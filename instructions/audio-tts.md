# Post & Journey audio — Bangla TTS with sentence highlighting

Every published **blog post** (and, opt-in, every **journey**) can be played as
audio in a natural Bangla voice, like an audiobook — with the **currently-spoken
sentence highlighted** in the article as it plays (karaoke-style), and auto-scroll.

Audio is **pre-generated at build time** (not synthesized live in the browser), so
there is no API key in the frontend and playback is instant on every device.

## How it works

1. `scripts/generate-audio.mjs` reads each post/journey, strips markdown & code,
   and splits the text into **sentence-level segments**.
2. Each segment is synthesized separately with **Google Cloud TTS**
   (`bn-IN-Chirp3-HD-Aoede`), its real duration is measured, and the segments are
   concatenated into one `public/audio/<hash>.mp3`.
3. A timing sidecar `public/audio/<hash>.json` records each sentence's start time
   so the player can highlight it in sync. (Chirp3-HD has no SSML timepoints, so
   timing is derived from per-segment durations — that's why we synthesize per
   sentence.)
4. At build time the page looks the item up in `public/audio/manifest.json` and,
   if audio exists, renders `src/components/AudioPlayer.astro`.
5. The player highlights the active sentence using the **CSS Custom Highlight
   API** (graceful no-op on older browsers; audio always plays regardless).
6. Re-running only regenerates items whose text changed — you are never charged
   twice for the same content.

## ⚠️ Size cap & journeys (read this)

Journeys are **huge** (200K–600K characters = multi-hour audio, real cost). To
prevent accidental spend, items over **`TTS_MAX_CHARS` (default 100,000 chars)**
are **skipped** unless explicitly opted in.

- **All blog posts** are under the cap → audio is generated automatically.
- **Journeys** are skipped by default. To enable one, add `"audio": true` to its
  JSON frontmatter, or raise the cap: `TTS_MAX_CHARS=700000 npm run audio`.
- To **disable** audio for a specific item, set `audio: false`.

> A 600K-char journey is ~10 hours of audio and exceeds the 1M/month free tier on
> its own. Enable journey audio deliberately.

## One-time setup

### 1. Create a Google Cloud API key

1. <https://console.cloud.google.com/> → create/select a project.
2. Enable the **Cloud Text-to-Speech API**.
3. Enable **billing** (required even for the free tier; a blog stays within the
   free monthly characters, so it is typically $0). Set a $1 budget alert for
   peace of mind.
4. APIs & Services → Credentials → **Create credentials → API key**.
5. (Recommended) Restrict the key to the "Cloud Text-to-Speech API".

### 2. Add it to GitHub

Repo → Settings → Secrets and variables → Actions → **New repository secret**:
`GOOGLE_TTS_API_KEY` = your key.

The deploy workflow (`.github/workflows/deploy.yml`) already restores the audio
cache, runs `npm run audio`, then builds — so audio regenerates for new/changed
posts on every deploy.

## Local usage

```bash
# Preview text + cost WITHOUT a key or any charge:
npm run audio -- --dry          # per-item segment counts + estimated cost
npm run audio -- --dry --show   # also show a text preview

# Generate for real (needs the key):
export GOOGLE_TTS_API_KEY=your_key_here
npm run audio
npm run dev                     # player + highlighting appear on each post
```

Without the key, `npm run audio` and `npm run build` still succeed — generation
is skipped and the player simply doesn't render.

## Configuration (env vars)

| Variable          | Default                 | Notes |
|-------------------|-------------------------|-------|
| `TTS_VOICE`       | `bn-IN-Chirp3-HD-Aoede` | Any `bn-IN` voice. HD options: Kore, Charon, Puck, Leda, Orus, … Fallback that always works with API keys: `bn-IN-Wavenet-A`. |
| `TTS_RATE`        | `1.0`                   | Speaking rate 0.25–4.0. |
| `TTS_SEGMENT`     | `sentence`              | `sentence` = fine highlighting (more requests). `paragraph` = fewer requests, coarser highlighting. |
| `TTS_MAX_CHARS`   | `100000`                | Skip items larger than this unless `audio: true`. |
| `TTS_CONCURRENCY` | `6`                     | Parallel TTS requests. |

## Notes

- **Accent**: top-quality neural Bangla is Indian Bengali (`bn-IN`) — clear, but
  slightly Kolkata-style, not Dhaka.
- **Highlighting coverage**: ~95%+ of sentences in prose-heavy posts; lower in
  table/diagram-heavy posts (table rows don't map to spoken sentences). Any
  unmatched sentence simply isn't highlighted — audio plays through normally.
- **Audio files are gitignored** (`public/audio/`). They're built in CI and
  persisted via the Actions cache. If you'd rather commit them (bulletproof, zero
  regeneration), remove that line from `.gitignore` and `git add -f public/audio`.
