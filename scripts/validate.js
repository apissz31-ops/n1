/* 문제 데이터 검증. 실행: node scripts/validate.js [day...]  또는 브라우저에서 scripts/validate.html?day=1
   확인: 문법당 10문제 / 선지 4개 서로 다름 / answer 0~3 / q에 빈칸 / 정답을 넣으면 ruby 문장(후리가나 제외)과 일치 / Day당 20문법(마지막 Day는 남은 수) */
const RUBY = /([一-鿿々〆ヶ]+)\(([぀-ゟー]+)\)/g;
const BLANK = '＿＿＿';

function validateDay(day, grammar, qs) {
  const errs = [], warn = [];
  const gs = grammar.filter(g => g.day === day);
  const maxDay = Math.max(...grammar.map(g => g.day));
  const expect = day < maxDay ? 20 : grammar.length - 20 * (maxDay - 1);
  if (gs.length !== expect) errs.push(`Day ${day}: 문법 ${gs.length}개 (기대 ${expect})`);
  const by = {};
  for (const q of qs) (by[q.gid] = by[q.gid] || []).push(q);
  for (const g of gs) { const n = (by[g.id] || []).length; if (n !== 10) errs.push(`${g.id} ${g.pattern}: 문제 ${n}개`); if (!g.explain) warn.push(`${g.id}: explain 비어 있음`); }
  for (const gid of Object.keys(by)) if (!gs.some(g => g.id === gid)) errs.push(`${gid}: Day ${day} 문법이 아님`);
  const ids = new Set(), pos = [0, 0, 0, 0];
  for (const q of qs) {
    const t = q.id;
    if (ids.has(t)) errs.push(`${t}: id 중복`); ids.add(t);
    if (!Array.isArray(q.choices) || q.choices.length !== 4) errs.push(`${t}: 선지 수 ${q.choices && q.choices.length}`);
    else if (new Set(q.choices).size !== 4) errs.push(`${t}: 선지 중복 ${q.choices.join('/')}`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errs.push(`${t}: answer ${q.answer}`); else pos[q.answer]++;
    const nb = q.q.split(BLANK).length - 1;
    if (nb !== 1) errs.push(`${t}: 빈칸 ${nb}개`);
    else {
      const filled = q.q.replace(BLANK, q.choices[q.answer]), plain = q.ruby.replace(RUBY, '$1');
      if (filled !== plain) errs.push(`${t}: 정답 대입 문장 불일치\n   q+정답: ${filled}\n   ruby  : ${plain}`);
    }
    if (/[()（）]/.test(q.ruby.replace(RUBY, ''))) warn.push(`${t}: ruby에 짝이 안 맞는 괄호`);
    if (!q.ko || !q.why) errs.push(`${t}: ko/why 비어 있음`);
    if (!Array.isArray(q.wrong) || q.wrong.length !== 3) errs.push(`${t}: wrong ${q.wrong && q.wrong.length}개`);
    if (!['shadow', 'speed', 'web', 'ai'].includes(q.src)) errs.push(`${t}: src ${q.src}`);
    if (q.src === 'web' && !q.url) errs.push(`${t}: web인데 url 없음`);
  }
  return { day, questions: qs.length, grammars: gs.length, answerPos: pos, errs, warn };
}

function report(r) {
  const lines = [`Day ${r.day}: 문법 ${r.grammars} · 문제 ${r.questions} · 정답 위치 ${r.answerPos.join('/')} → ${r.errs.length ? '오류 ' + r.errs.length : 'OK'}`];
  for (const e of r.errs) lines.push('  ✗ ' + e);
  for (const w of r.warn) lines.push('  △ ' + w);
  return lines.join('\n');
}

if (typeof module !== 'undefined' && require.main === module) {
  const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
  const grammar = JSON.parse(fs.readFileSync(path.join(root, 'data/grammar.json'), 'utf8'));
  const days = process.argv.slice(2).map(Number);
  const all = days.length ? days : [...new Set(grammar.map(g => g.day))].filter(d => fs.existsSync(path.join(root, `data/questions/day${String(d).padStart(2, '0')}.json`)));
  let bad = 0;
  for (const d of all) {
    const qs = JSON.parse(fs.readFileSync(path.join(root, `data/questions/day${String(d).padStart(2, '0')}.json`), 'utf8'));
    const r = validateDay(d, grammar, qs); bad += r.errs.length; console.log(report(r));
  }
  process.exit(bad ? 1 : 0);
} else if (typeof window !== 'undefined') {
  window.N1Validate = { validateDay, report };
}
