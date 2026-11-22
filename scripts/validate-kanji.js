/* 한자 데이터·문제 검증. 실행: node scripts/validate-kanji.js [day...]  또는 브라우저에서 scripts/validate-kanji.html
   확인: 한자 130자·unit 1~13 각 10자 / 어휘 reading·meaning / 문제 선지 4개 서로 다름 / answer 위치 = reading
         / 오답이 그 표기의 실제 읽기(reading·alt·같은 표기의 다른 어휘)가 아님 / 같은 어휘 중복 출제 없음 / Day별 문제 수 */
const KDAY = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 2, 7: 3, 8: 4, 9: 4, 10: 5, 11: 5, 12: 6, 13: 6 };

function validateData(kanji, vocab) {
  const errs = [], warn = [];
  if (kanji.length !== 130) errs.push(`한자 ${kanji.length}자 (기대 130)`);
  for (let u = 1; u <= 13; u++) { const n = kanji.filter(k => k.unit === u).length; if (n !== 10) errs.push(`unit ${u}: ${n}자`); }
  const KM = {};
  for (const k of kanji) {
    if (KM[k.id]) errs.push(`${k.id}: id 중복`); KM[k.id] = k;
    if (k.day !== KDAY[k.unit]) errs.push(`${k.id}: unit ${k.unit}인데 day ${k.day}`);
    if (!k.hun || !Array.isArray(k.on) || !Array.isArray(k.kun)) errs.push(`${k.id}: hun/on/kun 형식`);
  }
  const ids = new Set();
  for (const v of vocab) {
    if (ids.has(v.id)) errs.push(`${v.id}: id 중복`); ids.add(v.id);
    if (!KM[v.kid]) errs.push(`${v.id}: kid ${v.kid} 없음`);
    if (!v.reading || !v.meaning) errs.push(`${v.id} ${v.word}: reading/meaning 비어 있음`);
    if (/[^぀-ゟー]/.test(v.reading)) errs.push(`${v.id} ${v.word}: reading에 히라가나 외 문자 「${v.reading}」`);
    if (v.focus && !v.word.includes(v.focus)) errs.push(`${v.id}: focus 「${v.focus}」가 word에 없음`);
    if (v.check) warn.push(`${v.id} ${v.word}: check 표시`);
  }
  return { kanji: kanji.length, vocab: vocab.length, notes: vocab.filter(v => v.note).length, errs, warn };
}

/* 같은 표기(또는 focus)로 맞는 읽기 전부 */
function validReadings(vocab) {
  const R = {};
  for (const v of vocab) { const key = v.focus || v.word; (R[key] = R[key] || new Set()).add(v.reading); (v.alt || []).forEach(a => R[key].add(a)); }
  return R;
}
/* 문제를 낼 어휘: 같은 word+reading은 처음 나온 것만 */
function expectedVids(kanji, vocab, day) {
  const KM = Object.fromEntries(kanji.map(k => [k.id, k])), seen = new Set(), out = [];
  for (const v of vocab) { const key = v.word + '|' + v.reading; if (seen.has(key)) continue; seen.add(key); if (KM[v.kid].day === day) out.push(v.id); }
  return out;
}

function validateDay(day, kanji, vocab, qs) {
  const errs = [], warn = [], VM = Object.fromEntries(vocab.map(v => [v.id, v])), RD = validReadings(vocab);
  const expect = expectedVids(kanji, vocab, day), got = qs.map(q => q.vid);
  if (got.length !== expect.length) errs.push(`문제 ${got.length}개 (기대 ${expect.length})`);
  for (const id of expect) if (!got.includes(id)) errs.push(`${id}: 문제 없음`);
  const ids = new Set(), pos = [0, 0, 0, 0];
  for (const q of qs) {
    const t = q.id, v = VM[q.vid];
    if (ids.has(t)) errs.push(`${t}: id 중복`); ids.add(t);
    if (!v) { errs.push(`${t}: vid ${q.vid} 없음`); continue; }
    if (!expect.includes(q.vid)) errs.push(`${t}: Day ${day} 출제 대상이 아님`);
    if (q.kid !== v.kid) errs.push(`${t}: kid ${q.kid} ≠ 어휘 ${v.kid}`);
    if (q.q !== v.word) errs.push(`${t}: q 「${q.q}」 ≠ word 「${v.word}」`);
    if (!Array.isArray(q.choices) || q.choices.length !== 4) { errs.push(`${t}: 선지 수 ${q.choices && q.choices.length}`); continue; }
    if (new Set(q.choices).size !== 4) errs.push(`${t}: 선지 중복 ${q.choices.join('/')}`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) { errs.push(`${t}: answer ${q.answer}`); continue; }
    pos[q.answer]++;
    if (q.choices[q.answer] !== v.reading) errs.push(`${t} ${v.word}: 정답 선지 「${q.choices[q.answer]}」 ≠ reading 「${v.reading}」`);
    const ok = RD[v.focus || v.word];
    q.choices.forEach((c, i) => {
      if (i === q.answer) return;
      if (ok.has(c)) errs.push(`${t} ${v.word}: 오답 「${c}」가 실제 읽기`);
      if (/[^぀-ゟー]/.test(c)) errs.push(`${t}: 선지에 히라가나 외 문자 「${c}」`);
      if (Math.abs(c.length - v.reading.length) >= 3) warn.push(`${t} ${v.word}: 오답 「${c}」 길이 차이 큼 (정답 ${v.reading})`);
    });
    if (!q.why) errs.push(`${t}: why 비어 있음`);
    if (!Array.isArray(q.wrong) || q.wrong.length !== 3) errs.push(`${t}: wrong ${q.wrong && q.wrong.length}개`);
    else {
      const wc = q.choices.filter((_, i) => i !== q.answer);
      q.wrong.forEach((w, i) => { if (!w.startsWith(wc[i] + ':')) errs.push(`${t}: wrong[${i}]가 오답 「${wc[i]}」로 시작하지 않음`); });
    }
  }
  const n = qs.length || 1;
  if (Math.max(...pos) - Math.min(...pos) > Math.ceil(n * 0.08)) warn.push(`정답 위치 쏠림 ${pos.join('/')}`);
  return { day, questions: qs.length, answerPos: pos, errs, warn };
}

function report(r) {
  const head = r.day ? `한자 Day ${r.day}: 문제 ${r.questions} · 정답 위치 ${r.answerPos.join('/')}` : `한자 ${r.kanji}자 · 어휘 ${r.vocab}개 (메모 ${r.notes})`;
  const lines = [`${head} → ${r.errs.length ? '오류 ' + r.errs.length : 'OK'}`];
  for (const e of r.errs) lines.push('  ✗ ' + e);
  for (const w of r.warn) lines.push('  △ ' + w);
  return lines.join('\n');
}

if (typeof module !== 'undefined' && require.main === module) {
  const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
  const rd = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  const kanji = rd('data/kanji.json'), vocab = rd('data/kanji_vocab.json'), idx = rd('data/kanji_q/index.json');
  const r0 = validateData(kanji, vocab); console.log(report(r0)); let bad = r0.errs.length;
  const days = process.argv.slice(2).map(Number);
  for (const d of (days.length ? days : Object.keys(idx).map(Number))) {
    const r = validateDay(d, kanji, vocab, rd(`data/kanji_q/day${String(d).padStart(2, '0')}.json`)); bad += r.errs.length; console.log(report(r));
  }
  process.exit(bad ? 1 : 0);
} else if (typeof window !== 'undefined') {
  window.N1KanjiValidate = { validateData, validateDay, expectedVids, report };
}
