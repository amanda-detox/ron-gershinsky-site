# Waitlist server

A Cloudflare Worker (free plan) that receives signups from the landing page form.

For each new email it:
1. appends it to `data/waitlist.json` and regenerates `data/waitlist.csv` in this repo (via the GitHub API);
2. forwards it to detoxify.ai@proton.me through FormSubmit.

The GitHub token lives only in the Worker as a secret. Nothing secret is in the public page.

## Deploy (one time)
1. Create a free Cloudflare account.
2. On GitHub (amanda-detox), create a fine-grained token: repository access = only `ron-gershinsky-site`, permission Contents = Read and write.
3. In this folder:
   ```
   npx wrangler login
   npx wrangler secret put GITHUB_TOKEN   # paste the token
   npx wrangler deploy
   ```
4. Copy the URL Wrangler prints (e.g. https://ron-waitlist.<subdomain>.workers.dev) into `WAITLIST_URL` in `index.html`, then commit.

Until `WAITLIST_URL` is set, the form keeps sending to FormSubmit only.
