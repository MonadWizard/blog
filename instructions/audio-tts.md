# Post & Journey audio — FREE Bangla TTS with sentence highlighting

Every published **blog post** (and, opt-in, every **journey**) can be played as
audio in a natural Bangla voice, like an audiobook — with the **currently-spoken
sentence highlighted** in the article as it plays (karaoke-style) and auto-scroll.

Audio is **pre-generated** and committed, so there is no API in the frontend and
playback is instant on every device.

## The free engine: Microsoft Edge voices (edge-tts)

Default generation uses **[edge-tts](https://github.com/rany2/edge-tts)** — the
same free neural voices as Edge's "Read aloud". **No account, no credit card, no
API key.** Default voice `bn-BD-NabanitaNeural` is **Bangladeshi (Dhaka) accent**.

Available Bangla voices:

| Voice | Accent | Gender |
|---|---|---|
| `bn-BD-NabanitaNeural` (default) | Bangladesh 🇧🇩 | Female |
| `bn-BD-PradeepNeural` | Bangladesh 🇧🇩 | Male |
| `bn-IN-TanishaaNeural` | India | Female |
| `bn-IN-BashkarNeural` | India | Male |

> edge-tts uses an unofficial Microsoft endpoint. It's free and widely used, but
> Microsoft could change it. If it ever stops working, switch to the Google
> engine (`npm run audio:google`, needs a billing-enabled key) — same output.

## Setup (one time, free)

```bash
python3 -m venv .venv
.venv/bin/pip install edge-tts
```

`npm run audio` auto-detects `.venv`. (You're on Python — if you prefer, a global
`pip install --user edge-tts` or `pipx install edge-tts` works too.)

## Generate & publish

```bash
npm run audio            # generate MP3s + timings into public/audio (FREE)
git add public/audio
git commit -m "Add post audio"
git push                 # deploy serves the committed audio
```

Audio is committed to the repo (no secret, no CI cost). Re-running only
regenerates posts whose text changed — nothing is redone needlessly.

### Preview without generating (no network, no edge-tts needed)

```bash
npm run audio -- --dry          # per-item segment counts
npm run audio -- --dry --show   # also show a text preview
```

## ⚠️ Journeys are opt-in (size cap)

Journeys are **huge** (200K–600K chars = hours of audio). Items over
`TTS_MAX_CHARS` (default 100,000) are **skipped** unless opted in:

- All **blog posts** are under the cap → generated automatically.
- To enable a **journey**, add `"audio": true` to its JSON, or run
  `TTS_MAX_CHARS=700000 npm run audio`.
- To disable any item: `audio: false`.

## How it works

1. `scripts/generate_audio.py` strips markdown/code, splits text into
   **sentence-level segments**, synthesizes each with edge-tts, and concatenates
   them into `public/audio/<hash>.mp3`.
2. A sidecar `public/audio/<hash>.json` stores each sentence's start time.
3. Pages look items up in `public/audio/manifest.json` and render
   `src/components/AudioPlayer.astro` when audio exists.
4. The player highlights the active sentence (CSS Custom Highlight API; graceful
   no-op on old browsers — audio always plays).

## Config (env vars)

| Variable          | Default               | Notes |
|-------------------|-----------------------|-------|
| `TTS_VOICE`       | `bn-BD-NabanitaNeural`| Any voice from the table above. |
| `TTS_RATE`        | `+0%`                 | e.g. `-10%`, `+15%`. |
| `TTS_SEGMENT`     | `sentence`            | `sentence` = fine highlighting; `paragraph` = fewer requests. |
| `TTS_MAX_CHARS`   | `100000`              | Skip bigger items unless `audio: true`. |
| `TTS_CONCURRENCY` | `4`                   | Parallel requests. |

## Alternative: Google Cloud (paid, needs a card)

`npm run audio:google` uses Google Chirp3-HD (`scripts/generate-audio.mjs`) and
needs `GOOGLE_TTS_API_KEY` (billing-enabled account). Produces the same files.
Only worth it if you specifically want Google's voices.

## Notes

- **Highlighting coverage**: ~95%+ on prose-heavy posts; lower on
  table/diagram-heavy ones. Unmatched sentences simply aren't highlighted —
  audio always plays through.
- Audio lives in `public/audio/` and **is committed** to the repo.
