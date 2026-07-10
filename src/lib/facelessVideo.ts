// Client-side stitcher using ffmpeg.wasm.
// Runs entirely in the browser: fetches Pexels clips (via a CORS-safe proxy),
// normalizes each scene, then concatenates into one MP4 with burnt-in captions
// and mixed narration.

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import coreURLLocal from "@ffmpeg/core?url";
import wasmURLBundled from "@ffmpeg/core/wasm?url";
import wasmAsset from "../assets/ffmpeg-core.wasm.asset.json";

// Use the ESM core. The @ffmpeg/ffmpeg worker is a module worker, so UMD
// ffmpeg-core.js URLs fail with "failed to import ffmpeg-core.js". In dev,
// Lovable asset CDN paths are not served by localhost, so use Vite's bundled
// wasm URL locally and the CDN asset after publishing.
const wasmURLLocal = import.meta.env.DEV ? wasmURLBundled : (wasmAsset as { url?: string }).url || wasmURLBundled;

export interface Scene {
  narration: string;
  visual_query: string;
  duration_sec: number;
  caption: string;
}

export interface StitchClip {
  /** Direct Pexels MP4 URL (will be proxied through fetch-media). */
  url: string;
}

export interface StitchInput {
  scenes: Scene[];
  clips: StitchClip[]; // 1-to-1 with scenes
  narrationBlobs: Blob[]; // 1-to-1 with scenes (mp3)
  format: "short" | "long";
  musicBlob?: Blob | null;
  onProgress?: (percent: number, label: string) => void;
  proxyBase: string; // e.g. `${VITE_SUPABASE_URL}/functions/v1/fetch-media`
}

// Try multiple ESM CDNs — UMD core cannot be dynamically imported by the module worker.
const CORE_BASES = [
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm",
  "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm",
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm",
];

let ffmpegSingleton: FFmpeg | null = null;
let ffmpegLogHandlerAttached = false;

async function tryLoadCore(base: string): Promise<{ coreURL: string; wasmURL: string }> {
  const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript");
  const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm");
  return { coreURL, wasmURL };
}

async function getFFmpeg(onLog?: (m: string) => void): Promise<FFmpeg> {
  if (ffmpegSingleton) {
    if (onLog && !ffmpegLogHandlerAttached) {
      ffmpegSingleton.on("log", ({ message }) => onLog(message));
      ffmpegLogHandlerAttached = true;
    }
    return ffmpegSingleton;
  }
  const ff = new FFmpeg();
  if (onLog) {
    ff.on("log", ({ message }) => onLog(message));
    ffmpegLogHandlerAttached = true;
  }

  // Prefer locally-bundled ESM core (served same-origin by Vite) — most reliable.
  try {
    const coreURL = await toBlobURL(coreURLLocal, "text/javascript");
    const wasmURL = await toBlobURL(wasmURLLocal, "application/wasm");
    await ff.load({ coreURL, wasmURL });
    ffmpegSingleton = ff;
    return ff;
  } catch (e) {
    console.warn("Local ffmpeg core load failed, trying CDN fallbacks", e);
  }

  let lastErr: unknown = null;
  for (const base of CORE_BASES) {
    try {
      const urls = await tryLoadCore(base);
      await ff.load(urls);
      ffmpegSingleton = ff;
      return ff;
    } catch (e) {
      console.warn("ffmpeg core load failed from", base, e);
      lastErr = e;
    }
  }
  throw new Error(
    "Could not load ffmpeg-core. Check network/ad-blocker. " +
      (lastErr instanceof Error ? lastErr.message : String(lastErr))
  );
}

const escapeDrawtext = (s: string) =>
  s.replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\u2019")
    .replace(/,/g, "\\,")
    .replace(/\n/g, " ")
    .slice(0, 80);

export async function stitchFacelessVideo(input: StitchInput): Promise<Blob> {
  const { scenes, clips, narrationBlobs, format, musicBlob, onProgress, proxyBase } = input;
  if (scenes.length !== clips.length || scenes.length !== narrationBlobs.length) {
    throw new Error("scenes, clips and narrationBlobs must have same length");
  }

  const isShort = format === "short";
  const outW = isShort ? 720 : 1280;
  const outH = isShort ? 1280 : 720;

  const ffmpegLogs: string[] = [];
  const ff = await getFFmpeg((message) => {
    ffmpegLogs.push(message);
    if (ffmpegLogs.length > 80) ffmpegLogs.shift();
  });
  const total = scenes.length;
  const report = (p: number, l: string) => onProgress?.(Math.max(0, Math.min(99, p)), l);
  const run = async (args: string[], label: string) => {
    const code = await ff.exec(args);
    if (code !== 0) {
      const details = ffmpegLogs.slice(-12).join("\n");
      throw new Error(`${label} failed in video renderer.${details ? `\n${details}` : ""}`);
    }
  };

  // Write assets & normalize each scene
  const sceneFiles: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    report(Math.round((i / total) * 70), `Preparing scene ${i + 1}/${total}`);

    // Fetch clip through proxy (CORS-safe)
    const proxied = `${proxyBase}?url=${encodeURIComponent(clips[i].url)}`;
    const clipData = await fetchFile(proxied);
    const clipName = `in_${i}.mp4`;
    await ff.writeFile(clipName, clipData);

    // Narration
    const narrData = new Uint8Array(await narrationBlobs[i].arrayBuffer());
    const narrName = `narr_${i}.mp3`;
    await ff.writeFile(narrName, narrData);

    const caption = escapeDrawtext(scene.caption || "");
    const dur = scene.duration_sec;
    const outName = `scene_${i}.mp4`;

    // Video filter: scale to cover, crop to output, add caption text at bottom
    const vf = [
      `scale=${outW}:${outH}:force_original_aspect_ratio=increase`,
      `crop=${outW}:${outH}`,
      caption
        ? `drawtext=text='${caption}':fontcolor=white:fontsize=${isShort ? 42 : 36}:borderw=3:bordercolor=black@0.8:x=(w-text_w)/2:y=h-text_h-${isShort ? 140 : 80}`
        : "",
      "setsar=1",
    ].filter(Boolean).join(",");

    await run([
      "-y",
      "-t", String(dur),
      "-stream_loop", "-1",
      "-i", clipName,
      "-i", narrName,
      "-vf", vf,
      "-r", "30",
      "-pix_fmt", "yuv420p",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "26",
      "-c:a", "aac",
      "-b:a", "128k",
      "-ar", "44100",
      "-ac", "2",
      "-shortest",
      "-t", String(dur),
      "-map", "0:v:0",
      "-map", "1:a:0",
      outName,
    ], `Scene ${i + 1}`);

    // Free the input clip to keep memory low
    try { await ff.deleteFile(clipName); } catch { /* noop */ }
    sceneFiles.push(outName);
  }

  // Concat scene files with the concat demuxer
  report(75, "Stitching scenes");
  const listContent = sceneFiles.map((n) => `file '${n}'`).join("\n");
  await ff.writeFile("list.txt", new TextEncoder().encode(listContent));

  const finalName = "final.mp4";
  if (musicBlob) {
    // Concat then mix background music
    await run([
      "-y", "-f", "concat", "-safe", "0", "-i", "list.txt",
      "-c", "copy", "concat.mp4",
    ], "Scene stitching");
    const mus = new Uint8Array(await musicBlob.arrayBuffer());
    await ff.writeFile("music.mp3", mus);
    await run([
      "-y",
      "-i", "concat.mp4",
      "-i", "music.mp3",
      "-filter_complex", "[1:a]volume=0.15,aloop=loop=-1:size=2e9[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]",
      "-map", "0:v", "-map", "[a]",
      "-c:v", "copy",
      "-c:a", "aac", "-b:a", "160k",
      "-shortest",
      finalName,
    ], "Music mix");
  } else {
    await run([
      "-y", "-f", "concat", "-safe", "0", "-i", "list.txt",
      "-c", "copy", finalName,
    ], "Scene stitching");
  }

  report(95, "Finalizing");
  const data = await ff.readFile(finalName);
  const blob = new Blob([data instanceof Uint8Array ? data : new Uint8Array(data as any)], { type: "video/mp4" });

  // Cleanup
  for (const f of [...sceneFiles, "list.txt", "concat.mp4", "music.mp3", finalName]) {
    try { await ff.deleteFile(f); } catch { /* noop */ }
  }
  for (let i = 0; i < scenes.length; i++) {
    try { await ff.deleteFile(`narr_${i}.mp3`); } catch { /* noop */ }
  }

  report(100, "Done");
  return blob;
}

export function base64ToBlob(b64: string, mime = "audio/mpeg"): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
