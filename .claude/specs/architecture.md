# Architecture Spec

## Site Type

Fully static site (SSG). Every page is pre-rendered to HTML at build time. No server-side rendering.

## Request Flow

```
User browser
  → GitHub Pages CDN (free static hosting)
  → Static HTML/CSS/JS file from dist/
```

No server processes, no databases, no API at runtime.

## Content Pipeline

```
src/content/blog/*.md
  ↓ (Astro glob loader — src/content.config.ts)
getCollection('blog') in pages
  ↓ (render(post))
{ Content, headings } component + array
  ↓
BlogPostLayout.astro
  ├── Navbar
  ├── Two-column grid: [article prose] + [sticky TOC sidebar]
  ├── Giscus (GitHub Discussions comments)
  └── Footer
```

## Build Output Structure

```
dist/
├── index.html                    ← Homepage feed
├── about/index.html              ← About/resume page
├── blog/index.html               ← All posts list
├── blog/[slug]/index.html        ← One file per post
├── admin/                        ← Decap CMS SPA (copied from public/)
│   ├── index.html
│   └── config.yml
├── images/uploads/               ← CMS-uploaded media
├── sitemap-index.xml
├── sitemap-0.xml
└── _astro/                       ← Hashed CSS, JS, font files
```

## Dark Mode Implementation

1. `BaseLayout.astro` `<head>` contains an `is:inline` script
2. Script reads `localStorage.theme` before first paint → adds `class="dark"` to `<html>`
3. Prevents flash of unstyled content (FOUC) on page load
4. `Navbar.astro` toggle button: clicks toggle `html.dark` and write `localStorage.theme`
5. Tailwind `@custom-variant dark (&:where(.dark, .dark *))` in `global.css` enables `dark:` utilities
6. Giscus iframe synced via `postMessage` from the same toggle click handler

## Font Strategy

Inter and JetBrains Mono loaded from Google Fonts via `<link>` in `BaseLayout`.
- `font-display: swap` (default Google Fonts behavior) prevents invisible text during load
- Fonts are cached by the browser after first visit
- Alternative for full self-hosting: use `astro-font` or download and serve from `public/fonts/`

## Reading Time

Calculated at build time in `src/pages/blog/[slug].astro`:
```typescript
import readingTime from 'reading-time';
const rt = readingTime(post.body ?? '');
// rt.text → "8 min read"
```
`post.body` is the raw markdown string (available on glob-loaded entries in Astro 5).

## CMS Architecture

```
GitHub repo (main branch)
  ↓ push
GitHub Actions (deploy.yml)
  ↓ npm run build
dist/ artifact uploaded to GitHub Pages

Decap CMS (browser SPA at /admin)
  ↓ GitHub OAuth via Netlify Identity proxy
Commits new .md files to src/content/blog/
  ↓ triggers push → GitHub Actions → new deploy
```

## Comment System

Giscus maps comments to GitHub Discussions by `pathname`. Each blog post URL maps to one Discussion thread. Users authenticate with GitHub to comment.

No server required — the Giscus script loads comments directly from GitHub's API in the browser.
