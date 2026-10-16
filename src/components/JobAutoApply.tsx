import { useCallback, useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Briefcase, Search, Lock, Mail, ExternalLink, Loader2, Check, X, FileText, MapPin, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DownloadMenu } from "@/components/DownloadMenu";

interface Job {
  id?: string;
  external_id: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string | null;
  description: string | null;
  salary: string | null;
  contact_email: string | null;
  match_score: number | null;
  matched_skills?: string[];
  nearby?: boolean;
  status?: string;
  cover_letter?: string | null;
}

const COUNTRIES: [string, string][] = [
  ["za", "South Africa"], ["gb", "United Kingdom"], ["us", "United States"], ["au", "Australia"],
  ["ca", "Canada"], ["de", "Germany"], ["nl", "Netherlands"], ["in", "India"], ["nz", "New Zealand"],
  ["sg", "Singapore"], ["fr", "France"], ["br", "Brazil"],
];

async function errMsg(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try { const b = await error.context.json(); return b.error || "Request failed"; } catch { /* */ }
  }
  return error instanceof Error ? error.message : "Request failed";
}

interface Props {
  cvText: string; role: string; location: string; skills: string; fullName: string;
  hasAccess: boolean; onUpgrade: () => void;
}

export const JobAutoApply = ({ cvText, role, location, skills, fullName, hasAccess, onUpgrade }: Props) => {
  const { user } = useAuth();
  const [q, setQ] = useState(role);
  const [where, setWhere] = useState(location);
  const [country, setCountry] = useState("za");
  const [minScore, setMinScore] = useState(30);
  const [results, setResults] = useState<Job[]>([]);
  const [tracked, setTracked] = useState<Job[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [review, setReview] = useState<Job | null>(null);
  const [tab, setTab] = useState<"search" | "tracker">("search");

  useEffect(() => { if (!q) setQ(role); }, [role]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!where) setWhere(location); }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTracked = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("job_applications").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
    setTracked((data as Job[]) || []);
  }, [user]);
  useEffect(() => { loadTracked(); }, [loadTracked]);

  const search = async (override?: { where?: string; country?: string }) => {
    const query = q.trim() || role.trim();
    if (!query) return toast.error("Enter a role to search for (or generate your CV first)");
    if (!q.trim()) setQ(query);
    setSearching(true);
    const cvSkills = [skills, cvText.slice(0, 2500)].filter(Boolean).join("\n");
    const { data, error } = await supabase.functions.invoke("job-search", {
      body: { role: query, location: override?.where ?? where, country: override?.country ?? country, skills: cvSkills },
    });
    setSearching(false);
    if (error) return toast.error(await errMsg(error));
    setResults(data.jobs || []);
    if (!data.jobs?.length) toast.info("No jobs found — try a broader role or location");
  };

  const [locating, setLocating] = useState(false);
  const searchNearMe = () => {
    if (!navigator.geolocation) return toast.error("Your device doesn't support location");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`);
        const g = await r.json();
        const city = g.city || g.locality || g.principalSubdivision || "";
        const cc = String(g.countryCode || "").toLowerCase();
        const validCc = COUNTRIES.some(([c]) => c === cc) ? cc : country;
        setWhere(city); setCountry(validCc);
        toast.success(`Searching jobs near ${city || "you"} that match your CV`);
        await search({ where: city, country: validCc });
      } catch {
        toast.error("Couldn't work out your city — type it in instead");
      } finally { setLocating(false); }
    }, () => { setLocating(false); toast.error("Location permission denied — type your city instead"); },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  };

  const prepare = async (job: Job) => {
    if (cvText.trim().length < 50) return toast.error("Generate or fill in your CV first so we can tailor the cover letter");
    setBusy(job.external_id);
    const { data, error } = await supabase.functions.invoke("job-cover-letter", { body: { job, cvText, fullName } });
    setBusy(null);
    if (error) return toast.error(await errMsg(error));
    const row = { ...job, user_id: user!.id, cover_letter: data.coverLetter, status: "ready", updated_at: new Date().toISOString() };
    delete (row as any).created; delete (row as any).matched_skills; delete (row as any).nearby; delete (row as any).source; delete (row as any).remote;
    delete (row as any).id;
    const { data: saved, error: dbErr } = await supabase.from("job_applications")
      .upsert(row, { onConflict: "user_id,external_id" }).select().single();
    if (dbErr) return toast.error(dbErr.message);
    setReview(saved as Job);
    loadTracked();
  };

  const approve = async (job: Job) => {
    const letter = job.cover_letter || "";
    if (job.contact_email) {
      const subject = `Application: ${job.title}${fullName ? ` — ${fullName}` : ""}`;
      const body = `${letter}\n\n---\nCV attached (please attach the PDF downloaded from AI Hustle Studio).\n\n${cvText.slice(0, 1200)}`;
      window.open(`mailto:${job.contact_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    } else if (job.url) {
      try { await navigator.clipboard.writeText(letter); toast.success("Cover letter copied — paste it on the application page"); } catch { /* */ }
      window.open(job.url, "_blank", "noopener");
    }
    await supabase.from("job_applications").update({ status: "applied", applied_at: new Date().toISOString(), cover_letter: letter, updated_at: new Date().toISOString() }).eq("id", job.id!);
    setReview(null);
    toast.success(job.contact_email ? "Email drafted to the employer — attach your CV and press send" : "Application page opened & marked as applied");
    loadTracked();
  };

  const setStatus = async (job: Job, status: string) => {
    await supabase.from("job_applications").update({ status, updated_at: new Date().toISOString() }).eq("id", job.id!);
    loadTracked();
  };

  const filtered = results.filter((j) => (j.match_score ?? 0) >= minScore);
  const trackedIds = new Map(tracked.map((t) => [t.external_id, t]));

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold text-foreground">Job Search & Auto Apply</h2>
          <Badge variant="secondary">Pro</Badge>
        </div>
        {hasAccess && (
          <div className="flex gap-1 rounded-lg bg-secondary p-1 text-sm">
            {(["search", "tracker"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1 capitalize ${tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
                {t === "tracker" ? `Applications (${tracked.length})` : "Find jobs"}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Finds live jobs matching your CV and location, writes a cover letter for each one, and applies once you approve.
      </p>

      {!hasAccess ? (
        <div className="mt-4 flex flex-col items-start gap-3 rounded-lg border border-dashed border-border p-5">
          <div className="flex items-center gap-2 text-sm text-foreground"><Lock className="h-4 w-4" /> Available on the Pro plan (or free trial).</div>
          <Button onClick={onUpgrade}>Unlock auto apply</Button>
        </div>
      ) : tab === "search" ? (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_160px_auto_auto]">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Role, e.g. Data Analyst" />
            <Input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="City or area" />
            <select value={country} onChange={(e) => setCountry(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
            <Button variant="outline" onClick={searchNearMe} disabled={locating || searching}>
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />} Near me
            </Button>
            <Button onClick={() => search()} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
            </Button>
          </div>
          {results.length > 0 && (
            <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
              <span>Minimum match: {minScore}%</span>
              <input type="range" min={0} max={90} step={10} value={minScore} onChange={(e) => setMinScore(+e.target.value)} className="accent-primary" />
              <span>{filtered.length} of {results.length} jobs</span>
            </div>
          )}
          <div className="mt-4 space-y-3">
            {filtered.map((job) => {
              const t = trackedIds.get(job.external_id);
              return (
                <div key={job.external_id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">{job.title}</h3>
                      <p className="text-sm text-muted-foreground flex flex-wrap gap-x-3">
                        {job.company && <span>{job.company}</span>}
                        {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                        {job.salary && <span>{job.salary}</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={(job.match_score ?? 0) >= 60 ? "default" : "secondary"}>{job.match_score}% match</Badge>
                      {job.nearby && <Badge variant="outline" className="text-xs"><MapPin className="mr-1 h-3 w-3" /> Near you</Badge>}
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
                  {job.matched_skills && job.matched_skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {job.matched_skills.map((s) => (
                        <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{s}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t?.status === "applied" ? (
                      <Badge><Check className="mr-1 h-3 w-3" /> Applied</Badge>
                    ) : t?.cover_letter ? (
                      <Button size="sm" onClick={() => setReview(t)}><FileText className="h-4 w-4" /> Review & apply</Button>
                    ) : (
                      <Button size="sm" onClick={() => prepare(job)} disabled={busy === job.external_id}>
                        {busy === job.external_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Write cover letter
                      </Button>
                    )}
                    {job.url && <Button size="sm" variant="outline" asChild><a href={job.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> View job</a></Button>}
                    {job.contact_email && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> Email apply available</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-4 space-y-2">
          {tracked.length === 0 && <p className="text-sm text-muted-foreground">No applications yet.</p>}
          {tracked.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground">{[t.company, t.location].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={t.status} onChange={(e) => setStatus(t, e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground">
                  {["ready", "applied", "interview", "offer", "rejected"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {t.cover_letter && <Button size="sm" variant="outline" onClick={() => setReview(t)}>Letter</Button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {review && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Approve application</h3>
                <p className="text-sm text-muted-foreground">{review.title}{review.company ? ` at ${review.company}` : ""}</p>
              </div>
              <button onClick={() => setReview(null)} aria-label="Close"><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <label className="mt-4 block text-sm font-medium text-foreground">Cover letter (edit before sending)</label>
            <Textarea className="mt-1 min-h-[300px]" value={review.cover_letter || ""}
              onChange={(e) => setReview({ ...review, cover_letter: e.target.value })} />
            <p className="mt-2 text-xs text-muted-foreground">
              {review.contact_email
                ? `Approving opens an email to ${review.contact_email} with this letter, from your own email account.`
                : "This employer accepts applications on their site. Approving copies your letter and opens the application page."}
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <DownloadMenu content={review.cover_letter || ""} filename={`cover-letter-${review.company || "job"}`} />
              <Button variant="outline" onClick={() => setReview(null)}>Cancel</Button>
              <Button onClick={() => approve(review)} disabled={!review.contact_email && !review.url}>
                <Send className="h-4 w-4" /> Approve & apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
