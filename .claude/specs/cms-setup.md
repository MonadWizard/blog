# Decap CMS Setup Guide

Decap CMS lets you write and publish blog posts from a browser UI at `/admin`. It saves posts as Markdown files committed directly to your GitHub repo, which triggers a new deploy.

## Prerequisites

- [ ] GitHub repo is **public**
- [ ] A free Netlify account (for OAuth proxy only — you don't deploy to Netlify)

## Why Netlify?

GitHub Pages is a static host with no server. GitHub's OAuth flow requires a server to exchange the authorization code for an access token. Netlify Identity provides this server for free. The CMS still lives on your GitHub Pages site — Netlify only handles the login dance.

## Step-by-Step Setup

### 1. Create a Netlify site pointed at your GitHub repo

1. Log in to [app.netlify.com](https://app.netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Connect your GitHub account and select your blog repo
4. Configure build: **Build command** = `npm run build`, **Publish directory** = `dist`
5. Click **Deploy site** (the deploy may fail — that's OK, you only need the Identity service)

### 2. Enable Netlify Identity

1. In your Netlify site dashboard, go to **Site configuration** → **Identity**
2. Click **Enable Identity**
3. Under **Registration preferences**, select **Invite only**
4. Under **External providers**, click **Add provider** → **GitHub** → **Enable**
5. Scroll to **Services** → **Git Gateway** → click **Enable Git Gateway**

### 3. Invite yourself as a user

1. In **Identity** → **Users**, click **Invite users**
2. Enter your email address
3. Accept the invite from your email

### 4. Update config.yml

The `public/admin/config.yml` already has the correct Netlify OAuth settings:
```yaml
backend:
  name: github
  repo: your-username/your-repo      # ← REPLACE THIS
  branch: main
  base_url: https://api.netlify.com
  auth_endpoint: auth
```

Replace `your-username/your-repo` with your actual GitHub `username/repo-name`.

### 5. Access the CMS

Visit `https://your-username.github.io/admin` after deploying.

1. Click **Login with GitHub**
2. Authorize the Netlify Identity app
3. You're in — create and publish posts from the UI

## What Happens When You Publish a Post

1. Decap CMS commits a new `.md` file to `src/content/blog/` in your GitHub repo
2. The push triggers the GitHub Actions workflow (`deploy.yml`)
3. Astro rebuilds and deploys to GitHub Pages (~1-2 minutes)
4. The new post appears live on your site

## Local CMS Testing (Optional)

For local editing without GitHub auth:

```bash
# Install the local backend proxy
npm install -D decap-server

# Temporarily set local_backend: true in public/admin/config.yml
# Then start both servers:
npx decap-server        # in terminal 1
npm run dev             # in terminal 2

# Visit http://localhost:4321/admin
# IMPORTANT: revert local_backend to false before deploying
```
