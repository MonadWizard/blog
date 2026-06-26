# Skill: Create a New Blog Post

## File Location

`src/content/blog/YYYY-MM-DD-post-slug.md`

Use date-prefixed filenames to keep posts sorted in the filesystem. The full filename (without `.md`) becomes the URL slug, e.g. `2025-06-01-my-post.md` → `/blog/2025-06-01-my-post`.

## Frontmatter Template

```yaml
---
title: "Post Title Here"
description: "One to two sentence summary. Used in post cards and meta tags. Aim for 120-160 characters."
pubDate: 2025-06-01
tags: ["Tag1", "Tag2", "Tag3"]
draft: false
heroImage: "/images/uploads/filename.jpg"  # optional
---
```

## Schema Reference (from src/content.config.ts)

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Post headline |
| `description` | string | yes | Excerpt for cards & SEO |
| `pubDate` | date | yes | YYYY-MM-DD or ISO format |
| `updatedDate` | date | no | Show "Updated" in post header |
| `tags` | string[] | no | Defaults to `[]` |
| `draft` | boolean | no | Defaults to `false`; `true` hides from public |
| `heroImage` | string | no | Path from `/public/` root |

## Writing Guide

- Use `## ` (h2) for main sections — these appear in the Table of Contents
- Use `### ` (h3) for subsections — also appear in TOC
- Code blocks: use triple backticks with language identifier (`python`, `sql`, `bash`, `nginx`, etc.)
- Set `draft: true` while writing, flip to `false` to publish

## Code Block Examples

**Python:**
````markdown
```python
def my_function():
    return "Hello"
```
````

**PostgreSQL with dollar quoting:**
````markdown
```sql
CREATE OR REPLACE FUNCTION my_func() RETURNS TEXT AS $$
BEGIN
    RETURN 'hello';
END;
$$ LANGUAGE plpgsql;
```
````

## Preview Locally

```bash
npm run dev
# Visit http://localhost:4321/blog/YYYY-MM-DD-post-slug
```
