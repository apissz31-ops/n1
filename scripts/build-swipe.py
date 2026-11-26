"""swipe/data.json 생성: data/grammar.json + data/questions/*.json + scripts/swipe_src/categories.txt
실행: python3 scripts/build-swipe.py"""
import json, re, glob, html, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = json.load(open(f'{ROOT}/data/grammar.json', encoding='utf-8'))
Q = {}
for f in sorted(glob.glob(f'{ROOT}/data/questions/day*.json')):
    for q in json.load(open(f, encoding='utf-8')):
        Q.setdefault(q['gid'], []).append(q)
CAT = {}
for line in open(f'{ROOT}/scripts/swipe_src/categories.txt', encoding='utf-8'):
    if line.startswith('g'):
        gid, c, sub = line.split(maxsplit=2)
        CAT[gid] = (c, sub.strip())

RUBY = re.compile(r'([^\s()（）、。「」『』！？]+?)\(([ぁ-ゖー・]+)\)')
BLANK = re.compile(r'[＿_]{2,}')

def units(ruby):
    """ruby 문자열 → [(base, reading|None)] (base는 1글자 또는 루비 단위)"""
    out, i = [], 0
    for m in RUBY.finditer(ruby):
        pre = ruby[i:m.start()]
        base = m.group(1)
        # 루비 base는 한자 연속 부분만 (앞의 가나는 일반 글자로)
        k = len(base)
        while k > 0 and re.match(r'[一-龯々〆ヵヶ〇]', base[k-1]): k -= 1
        pre += base[:k]; base = base[k:]
        out += [(ch, None) for ch in pre]
        if base: out.append((base, m.group(2)))
        i = m.end()
    out += [(ch, None) for ch in ruby[i:]]
    return out

def render(q):
    ans = q['choices'][q['answer']]
    parts = BLANK.split(q['q'])
    if len(parts) != 2: return None
    plain = parts[0] + ans + parts[1]
    us = units(q.get('ruby') or plain)
    if ''.join(b for b, _ in us) != plain: return None
    s, e = len(parts[0]), len(parts[0]) + len(ans)
    out, pos, inmark = [], 0, False
    for b, r in us:
        a, z = pos, pos + len(b); pos = z
        hit = a < e and z > s
        if hit and not inmark: out.append('<mark>'); inmark = True
        if not hit and inmark: out.append('</mark>'); inmark = False
        out.append(f'<ruby>{html.escape(b)}<rt>{html.escape(r)}</rt></ruby>' if r else html.escape(b))
    if inmark: out.append('</mark>')
    return ''.join(out)

items, miss = [], []
for g in G:
    c, sub = CAT[g['id']]
    ex = None
    for q in Q.get(g['id'], []):
        h = render(q)
        if h: ex = {'html': h, 'ko': q.get('ko', '')}; break
    if not ex: miss.append(g['id'])
    items.append({'id': g['id'], 'day': 1 if g['day'] <= 4 else 2 if g['day'] <= 8 else 3,
                  'p': g['pattern'], 'm': g['meaning'], 'conn': g.get('connection', ''),
                  'cat': c, 'sub': sub, 'ex': ex, 'note': g.get('explain', '')})
assert len(items) == 234 and all(i['cat'] in 'LRUD' for i in items)
json.dump(items, open(f'{ROOT}/swipe/data.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
from collections import Counter
print('items', len(items), 'days', Counter(i['day'] for i in items), 'cats', Counter(i['cat'] for i in items))
print('no example:', miss)
