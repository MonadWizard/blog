# Decap CMS + Cloudflare Workers OAuth — Full Setup Guide

Decap CMS lets you write and publish blog posts from a browser UI at `/admin`.
It saves posts as Markdown files committed directly to your GitHub repo, which
triggers a new GitHub Actions deploy.

GitHub Pages is a **static** host — it cannot run the server-side OAuth code
exchange that GitHub requires. A Cloudflare Worker acts as the middleman: it
receives the GitHub authorization code and swaps it for an access token, then
hands control back to the CMS. Zero cost, no Netlify needed.

---

## What Is Already Done (current state)

| Thing | Value |
|---|---|
| GitHub repo | `MonadWizard/blog` |
| Cloudflare Worker URL | `https://mute-king-c1c2.monad-wizard-r.workers.dev` |
| Worker name | `mute-king-c1c2` |
| `config.yml` `base_url` | already set to the Worker URL above |
| `config.yml` `auth_endpoint` | `auth` |
| CMS admin URL (live) | `https://monadwizard.github.io/blog/admin/` |

If you are **rebuilding from scratch** (new repo, new machine, or the worker
was deleted), follow every step below in order.

---

## Prerequisites

- [ ] GitHub account (MonadWizard)
- [ ] Cloudflare account — free tier is enough
- [ ] Node.js ≥ 18 installed locally
- [ ] `npm install -g wrangler` (Cloudflare CLI)

---

## Step 1 — Create a GitHub OAuth App

This app is what GitHub uses to authorize the CMS to commit to your repo on
your behalf.

1. Go to **GitHub → Settings → Developer settings → OAuth Apps**
   Direct URL: `https://github.com/settings/developers`
2. Click **New OAuth App**
3. Fill in:
   - **Application name:** `Rakib Blog CMS` (anything readable)
   - **Homepage URL:** `https://monadwizard.github.io/blog`
   - **Authorization callback URL:**
     `https://mute-king-c1c2.monad-wizard-r.workers.dev/callback`
     *(use your actual Worker URL — this must match exactly)*
4. Click **Register application**
5. On the next page, copy:
   - **Client ID** — visible immediately
   - **Client Secret** — click **Generate a new client secret**, copy it now
     (you cannot see it again)

Keep both values handy for Step 3.

---

## Step 2 — Deploy the Cloudflare Worker

The Worker is a small script that handles two routes:
- `GET /auth` → redirects the browser to GitHub's OAuth page
- `GET /callback` → exchanges the authorization code for an access token,
  then posts the token back to the CMS window

### 2a. Clone the OAuth Worker template

```bash
git clone https://github.com/bericp1/netlify-cms-github-oauth-provider \
    cf-oauth-worker
cd cf-oauth-worker
```

> **Alternative (simpler, single-file):** Use the community Cloudflare Workers
> port. Any worker that implements `/auth` and `/callback` compatible with
> Decap CMS works. The one at the repo above is Node-based but can be adapted.
> A pure Cloudflare Workers version:
> `https://github.com/Herber/decap-cms-github-oauth-provider-cloudflare`
> — clone that instead if you prefer zero Node dependencies.

### 2b. Authenticate wrangler with your Cloudflare account

```bash
wrangler login
# Opens a browser — log in to Cloudflare and authorize wrangler
```

### 2c. Create the worker project (if starting fresh)

```bash
# If you cloned a template that already has wrangler.toml, skip this.
wrangler init cf-oauth-worker --no-package-manager
```

Your `wrangler.toml` should look like this (adjust the name if you want a
different worker URL slug):

```toml
name = "mute-king-c1c2"          # becomes <name>.<account>.workers.dev
main = "src/index.js"            # or index.ts if TypeScript
compatibility_date = "2024-01-01"

[vars]
ORIGINS = "https://monadwizard.github.io"
```

### 2d. Set secrets (never commit these to git)

```bash
wrangler secret put GITHUB_CLIENT_ID
# Paste your Client ID from Step 1, press Enter

wrangler secret put GITHUB_CLIENT_SECRET
# Paste your Client Secret from Step 1, press Enter
```

### 2e. Deploy

```bash
wrangler deploy
```

Output will confirm the Worker URL, e.g.:
```
Published mute-king-c1c2 (0.00 sec)
  https://mute-king-c1c2.monad-wizard-r.workers.dev
```

---

## Step 3 — Configure Decap CMS (`public/admin/config.yml`)

The file is already correctly configured. For reference, the production backend
block must look like this:

```yaml
backend:
  name: github
  repo: MonadWizard/blog        # GitHub username/repo-name
  branch: main
  base_url: https://mute-king-c1c2.monad-wizard-r.workers.dev
  auth_endpoint: auth
```

- `base_url` = your Cloudflare Worker URL (no trailing slash)
- `auth_endpoint` = the path on the worker that starts the OAuth flow (`auth`)

**Never** set `base_url` to the GitHub Pages URL or the Astro dev server.

---

## Step 4 — Enable GitHub Discussions (for Giscus comments)

This is separate from the CMS but done at the same time during repo setup.

1. Go to `https://github.com/MonadWizard/blog/settings`
2. Scroll to **Features** → check **Discussions**
3. Go to `https://github.com/apps/giscus` → **Install** → select
   `MonadWizard/blog`
4. Visit `https://giscus.app/` → enter `MonadWizard/blog` → choose category
   **Announcements** → copy `data-repo-id` and `data-category-id`
5. Paste into `src/components/Giscus.astro` (already done — IDs are live)

---

## Step 5 — Verify GitHub Pages Source

1. Go to `https://github.com/MonadWizard/blog/settings/pages`
2. Under **Source**, make sure it says **GitHub Actions** (not "Deploy from a
   branch"). If it says a branch, switch it to GitHub Actions.

---

## Step 6 — Test the CMS Login

1. Push any change to trigger a deploy, or wait for the existing live deploy
2. Visit `https://monadwizard.github.io/blog/admin/`
3. Click **Login with GitHub**
4. GitHub asks to authorize the OAuth App → click **Authorize**
5. The Worker exchanges the code, CMS loads with your blog posts listed

---

## How Publishing Works

```
You click "Publish" in the CMS
        ↓
Decap CMS commits a .md file to src/content/blog/ via GitHub API
        ↓
GitHub receives the push → triggers .github/workflows/deploy.yml
        ↓
GitHub Actions runs: npm run build → uploads dist/ to GitHub Pages
        ↓
New post is live in ~1-2 minutes
```

---

## Local Development (no GitHub auth needed)

```bash
# Terminal 1 — start the local CMS proxy
npx decap-server

# Terminal 2 — start Astro
npm run dev
```

In `public/admin/config.yml`, temporarily swap the backend block to:

```yaml
backend:
  name: proxy
  proxy_url: http://localhost:8081/api/v1
  branch: main
```

Visit `http://localhost:4321/admin/` — no OAuth needed locally.

**IMPORTANT:** Switch the backend block back to the github backend before
deploying. Never commit the proxy backend to production.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "giscus is not installed on this repository" | Giscus app not installed | Follow Step 4 |
| CMS shows blank page or JS error | Wrong CDN version in `index.html` | Check the `decap-cms@X.Y.Z` version |
| Login redirects back but CMS says "error" | Callback URL mismatch | Ensure the OAuth App callback URL exactly matches the Worker URL + `/callback` |
| Worker returns 403 | `ORIGINS` env var doesn't include your site | Add your Pages URL to `ORIGINS` in `wrangler.toml` and redeploy |
| "Could not find entry" in CMS | `content.config.ts` schema mismatch | Check field names match between schema and `config.yml` fields |
| Worker secrets lost | Wrangler secrets are per-account | Re-run `wrangler secret put` commands from Step 2d |
