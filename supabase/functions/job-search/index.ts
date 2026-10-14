import { corsHeaders, json, requirePro } from "../_shared/proAccess.ts";

const COUNTRIES = new Set(["za", "gb", "us", "au", "ca", "de", "fr", "in", "nl", "nz", "sg", "br", "pl", "it", "es", "at", "be", "ch", "mx"]);
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const gate = await requirePro(req);
    if (gate instanceof Response) return gate;

    const appId = Deno.env.get("ADZUNA_APP_ID");
    const appKey = Deno.env.get("ADZUNA_APP_KEY");
    if (!appId || !appKey) return json({ error: "Job search isn't configured yet (missing Adzuna keys)." }, 503);

    const { role, location, country = "za", skills = "", page = 1, remoteOnly = false } = await req.json();
    if (!role || typeof role !== "string") return json({ error: "A target role is required" }, 400);
    const cc = String(country).toLowerCase();
    if (!COUNTRIES.has(cc)) return json({ error: "Unsupported country" }, 400);

    const params = new URLSearchParams({
      app_id: appId, app_key: appKey, results_per_page: "20",
      what: remoteOnly ? `${role} remote` : role.slice(0, 120),
      "content-type": "application/json",
    });
    if (location) params.set("where", String(location).slice(0, 80));
    const resp = await fetch(`https://api.adzuna.com/v1/api/jobs/${cc}/search/${Number(page) || 1}?${params}`);
    if (!resp.ok) {
      const t = await resp.text();
      console.error("Adzuna", resp.status, t.slice(0, 300));
      return json({ error: "Job search provider failed", status: resp.status, details: t.slice(0, 300) }, resp.status);
    }
    const data = await resp.json();

    const skillList = String(skills).toLowerCase().split(/[,;\n]/).map((s) => s.trim()).filter((s) => s.length > 1).slice(0, 40);
    const roleWords = role.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);

    const jobs = (data.results || []).map((r: any) => {
      const text = `${r.title} ${r.description}`.toLowerCase();
      const skillHits = skillList.filter((s) => text.includes(s)).length;
      const roleHits = roleWords.filter((w: string) => r.title?.toLowerCase().includes(w)).length;
      const score = Math.min(100, Math.round(
        (roleWords.length ? (roleHits / roleWords.length) * 60 : 30) +
        (skillList.length ? (skillHits / Math.min(skillList.length, 8)) * 40 : 20),
      ));
      const salary = r.salary_min ? `${Math.round(r.salary_min).toLocaleString()}${r.salary_max && r.salary_max !== r.salary_min ? ` – ${Math.round(r.salary_max).toLocaleString()}` : ""}` : null;
      return {
        external_id: `adzuna-${r.id}`,
        title: r.title?.replace(/<[^>]+>/g, "") ?? "Untitled",
        company: r.company?.display_name ?? null,
        location: r.location?.display_name ?? null,
        url: r.redirect_url,
        description: r.description?.replace(/<[^>]+>/g, "") ?? "",
        salary,
        contact_email: (r.description?.match(EMAIL_RE) || [])[0] ?? null,
        match_score: score,
        created: r.created,
      };
    }).sort((a: any, b: any) => b.match_score - a.match_score);

    return json({ jobs, total: data.count ?? jobs.length });
  } catch (e) {
    console.error("job-search error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
