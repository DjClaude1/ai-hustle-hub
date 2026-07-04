
# Downloads Everywhere + Faceless YouTube/TikTok Video Generator

## Part 1 — Universal Downloads (TXT / MD / PDF / DOCX)

Every generated output becomes downloadable in 4 formats via a reusable dropdown.

**New:** `src/lib/downloads.ts`
- `downloadText`, `downloadMarkdown` — direct Blob save
- `downloadPDF` — uses `html2pdf.js` to snapshot the rendered `ProductPreview` node so the PDF matches the styled preview (resume templates, book pages, landing-page mocks, etc.)
- `downloadDOCX` — uses the `docx` library, parses markdown into Word paragraphs/headings/lists

**New:** `src/components/DownloadMenu.tsx` — dropdown wired into `ToolPage.tsx` and `HistoryPage.tsx`.

**Deps:** `bun add html2pdf.js docx file-saver`

---

## Part 2 — Faceless Video Generator (Pro tool)

Full pipeline: **Script → split into scenes → per-scene narration (TTS) → per-scene Pexels stock footage → ffmpeg.wasm stitches one final MP4** with burnt-in captions + optional music. Downloadable and re-uploadable.

### 2a. Registration
- `src/data/tools.ts`: add `faceless-video` tool, category "Video", `premium: true`.
- Add to `PRO_TOOLS` in `src/lib/plans.ts` + `supabase/functions/generate/index.ts`.
- `src/App.tsx`: dedicated route `/tool/faceless-video` → new page (bypasses generic ToolPage).

### 2b. New page: `src/pages/FacelessVideoPage.tsx`
**Inputs:** topic, format (TikTok 9:16 30–60s / YouTube 16:9 3–6min), voice (alloy/nova/onyx/shimmer/echo), optional background music upload, optional footage overrides.

**Stepper UI (each step shows progress + result):**
1. **Script + Scenes** → calls `faceless-script` edge fn, returns strict JSON `{ scenes: [{ narration, visual_query, duration_sec, caption }] }`
2. **Narration** → for each scene, call `tts-narrate` (returns mp3 as base64); shows waveform + duration
3. **Stock Footage** → for each scene, call `pexels-search` with `visual_query`; user can swap any clip from 3 alternatives
4. **Stitch** → `ffmpeg.wasm` runs in-browser: downloads clips (proxied via `fetch-media` for CORS), scales/crops each to target aspect, trims to scene duration, muxes narration + optional music (−18dB), overlays captions with `drawtext`, concats scenes, encodes 720p MP4 (progress %)
5. **Deliver** → `<video>` preview + Download MP4 + "Save to Library" (uploads to `videos` bucket, logs in `generations` table)

### 2c. New edge functions
- `supabase/functions/faceless-script/index.ts` — Lovable AI (`google/gemini-3-flash-preview`) with JSON output enforcing the scene schema. Auth + Pro-gated via `check_and_increment_usage_v2`.
- `supabase/functions/tts-narrate/index.ts` — proxies Lovable AI `/v1/audio/speech` (`openai/gpt-4o-mini-tts`, mp3), returns base64. Chunks long text at sentence boundaries.
- `supabase/functions/pexels-search/index.ts` — calls Pexels Videos API with `PEXELS_API_KEY`, returns 3 clips per query with `{ url, width, height, duration }`, filtered by orientation.
- `supabase/functions/fetch-media/index.ts` — CORS-safe passthrough for Pexels MP4s so `ffmpeg.wasm` can `fetch()` them.

### 2d. Client stitcher: `src/lib/facelessVideo.ts`
- Lazy dynamic import of `@ffmpeg/ffmpeg` + `@ffmpeg/util`
- `stitchVideo({ scenes, narrations, clips, music?, format })` returns a `Blob`
- One ffmpeg pass per scene (scale+crop+trim+audio), then a final `concat demuxer` pass with drawtext captions
- Emits progress callback (0–100)

**Deps:** `bun add @ffmpeg/ffmpeg @ffmpeg/util`

### 2e. Storage + history
- Create public `videos` bucket via `supabase--storage_create_bucket`.
- Insert row into `generations` (tool_id `faceless-video`, output = MP4 URL + script JSON).
- `HistoryPage.tsx` renders a `<video>` thumbnail for these entries with the DownloadMenu.

### 2f. Secrets
- Request `PEXELS_API_KEY` via `add_secret` immediately after plan approval (user gets it free at pexels.com/api).
- `LOVABLE_API_KEY` already set.

### 2g. Gating + UX guards
- Free/Creator users see the tool card locked → `UpgradeModal`.
- Warn on mobile viewport: recommend desktop for 4+ min renders (ffmpeg.wasm memory).
- Hard-cap client stitching at 6 min; longer requests get "Download script + assets pack" fallback (zip of narration mp3s + clip URLs).

---

## Constraints acknowledged
- Supabase edge functions can't run native ffmpeg → stitching happens **client-side** with ffmpeg.wasm (still "self-hosted", no third-party render service).
- Pexels MP4s need proxying to bypass CORS during `fetch()` inside ffmpeg.wasm.

## Files
**Created (12):** `src/lib/downloads.ts`, `src/lib/facelessVideo.ts`, `src/components/DownloadMenu.tsx`, `src/pages/FacelessVideoPage.tsx`, `supabase/functions/{faceless-script,tts-narrate,pexels-search,fetch-media}/index.ts`
**Modified:** `src/App.tsx`, `src/data/tools.ts`, `src/lib/plans.ts`, `src/pages/ToolPage.tsx`, `src/pages/HistoryPage.tsx`, `supabase/functions/generate/index.ts`

Approve to build.
