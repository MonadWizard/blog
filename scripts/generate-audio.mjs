#!/usr/bin/env node
// -----------------------------------------------------------------------------
// Bangla text-to-speech generator for blog posts AND journeys.
//
// For every published post/journey it:
//   1. Builds clean speech text (strips markdown/code).
//   2. Splits it into sentence-level segments.
//   3. Synthesizes each segment with Google Cloud TTS (natural Bangla voice).
//   4. Measures each segment's real duration and concatenates them into one MP3.
//   5. Writes a timing sidecar (<hash>.json) so the player can highlight the
//      currently-spoken sentence (karaoke-style) in sync with the audio.
//
// A manifest tracks content hashes, so unchanged items are skipped — you are
// never charged twice for the same text.
//
// Usage:   GOOGLE_TTS_API_KEY=xxxx npm run audio
//          npm run audio -- --dry [--show]   (preview text/cost, no API, no key)
//
// Without GOOGLE_TTS_API_KEY (and not --dry) it prints a notice and exits 0 so
// `npm run build` never breaks just because audio hasn't been generated.
// -----------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'src/content/blog');
const JOURNEY_DIR = path.join(ROOT, 'src/content/journey');
const OUT_DIR = path.join(ROOT, 'public/audio');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');

// ---- Configuration ----------------------------------------------------------
// Change VOICE to any bn-IN voice. Chirp3-HD = most natural (Gemini-like).
// If an API key is ever rejected for Chirp3-HD, swap to a Wavenet voice which
// always works with API keys, e.g. 'bn-IN-Wavenet-A'.
const VOICE = process.env.TTS_VOICE || 'bn-IN-Chirp3-HD-Aoede';
const LANGUAGE_CODE = 'bn-IN';
const SPEAKING_RATE = Number(process.env.TTS_RATE || 1.0);
// 'sentence' = fine-grained highlighting (more API requests, default).
// 'paragraph' = fewer requests + slightly better prosody, coarser highlighting.
const SEGMENT_MODE = (process.env.TTS_SEGMENT || 'sentence').toLowerCase();
const AUDIO_ENCODING = 'MP3';
const MAX_BYTES = 4500; // stay safely under the 5000-byte per-request API limit
const MIN_SEG_CHARS = 30; // merge sentences shorter than this into the next one
// Items longer than this are skipped unless they set `audio: true` — guards you
// from accidentally synthesizing a 600K-char journey (hours of audio, real $$$).
const MAX_CHARS = Number(process.env.TTS_MAX_CHARS || 100000);
const CONCURRENCY = Number(process.env.TTS_CONCURRENCY || 6);
const API_KEY = process.env.GOOGLE_TTS_API_KEY || '';
const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const DRY_RUN = process.argv.includes('--dry');
const SHOW = process.argv.includes('--show');

// -----------------------------------------------------------------------------

function log(...args) {
  console.log('[tts]', ...args);
}

if (!API_KEY && !DRY_RUN) {
  log('GOOGLE_TTS_API_KEY not set — skipping audio generation.');
  log('Set it locally (export GOOGLE_TTS_API_KEY=...) or as a GitHub secret to enable.');
  log('Tip: run `npm run audio -- --dry` to preview text + cost without a key.');
  process.exit(0);
}

// ---- Frontmatter + markdown -> clean speech text ----------------------------

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const km = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (km) data[km[1]] = km[2].trim().replace(/^["']|["']$/g, '');
  }
  return { data, body: m[2] };
}

function markdownToSpeech(md) {
  let t = md || '';
  t = t.replace(/```[\s\S]*?```/g, '\n\n'); // fenced code -> paragraph break
  t = t.replace(/~~~[\s\S]*?~~~/g, '\n\n');
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, ' '); // images
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'); // links -> text
  t = t.replace(/`([^`]*)`/g, '$1'); // inline code -> text
  t = t.replace(/<[^>]+>/g, ' '); // html
  // Isolate block-level lines into their own paragraphs so a segment never spans
  // two DOM blocks (which have no whitespace between them in textContent). This
  // keeps karaoke highlighting aligned for headings and list items.
  t = t.replace(/^(#{1,6}[ \t].+)$/gm, '\n$1\n');
  t = t.replace(/^([ \t]*(?:[-*+]|\d+\.)[ \t]+.+)$/gm, '\n$1\n');
  t = t.replace(/^#{1,6}\s+/gm, ''); // headings
  t = t.replace(/^>\s?/gm, ''); // blockquote
  t = t.replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, ' '); // table separator rows
  t = t.replace(/\|/g, ', '); // table pipes
  t = t.replace(/^\s*([-*_])\1{2,}\s*$/gm, ' '); // hr
  t = t.replace(/^\s*[-*+]\s+/gm, ''); // bullets
  t = t.replace(/^\s*\d+\.\s+/gm, ''); // numbered
  t = t.replace(/\*\*|\*|~~/g, ''); // asterisk emphasis + strikethrough
  t = t.replace(/_+/g, (m, off, s) => {
    // Keep intra-word underscores (snake_case like RATE_LIMIT); strip emphasis.
    const b = s[off - 1];
    const a = s[off + m.length];
    const wb = b && /[0-9A-Za-z]/.test(b);
    const wa = a && /[0-9A-Za-z]/.test(a);
    return wb && wa ? m : '';
  });
  t = t.replace(/\\([\\`*_{}\[\]()#+.!>~#-])/g, '$1'); // markdown backslash escapes
  t = t.replace(/[ \t]+\n/g, '\n'); // trailing spaces -> keep paragraph breaks clean
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

// ---- Segmentation (sentence-level, paragraph-aware) -------------------------

const byteLen = (s) => Buffer.byteLength(s, 'utf8');

function hardSplit(str) {
  const out = [];
  let cur = '';
  for (const ch of str) {
    if (byteLen(cur + ch) > MAX_BYTES) {
      if (cur) out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function segmentText(text) {
  const segments = [];
  for (const para of text.split(/\n{2,}/)) {
    const p = para.trim();
    if (!p) continue;
    if (SEGMENT_MODE === 'paragraph') {
      // Whole paragraph is one segment, hard-split only if over the byte limit.
      if (byteLen(p) > MAX_BYTES) segments.push(...hardSplit(p));
      else segments.push(p);
      continue;
    }
    // Sentence mode: split on Bangla danda ।, ., !, ? — merge very short ones.
    const sentences = p
      .split(/(?<=[।.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    let cur = '';
    for (const s of sentences) {
      const parts = byteLen(s) > MAX_BYTES ? hardSplit(s) : [s];
      for (const part of parts) {
        if (!cur) {
          cur = part;
          continue;
        }
        const cand = cur + ' ' + part;
        if ([...cur].length < MIN_SEG_CHARS && byteLen(cand) <= MAX_BYTES) {
          cur = cand; // merge short fragment forward
        } else {
          segments.push(cur);
          cur = part;
        }
      }
    }
    if (cur) segments.push(cur);
  }
  return segments;
}

// ---- MP3 duration (sum of frame durations) ----------------------------------

const V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const SR = { 3: [44100, 48000, 32000, 0], 2: [22050, 24000, 16000, 0], 0: [11025, 12000, 8000, 0] };

function mp3Duration(buf) {
  let i = 0;
  if (buf.length > 10 && buf.toString('latin1', 0, 3) === 'ID3') {
    const size =
      ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    i = 10 + size;
  }
  let dur = 0;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) {
      i++;
      continue;
    }
    const ver = (buf[i + 1] >> 3) & 0x3; // 3=MPEG1, 2=MPEG2, 0=MPEG2.5
    const layer = (buf[i + 1] >> 1) & 0x3; // 1=Layer3
    if (layer !== 1 || ver === 1) {
      i++;
      continue;
    }
    const isV1 = ver === 3;
    const bitrate = (isV1 ? V1_L3 : V2_L3)[(buf[i + 2] >> 4) & 0xf];
    const sr = (SR[ver] || [])[(buf[i + 2] >> 2) & 0x3];
    const padding = (buf[i + 2] >> 1) & 0x1;
    if (!bitrate || !sr) {
      i++;
      continue;
    }
    const samplesPerFrame = isV1 ? 1152 : 576;
    const frameLen = Math.floor(((samplesPerFrame / 8) * bitrate * 1000) / sr) + padding;
    if (frameLen <= 0) {
      i++;
      continue;
    }
    // Skip Xing/Info/VBRI header frames (contain no audio).
    const tag = buf.toString('latin1', i + 4, Math.min(i + 40, buf.length));
    if (!tag.includes('Xing') && !tag.includes('Info') && !tag.includes('VBRI')) {
      dur += samplesPerFrame / sr;
    }
    i += frameLen;
  }
  return dur;
}

// ---- Google TTS call + concurrency ------------------------------------------

async function synthesize(text) {
  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: LANGUAGE_CODE, name: VOICE },
      audioConfig: { audioEncoding: AUDIO_ENCODING, speakingRate: SPEAKING_RATE },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    const e = new Error(`TTS ${res.status}: ${err.slice(0, 300)}`);
    e.status = res.status;
    throw e;
  }
  const json = await res.json();
  if (!json.audioContent) throw new Error('No audioContent in TTS response');
  return Buffer.from(json.audioContent, 'base64');
}

async function synthRetry(text, tries = 5) {
  for (let a = 0; a < tries; a++) {
    try {
      return await synthesize(text);
    } catch (e) {
      const retryable = e.status === 429 || (e.status >= 500 && e.status <= 599) || !e.status;
      if (a === tries - 1 || !retryable) throw e;
      await new Promise((r) => setTimeout(r, 600 * 2 ** a));
    }
  }
}

async function mapPool(items, concurrency, fn, onProgress) {
  const results = new Array(items.length);
  let idx = 0;
  let done = 0;
  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
      if (onProgress) onProgress(++done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

// ---- Collect items from both collections ------------------------------------

function listFiles(dir, re) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, re));
    else if (re.test(entry.name)) out.push(full);
  }
  return out;
}

function collectBlog() {
  return listFiles(BLOG_DIR, /\.(md|mdx)$/).map((file) => {
    const { data, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    const slug = path.relative(BLOG_DIR, file).replace(/\.(md|mdx)$/, '');
    const title = data.title || '';
    const text = [title, markdownToSpeech(body)].filter(Boolean).join('।\n\n');
    const audio = data.audio === 'true' ? true : data.audio === 'false' ? false : undefined;
    return { key: `blog:${slug}`, draft: String(data.draft) === 'true', title, text, audio };
  });
}

function collectJourney() {
  return listFiles(JOURNEY_DIR, /\.json$/).map((file) => {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const slug = path.relative(JOURNEY_DIR, file).replace(/\.json$/, '');
    const parts = [data.title || '', data.description || ''];
    for (const step of data.steps || []) {
      if (step.levelTitle) parts.push(step.levelTitle);
      if (step.title) parts.push(step.title);
      if (step.description) parts.push(markdownToSpeech(step.description));
    }
    const text = parts.filter(Boolean).join('।\n\n');
    const audio = data.audio === true ? true : data.audio === false ? false : undefined;
    return { key: `journey:${slug}`, draft: data.draft === true, title: data.title || '', text, audio };
  });
}

// ---- Main -------------------------------------------------------------------

const keyToHash = (key) => crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let manifest = {};
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch {
      manifest = {};
    }
  }

  const items = [...collectBlog(), ...collectJourney()].filter((it) => !it.draft && it.text);
  const seen = new Set();
  let generated = 0;
  let skipped = 0;
  let totalChars = 0;

  let tooLarge = 0;
  for (const item of items) {
    const chars0 = [...item.text].length;
    // Respect explicit opt-out, and cap oversized items unless opted in.
    if (item.audio === false) continue;
    if (item.audio !== true && chars0 > MAX_CHARS) {
      log(
        `SKIP ${item.key} — ${chars0.toLocaleString()} chars > cap ${MAX_CHARS.toLocaleString()}. ` +
          `Add "audio": true (or raise TTS_MAX_CHARS) to force.`
      );
      tooLarge++;
      continue;
    }
    seen.add(item.key);
    const segments = segmentText(item.text);
    const contentHash = crypto
      .createHash('sha256')
      .update(`${VOICE}|${SPEAKING_RATE}|${SEGMENT_MODE}|${item.text}`)
      .digest('hex');

    const hash = keyToHash(item.key);
    const mp3File = `audio/${hash}.mp3`;
    const jsonFile = `audio/${hash}.json`;
    const mp3Path = path.join(ROOT, 'public', mp3File);
    const existing = manifest[item.key];

    if (
      existing &&
      existing.hash === contentHash &&
      fs.existsSync(mp3Path) &&
      fs.existsSync(path.join(ROOT, 'public', jsonFile))
    ) {
      skipped++;
      continue;
    }

    const chars = [...item.text].length;
    totalChars += chars;

    if (DRY_RUN) {
      const maxSeg = Math.max(...segments.map(byteLen));
      log(
        `DRY ${item.key} — ${chars.toLocaleString()} chars, ${segments.length} segment(s), ` +
          `largest ${maxSeg} bytes ${maxSeg <= 5000 ? 'OK' : 'OVER LIMIT!'}`
      );
      if (SHOW) {
        console.log('  preview:', segments.slice(0, 3).join(' | ').slice(0, 220));
      }
      generated++;
      continue;
    }

    log(`Generating: ${item.key} — ${segments.length} segments, ${chars.toLocaleString()} chars`);
    try {
      const parts = await mapPool(
        segments,
        CONCURRENCY,
        async (seg) => {
          const buf = await synthRetry(seg);
          return { buf, dur: mp3Duration(buf), text: seg };
        },
        (d, tot) => process.stdout.write(`    ${d}/${tot}\r`)
      );
      process.stdout.write(' '.repeat(24) + '\r');

      const buffers = [];
      const timed = [];
      let t = 0;
      for (const p of parts) {
        timed.push({ text: p.text, t: Number(t.toFixed(3)), d: Number(p.dur.toFixed(3)) });
        buffers.push(p.buf);
        t += p.dur;
      }

      fs.writeFileSync(mp3Path, Buffer.concat(buffers));
      fs.writeFileSync(
        path.join(ROOT, 'public', jsonFile),
        JSON.stringify(
          { voice: VOICE, rate: SPEAKING_RATE, computedDuration: Number(t.toFixed(3)), segments: timed },
          null,
          0
        )
      );
      manifest[item.key] = {
        file: mp3File,
        segmentsFile: jsonFile,
        hash: contentHash,
        chars,
        segments: timed.length,
        voice: VOICE,
        generatedAt: new Date().toISOString(),
      };
      generated++;
    } catch (err) {
      console.error(`[tts] FAILED for ${item.key}:`, err.message);
      process.exitCode = 1;
    }
  }

  if (!DRY_RUN) {
    // Remove files + manifest entries for items that no longer exist.
    for (const key of Object.keys(manifest)) {
      if (!seen.has(key)) {
        for (const f of [manifest[key].file, manifest[key].segmentsFile]) {
          const p = f && path.join(ROOT, 'public', f);
          if (p && fs.existsSync(p)) fs.unlinkSync(p);
        }
        delete manifest[key];
      }
    }
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  }

  log(
    `${DRY_RUN ? '[dry-run] ' : ''}Done. generated=${generated}, unchanged=${skipped}, over-cap=${tooLarge}, audio-items=${seen.size}` +
      (totalChars
        ? `, chars this run=${totalChars.toLocaleString()} (~$${((totalChars / 1_000_000) * 30).toFixed(4)} at Chirp3-HD rates; first 1M chars/month are free)`
        : '')
  );
}

main().catch((err) => {
  console.error('[tts] Fatal:', err);
  process.exit(1);
});
