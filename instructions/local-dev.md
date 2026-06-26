# Local Development Guide

---

## Prerequisites

### Node.js v22+

Astro 7 requires Node.js v22.12.0 or higher. Check your version:

```bash
node --version   # must be v22.12.0+
```

If Node.js is not installed or too old, install via nvm:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# Reload shell (or open a new terminal)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install and use Node.js 22
nvm install 22
nvm use 22
nvm alias default 22

# Verify
node --version   # v22.x.x
npm --version    # 10.x.x
```

---

## First-Time Setup

```bash
# Clone the repo
git clone https://github.com/your-username/your-repo.git
cd your-repo

# Install dependencies
npm install
```

---

## Development Server

```bash
npm run dev
```

Opens at **http://localhost:4321** with hot module replacement.

Changes to `.astro`, `.md`, `.ts`, and `.css` files trigger instant browser refresh.

| Route | URL |
|---|---|
| Homepage | http://localhost:4321/ |
| Blog list | http://localhost:4321/blog |
| Sample post | http://localhost:4321/blog/postgresql-dollar-quoting-python |
| About page | http://localhost:4321/about |
| CMS admin | http://localhost:4321/admin |

---

## Build & Preview

```bash
# Build production site to dist/
npm run build

# Serve the built site locally
npm run preview
# → http://localhost:4321
```

The preview server serves exactly what GitHub Pages will serve. Use this to catch any build-time issues before pushing.

---

## Adding a Blog Post

1. Create a file: `src/content/blog/YYYY-MM-DD-my-post.md`
2. Add the required frontmatter (see `.claude/skills/blog-post.md`)
3. Write content in Markdown below the `---` separator
4. The dev server picks up the new file automatically — visit the post URL to preview

---

## Dark Mode Testing

The dark mode toggle in the Navbar writes to `localStorage`. To test:

- Click the sun/moon icon in the Navbar to toggle
- To reset: open DevTools → Application → Local Storage → delete the `theme` key

To test the initial load (prevents flash):
- Set `localStorage.theme = 'dark'` in the console, then reload

---

## TypeScript & Type Checking

Astro runs TypeScript via `tsconfig.json`. Type errors in `.astro` and `.ts` files surface at build time:

```bash
# Check for type errors without building
npx astro check

# Or build (will also show errors)
npm run build 2>&1 | grep -E 'error|Error'
```

---

## Content Collection Validation

Schema violations in frontmatter show as build errors. Example: a post missing the required `description` field will fail with:

```
[ERROR] Invalid frontmatter in "src/content/blog/my-post.md"
```

Fix the frontmatter and rerun `npm run build`.

---

## Testing Decap CMS Locally

The CMS at `/admin` requires internet access and GitHub OAuth even in development.

For a fully local test (no GitHub auth required):

```bash
# Install local backend
npm install -D decap-server

# In public/admin/config.yml, temporarily set:
#   local_backend: true

# Run both servers in separate terminals:
# Terminal 1:
npx decap-server

# Terminal 2:
npm run dev

# Visit http://localhost:4321/admin
```

**Important:** Revert `local_backend` to `false` before committing.

---

## Environment & Tooling

| Tool | Version | Notes |
|---|---|---|
| Node.js | v22+ | Required by Astro 7 |
| npm | v10+ | Bundled with Node.js |
| Astro | v7 | `npm run astro -- --version` |
| Tailwind CSS | v4 | Config in `src/styles/global.css` |

---

## Troubleshooting

**Port 4321 already in use:**
```bash
npm run dev -- --port 3000
```

**Module not found errors after pulling:**
```bash
rm -rf node_modules
npm install
```

**Astro content types not refreshing:**
```bash
npx astro sync
```

**Tailwind classes not applying:**
- Remember: no `tailwind.config.mjs` — all config is in `src/styles/global.css`
- The `global.css` must be imported in `BaseLayout.astro` (it is, by default)
