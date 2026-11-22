'use strict';
/* N1 한자 읽기 퀴즈 — app.js의 저장(S)·화면 도구($, esc, ask, toast, celebrate)를 함께 쓴다.
   하루 = ① 본 라운드(자료집 순서) → ② 섞기 라운드(같은 문제 무작위) → ③ 오답 라운드(①②에서 틀린 문제, 전부 맞힐 때까지).
   저장: S.kanji = { ans, wrong, days }. 데이터: data/kanji.json, data/kanji_vocab.json, data/kanji_q/dayNN.json */
const KSTART = '2026-11-23', KNDAYS = 6;
let KJ = [], KJM = {}, KJC = {}, KV = [], KVM = {}, KAV = {}, KQS = {}, KQM = {}, KOK = false;

/* ---------- 저장 (S.kanji 기본값은 app.js normalize()에서 채움) ---------- */
const kds = d => (S.kanji.days[d] = S.kanji.days[d] || { stage: 'main', pos: 0, mix: null, mpos: 0, missed: [], round: 0, done: false });

/* ---------- 데이터 ---------- */
async function kLoad() {
  try {
    [KJ, KV, KAV] = await Promise.all([getJSON('data/kanji.json'), getJSON('data/kanji_vocab.json'), getJSON('data/kanji_q/index.json')]);
    KJ.forEach(k => { KJM[k.id] = k; KJC[k.kanji] = k; }); KV.forEach(v => { KVM[v.id] = v; });
    KOK = true;
  } catch (e) { KOK = false; }
}
const kHas = d => !!KAV[d];
async function kLoadDay(d) {
  if (KQS[d]) return KQS[d];
  const qs = await getJSON(`data/kanji_q/day${String(d).padStart(2, '0')}.json`);
  qs.forEach(q => { q.d = d; KQM[q.id] = q; });
  return (KQS[d] = qs);
}
function kDayDate(d) { const t = new Date(KSTART + 'T00:00:00'); t.setDate(t.getDate() + d - 1); return `${t.getMonth() + 1}/${t.getDate()}`; }
const kUnits = d => KJ.filter(k => k.day === d).map(k => k.unit);

/* ---------- 통계 ---------- */
function kDayStats(d) {
  const total = KAV[d] || 0, st = kds(d);
  const solved = st.done || st.stage === 'round' ? total * 2 : st.stage === 'mix' ? total + st.mpos : st.pos;
  let n = 0, ok = 0;
  for (const a of Object.values(S.kanji.ans)) if (a.d === d && a.first !== undefined) { n++; if (a.first) ok++; }
  const wrong = S.kanji.wrong.filter(id => (S.kanji.ans[id] || {}).d === d).length;
  return { total, solved, all: total * 2, n, ok, acc: pct(ok, n), wrong, done: st.done, stage: st.stage };
}
function kKanjiStats(kid) {
  let n = 0, ok = 0, w = 0;
  for (const a of Object.values(S.kanji.ans)) if (a.k === kid) { w += a.w || 0; if (a.first !== undefined) { n++; if (a.first) ok++; } }
  const un = S.kanji.wrong.filter(id => (S.kanji.ans[id] || {}).k === kid).length;
  return { n, ok, w, un };
}
function kTopWrong(kids, k) {
  return kids.map(id => ({ k: KJM[id], w: kKanjiStats(id).w })).filter(x => x.w > 0).sort((a, b) => b.w - a.w).slice(0, k);
}
function kFirstOpenDay() { for (let d = 1; d <= KNDAYS; d++) if (kHas(d) && !kds(d).done) return d; return null; }

/* ---------- 홈 섹션 (renderHome 끝에서 호출) ---------- */
function kHomeHTML() {
  if (!KOK) return '<h3 class="sec">한자 읽기</h3><p class="note">한자 데이터를 불러오지 못했어요. 새로고침해 주세요.</p>';
  const next = kFirstOpenDay(), tiles = [];
  for (let d = 1; d <= KNDAYS; d++) {
    const has = kHas(d), s = kDayStats(d), us = kUnits(d);
    tiles.push(`<button class="tile${s.done ? ' done' : ''}" data-kday="${d}" ${has ? '' : 'disabled'}>
      <span class="th"><b>한자 Day ${d}</b><em>${kDayDate(d)}</em>${s.done ? '<span class="ck" aria-label="완료">✓</span>' : ''}</span>
      <span class="ts">${has ? `${us.length ? `${us[0]}~${us[us.length - 1]}일차 · ` : ''}${s.total}문제` : '준비 중'}</span>
      <span class="bar"><i style="width:${pct(s.solved, s.all)}%"></i></span>
      <span class="ts">${s.n ? `정답률 ${s.acc}%` : '&nbsp;'}${s.wrong ? ` · 오답 ${s.wrong}` : ''}</span></button>`);
  }
  const nAvail = Object.keys(KAV).length;
  return `
  <h3 class="sec">한자 읽기 Day 1~6 <span>본 라운드 → 섞기 → 오답 라운드</span></h3>
  <div class="homebtns"><button class="btn primary" id="kgo" ${next ? '' : 'disabled'}>${next ? `한자 이어서 풀기 · Day ${next}` : nAvail < KNDAYS ? `한자 Day ${nAvail + 1} 준비 중` : '한자 모든 Day 완료!'}</button></div>
  <div class="tiles ktiles">${tiles.join('')}</div>`;
}
function kBindHome() {
  if ($('#kgo')) $('#kgo').onclick = () => { const d = kFirstOpenDay(); if (d) kOpenDay(d); };
  $$('[data-kday]').forEach(b => b.onclick = () => kOpenDay(+b.dataset.kday));
}

/* ---------- 흐름 ---------- */
const kIds = d => KQS[d].map(q => q.id);
async function kOpenDay(d) {
  try { await kLoadDay(d); } catch (e) { return toast('문제를 불러오지 못했어요'); }
  const st = kds(d);
  if (st.done) {
    const v = await ask(`<h3>한자 Day ${d}는 완료했어요</h3><p>${KQS[d].length}문제를 처음부터 다시 연습할까요? (기록된 정답률은 바뀌지 않아요)</p>`,
      [{ label: '다시 연습', value: 'p', cls: 'primary' }, { label: '닫기', value: null }]);
    if (v === 'p') kStart({ mode: 'kpractice', day: d, list: kIds(d), i: 0 });
    return;
  }
  if (st.stage === 'main') return kStart({ mode: 'kmain', day: d, list: kIds(d), i: st.pos });
  if (st.stage === 'mix') {
    if (!st.mix || st.mix.length !== KQS[d].length) { st.mix = shuffle(kIds(d)); st.mpos = 0; save(); }
    return kStart({ mode: 'kmix', day: d, list: st.mix, i: st.mpos });
  }
  return kRound(d);
}
function kRound(d) {
  const st = kds(d), list = st.missed.filter(id => KQM[id]);
  if (!list.length) return kComplete(d);
  st.round = (st.round || 0) + 1; save();
  ask(`<h3>오답 라운드 ${st.round}</h3><p>한자 Day ${d}에서 틀린 <b>${list.length}문제</b>를 다시 풉니다. 전부 맞히면 Day ${d} 완료!</p>`, [{ label: '시작', value: 1, cls: 'primary' }])
    .then(() => kStart({ mode: 'kround', day: d, list: shuffle(list), i: 0, round: st.round }));
}
async function kStartReview(ids) {
  ids = ids || S.kanji.wrong.slice();
  if (!ids.length) return toast('미해결 한자 오답이 없어요');
  try { await Promise.all([...new Set(ids.map(id => (S.kanji.ans[id] || {}).d).filter(Boolean))].map(kLoadDay)); } catch (e) { return toast('문제를 불러오지 못했어요'); }
  ids = ids.filter(id => KQM[id]);
  kStart({ mode: 'kreview', list: shuffle(ids), i: 0, round: 1, scope: ids.slice() });
}
async function kStartKanji(kid) {
  const k = KJM[kid]; if (!k || !kHas(k.day)) return toast('아직 준비 중인 Day예요');
  try { await kLoadDay(k.day); } catch (e) { return toast('문제를 불러오지 못했어요'); }
  const list = KQS[k.day].filter(q => q.kid === kid).map(q => q.id);
  if (!list.length) return toast('이 한자로 나온 문제가 없어요');
  kStart({ mode: 'kkanji', day: k.day, kid, from: TAB, list, i: 0 });
}
function kStart(sess) {
  R = Object.assign({ picked: null, k: true }, sess);
  if (R.i >= R.list.length) return kFinish();
  $('#hdr').hidden = true;
  kRender();
}

/* ---------- 퀴즈 화면 ---------- */
const K_ROUND = { kmain: '본 라운드', kmix: '섞기 라운드' };
function kHeadInfo() {
  const m = R.i + 1, n = R.list.length;
  if (R.mode === 'kmain' || R.mode === 'kmix') return `한자 Day ${R.day} · ${K_ROUND[R.mode]} · 문제 ${m}/${n}`;
  if (R.mode === 'kround') return `한자 Day ${R.day} · 오답 라운드 ${R.round} · ${m}/${n}`;
  if (R.mode === 'kreview') return `한자 오답 다시 풀기${R.round > 1 ? ` · 라운드 ${R.round}` : ''} · ${m}/${n}`;
  if (R.mode === 'kkanji') return `${KJM[R.kid].kanji} 어휘 풀기 · ${m}/${n}`;
  return `한자 Day ${R.day} 연습 · ${m}/${n}`;
}
function kWordHTML(q) {
  if (!q.focus) return esc(q.q);
  const i = q.q.indexOf(q.focus);
  return esc(q.q.slice(0, i)) + `<u class="kfocus">${esc(q.focus)}</u>` + esc(q.q.slice(i + q.focus.length));
}
function kRender() {
  const q = KQM[R.list[R.i]];
  $('#view').innerHTML = `
  <div class="qhead">
    <div class="qtop"><button class="btn sm" id="home" aria-label="홈으로">← 홈</button><span class="qinfo">${kHeadInfo()}</span></div>
    <div class="bar"><i style="width:${pct(R.i, R.list.length)}%"></i></div>
  </div>
  <section class="qcard">
    <p class="kprompt">${q.focus ? '밑줄 친 말의 읽기는?' : '읽기로 알맞은 것은?'}</p>
    <p class="kq ja${q.focus ? ' sent' : ''}" lang="ja">${kWordHTML(q)}</p>
    <div class="choices">${q.choices.map((c, i) => `<button class="choice" data-i="${i}"><i>${i + 1}</i><span class="ja" lang="ja">${esc(c)}</span><span class="mk"></span></button>`).join('')}</div>
    <div class="explain" id="exp" hidden></div>
  </section>
  <div class="actions one"><button class="btn primary" id="next" disabled>다음 <small>Enter</small></button></div>`;
  $('#home').onclick = () => setTab('home');
  $$('.choice').forEach(b => b.onclick = () => kPick(+b.dataset.i));
  $('#next').onclick = kNext;
  scrollTo(0, 0);
}
function kSegMap(seg) {
  const m = {};
  for (const t of String(seg || '').split(',')) { const [k, r] = t.split('='); if (k && r && !m[k[0]]) m[k[0]] = { r, whole: k.length > 1 ? k : null }; }
  return m;
}
function kExplainHTML(q, ok) {
  const v = KVM[q.vid], word = q.focus || q.q, seg = kSegMap(q.seg), wrongC = q.choices.filter((_, j) => j !== q.answer);
  const chars = [...new Set([...word].filter(c => /[一-鿿々]/.test(c) && c !== '々'))];
  const kRows = chars.map(c => {
    const k = KJC[c];
    if (k) return `<li><b class="ja kc">${esc(c)}</b> <span>${esc(k.hun)}</span><span class="sub"> · 음 <span class="ja">${esc(k.on.join('·') || '–')}</span> · 훈 <span class="ja">${esc(k.kun.join('·') || '–')}</span></span></li>`;
    const s = seg[c];
    return s ? `<li><b class="ja kc">${esc(c)}</b> <span class="ja">${esc(s.whole ? `${s.whole} ${s.r}` : s.r)}</span> <span class="tag">보충</span></li>` : '';
  }).join('');
  const seen = new Set([v.word]), same = KV.filter(x => x.kid === q.kid && x.id !== v.id && !x.focus && !seen.has(x.word) && seen.add(x.word)).slice(0, 6);
  return `
    <p class="verdict ${ok ? 'r' : 'w'}">${ok ? '⭕ 정답' : `❌ 오답 · 정답은 ${q.answer + 1}번 「<span class="ja">${esc(q.choices[q.answer])}</span>」`}</p>
    <div class="key"><b>어휘</b><p><span class="ja kw">${esc(q.focus ? q.focus : v.word)}</span> <span class="ja kr">${esc(v.reading)}</span> <span class="mean">${esc(v.meaning)}</span></p>${q.focus ? `<p class="ja sub" lang="ja">${esc(q.q)}</p>` : ''}</div>
    ${kRows ? `<div class="key"><b>한자</b><ul class="kl">${kRows}</ul></div>` : ''}
    ${same.length ? `<div class="key"><b>같은 한자 어휘 · ${esc(KJM[q.kid].kanji)}</b><ul class="kv">${same.map(x => `<li><span class="ja">${esc(x.word)}</span> <span class="ja sub">${esc(x.reading)}</span> <span>${esc(x.meaning)}</span></li>`).join('')}</ul></div>` : ''}
    <div class="key"><b>읽기 포인트</b><p>${esc(q.why)}</p></div>
    <div class="key"><b>오답 해설</b><ul class="wl">${q.wrong.map((w, j) => {
      const m = w.match(/^(.+?): (.*)$/);
      return m ? `<li><span class="ja">${esc(m[1])}</span> ${esc(m[2])}</li>` : `<li><span class="ja">${esc(wrongC[j])}</span> ${esc(w)}</li>`; }).join('')}</ul></div>
    <p class="meta">${v.note ? '<span class="tag exam">메모·예문</span>' : ''}<span class="tag">자료집 ${KJM[q.kid].unit}일차 · ${KJM[q.kid].page}쪽</span><span>${esc(q.id)}</span></p>`;
}
function kPick(i) {
  if (R.picked !== null) return;
  const id = R.list[R.i], q = KQM[id], ok = i === q.answer;
  R.picked = i;
  if (R.mode !== 'kpractice') {
    const K = S.kanji, a = K.ans[id] = K.ans[id] || { n: 0, w: 0 };
    a.d = q.d; a.k = q.kid;
    if (a.first === undefined) a.first = ok;
    a.n++; a.last = i; if (!ok) a.w = (a.w || 0) + 1;
    const x = K.wrong.indexOf(id);
    if (ok && x >= 0) K.wrong.splice(x, 1);
    if (!ok && x < 0) K.wrong.push(id);
    if (['kmain', 'kmix', 'kround'].includes(R.mode)) {
      const ms = kds(R.day).missed, y = ms.indexOf(id);
      if (!ok && y < 0) ms.push(id);
      if (ok && R.mode === 'kround' && y >= 0) ms.splice(y, 1);
    }
    save();
  }
  $$('.choice').forEach((b, j) => {
    b.disabled = true;
    if (j === q.answer) { b.classList.add('r'); $('.mk', b).textContent = '⭕'; }
    else if (j === i) { b.classList.add('w'); $('.mk', b).textContent = '❌'; }
  });
  const exp = $('#exp'); exp.innerHTML = kExplainHTML(q, ok); exp.hidden = false;
  const nb = $('#next'); nb.disabled = false; nb.focus({ preventScroll: true });
}
function kNext() {
  if (R.picked === null) return;
  R.i++; R.picked = null;
  if (R.mode === 'kmain') kds(R.day).pos = R.i;
  if (R.mode === 'kmix') kds(R.day).mpos = R.i;
  save();
  if (R.i >= R.list.length) return kFinish();
  kRender();
}
function kFinish() {
  const m = R.mode, d = R.day;
  if (m === 'kmain') {
    const st = kds(d); st.stage = 'mix'; st.pos = R.list.length; st.mix = shuffle(kIds(d)); st.mpos = 0; save();
    return ask(`<h3>본 라운드 끝!</h3><p>이번엔 같은 <b>${st.mix.length}문제</b>를 순서를 섞어 한 번 더 풉니다.</p>`, [{ label: '섞기 라운드 시작', value: 1, cls: 'primary' }, { label: '나중에', value: 0 }])
      .then(v => v ? kStart({ mode: 'kmix', day: d, list: st.mix, i: 0 }) : setTab('home'));
  }
  if (m === 'kmix') { const st = kds(d); st.stage = 'round'; st.mpos = R.list.length; save(); return kRound(d); }
  if (m === 'kround') return kRound(d);
  if (m === 'kreview') {
    const left = S.kanji.wrong.filter(id => R.scope.includes(id));
    if (left.length) {
      const r = R.round + 1, scope = R.scope;
      return ask(`<h3>한자 오답 라운드 ${r}</h3><p>아직 <b>${left.length}문제</b>가 남았어요. 전부 맞힐 때까지 다시 풉니다.</p>`,
        [{ label: '계속', value: 1, cls: 'primary' }, { label: '그만하기', value: 0 }])
        .then(v => v ? kStart({ mode: 'kreview', list: shuffle(left), i: 0, round: r, scope }) : setTab('wrong'));
    }
    toast('한자 오답을 모두 해결했어요!'); return setTab('wrong');
  }
  if (m === 'kkanji') { toast(`${KJM[R.kid].kanji} 어휘를 다 풀었어요`); return setTab(R.from || 'kanji'); }
  toast(`한자 Day ${d} 연습 끝!`); setTab('home');
}
function kComplete(d) {
  const st = kds(d); st.done = true; st.stage = 'done'; st.doneAt = new Date().toISOString(); save();
  R = null; $('#hdr').hidden = false;
  $$('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === 'home'));
  const s = kDayStats(d), top = kTopWrong(KJ.filter(k => k.day === d).map(k => k.id), 3), nd = kFirstOpenDay();
  $('#view').innerHTML = `
  <section class="result">
    <p class="rk">🎉</p>
    <h2>한자 Day ${d} 완료</h2>
    <p class="racc">정답률 <b>${s.acc}%</b> <small>(첫 시도 ${s.ok}/${s.n})</small></p>
    <h3 class="sec">많이 틀린 한자 3개</h3>
    ${top.length ? `<ol class="rtop">${top.map(x => `<li><button class="link" data-k="${x.k.id}"><span class="ja">${esc(x.k.kanji)}</span> <small>${esc(x.k.hun)}</small></button><em>${x.w}회</em></li>`).join('')}</ol>` : '<p class="note">틀린 한자가 없어요. 완벽!</p>'}
    <div class="homebtns">${nd ? `<button class="btn primary" id="nd">한자 Day ${nd} 시작</button>` : ''}<button class="btn" id="hm">홈으로</button></div>
  </section>`;
  $('#hm').onclick = () => setTab('home');
  if ($('#nd')) $('#nd').onclick = () => kOpenDay(nd);
  $$('.rtop button').forEach(b => b.onclick = () => kStartKanji(b.dataset.k));
  celebrate();
}

/* ---------- 한자 탭 ---------- */
const KLF = { q: '', day: 0, open: null };
function renderKanjiList() {
  if (!KOK) { $('#view').innerHTML = '<p class="empty">한자 데이터를 불러오지 못했어요. 새로고침해 주세요.</p>'; return; }
  $('#view').innerHTML = `
  <div class="lsearch"><input type="search" id="kq" placeholder="한자·읽기·뜻·훈음 검색 (예: 繁, はん, 번영)" value="${esc(KLF.q)}" aria-label="한자 검색" autocomplete="off"></div>
  <div class="dchips" role="group" aria-label="Day 선택">
    <button class="chip" data-d="0" aria-pressed="${KLF.day === 0}">전체</button>
    ${Array.from({ length: KNDAYS }, (_, i) => i + 1).map(d => `<button class="chip" data-d="${d}" aria-pressed="${KLF.day === d}">Day ${d}</button>`).join('')}
  </div>
  <h3 class="sec" id="kcnt"></h3>
  <div class="glist" id="kl"></div>`;
  const draw = () => {
    const q = norm(KLF.q);
    const rows = KJ.filter(k => (!KLF.day || k.day === KLF.day) && (!q || norm([k.kanji, k.hun, ...k.on, ...k.kun, ...KV.filter(v => v.kid === k.id).map(v => v.word + v.reading + v.meaning)].join(' ')).includes(q)));
    $('#kcnt').innerHTML = `${KLF.day ? `한자 Day ${KLF.day}` : '전체 한자'} <span>${rows.length}자 · 누르면 읽기와 어휘</span>`;
    $('#kl').innerHTML = rows.length ? rows.map(k => {
      const s = kKanjiStats(k.id), vs = KV.filter(v => v.kid === k.id && !v.focus);
      return `<details data-k="${k.id}"${KLF.open === k.id ? ' open' : ''}>
        <summary><span class="no">${+k.id.slice(1)}</span><span class="t"><b class="ja kbig" lang="ja">${esc(k.kanji)}</b><small>${esc(k.hun)}</small></span>
          <span class="c"><small>Day ${k.day}</small>${s.n ? `<small>${s.ok}/${s.n}</small>` : ''}${s.un ? `<em class="un">오답 ${s.un}</em>` : ''}</span></summary>
        <div class="gbody">
          <p><span class="tag">음</span> <span class="ja">${esc(k.on.join('・') || '–')}</span> &nbsp; <span class="tag exam">훈</span> <span class="ja">${esc(k.kun.join('・') || '–')}</span></p>
          <ul class="kv">${vs.map(v => `<li><span class="ja">${esc(v.word)}</span> <span class="ja sub">${esc(v.reading)}</span> <span>${esc(v.meaning)}</span>${v.note ? ' <span class="tag exam">메모</span>' : ''}</li>`).join('')}</ul>
          <p class="meta"><span>자료집 ${k.unit}일차 · ${k.page}쪽</span>${s.n ? `<span>내 정답률 ${pct(s.ok, s.n)}% (${s.ok}/${s.n})</span>` : '<span>아직 안 풂</span>'}${s.w ? `<span>누적 오답 ${s.w}회</span>` : ''}</p>
          <button class="btn primary" data-play="${k.id}"${kHas(k.day) ? '' : ' disabled'}>${kHas(k.day) ? '이 한자 문제 풀기' : '준비 중'}</button>
        </div></details>`;
    }).join('') : '<p class="empty">맞는 한자가 없어요.</p>';
    $$('#kl details').forEach(d => d.ontoggle = () => { if (d.open) { KLF.open = d.dataset.k; $$('#kl details[open]').forEach(o => o !== d && (o.open = false)); } else if (KLF.open === d.dataset.k) KLF.open = null; });
    $$('#kl [data-play]').forEach(b => b.onclick = () => kStartKanji(b.dataset.play));
  };
  $('#kq').oninput = e => { KLF.q = e.target.value; draw(); };
  $$('.dchips .chip').forEach(b => b.onclick = () => { KLF.day = +b.dataset.d; $$('.dchips .chip').forEach(c => c.setAttribute('aria-pressed', c === b)); draw(); });
  draw();
}

/* ---------- 오답 탭의 한자 쪽 ---------- */
function renderKanjiWrong(box) {
  const ids = S.kanji.wrong.filter(id => KVM[id]), top = kTopWrong(KJ.map(k => k.id), 999);
  box.innerHTML = `
  <div class="homebtns"><button class="btn no" id="krv" ${ids.length ? '' : 'disabled'}>한자 오답 다시 풀기 (${ids.length}개)</button></div>
  <h3 class="sec">미해결 한자 오답 <span>다시 풀어 맞히면 빠져요</span></h3>
  ${ids.length ? `<ul class="kwl">${ids.map(id => { const v = KVM[id], a = S.kanji.ans[id] || {};
    return `<li><span class="ja kw">${esc(v.focus || v.word)}</span> <span class="ja sub">${esc(v.reading)}</span> <span>${esc(v.meaning)}</span><em>${a.w || 0}회</em></li>`; }).join('')}</ul>` : '<p class="empty">미해결 한자 오답이 없어요.</p>'}
  <h3 class="sec">많이 틀린 한자 TOP <span>누르면 그 한자 어휘만 풉니다</span></h3>
  ${top.length ? `<ol class="rank">${top.map((x, i) => { const s = kKanjiStats(x.k.id);
    return `<li><button data-k="${x.k.id}"><span class="no">${i + 1}</span><span class="t"><b class="ja">${esc(x.k.kanji)}</b><small>${esc(x.k.hun)}</small></span><span class="c"><b>${x.w}회</b><small>Day ${x.k.day}${s.un ? ` · 미해결 ${s.un}` : ''}</small></span></button></li>`; }).join('')}</ol>` : '<p class="empty">아직 틀린 한자가 없어요.</p>'}`;
  $('#krv').onclick = () => kStartReview();
  $$('.rank button[data-k]', box).forEach(b => b.onclick = () => kStartKanji(b.dataset.k));
}
