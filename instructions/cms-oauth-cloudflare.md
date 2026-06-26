# CMS + Comments Full Setup — Personal Note
# Cloudflare Workers OAuth for Decap CMS + Giscus Comments

This is the complete, ordered checklist to set up the CMS admin panel and
comments system from scratch. Follow every numbered step exactly in order.

---

## What This Sets Up

| Feature | Technology | URL after setup |
|---|---|---|
| CMS admin panel | Decap CMS v3 | `https://monadwizard.github.io/blog/admin/` |
| CMS login (OAuth) | Cloudflare Worker | `https://mute-king-c1c2.monad-wizard-r.workers.dev` |
| Blog comments | Giscus (GitHub Discussions) | Loads on every blog post |

---

## PART A — Cloudflare Workers OAuth (Decap CMS Login)

### Why You Need This

GitHub Pages is a static host. When you click "Login with GitHub" in the CMS,
GitHub sends back an authorization code but needs a **server** to exchange it
for an access token. The Cloudflare Worker is that server. Without it the login
silently fails or redirects nowhere.

---

### Step A1 — Create a GitHub OAuth App

1. Open: `https://github.com/settings/developers`
2. Click **OAuth Apps** in the left sidebar
3. Click **New OAuth App**
4. Fill in the form:
   - **Application name:** `Rakib Blog CMS`
   - **Homepage URL:** `https://monadwizard.github.io/blog`
   - **Authorization callback URL:**
     `https://mute-king-c1c2.monad-wizard-r.workers.dev/callback`
     *(This must match the Worker URL exactly — including `/callback` at the end)*
5. Click **Register application**
6. On the app page that opens:
   - Copy the **Client ID** (visible immediately)
   - Click **Generate a new client secret**
   - Copy the **Client Secret** immediately (shown only once)

Save both values somewhere safe — you need them in Step A3.

---

### Step A2 — Install Wrangler (Cloudflare CLI)

```bash
npm install -g wrangler
```

Verify it works:

```bash
wrangler --version
```

Log in to your Cloudflare account:

```bash
wrangler login
# Opens browser → log in to Cloudflare → click Allow
```

---

### Step A3 — Deploy the Cloudflare Worker

The Worker handles two routes:
- `GET /auth` → starts the GitHub OAuth flow (redirects to GitHub)
- `GET /callback` → finishes the flow (exchanges code for token, posts token back to CMS)

#### Option A — Use an existing Worker template (recommended)

Clone and deploy a ready-made GitHub OAuth Worker for Cloudflare:

```bash
# Clone the Cloudflare Workers OAuth provider
git clone https://github.com/Herber/decap-cms-github-oauth-provider-cloudflare
cd decap-cms-github-oauth-provider-cloudflare

npm install
```

Edit `wrangler.toml` — make sure the name matches your desired worker URL slug:

```toml
name = "mute-king-c1c2"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ORIGINS = "https://monadwizard.github.io"
```

#### Option B — Write the Worker from scratch (minimal)

Create a new directory for the worker, add a `wrangler.toml`:

```toml
name = "mute-king-c1c2"
main = "worker.js"
compatibility_date = "2024-01-01"

[vars]
ORIGINS = "https://monadwizard.github.io"
```

The worker script (`worker.js`) must handle `/auth` and `/callback`. See the
Decap CMS docs for the expected response format, or use Option A above which is
pre-built and tested.

---

#### Set secrets (never put these in wrangler.toml or commit them)

```bash
wrangler secret put GITHUB_CLIENT_ID
# Paste the Client ID from Step A1 → press Enter

wrangler secret put GITHUB_CLIENT_SECRET
# Paste the Client Secret from Step A1 → press Enter
```

#### Deploy

```bash
wrangler deploy
```

Expected output:

```
✅ Successfully published your Worker
  https://mute-king-c1c2.monad-wizard-r.workers.dev
```

---

### Step A4 — Verify config.yml Is Correct

Open `public/admin/config.yml`. The **production backend block** must be active
(not commented out) and the **proxy block** must be commented out:

```yaml
# ── Local dev backend (inactive) ──────────────────────────────────────────────
# backend:
#   name: proxy
#   proxy_url: http://localhost:8081/api/v1
#   branch: main

# ── Production backend (active) ───────────────────────────────────────────────
backend:
  name: github
  repo: MonadWizard/blog
  branch: main
  base_url: https://mute-king-c1c2.monad-wizard-r.workers.dev
  auth_endpoint: auth
```

- `base_url` = Cloudflare Worker URL (no trailing slash, no `/auth`)
- `auth_endpoint` = `auth` (just the path, not the full URL)
- `repo` = `MonadWizard/blog` (GitHub username/repo-name)

---

### Step A5 — Test CMS Login

1. Push any commit so a deploy runs (or wait for the live site to be current)
2. Open: `https://monadwizard.github.io/blog/admin/`
3. Click **Login with GitHub**
4. GitHub asks to authorize **Rakib Blog CMS** → click **Authorize**
5. Browser redirects back to the CMS — you should see your blog posts listed

If it fails, check the troubleshooting section at the bottom of this file.

---

## PART B — Giscus Comments Setup

### Why You Need This

Giscus turns GitHub Discussions into a comment section that appears at the
bottom of every blog post. Readers can react and comment with their GitHub
account.

---

### Step B1 — Enable GitHub Discussions on the Repo

1. Open: `https://github.com/MonadWizard/blog/settings`
2. Scroll to the **Features** section
3. Check the **Discussions** checkbox
4. Click **Save changes** (if a button appears)

---

### Step B2 — Install the Giscus GitHub App

1. Open: `https://github.com/apps/giscus`
2. Click **Install**
3. Select **Only select repositories**
4. Choose `MonadWizard/blog`
5. Click **Install**

---

### Step B3 — Get Your Repo ID and Category ID

1. Open: `https://giscus.app/`
2. In the **Repository** field type: `MonadWizard/blog`
   - If the app is installed correctly you see a green checkmark
3. Under **Discussion Category** select: **Announcements**
4. Under **Page ↔ Discussions Mapping** select: **pathname**
5. Scroll to the generated `<script>` block — copy:
   - `data-repo-id="..."` value
   - `data-category-id="..."` value

Current values (already configured):

| Field | Value |
|---|---|
| `data-repo-id` | `R_kgDOTGRvSQ` |
| `data-category-id` | `DIC_kwDOTGRvSc4C_9zG` |

---

### Step B4 — Update Giscus.astro

Open `src/components/Giscus.astro` and set the constants at the top:

```js
const GISCUS_REPO = 'MonadWizard/blog';
const GISCUS_REPO_ID = 'R_kgDOTGRvSQ';
const GISCUS_CATEGORY = 'Announcements';
const GISCUS_CATEGORY_ID = 'DIC_kwDOTGRvSc4C_9zG';
```

These are **already set correctly** in the current codebase. Only redo this
step if you change repos or reset the Giscus app.

---

### Step B5 — Test Comments

1. Visit any blog post on the live site (after a deploy)
2. Scroll to the bottom — you should see the Giscus comment box
3. If it says "giscus is not installed on this repository" → redo Step B2
4. Sign in with GitHub and leave a test comment

---

## PART C — GitHub Pages Settings (One-Time)

### Step C1 — Set Pages Source to GitHub Actions

1. Open: `https://github.com/MonadWizard/blog/settings/pages`
2. Under **Build and deployment → Source**
3. Change from "Deploy from a branch" to **GitHub Actions**
4. No branch or folder to select — just click Save

> Without this, GitHub Pages won't deploy even when the workflow runs
> successfully.

---

## Quick Reference — All Configured Values

| Item | Value |
|---|---|
| Blog live URL | `https://monadwizard.github.io/blog` |
| CMS admin URL | `https://monadwizard.github.io/blog/admin/` |
| GitHub repo | `MonadWizard/blog` |
| Cloudflare Worker URL | `https://mute-king-c1c2.monad-wizard-r.workers.dev` |
| Worker name | `mute-king-c1c2` |
| Cloudflare account subdomain | `monad-wizard-r` |
| GitHub OAuth App name | `Rakib Blog CMS` |
| OAuth callback URL | `https://mute-king-c1c2.monad-wizard-r.workers.dev/callback` |
| Giscus repo ID | `R_kgDOTGRvSQ` |
| Giscus category | `Announcements` |
| Giscus category ID | `DIC_kwDOTGRvSc4C_9zG` |

---

## Local Dev — CMS Without GitHub Auth

```bash
# Terminal 1
npx decap-server

# Terminal 2
npm run dev
```

In `public/admin/config.yml`, temporarily swap to:

```yaml
backend:
  name: proxy
  proxy_url: http://localhost:8081/api/v1
  branch: main
```

Visit `http://localhost:4321/admin/` — no login needed.

**Before committing:** switch back to the `github` backend block.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "giscus is not installed" | Giscus app not installed | Redo Step B2 |
| CMS login redirects nowhere | Callback URL mismatch | OAuth App callback URL must be `<worker-url>/callback` |
| CMS login shows "error" | Worker not deployed or secrets missing | Redo Steps A3–A4 |
| Worker returns 403 | `ORIGINS` doesn't include your site URL | Add `https://monadwizard.github.io` to `ORIGINS` in `wrangler.toml`, redeploy |
| Wrangler secrets lost | Worker redeployed from scratch | Re-run `wrangler secret put` commands in Step A3 |
| CMS loads but posts are empty | Wrong `repo` in `config.yml` | Must be `MonadWizard/blog` |
| `npm run build` fails | Content frontmatter mismatch | Check `src/content.config.ts` field names match `config.yml` fields |
| GitHub Pages shows old content | Pages source not set to GitHub Actions | Redo Step C1 |
