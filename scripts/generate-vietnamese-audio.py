"""Generate static Vietnamese MP3s from the app vocabulary via the secured TTS backend.

Usage:
  pip install requests
  python scripts/generate-vietnamese-audio.py https://YOUR-CLOUD-RUN-URL

By default generates a starter set (first 80 vocabulary entries). Pass --all to generate
all entries. Audio files are saved to assets/audio/vi/<word-id>.mp3.
"""
import argparse, json, re, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
VOCAB_JS = ROOT / 'vietnamese-vocab.js'
OUT = ROOT / 'assets' / 'audio' / 'vi'


def parse_vocab():
    source = VOCAB_JS.read_text(encoding='utf-8')
    rows = []
    category = None
    index = 0
    in_items = False
    for line in source.splitlines():
        match = re.match(r"\s*([a-zA-Z0-9_-]+):\s*\{.*items:\s*`", line)
        if match:
            category = match.group(1)
            index = 0
            in_items = True
            remainder = line.split('items:', 1)[1].split('`', 1)[-1]
            line = remainder
        if in_items and category:
            if '`' in line:
                line = line.split('`', 1)[0]
                closing = True
            else:
                closing = False
            value = line.strip()
            if '|' in value:
                vi, en = [part.strip() for part in value.split('|', 1)]
                if vi and en:
                    slug = re.sub(r'[^a-z0-9]+', '-', vi.lower().translate(str.maketrans('áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuyyyyyyd'))).strip('-')
                    # Match the app's exact NFD accent-stripping ID algorithm.
                    import unicodedata
                    slug = re.sub(r'[^a-z0-9]+', '-', ''.join(ch for ch in unicodedata.normalize('NFD', vi) if not unicodedata.combining(ch)).replace('đ', 'd').lower()).strip('-')
                    rows.append((f'{category}-{slug}-{index}', vi))
                index += 1
            if closing:
                in_items = False
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('endpoint', help='Cloud Run service base URL, without /api/speak')
    ap.add_argument('--all', action='store_true', help='Generate every parsed vocabulary row')
    ap.add_argument('--limit', type=int, default=80, help='Starter count (default 80)')
    ap.add_argument('--pause', type=float, default=2.2, help='Delay between requests (default 2.2 seconds to respect the backend rate limit)')
    args = ap.parse_args()
    endpoint = args.endpoint.rstrip('/') + '/api/speak'
    words = parse_vocab()
    if not args.all: words = words[:max(1, args.limit)]
    OUT.mkdir(parents=True, exist_ok=True)
    done = skipped = failed = 0
    for i, (word_id, vi) in enumerate(words, 1):
        target = OUT / f'{word_id}.mp3'
        if target.exists() and target.stat().st_size > 1000:
            skipped += 1; continue
        try:
            r = requests.post(endpoint, json={'text': vi, 'slow': False}, timeout=45)
            r.raise_for_status()
            if not r.headers.get('content-type', '').startswith('audio/'):
                raise RuntimeError('Backend did not return audio')
            target.write_bytes(r.content); done += 1
            print(f'[{i}/{len(words)}] saved {vi} -> {target.name}')
        except Exception as exc:
            failed += 1; print(f'[{i}/{len(words)}] FAILED {vi}: {exc}')
        time.sleep(args.pause)
    print(f'Finished. Generated={done}, existing={skipped}, failed={failed}.')
    print('Review generated audio and ensure voice/model licensing is suitable before publishing.')

if __name__ == '__main__': main()
