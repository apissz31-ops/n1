"""vocab/data.json 생성: scripts/vocab_src/words.tsv + scripts/vocab_src/quiz.json
실행: python3 scripts/build-vocab.py"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = f'{ROOT}/scripts/vocab_src'

words, seen = [], set()
for line in open(f'{SRC}/words.tsv', encoding='utf-8'):
    line = line.rstrip('\n')
    if not line or line.startswith('#'):
        continue
    cols = line.split('\t')
    if len(cols) != 6:
        sys.exit(f'열 개수 오류: {line}')
    sec, star, w, r, m, p = cols
    if w in seen:
        sys.exit(f'중복 단어: {w}')
    seen.add(w)
    words.append({'id': f'v{len(words)+1:03d}', 'sec': int(sec), 'star': star == '★', 'w': w, 'r': r, 'm': m, 'p': p})

byw = {x['w']: x['id'] for x in words}
quiz = json.load(open(f'{SRC}/quiz.json', encoding='utf-8'))
for i, q in enumerate(quiz):
    if q['t'] not in ('読み', '文脈', '言換', '用法'):
        sys.exit(f'유형 오류 {i}')
    if len(q['c']) != 4 or len(set(q['c'])) != 4:
        sys.exit(f'선택지 오류 {i}')
    if q['k'] not in byw:
        sys.exit(f'단어 연결 오류 {i}: {q["k"]}')
    q['id'] = f'q{i+1:03d}'
    q['wid'] = byw[q['k']]

out = {'words': words, 'quiz': quiz}
json.dump(out, open(f'{ROOT}/vocab/data.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'words {len(words)}, quiz {len(quiz)}')
