# Deployment Guide

This guide covers deploying the blog to GitHub Pages for the first time, and explains subsequent automatic deployments.

## Prerequisites

- Git installed and configured (`git config --global user.name` and `user.email`)
- A GitHub account
- Node.js v22+ installed (see `instructions/local-dev.md` if not set up)

---

## Step 1 — Create the GitHub Repository

### Option A: User/Organization site (recommended)

Create a repo named exactly `your-username.github.io` (replace with your actual GitHub username).

- Site URL will be: `https://your-username.github.io`
- Keep `base: '/'` in `astro.config.mjs`

### Option B: Project site

Create a repo with any name (e.g. `blog`).

- Site URL will be: `https://your-username.github.io/blog`
- Update `astro.config.mjs`:
  ```js
  site: 'https://your-username.github.io',
  base: '/blog',
  ```

---

## Step 2 — Update Placeholder Values

Before pushing, replace these placeholders across the project:

| File | Placeholder | Replace with |
|---|---|---|
| `astro.config.mjs` | `https://your-username.github.io` | Your GitHub Pages URL |
| `public/admin/config.yml` | `your-username/your-repo` | `githubusername/reponame` |
| `src/components/Navbar.astro` | `your-username`, `your-profile`, `your-handle` | Real links |
| `src/components/Footer.astro` | Same placeholders | Real links |
| `src/pages/index.astro` | `your-username` | GitHub username |
| `src/pages/about.astro` | `your-username`, `your-profile` | Real links |

---

## Step 3 — Push to GitHub

```bash
# From the project root
git remote add origin https://github.com/your-username/your-repo.git
git branch -M main
git add .
git commit -m "Initial commit: Rakib Hasan blog"
git push -u origin main
```

---

## Step 4 — Enable GitHub Pages

1. Go to your repo on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Build and deployment** → **Source**: select **GitHub Actions**
4. Click **Save**

> This is a one-time manual step. GitHub Pages will not deploy until this is set.

---

## Step 5 — Watch the First Deploy

1. Go to your repo → **Actions** tab
2. You'll see a workflow run called "Deploy to GitHub Pages"
3. Wait ~1-2 minutes for it to complete (green checkmark)
4. Visit your site URL — it's live!

---

## Step 6 — Post-Deploy Setup

### Giscus comments
Follow `.claude/specs/giscus-setup.md` to enable GitHub Discussions comments.

### Decap CMS admin panel
Follow `.claude/specs/cms-setup.md` to configure Netlify Identity OAuth for the `/admin` panel.

### Resume PDF
Add your resume as `public/resume.pdf` — the "Download Resume" button on the About page points to it.

### Social links
The Navbar, Footer, and About page have placeholder links. Update them with your real profiles.

---

## Subsequent Deployments

Every `git push` to the `main` branch automatically triggers a new deploy via GitHub Actions.

The workflow is defined in `.github/workflows/deploy.yml`.

**To deploy without a code push:**
1. Go to repo → **Actions** → **Deploy to GitHub Pages**
2. Click **Run workflow** → **Run workflow**

---

## Custom Domain (Optional)

To use a custom domain (e.g. `rakib.dev`):

1. Add a `CNAME` file in `public/` containing your domain:
   ```
   rakib.dev
   ```
2. Update `astro.config.mjs`:
   ```js
   site: 'https://rakib.dev',
   base: '/',
   ```
3. In your domain registrar, add a CNAME record:
   - Name: `@` or `www`
   - Value: `your-username.github.io`
4. In GitHub repo → **Settings** → **Pages** → **Custom domain**: enter your domain
5. Check **Enforce HTTPS**
