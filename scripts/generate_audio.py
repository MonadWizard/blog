#!/usr/bin/env python3
"""
FREE Bangla text-to-speech generator (Microsoft Edge neural voices via edge-tts).

No API key, no credit card, no signup. Uses the same free voices as Edge's
"Read aloud". Default voice is bn-BD-NabanitaNeural (Bangladeshi / Dhaka accent).

Produces exactly the same output as the Google generator, so the on-page player
and sentence highlighting work unchanged:
  public/audio/manifest.json
  public/audio/<hash>.mp3        (all sentence clips concatenated)
  public/audio/<hash>.json       ({ computedDuration, segments:[{t,d,text}] })

Setup (one time):
  python3 -m venv .venv
  .venv/bin/pip install edge-tts
Run:
  npm run audio                 # -> ./scripts/audio.sh -> this file
  npm run audio -- --dry        # preview segments, NO network, no edge-tts needed
  npm run audio -- --dry --show

Config via env:
  TTS_VOICE (default bn-BD-NabanitaNeural; others: bn-BD-PradeepNeural,
            bn-IN-TanishaaNeural, bn-IN-BashkarNeural)
  TTS_RATE (e.g. "+0%", "-10%"), TTS_SEGMENT (sentence|paragraph),
  TTS_MAX_CHARS (default 100000), TTS_CONCURRENCY (default 4)
"""
import os
import re
import sys
import json
import time
import hashlib
import asyncio
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOG_DIR = ROOT / "src/content/blog"
JOURNEY_DIR = ROOT / "src/content/journey"
OUT_DIR = ROOT / "public/audio"
MANIFEST_PATH = OUT_DIR / "manifest.json"

VOICE = os.environ.get("TTS_VOICE", "bn-BD-NabanitaNeural")
RATE = os.environ.get("TTS_RATE", "+0%")
SEGMENT_MODE = os.environ.get("TTS_SEGMENT", "sentence").lower()
MAX_BYTES = 4500
MIN_SEG_CHARS = 30
MAX_CHARS = int(os.environ.get("TTS_MAX_CHARS", "100000"))
CONCURRENCY = int(os.environ.get("TTS_CONCURRENCY", "4"))
# edge-tts default output is audio-24khz-48kbitrate-mono-mp3 (48 kbit/s CBR),
# so audio bytes are proportional to duration. The player rescales to the real
# duration on load, so proportional timing is all we need.
BYTES_PER_SEC = 48000 / 8  # 6000

DRY = "--dry" in sys.argv
SHOW = "--show" in sys.argv


def log(*a):
    print("[tts]", *a)


# ---- frontmatter + markdown -> speech text ---------------------------------

def parse_frontmatter(raw: str):
    m = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n?(.*)$", raw, re.S)
    if not m:
        return {}, raw
    data = {}
    for line in m.group(1).splitlines():
        km = re.match(r"^([A-Za-z0-9_]+):\s*(.*)$", line)
        if km:
            data[km.group(1)] = km.group(2).strip().strip("\"'")
    return data, m.group(2)


def _strip_underscores(s: str) -> str:
    def repl(mt):
        i = mt.start()
        before = s[i - 1] if i > 0 else ""
        after = s[mt.end()] if mt.end() < len(s) else ""
        wb = bool(before) and bool(re.match(r"[0-9A-Za-z]", before))
        wa = bool(after) and bool(re.match(r"[0-9A-Za-z]", after))
        return mt.group(0) if (wb and wa) else ""
    return re.sub(r"_+", repl, s)


def md_to_speech(md: str) -> str:
    t = md or ""
    t = re.sub(r"```.*?```", "\n\n", t, flags=re.S)
    t = re.sub(r"~~~.*?~~~", "\n\n", t, flags=re.S)
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", t)
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t)
    t = re.sub(r"`([^`]*)`", r"\1", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"^(#{1,6}[ \t].+)$", r"\n\1\n", t, flags=re.M)
    t = re.sub(r"^([ \t]*(?:[-*+]|\d+\.)[ \t]+.+)$", r"\n\1\n", t, flags=re.M)
    t = re.sub(r"^#{1,6}\s+", "", t, flags=re.M)
    t = re.sub(r"^>\s?", "", t, flags=re.M)
    t = re.sub(r"^\s*\|?[\s:|-]+\|?\s*$", " ", t, flags=re.M)
    t = t.replace("|", ", ")
    t = re.sub(r"^\s*([-*_])\1{2,}\s*$", " ", t, flags=re.M)
    t = re.sub(r"^\s*[-*+]\s+", "", t, flags=re.M)
    t = re.sub(r"^\s*\d+\.\s+", "", t, flags=re.M)
    t = re.sub(r"\*\*|\*|~~", "", t)
    t = _strip_underscores(t)
    t = re.sub(r"\\([\\`*_{}\[\]()#+.!>~-])", r"\1", t)
    t = re.sub(r"[ \t]+\n", "\n", t)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


# ---- segmentation ----------------------------------------------------------

def blen(s: str) -> int:
    return len(s.encode("utf-8"))


def hard_split(s: str):
    out, cur = [], ""
    for ch in s:
        if blen(cur + ch) > MAX_BYTES:
            if cur:
                out.append(cur)
            cur = ch
        else:
            cur += ch
    if cur:
        out.append(cur)
    return out


def segment_text(text: str):
    segments = []
    for para in re.split(r"\n{2,}", text):
        p = para.strip()
        if not p:
            continue
        if SEGMENT_MODE == "paragraph":
            segments.extend(hard_split(p) if blen(p) > MAX_BYTES else [p])
            continue
        sentences = [x.strip() for x in re.split(r"(?<=[।.!?])\s+", p) if x.strip()]
        cur = ""
        for s in sentences:
            for part in (hard_split(s) if blen(s) > MAX_BYTES else [s]):
                if not cur:
                    cur = part
                    continue
                cand = cur + " " + part
                if len(cur) < MIN_SEG_CHARS and blen(cand) <= MAX_BYTES:
                    cur = cand
                else:
                    segments.append(cur)
                    cur = part
        if cur:
            segments.append(cur)
    return segments


# ---- collect items ---------------------------------------------------------

def list_files(d: Path, exts):
    return [p for p in d.rglob("*") if p.suffix in exts] if d.exists() else []


def _audio_flag(v):
    if v is True or v == "true":
        return True
    if v is False or v == "false":
        return False
    return None


def collect_blog():
    items = []
    for f in list_files(BLOG_DIR, {".md", ".mdx"}):
        data, body = parse_frontmatter(f.read_text(encoding="utf-8"))
        slug = str(f.relative_to(BLOG_DIR)).rsplit(".", 1)[0]
        title = data.get("title", "")
        text = "।\n\n".join(x for x in [title, md_to_speech(body)] if x)
        items.append({
            "key": f"blog:{slug}", "draft": str(data.get("draft")) == "true",
            "text": text, "audio": _audio_flag(data.get("audio")),
        })
    return items


def collect_journey():
    items = []
    for f in list_files(JOURNEY_DIR, {".json"}):
        data = json.loads(f.read_text(encoding="utf-8"))
        slug = str(f.relative_to(JOURNEY_DIR)).rsplit(".", 1)[0]
        parts = [data.get("title", ""), data.get("description", "")]
        for step in data.get("steps", []):
            if step.get("levelTitle"):
                parts.append(step["levelTitle"])
            if step.get("title"):
                parts.append(step["title"])
            if step.get("description"):
                parts.append(md_to_speech(step["description"]))
        text = "।\n\n".join(x for x in parts if x)
        items.append({
            "key": f"journey:{slug}", "draft": data.get("draft") is True,
            "text": text, "audio": _audio_flag(data.get("audio")),
        })
    return items


def key_hash(key: str) -> str:
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


def content_hash(text: str) -> str:
    return hashlib.sha256(f"{VOICE}|{RATE}|{SEGMENT_MODE}|{text}".encode("utf-8")).hexdigest()


# ---- synthesis (edge-tts) --------------------------------------------------

async def synth_segment(edge_tts, sem, text, tries=4) -> bytes:
    async with sem:
        last_err = None
        for attempt in range(tries):
            try:
                audio = bytearray()
                comm = edge_tts.Communicate(text, VOICE, rate=RATE)
                async for chunk in comm.stream():
                    if chunk["type"] == "audio":
                        audio.extend(chunk["data"])
                if not audio:
                    raise RuntimeError("empty audio")
                return bytes(audio)
            except Exception as err:  # noqa
                last_err = err
                if attempt == tries - 1:
                    break
                await asyncio.sleep(0.8 * (2 ** attempt))
        raise RuntimeError(f"synthesis failed: {last_err}")


async def synth_item(edge_tts, segments):
    sem = asyncio.Semaphore(CONCURRENCY)
    done = {"n": 0}

    async def one(i, seg):
        buf = await synth_segment(edge_tts, sem, seg)
        done["n"] += 1
        sys.stdout.write(f"    {done['n']}/{len(segments)}\r")
        sys.stdout.flush()
        return i, buf

    results = await asyncio.gather(*(one(i, s) for i, s in enumerate(segments)))
    results.sort(key=lambda x: x[0])
    sys.stdout.write(" " * 24 + "\r")
    return [b for _, b in results]


# ---- main ------------------------------------------------------------------

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {}
    if MANIFEST_PATH.exists():
        try:
            manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        except Exception:
            manifest = {}

    edge_tts = None
    if not DRY:
        try:
            import edge_tts as _e
            edge_tts = _e
        except ImportError:
            log("edge-tts is not installed. Set it up (free, no account):")
            log("  python3 -m venv .venv && .venv/bin/pip install edge-tts")
            log("Then run `npm run audio` again. (Use --dry to preview without it.)")
            sys.exit(1)

    items = [it for it in (collect_blog() + collect_journey()) if not it["draft"] and it["text"]]
    seen, generated, skipped, too_large, total_chars = set(), 0, 0, 0, 0

    for item in items:
        chars = len(item["text"])
        if item["audio"] is False:
            continue
        if item["audio"] is not True and chars > MAX_CHARS:
            log(f"SKIP {item['key']} — {chars:,} chars > cap {MAX_CHARS:,}. "
                f'Add "audio": true (or raise TTS_MAX_CHARS) to force.')
            too_large += 1
            continue
        seen.add(item["key"])

        segments = segment_text(item["text"])
        chash = content_hash(item["text"])
        h = key_hash(item["key"])
        mp3_file, json_file = f"audio/{h}.mp3", f"audio/{h}.json"
        mp3_path = ROOT / "public" / mp3_file

        existing = manifest.get(item["key"])
        if (existing and existing.get("hash") == chash and mp3_path.exists()
                and (ROOT / "public" / json_file).exists()):
            skipped += 1
            continue

        total_chars += chars
        if DRY:
            mx = max((blen(s) for s in segments), default=0)
            log(f"DRY {item['key']} — {chars:,} chars, {len(segments)} segment(s), "
                f"largest {mx} bytes {'OK' if mx <= 5000 else 'OVER LIMIT!'}")
            if SHOW:
                print("  preview:", " | ".join(segments[:3])[:220])
            generated += 1
            continue

        log(f"Generating: {item['key']} — {len(segments)} segments, {chars:,} chars")
        try:
            buffers = asyncio.run(synth_item(edge_tts, segments))
            timed, t = [], 0.0
            audio = bytearray()
            for buf, seg in zip(buffers, segments):
                d = len(buf) / BYTES_PER_SEC
                timed.append({"text": seg, "t": round(t, 3), "d": round(d, 3)})
                audio.extend(buf)
                t += d
            mp3_path.write_bytes(bytes(audio))
            (ROOT / "public" / json_file).write_text(json.dumps(
                {"voice": VOICE, "rate": RATE, "computedDuration": round(t, 3),
                 "segments": timed}, ensure_ascii=False), encoding="utf-8")
            manifest[item["key"]] = {
                "file": mp3_file, "segmentsFile": json_file, "hash": chash,
                "chars": chars, "segments": len(timed), "voice": VOICE,
                "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            generated += 1
        except Exception as e:  # noqa
            print(f"[tts] FAILED for {item['key']}: {e}", file=sys.stderr)
            sys.exit(1)

    if not DRY:
        for key in list(manifest.keys()):
            if key not in seen:
                for fn in (manifest[key].get("file"), manifest[key].get("segmentsFile")):
                    if fn and (ROOT / "public" / fn).exists():
                        (ROOT / "public" / fn).unlink()
                del manifest[key]
        MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                                 encoding="utf-8")

    log(f"{'[dry-run] ' if DRY else ''}Done. generated={generated}, unchanged={skipped}, "
        f"over-cap={too_large}, audio-items={len(seen)}, chars this run={total_chars:,} "
        f"(FREE via edge-tts)")


if __name__ == "__main__":
    main()
