"""grammar/data.json 생성: scripts/grammar_src/grammar.json + quiz.json
실행: python3 scripts/build-grammar.py"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = f'{ROOT}/scripts/grammar_src'
G = json.load(open(f'{SRC}/grammar.json', encoding='utf-8'))
for i, g in enumerate(G):
    g['id'] = f'g{i+1:02d}'
    for e in g['ex']:
        if e['b'] not in e['ja']:
            sys.exit(f'예문에 문형 부분 없음: {g["pat"]} / {e["b"]}')
by = {g['pat']: g['id'] for g in G}
Q = json.load(open(f'{SRC}/quiz.json', encoding='utf-8'))
for i, q in enumerate(Q):
    if q['t'] not in ('形式', '組立'): sys.exit(f'유형 오류 {i}')
    if len(q['c']) != 4 or len(set(q['c'])) != 4: sys.exit(f'선택지 오류 {i}')
    if q['t'] == '組立' and sorted(q['ord']) != sorted(q['c']): sys.exit(f'배열 오류 {i}')
    if q['k'] not in by: sys.exit(f'문형 연결 오류 {i}: {q["k"]}')
    q['id'] = f'q{i+1:02d}'; q['gid'] = by[q['k']]
json.dump({'grammar': G, 'quiz': Q}, open(f'{ROOT}/grammar/data.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'grammar {len(G)}, quiz {len(Q)}')
