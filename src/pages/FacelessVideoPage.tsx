import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, Loader2, Film, Download, Lock, Crown,
  RefreshCw, Play, AlertTriangle, CheckCircle2, Music,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { UpgradeModal } from "@/components/UpgradeModal";
import { stitchFacelessVideo, base64ToBlob, type Scene } from "@/lib/facelessVideo";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SCRIPT_URL = `${SUPABASE_URL}/functions/v1/faceless-script`;
const TTS_URL = `${SUPABASE_URL}/functions/v1/tts-narrate`;
const PEXELS_URL = `${SUPABASE_URL}/functions/v1/pexels-search`;
const PROXY_URL = `${SUPABASE_URL}/functions/v1/fetch-media`;

type Step = "idle" | "script" | "narration" | "footage" | "stitch" | "done" | "error";

interface ClipChoice {
  results: { id: number; url: string; preview?: string; width: number; height: number; duration: number }[];
  selected: number; // index
}

const FacelessVideoPage = () => {
  const { user, session } = useAuth();
  const { canAccessTool, trialActive, trialAvailable, trialRemaining } = useSubscription();
  const navigate = useNavigate();

  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<"short" | "long">("short");
  const [voice, setVoice] = useState("alloy");
  const [tone, setTone] = useState("engaging, motivational");
  const [musicFile, setMusicFile] = useState<File | null>(null);

  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [script, setScript] = useState<{ title: string; hook: string; scenes: Scene[]; total_seconds: number } | null>(null);
  const [narrationBlobs, setNarrationBlobs] = useState<Blob[]>([]);
  const [clipChoices, setClipChoices] = useState<ClipChoice[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const locked = !canAccessTool("faceless-video-studio");

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  });

  const generateScript = async () => {
    setError(null);
    setScript(null);
    setNarrationBlobs([]);
    setClipChoices([]);
    setVideoUrl(null);
    setVideoBlob(null);

    setStep("script");
    setProgress(5);
    setProgressLabel("Writing script and splitting into scenes…");

    const resp = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ topic, format, tone }),
    });
    if (!resp.ok) {
      const j = await resp.json().catch(() => ({}));
      if (j.code === "UPGRADE_REQUIRED" || j.code === "TRIAL_EXHAUSTED") {
        setUpgradeOpen(true);
        setStep("idle");
        return null;
      }
      throw new Error(j.error || "Script generation failed");
    }
    const data = await resp.json();
    setScript(data);
    return data;
  };

  const generateNarration = async (scenes: Scene[]) => {
    setStep("narration");
    const blobs: Blob[] = [];
    for (let i = 0; i < scenes.length; i++) {
      setProgress(10 + Math.round((i / scenes.length) * 25));
      setProgressLabel(`Generating narration ${i + 1}/${scenes.length}…`);
      const resp = await fetch(TTS_URL, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ text: scenes[i].narration, voice }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || `TTS failed on scene ${i + 1}`);
      }
      const { audio_base64 } = await resp.json();
      blobs.push(base64ToBlob(audio_base64));
    }
    setNarrationBlobs(blobs);
    return blobs;
  };

  const findFootage = async (scenes: Scene[]) => {
    setStep("footage");
    const choices: ClipChoice[] = [];
    const orientation = format === "short" ? "portrait" : "landscape";
    for (let i = 0; i < scenes.length; i++) {
      setProgress(35 + Math.round((i / scenes.length) * 20));
      setProgressLabel(`Fetching footage ${i + 1}/${scenes.length}…`);
      const resp = await fetch(PEXELS_URL, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ query: scenes[i].visual_query, orientation, perPage: 5 }),
      });
      if (!resp.ok) throw new Error(`Stock footage lookup failed on scene ${i + 1}`);
      const { results } = await resp.json();
      if (!results?.length) {
        // fallback: retry with a generic query
        const retry = await fetch(PEXELS_URL, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ query: "abstract background", orientation, perPage: 5 }),
        });
        const rj = await retry.json();
        choices.push({ results: rj.results || [], selected: 0 });
      } else {
        choices.push({ results, selected: 0 });
      }
    }
    setClipChoices(choices);
    return choices;
  };

  const stitch = async (scenes: Scene[], blobs: Blob[], choices: ClipChoice[]) => {
    setStep("stitch");
    setProgress(55);
    setProgressLabel("Stitching video…");
    const clips = choices.map((c) => ({ url: c.results[c.selected].url }));
    const musicBlob = musicFile ? musicFile : null;
    const blob = await stitchFacelessVideo({
      scenes, clips, narrationBlobs: blobs, format, musicBlob,
      proxyBase: PROXY_URL,
      onProgress: (p, label) => {
        setProgress(55 + Math.round(p * 0.4));
        setProgressLabel(label);
      },
    });
    setVideoBlob(blob);
    setVideoUrl(URL.createObjectURL(blob));
    setStep("done");
    setProgress(100);
    setProgressLabel("Done");
  };

  const handleRun = async () => {
    if (!user) { navigate("/auth"); return; }
    if (locked) { setUpgradeOpen(true); return; }
    if (!topic.trim()) { toast.error("Enter a topic first."); return; }

    try {
      const scriptData = await generateScript();
      if (!scriptData) return;
      const blobs = await generateNarration(scriptData.scenes);
      const choices = await findFootage(scriptData.scenes);
      await stitch(scriptData.scenes, blobs, choices);
      toast.success("Video ready!");
    } catch (e: any) {
      console.error("Faceless video error:", e);
      setError(e.message || "Something went wrong");
      setStep("error");
      toast.error(e.message || "Video generation failed");
    }
  };

  const handleSwapClip = (sceneIdx: number, dir: 1 | -1) => {
    setClipChoices((cs) => {
      const next = [...cs];
      const c = { ...next[sceneIdx] };
      const total = c.results.length || 1;
      c.selected = (c.selected + dir + total) % total;
      next[sceneIdx] = c;
      return next;
    });
  };

  const handleRestitch = async () => {
    if (!script || !narrationBlobs.length || !clipChoices.length) return;
    try {
      await stitch(script.scenes, narrationBlobs, clipChoices);
      toast.success("Video re-stitched with your selected clips.");
    } catch (e: any) {
      setError(e.message || "Re-stitch failed");
      setStep("error");
    }
  };

  const handleDownload = () => {
    if (!videoBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(videoBlob);
    const suffix = format === "short" ? "short" : "long";
    a.download = `faceless-${suffix}-${Date.now()}.mp4`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleSaveToLibrary = async () => {
    if (!videoBlob || !user) return;
    const path = `${user.id}/${Date.now()}.mp4`;
    const { error: upErr } = await supabase.storage.from("videos").upload(path, videoBlob, {
      contentType: "video/mp4",
    });
    if (upErr) { toast.error(upErr.message); return; }
    const { data: signed } = await supabase.storage.from("videos").createSignedUrl(path, 60 * 60 * 24 * 7);
    await supabase.from("generations").insert({
      user_id: user.id,
      tool_id: "faceless-video-studio",
      tool_name: "Faceless Video Studio",
      inputs: { topic, format, voice, tone },
      output: JSON.stringify({
        video_path: path,
        video_url: signed?.signedUrl,
        script,
      }),
    });
    toast.success("Saved to your library.");
  };

  return (
    <div className="min-h-screen pt-20 pb-16 bg-background md:pl-56">
      <div className="container max-w-3xl">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Film className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold text-foreground">Faceless Video Studio</h1>
            <p className="text-sm text-muted-foreground">AI script → scene splits → Pexels footage → stitched MP4</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            <Crown className="h-3 w-3" /> Pro
          </span>
        </div>

        {locked && (
          <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-6 text-center">
            <Lock className="h-8 w-8 text-accent mx-auto mb-2" />
            <h3 className="font-display text-lg font-semibold text-foreground">
              {trialAvailable ? "Try Faceless Video Studio free" : "Pro-only tool"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {trialAvailable
                ? "3 free premium generations — authorize PayPal, no charge for 7 days."
                : "Upgrade to Pro to generate faceless YouTube & TikTok videos end-to-end."}
            </p>
            <Button variant="accent" size="sm" onClick={() => setUpgradeOpen(true)}>
              <Crown className="h-4 w-4" /> {trialAvailable ? "Start free trial" : "Upgrade to Pro"}
            </Button>
          </div>
        )}

        {trialActive && !locked && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm text-accent">
            <Sparkles className="h-4 w-4" />
            <span>Premium trial active — <strong>{trialRemaining}</strong> premium generation{trialRemaining !== 1 ? "s" : ""} remaining.</span>
          </div>
        )}

        {/* Inputs */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-soft space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Video topic <span className="text-destructive">*</span></label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., 5 side hustles that made me $10k in 2025"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as "short" | "long")}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm"
              >
                <option value="short">Short — TikTok / Reels / Shorts (9:16, ~45s)</option>
                <option value="long">Long — YouTube (16:9, ~5min)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Voice</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm"
              >
                <option value="alloy">Alloy — neutral</option>
                <option value="nova">Nova — warm female</option>
                <option value="onyx">Onyx — deep male</option>
                <option value="shimmer">Shimmer — bright female</option>
                <option value="echo">Echo — steady male</option>
                <option value="fable">Fable — storyteller</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Tone</label>
            <Input
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="engaging, motivational"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium flex items-center gap-2">
              <Music className="h-3.5 w-3.5" /> Background music (optional, mp3)
            </label>
            <input
              type="file" accept="audio/mpeg,audio/mp3"
              onChange={(e) => setMusicFile(e.target.files?.[0] || null)}
              className="text-sm text-muted-foreground"
            />
            {musicFile && <p className="mt-1 text-xs text-muted-foreground">Loaded: {musicFile.name}</p>}
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            Rendering runs in your browser. Use a desktop for best performance — long-form (5 min) may take 3-6 minutes to render.
          </div>

          <Button
            variant="hero" size="lg" className="w-full"
            onClick={handleRun}
            disabled={step !== "idle" && step !== "done" && step !== "error"}
          >
            {step === "idle" || step === "done" || step === "error" ? (
              <><Sparkles className="h-4 w-4" /> Generate Faceless Video</>
            ) : (
              <><Loader2 className="h-4 w-4 animate-spin" /> {progressLabel || "Working…"}</>
            )}
          </Button>
        </div>

        {/* Progress */}
        {step !== "idle" && step !== "error" && (
          <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{progressLabel}</span>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            {step === "done" && (
              <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" /> Your video is ready below.
              </div>
            )}
          </div>
        )}

        {step === "error" && error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" /> {error}
          </div>
        )}

        {/* Script preview */}
        {script && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft animate-fade-up">
            <h2 className="font-display text-base font-semibold">{script.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{script.hook}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {script.scenes.length} scenes · ~{Math.round(script.total_seconds)}s
            </p>

            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {script.scenes.map((s, i) => (
                <div key={i} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Scene {i + 1}</span>
                    <span className="text-xs text-muted-foreground">{s.duration_sec}s</span>
                  </div>
                  <p className="text-foreground">{s.narration}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <strong>B-roll query:</strong> {s.visual_query}
                    {s.caption && <> · <strong>Caption:</strong> {s.caption}</>}
                  </p>
                  {clipChoices[i]?.results?.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      {clipChoices[i].results[clipChoices[i].selected]?.preview && (
                        <img
                          src={clipChoices[i].results[clipChoices[i].selected].preview}
                          alt=""
                          className="h-14 w-24 rounded object-cover"
                        />
                      )}
                      <span className="text-xs text-muted-foreground">
                        Clip {clipChoices[i].selected + 1}/{clipChoices[i].results.length}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => handleSwapClip(i, -1)}>‹</Button>
                      <Button variant="outline" size="sm" onClick={() => handleSwapClip(i, 1)}>›</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {step === "done" && (
              <Button variant="outline" size="sm" className="mt-3" onClick={handleRestitch}>
                <RefreshCw className="h-3.5 w-3.5" /> Re-stitch with selected clips
              </Button>
            )}
          </div>
        )}

        {/* Video preview */}
        {videoUrl && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft animate-fade-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-semibold">Your video</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5" /> Download MP4
                </Button>
                <Button variant="hero" size="sm" onClick={handleSaveToLibrary}>
                  <Play className="h-3.5 w-3.5" /> Save to library
                </Button>
              </div>
            </div>
            <video
              src={videoUrl} controls
              className={`w-full rounded-lg ${format === "short" ? "max-w-xs mx-auto" : ""}`}
            />
          </div>
        )}
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        onUpgrade={async (tier) => {
          setUpgradeOpen(false);
          if (!user || !session) { navigate("/auth"); return; }
          try {
            const { data, error: err } = await supabase.functions.invoke("paypal-create-subscription", {
              body: {
                tier,
                returnUrl: `${window.location.origin}/dashboard`,
                cancelUrl: `${window.location.origin}/dashboard?paypal=cancelled`,
              },
            });
            if (err) throw err;
            if (data?.approveUrl) window.location.href = data.approveUrl;
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Payment failed");
          }
        }}
        requiredPlan="pro"
        trialAvailable={trialAvailable}
        trialExhausted={!trialActive && trialRemaining === 0 && !trialAvailable}
      />
    </div>
  );
};

export default FacelessVideoPage;
