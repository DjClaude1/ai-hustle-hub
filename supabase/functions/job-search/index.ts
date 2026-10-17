import { corsHeaders, json, requirePro } from "../_shared/proAccess.ts";

const COUNTRIES = new Set(["za", "gb", "us", "au", "ca", "de", "fr", "in", "nl", "nz", "sg", "br", "pl", "it", "es", "at", "be", "ch", "mx"]);
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const strip = (s: string | null | undefined) => (s ?? "").replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").trim();

interface RawJob {
  external_id: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  description: string;
  salary: string | null;
  created: string | null;
  remote: boolean;
  source: string;
}

// ---------- Providers (all free; Adzuna needs keys, the rest don't) ----------

async function fromAdzuna(role: string, location: string, cc: string, page: number, remoteOnly: boolean): Promise<RawJob[]> {
  const appId = Deno.env.get("ADZUNA_APP_ID");
  const appKey = Deno.env.get("ADZUNA_APP_KEY");
  if (!appId || !appKey) return [];
  const params = new URLSearchParams({
    app_id: appId, app_key: appKey, results_per_page: "20",
    what: remoteOnly ? `${role} remote` : role.slice(0, 120),
    "content-type": "application/json",
  });
  if (location) params.set("where", location.slice(0, 80));
  const resp = await fetch(`https://api.adzuna.com/v1/api/jobs/${cc}/search/${page}?${params}`);
  if (!resp.ok) { console.error("Adzuna", resp.status, (await resp.text()).slice(0, 200)); return []; }
  const data = await resp.json();
  return (data.results || []).map((r: any): RawJob => ({
    external_id: `adzuna-${r.id}`,
    title: strip(r.title) || "Untitled",
    company: r.company?.display_name ?? null,
    location: r.location?.display_name ?? null,
    url: r.redirect_url,
    description: strip(r.description),
    salary: r.salary_min ? `${Math.round(r.salary_min).toLocaleString()}${r.salary_max && r.salary_max !== r.salary_min ? ` – ${Math.round(r.salary_max).toLocaleString()}` : ""}` : null,
    created: r.created ?? null,
    remote: /remote/i.test(`${r.title} ${r.location?.display_name ?? ""}`),
    source: "Adzuna",
  }));
}

async function fromJobicy(role: string, remoteOnly: boolean): Promise<RawJob[]> {
  const params = new URLSearchParams({ count: "50", tag: role.slice(0, 60) });
  const resp = await fetch(`https://jobicy.com/api/v2/remote-jobs?${params}`);
  if (!resp.ok) { console.error("Jobicy", resp.status); return []; }
  const data = await resp.json();
  return (data.jobs || []).map((r: any): RawJob => ({
    external_id: `jobicy-${r.id}`,
    title: strip(r.jobTitle) || "Untitled",
    company: r.companyName ?? null,
    location: r.jobGeo ?? "Remote",
    url: r.url,
    description: strip(r.jobDescription).slice(0, 2000),
    salary: r.annualSalaryMin ? `$${Number(r.annualSalaryMin).toLocaleString()}${r.annualSalaryMax ? ` – $${Number(r.annualSalaryMax).toLocaleString()}` : ""}` : null,
    created: r.pubDate ?? null,
    remote: true,
    source: "Jobicy",
  })).filter((j: RawJob) => !remoteOnly || j.remote);
}

async function fromRemotive(role: string): Promise<RawJob[]> {
  const params = new URLSearchParams({ search: role.slice(0, 60), limit: "50" });
  const resp = await fetch(`https://remotive.com/api/remote-jobs?${params}`);
  if (!resp.ok) { console.error("Remotive", resp.status); return []; }
  const data = await resp.json();
  return (data.jobs || []).map((r: any): RawJob => ({
    external_id: `remotive-${r.id}`,
    title: strip(r.title) || "Untitled",
    company: r.company_name ?? null,
    location: r.candidate_required_location ?? "Remote",
    url: r.url,
    description: strip(r.description).slice(0, 2000),
    salary: r.salary || null,
    created: r.publication_date ?? null,
    remote: true,
    source: "Remotive",
  }));
}

async function fromArbeitnow(role: string): Promise<RawJob[]> {
  const resp = await fetch("https://www.arbeitnow.com/api/job-board-api");
  if (!resp.ok) { console.error("Arbeitnow", resp.status); return []; }
  const data = await resp.json();
  const words = role.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  return (data.data || [])
    .filter((r: any) => words.some((w) => String(r.title).toLowerCase().includes(w)))
    .slice(0, 50)
    .map((r: any): RawJob => ({
      external_id: `arbeitnow-${r.slug}`,
      title: strip(r.title) || "Untitled",
      company: r.company_name ?? null,
      location: r.location ?? null,
      url: r.url,
      description: strip(r.description).slice(0, 2000),
      salary: null,
      created: r.created_at ? new Date(r.created_at * 1000).toISOString() : null,
      remote: !!r.remote,
      source: "Arbeitnow",
    }));
}

async function fromHimalayas(role: string): Promise<RawJob[]> {
  const resp = await fetch(`https://himalayas.app/jobs/api/search?q=${encodeURIComponent(role.slice(0, 60))}`);
  if (!resp.ok) { console.error("Himalayas", resp.status); return []; }
  const data = await resp.json();
  return (data.jobs || []).slice(0, 40).map((r: any): RawJob => ({
    external_id: `himalayas-${r.guid ?? r.applicationLink}`,
    title: strip(r.title) || "Untitled",
    company: r.companyName ?? null,
    location: (r.locationRestrictions || []).join(", ") || "Remote",
    url: r.applicationLink,
    description: strip(r.description ?? r.excerpt).slice(0, 2000),
    salary: r.minSalary ? `$${Number(r.minSalary).toLocaleString()}${r.maxSalary ? ` – $${Number(r.maxSalary).toLocaleString()}` : ""}` : null,
    created: r.pubDate ? new Date(r.pubDate * 1000).toISOString() : null,
    remote: true,
    source: "Himalayas",
  }));
}

async function fromRemoteOK(role: string): Promise<RawJob[]> {
  const resp = await fetch("https://remoteok.com/api", { headers: { "User-Agent": "AIHustleStudio/1.0" } });
  if (!resp.ok) { console.error("RemoteOK", resp.status); return []; }
  const data = await resp.json();
  const words = role.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  return (Array.isArray(data) ? data.slice(1) : [])
    .filter((r: any) => words.some((w) => `${r.position} ${(r.tags || []).join(" ")}`.toLowerCase().includes(w)))
    .slice(0, 40)
    .map((r: any): RawJob => ({
      external_id: `remoteok-${r.id}`,
      title: strip(r.position) || "Untitled",
      company: r.company ?? null,
      location: r.location || "Remote",
      url: r.url,
      description: strip(r.description).slice(0, 2000),
      salary: r.salary_min ? `$${Number(r.salary_min).toLocaleString()}${r.salary_max ? ` – $${Number(r.salary_max).toLocaleString()}` : ""}` : null,
      created: r.date ?? null,
      remote: true,
      source: "RemoteOK",
    }));
}

async function fromTheMuse(role: string): Promise<RawJob[]> {
  const resp = await fetch(`https://www.themuse.com/api/public/jobs?page=0&descending=true`);
  if (!resp.ok) { console.error("TheMuse", resp.status); return []; }
  const data = await resp.json();
  const words = role.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  return (data.results || [])
    .filter((r: any) => words.some((w) => String(r.name).toLowerCase().includes(w)))
    .map((r: any): RawJob => {
      const locs = (r.locations || []).map((l: any) => l.name).join(", ");
      return {
        external_id: `muse-${r.id}`,
        title: strip(r.name) || "Untitled",
        company: r.company?.name ?? null,
        location: locs || null,
        url: r.refs?.landing_page,
        description: strip(r.contents).slice(0, 2000),
        salary: null,
        created: r.publication_date ?? null,
        remote: /remote|flexible/i.test(locs),
        source: "The Muse",
      };
    });
}

// ---------- Handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const gate = await requirePro(req);
    if (gate instanceof Response) return gate;

    const { role, location = "", country = "za", skills = "", page = 1, remoteOnly = false } = await req.json();
    if (!role || typeof role !== "string") return json({ error: "A target role is required" }, 400);
    const cc = String(country).toLowerCase();
    if (!COUNTRIES.has(cc)) return json({ error: "Unsupported country" }, 400);

    // Query all providers in parallel; Adzuna returns [] when keys are missing.
    const results = await Promise.allSettled([
      fromAdzuna(role, String(location), cc, Number(page) || 1, !!remoteOnly),
      fromJobicy(role, !!remoteOnly),
      fromRemotive(role),
      fromArbeitnow(role),
      fromHimalayas(role),
      fromRemoteOK(role),
      fromTheMuse(role),
    ]);
    let jobs: RawJob[] = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    if (remoteOnly) jobs = jobs.filter((j) => j.remote);

    // Near-me prioritisation: always float jobs in the requested city/area to
    // the top, even when there are only one or two of them.
    const loc = String(location).toLowerCase().trim();
    const isLocal = (j: RawJob) => !!loc && !!j.location && j.location.toLowerCase().includes(loc);
    if (loc) {
      const local = jobs.filter(isLocal);
      const rest = jobs.filter((j) => !isLocal(j));
      jobs = local.concat(rest.filter((j) => j.remote), rest.filter((j) => !j.remote));
    }
    if (jobs.length === 0) {
      return json({ jobs: [], total: 0, message: "No jobs found for that role right now. Try a broader title." });
    }

    const skillList = String(skills).toLowerCase().split(/[,;\n]/).map((s) => s.trim()).filter((s) => s.length > 1).slice(0, 40);
    const roleWords = role.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);

    const scored = jobs.map((j) => {
      // Parse the job description: which of the candidate's skills does this
      // job actually ask for, and which role words appear in the title?
      const text = `${j.title} ${j.description}`.toLowerCase();
      const matchedSkills = skillList.filter((s) => text.includes(s));
      const skillHits = matchedSkills.length;
      const roleHits = roleWords.filter((w: string) => j.title.toLowerCase().includes(w)).length;
      const localBoost = isLocal(j) ? 10 : 0;
      const score = Math.min(100, Math.round(
        (roleWords.length ? (roleHits / roleWords.length) * 55 : 25) +
        (skillList.length ? (skillHits / Math.min(skillList.length, 8)) * 35 : 15) +
        localBoost,
      ));
      return {
        external_id: j.external_id,
        title: j.title,
        company: j.company,
        location: j.location,
        url: j.url,
        description: j.description,
        salary: j.salary,
        contact_email: (j.description.match(EMAIL_RE) || [])[0] ?? null,
        match_score: score,
        matched_skills: matchedSkills.slice(0, 8),
        nearby: isLocal(j),
        created: j.created,
        source: j.source,
        remote: j.remote,
      };
    })
      .filter((j) => j.match_score >= 20)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 40);

    if (scored.length === 0) {
      return json({ jobs: [], total: 0, message: "No close matches found. Try a broader role title or fewer filters." });
    }

    const sources = [...new Set(scored.map((j) => j.source))];
    return json({ jobs: scored, total: scored.length, sources });
  } catch (e) {
    console.error("job-search error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
