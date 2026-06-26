# Rakib Hasan Blog — Claude Project Context

## Project Summary

Personal developer portfolio and blog for **Rakib Hasan**, Backend Software Developer & System Architect, Dhaka, Bangladesh. Medium-style static site hosted on GitHub Pages.

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Astro 7 | Static site generation |
| Styling | Tailwind CSS v4 | Config in CSS, not tailwind.config.mjs |
| Typography | @tailwindcss/typography | prose classes for blog posts |
| Content | Astro Content Collections v5 | `src/content.config.ts` (not src/content/) |
| Comments | Giscus | GitHub Discussions |
| CMS | Decap CMS v3 | `/admin` route, GitHub OAuth via Cloudflare Worker |
| Deploy | GitHub Actions → GitHub Pages | `withastro/action@v4` |

## Key Commands

```bash
# Development
npm run dev        # http://localhost:4321

# Production
npm run build      # outputs to dist/
npm run preview    # serve dist/ locally at localhost:4321
```

## Directory Structure

```
src/
├── components/        Navbar, Footer, PostCard, TableOfContents, Giscus
├── content/
│   └── blog/          Markdown blog posts
├── layouts/
│   ├── BaseLayout.astro
│   └── BlogPostLayout.astro
├── pages/
│   ├── index.astro    Homepage feed
│   ├── about.astro    Resume/portfolio
│   └── blog/
│       ├── index.astro   Blog list
│       └── [slug].astro  Dynamic post route
├── styles/
│   └── global.css     Tailwind v4 config lives here
└── content.config.ts  Content collection schema (Astro 5 location)
public/
└── admin/
    ├── index.html     Decap CMS SPA entry
    └── config.yml     CMS collection config
```

## Critical Gotchas

1. **No tailwind.config.mjs** — Tailwind v4 config is in `src/styles/global.css` via `@theme`, `@plugin`, `@custom-variant`
2. **Content config location** — `src/content.config.ts` at the `src/` root, NOT inside `src/content/`
3. **Giscus `is:inline`** — required on the `<script>` tag or Astro strips `data-*` attributes
4. **Dark mode Giscus sync** — Navbar toggle must also postMessage to `.giscus-frame` iframe
5. **GitHub Pages source** — must be set to "GitHub Actions" (not "Deploy from a branch") in repo Settings → Pages
6. **Decap CMS OAuth** — uses a Cloudflare Worker as the GitHub OAuth proxy (see `.claude/specs/cms-setup.md`). Worker URL: `https://mute-king-c1c2.monad-wizard-r.workers.dev`. No Netlify involved.
7. **reading-time** — computed in `[slug].astro` from `post.body` (raw markdown string)
8. **Astro v7 integrations** — Tailwind added via Vite plugin (`@tailwindcss/vite`), not `@astrojs/tailwind`

## Owner Profile

- **Name:** Rakib Hasan
- **Role:** Backend Software Developer & System Architect
- **Location:** Dhaka, Bangladesh
- **Stack:** Django, FastAPI, Python, PostgreSQL, Redis, Elasticsearch, Nginx
- **Hardware:** Intel Arc A770, Ryzen 7 7700

## Deployed Values (already configured)

| Item | Value | File |
|---|---|---|
| GitHub repo | `MonadWizard/blog` | `astro.config.mjs`, `config.yml` |
| Cloudflare Worker (OAuth proxy) | `https://mute-king-c1c2.monad-wizard-r.workers.dev` | `public/admin/config.yml` |
| Giscus repo ID | `R_kgDOTGRvSQ` | `src/components/Giscus.astro` |
| Giscus category ID | `DIC_kwDOTGRvSc4C_9zG` | `src/components/Giscus.astro` |

## Still Needs Replacing

| Placeholder | File | Replace with |
|---|---|---|
| `your-profile` | Navbar.astro, Footer.astro, about.astro | LinkedIn profile slug |
| `your-handle` | Navbar.astro, Footer.astro | Twitter/X handle |
