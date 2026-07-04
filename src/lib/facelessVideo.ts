// Client-side stitcher using ffmpeg.wasm.
// Runs entirely in the browser: fetches Pexels clips (via a CORS-safe proxy),
// normalizes each scene, then concatenates into one MP4 with burnt-in captions
// and mixed narration.

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

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

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

let ffmpegSingleton: FFmpeg | null = null;

async function getFFmpeg(onLog?: (m: string) => void): Promise<FFmpeg> {
  if (ffmpegSingleton) return ffmpegSingleton;
  const ff = new FFmpeg();
  if (onLog) ff.on("log", ({ message }) => onLog(message));
  await ff.load({
    coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
  });
  ffmpegSingleton = ff;
  return ff;
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

  const ff = await getFFmpeg();
  const total = scenes.length;
  const report = (p: number, l: string) => onProgress?.(Math.max(0, Math.min(99, p)), l);

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

    await ff.exec([
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
    ]);

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
    await ff.exec([
      "-y", "-f", "concat", "-safe", "0", "-i", "list.txt",
      "-c", "copy", "concat.mp4",
    ]);
    const mus = new Uint8Array(await musicBlob.arrayBuffer());
    await ff.writeFile("music.mp3", mus);
    await ff.exec([
      "-y",
      "-i", "concat.mp4",
      "-i", "music.mp3",
      "-filter_complex", "[1:a]volume=0.15,aloop=loop=-1:size=2e9[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]",
      "-map", "0:v", "-map", "[a]",
      "-c:v", "copy",
      "-c:a", "aac", "-b:a", "160k",
      "-shortest",
      finalName,
    ]);
  } else {
    await ff.exec([
      "-y", "-f", "concat", "-safe", "0", "-i", "list.txt",
      "-c", "copy", finalName,
    ]);
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
