# Giscus Comments Setup Guide

Giscus embeds GitHub Discussions as a comment system on static sites. Each blog post maps to one Discussion thread by URL pathname.

## Prerequisites

- [ ] GitHub repo is **public**
- [ ] GitHub Discussions is enabled on the repo
- [ ] Giscus GitHub App installed on the repo

## Step-by-Step Setup

### 1. Enable GitHub Discussions

1. Go to your repo → **Settings** → **General**
2. Scroll to **Features** → check **Discussions**
3. Save

### 2. Create a Discussion Category for Comments

1. Go to your repo → **Discussions** tab
2. Click the ⚙️ gear icon next to "Categories" → **New category**
3. Name: `Comments` (or use the existing `Announcements` category)
4. Type: **Announcement** (only maintainers can create threads — Giscus creates them automatically)

### 3. Install the Giscus App

1. Visit: https://github.com/apps/giscus
2. Click **Install**
3. Select your blog repo

### 4. Get Your IDs from giscus.app

1. Visit: https://giscus.app/
2. Under **Repository**, enter: `your-username/your-repo`
3. Under **Page ↔ Discussions Mapping**, select: `pathname`
4. Under **Discussion Category**, select the category you created
5. The page generates a `<script>` tag — copy:
   - `data-repo-id` (format: `R_kgDOxxxxxxxxxx`)
   - `data-category-id` (format: `DIC_kwDOxxxxxxxxxxxx`)

### 5. Update the Giscus Component

Edit `src/components/Giscus.astro`:

```typescript
const GISCUS_REPO = 'your-username/your-repo';         // your actual repo
const GISCUS_REPO_ID = 'R_kgDOxxxxxxxxxx';              // from giscus.app
const GISCUS_CATEGORY = 'Comments';                      // your category name
const GISCUS_CATEGORY_ID = 'DIC_kwDOxxxxxxxxxxxx';       // from giscus.app
```

### 6. Deploy

Push to main → GitHub Actions rebuilds → Giscus is live on all blog posts.

## Dark Mode Sync

The Giscus component uses `data-theme="preferred_color_scheme"` by default, which follows the OS preference.

For manual dark mode sync with the site toggle, the `Navbar.astro` already includes this code in the theme toggle script:

```typescript
const giscusFrame = document.querySelector<HTMLIFrameElement>('.giscus-frame');
if (giscusFrame) {
  giscusFrame.contentWindow?.postMessage(
    { giscus: { setConfig: { theme: isDark ? 'dark' : 'light' } } },
    'https://giscus.app'
  );
}
```

This sends a message to the Giscus iframe whenever the toggle is clicked, keeping the comment widget in sync with the site theme.

## Technical Note: `is:inline` Requirement

The Giscus `<script>` tag in `src/components/Giscus.astro` uses `is:inline`. This is required because Astro normally processes and optimizes `<script>` tags, which strips unknown `data-*` attributes. The `is:inline` directive tells Astro to pass the tag verbatim to the HTML output, preserving all `data-*` configuration attributes.
