// Waitlist server for ron-gershinsky-site (Cloudflare Worker).
// Secrets (set with `wrangler secret put`): GITHUB_TOKEN (fine-grained, Contents: read/write on this repo only).
// Vars (wrangler.toml): REPO, BRANCH, ALLOWED_ORIGIN, NOTIFY_EMAIL.

const json = (body, status, cors) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...cors } });

const b64encode = (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str)));
const b64decode = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

async function gh(env, method, path, body) {
  return fetch(`https://api.github.com/repos/${env.REPO}/contents/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "ron-waitlist-worker",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function readFile(env, path) {
  const r = await gh(env, "GET", `${path}?ref=${env.BRANCH}`);
  if (r.status === 404) return { text: null, sha: undefined };
  if (!r.ok) throw new Error(`read ${path}: ${r.status}`);
  const d = await r.json();
  return { text: b64decode(d.content), sha: d.sha };
}

async function writeFile(env, path, text, sha, message) {
  const r = await gh(env, "PUT", path, { message, content: b64encode(text), sha, branch: env.BRANCH });
  return r;
}

const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;

async function appendSignup(env, entry) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const j = await readFile(env, "data/waitlist.json");
    const list = j.text ? JSON.parse(j.text) : [];
    if (list.some((e) => e.email === entry.email)) return "duplicate";
    list.push(entry);
    const r1 = await writeFile(env, "data/waitlist.json", JSON.stringify(list, null, 2) + "\n", j.sha, "Waitlist signup");
    if (r1.status === 409 || r1.status === 422) continue; // concurrent write, retry
    if (!r1.ok) throw new Error(`write json: ${r1.status}`);
    // CSV is regenerated from the JSON so the two never drift.
    const csv = "email,lang,created_at\n" + list.map((e) => [e.email, e.lang, e.created_at].map(csvCell).join(",")).join("\n") + "\n";
    for (let k = 0; k < 4; k++) {
      const c = await readFile(env, "data/waitlist.csv");
      const r2 = await writeFile(env, "data/waitlist.csv", csv, c.sha, "Waitlist signup (csv)");
      if (r2.ok) break;
      if (r2.status !== 409 && r2.status !== 422) throw new Error(`write csv: ${r2.status}`);
    }
    return "added";
  }
  throw new Error("too many conflicts");
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    const allowed = env.ALLOWED_ORIGIN.split(",").map((s) => s.trim());
    const cors = {
      "access-control-allow-origin": allowed.includes(origin) ? origin : allowed[0],
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      vary: "origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ ok: false, error: "method" }, 405, cors);
    if (!allowed.includes(origin)) return json({ ok: false, error: "origin" }, 403, cors);

    let data;
    try { data = await request.json(); } catch { return json({ ok: false, error: "body" }, 400, cors); }
    if (data.website) return json({ ok: true }, 200, cors); // honeypot: bots fill hidden field
    const email = String(data.email || "").trim().toLowerCase().slice(0, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: "email" }, 400, cors);
    const lang = data.lang === "en" ? "en" : "he";
    const entry = { email, lang, created_at: new Date().toISOString() };

    let status;
    try { status = await appendSignup(env, entry); }
    catch (e) { return json({ ok: false, error: "store" }, 502, cors); }

    if (status === "added" && env.NOTIFY_EMAIL) {
      // Forward to Ron's inbox through FormSubmit; a failure here does not lose the signup.
      try {
        await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(env.NOTIFY_EMAIL)}`, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json", referer: allowed[0] + "/" },
          body: JSON.stringify({ email, lang, _subject: "Waitlist signup", _template: "table" }),
        });
      } catch {}
    }
    return json({ ok: true, status }, 200, cors);
  },
};
