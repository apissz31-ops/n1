'use strict';
/* N1 문법 퀴즈 — Day별 200문제 본 풀이 → 오답 라운드(전부 맞힐 때까지) → 완료 폭죽.
   저장: localStorage 키 하나(KEY). 데이터: data/grammar.json, data/questions/dayNN.json */
const KEY = 'n1quiz.v1', EXAM = '2026-12-06', START = '2026-11-09', NDAYS = 10;
const CONFETTI = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RUBY = /([一-鿿々〆ヶ]+)\(([぀-ゟー]+)\)/g;
const ruby = s => esc(s).replace(RUBY, '<ruby>$1<rt>$2</rt></ruby>');
const stem = s => esc(s).replace('＿＿＿', '<span class="blank" aria-label="빈칸">&nbsp;</span>');
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const SRC = { shadow: '쉐도잉 N1', speed: '스피드 문법', web: '웹 예문', ai: 'AI 작성' };

let G = [], GM = {}, AVAIL = [], QS = {}, QM = {}, S, R = null;

/* ---------- 저장 ---------- */
function load() {
  try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
  normalize();
}
function normalize() {
  if (!S || typeof S !== 'object' || Array.isArray(S)) S = {};
  S.ans = S.ans || {}; S.wrong = Array.isArray(S.wrong) ? S.wrong : []; S.days = S.days || {};
  S.shuffle = !!S.shuffle; S.showG = !!S.showG; S.theme = S.theme || 'auto';
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('저장하지 못했어요. 브라우저 저장 공간을 확인하세요.'); } }
const ds = d => (S.days[d] = S.days[d] || { pos: 0, main: false, done: false, round: 0, order: null });

/* ---------- 데이터 ---------- */
async function getJSON(u) { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }
async function loadDay(d) {
  if (QS[d]) return QS[d];
  const qs = await getJSON(`data/questions/day${String(d).padStart(2, '0')}.json`);
  qs.forEach(q => { QM[q.id] = q; });
  return (QS[d] = qs);
}
const dayOf = id => (GM[id.slice(0, 4)] || {}).day;
const dayGrammars = d => G.filter(g => g.day === d);

/* ---------- 통계 ---------- */
function dayStats(d) {
  const gs = dayGrammars(d), total = gs.length * 10, st = ds(d);
  let n = 0, ok = 0;
  for (const g of gs) for (let i = 1; i <= 10; i++) { const a = S.ans[`${g.id}-${String(i).padStart(2, '0')}`]; if (a && a.first !== undefined) { n++; if (a.first) ok++; } }
  const solved = st.main ? total : Math.min(st.pos, total);
  const wrong = S.wrong.filter(id => dayOf(id) === d).length;
  return { total, solved, n, ok, acc: pct(ok, n), wrong, done: st.done, main: st.main };
}
function overall() {
  let n = 0, ok = 0;
  for (const a of Object.values(S.ans)) if (a.first !== undefined) { n++; if (a.first) ok++; }
  return { n, ok, total: G.length * 10, acc: pct(ok, n) };
}
function topWrong(gids, k) {
  return gids.map(g => {
    let w = 0; for (let i = 1; i <= 10; i++) { const a = S.ans[`${g.id}-${String(i).padStart(2, '0')}`]; if (a) w += a.w || 0; }
    return { g, w };
  }).filter(x => x.w > 0).sort((a, b) => b.w - a.w).slice(0, k);
}
function dday() { const t = new Date(); t.setHours(0, 0, 0, 0); const e = new Date(EXAM + 'T00:00:00'); const n = Math.round((e - t) / 864e5); return n > 0 ? `D-${n}` : n === 0 ? 'D-DAY' : `D+${-n}`; }
function dayDate(d) { const t = new Date(START + 'T00:00:00'); t.setDate(t.getDate() + d - 1); return `${t.getMonth() + 1}/${t.getDate()}`; }

/* ---------- 공통 UI ---------- */
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
function ask(html, btns) {
  const m = $('#modal');
  m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}<div class="mbtns">${btns.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
  m.hidden = false;
  return new Promise(res => {
    m.onclick = e => { const b = e.target.closest('button[data-i]'); if (b) { m.hidden = true; m.onclick = null; res(btns[+b.dataset.i].value); } else if (e.target === m) { m.hidden = true; m.onclick = null; res(null); } };
    $('button', m).focus();
  });
}
function applyTheme() { if (S.theme === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = S.theme; }
function setTab(tab) {
  R = null; $('#hdr').hidden = false;
  $$('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
  ({ home: renderHome, wrong: renderWrong, settings: renderSettings })[tab]();
  scrollTo(0, 0);
}

/* ---------- 홈 ---------- */
function firstOpenDay() { for (const d of AVAIL) if (!ds(d).done) return d; return null; }
function renderHome() {
  const o = overall(), next = firstOpenDay(), nw = S.wrong.length;
  const tiles = [];
  for (let d = 1; d <= NDAYS; d++) {
    const has = AVAIL.includes(d), st = dayStats(d), gs = dayGrammars(d);
    const prog = pct(st.solved, st.total);
    tiles.push(`<button class="tile${st.done ? ' done' : ''}" data-day="${d}" ${has ? '' : 'disabled'}>
      <span class="th"><b>Day ${d}</b><em>${dayDate(d)}</em>${st.done ? '<span class="ck" aria-label="완료">✓</span>' : ''}</span>
      <span class="ts">${has ? `${gs.length}문법 · ${st.solved}/${st.total}` : '준비 중'}</span>
      <span class="bar"><i style="width:${prog}%"></i></span>
      <span class="ts">${st.n ? `정답률 ${st.acc}%` : '&nbsp;'}${st.wrong ? ` · 오답 ${st.wrong}` : ''}</span></button>`);
  }
  $('#view').innerHTML = `
  <section class="hero">
    <div><span class="big">${dday()}</span><span class="lbl">시험 12/6(일)</span></div>
    <div><span class="big">${o.acc}<small>%</small></span><span class="lbl">정답률 (첫 시도)</span></div>
    <div class="hprog"><div class="progress"><span>${o.n} / ${o.total}문제</span><span class="bar"><i style="width:${pct(o.n, o.total)}%"></i></span><span>${pct(o.n, o.total)}%</span></div></div>
  </section>
  <div class="homebtns">
    <button class="btn primary big" id="go" ${next ? '' : 'disabled'}>${next ? `오늘 이어서 풀기 · Day ${next}` : AVAIL.length < NDAYS ? `Day ${AVAIL.length + 1} 준비 중` : '모든 Day 완료!'}</button>
    <button class="btn no" id="rv" ${nw ? '' : 'disabled'}>오답 다시 풀기 (${nw}개)</button>
  </div>
  <h3 class="sec">Day 1~10 <span>하루 20문법 · 200문제</span></h3>
  <div class="tiles">${tiles.join('')}</div>
  <p class="note">Day를 끝까지 풀면 그 Day의 틀린 문제로 오답 라운드가 이어지고, 전부 맞히면 완료됩니다.</p>`;
  $('#go').onclick = () => next && openDay(next);
  $('#rv').onclick = () => startReview();
  $$('.tile').forEach(b => b.onclick = () => openDay(+b.dataset.day));
}

/* ---------- 흐름 ---------- */
async function openDay(d) {
  await loadDay(d);
  const st = ds(d);
  if (st.done) {
    const v = await ask(`<h3>Day ${d}는 완료했어요</h3><p>200문제를 처음부터 다시 연습할까요? (기록된 정답률은 바뀌지 않아요)</p>`,
      [{ label: '다시 연습', value: 'p', cls: 'primary' }, { label: '닫기', value: null }]);
    if (v === 'p') startList({ mode: 'practice', day: d, list: QS[d].map(q => q.id), i: 0 });
    return;
  }
  if (st.main) {
    if (S.sess && S.sess.mode === 'round' && S.sess.day === d) return startList(S.sess);
    return startRound(d);
  }
  if (st.pos === 0) {
    const prev = S.wrong.filter(id => dayOf(id) < d);
    if (prev.length) {
      const v = await ask(`<h3>Day ${d} 시작 전에</h3><p>이전 Day의 미해결 오답이 <b>${prev.length}개</b> 있어요. 먼저 풀까요?</p>`,
        [{ label: '오답 먼저 풀기', value: 'w', cls: 'primary' }, { label: `바로 Day ${d} 시작`, value: 'd' }]);
      if (v === null) return;
      if (v === 'w') return startReview(prev, d);
    }
  }
  startMain(d);
}
function orderFor(d) {
  const st = ds(d), base = QS[d].map(q => q.id);
  if (!st.order || st.order.length !== base.length) st.order = S.shuffle ? shuffle(base) : base;
  return st.order;
}
function startMain(d) { startList({ mode: 'day', day: d, list: orderFor(d), i: ds(d).pos }); }
function startRound(d) {
  const list = S.wrong.filter(id => dayOf(id) === d);
  if (!list.length) return completeDay(d);
  const st = ds(d); st.round = (st.round || 0) + 1;
  const sess = { mode: 'round', day: d, list: shuffle(list), i: 0, round: st.round };
  S.sess = sess; save();
  ask(`<h3>오답 라운드 ${sess.round}</h3><p>Day ${d}에서 틀린 <b>${list.length}문제</b>를 다시 풉니다. 전부 맞히면 Day ${d} 완료!</p>`, [{ label: '시작', value: 1, cls: 'primary' }])
    .then(() => startList(sess));
}
async function startReview(ids, thenDay) {
  ids = ids || S.wrong.slice();
  if (!ids.length) return toast('미해결 오답이 없어요');
  await Promise.all([...new Set(ids.map(dayOf))].map(loadDay));
  startList({ mode: 'review', list: shuffle(ids), i: 0, round: 1, then: thenDay || null, scope: thenDay ? ids.slice() : null });
}
async function startGrammar(gid) {
  const g = GM[gid]; await loadDay(g.day);
  startList({ mode: 'grammar', day: g.day, gid, list: QS[g.day].filter(q => q.gid === gid).map(q => q.id), i: 0 });
}
function startList(sess) {
  R = Object.assign({ picked: null }, sess);
  if (R.mode === 'round') S.sess = R;
  if (R.i >= R.list.length) return finishList();
  $('#hdr').hidden = true;
  renderQuiz();
}

/* ---------- 퀴즈 화면 ---------- */
function headInfo(q) {
  const g = GM[q.gid], gs = dayGrammars(g.day), k = gs.findIndex(x => x.id === q.gid) + 1, m = R.i + 1, n = R.list.length;
  if (R.mode === 'day') return `Day ${R.day} · 문법 ${k}/${gs.length} · 문제 ${m}/${n}`;
  if (R.mode === 'round') return `Day ${R.day} · 오답 라운드 ${R.round} · ${m}/${n}`;
  if (R.mode === 'review') return `오답 다시 풀기${R.round > 1 ? ` · 라운드 ${R.round}` : ''} · ${m}/${n}`;
  if (R.mode === 'grammar') return `문법 다시 풀기 · ${m}/${n}`;
  return `Day ${R.day} 연습 · 문법 ${k}/${gs.length} · 문제 ${m}/${n}`;
}
function renderQuiz() {
  const q = QM[R.list[R.i]], g = GM[q.gid], done = R.i;
  $('#view').innerHTML = `
  <div class="qhead">
    <div class="qtop"><button class="btn sm" id="home" aria-label="홈으로">← 홈</button><span class="qinfo">${headInfo(q)}</span></div>
    <div class="bar"><i style="width:${pct(done, R.list.length)}%"></i></div>
    <div class="qtools">
      <button class="chip" id="tg" aria-pressed="${S.showG}">문법 보기</button>
      ${R.mode === 'day' ? `<button class="chip" id="sh" aria-pressed="${S.shuffle}">섞기</button>` : ''}
      <span class="gname" ${S.showG ? '' : 'hidden'}><b class="ja">${esc(g.pattern)}</b> ${esc(g.meaning)}</span>
    </div>
  </div>
  <section class="qcard">
    <p class="qstem ja" lang="ja">${stem(q.q)}</p>
    <div class="choices">${q.choices.map((c, i) => `<button class="choice" data-i="${i}"><i>${i + 1}</i><span class="ja" lang="ja">${esc(c)}</span><span class="mk"></span></button>`).join('')}</div>
    <div class="explain" id="exp" hidden></div>
  </section>
  <div class="actions one"><button class="btn primary" id="next" disabled>다음 <small>Enter</small></button></div>`;
  $('#home').onclick = () => setTab('home');
  $('#tg').onclick = e => { S.showG = !S.showG; save(); e.currentTarget.setAttribute('aria-pressed', S.showG); $('.gname').hidden = !S.showG; };
  if ($('#sh')) $('#sh').onclick = e => toggleShuffle(e.currentTarget);
  $$('.choice').forEach(b => b.onclick = () => pick(+b.dataset.i));
  $('#next').onclick = next;
  scrollTo(0, 0);
}
function toggleShuffle(btn) {
  S.shuffle = !S.shuffle; btn.setAttribute('aria-pressed', S.shuffle);
  const st = ds(R.day), base = QS[R.day].map(q => q.id), head = R.list.slice(0, R.i), cur = R.picked === null ? [] : [R.list[R.i]];
  const used = new Set([...head, ...cur]), rest = base.filter(id => !used.has(id));
  st.order = [...head, ...cur, ...(S.shuffle ? shuffle(rest) : rest)];
  R.list = st.order; save();
  toast(S.shuffle ? '남은 문제를 Day 안에서 섞었어요' : '남은 문제를 문법 순서로 되돌렸어요');
}
function pick(i) {
  if (R.picked !== null) return;
  const id = R.list[R.i], q = QM[id], ok = i === q.answer;
  R.picked = i;
  if (R.mode !== 'practice') {
    const a = S.ans[id] = S.ans[id] || { n: 0, w: 0 };
    if (a.first === undefined) a.first = ok;
    a.n++; a.last = i; if (!ok) a.w = (a.w || 0) + 1;
    const k = S.wrong.indexOf(id);
    if (ok && k >= 0) S.wrong.splice(k, 1);
    if (!ok && k < 0) S.wrong.push(id);
    save();
  }
  $$('.choice').forEach((b, j) => {
    b.disabled = true;
    if (j === q.answer) { b.classList.add('r'); $('.mk', b).textContent = '⭕'; }
    else if (j === i) { b.classList.add('w'); $('.mk', b).textContent = '❌'; }
  });
  const g = GM[q.gid], wrongC = q.choices.filter((_, j) => j !== q.answer);
  const exp = $('#exp');
  exp.innerHTML = `
    <p class="verdict ${ok ? 'r' : 'w'}">${ok ? '⭕ 정답' : `❌ 오답 · 정답은 ${q.answer + 1}번 「<span class="ja">${esc(q.choices[q.answer])}</span>」`}</p>
    <div class="key"><b>문장</b><p class="ja sent" lang="ja">${ruby(q.ruby)}</p><p class="ko">${esc(q.ko)}</p></div>
    <div class="key"><b>문법</b><p><span class="ja pat" lang="ja">${esc(g.pattern)}</span> <span class="mean">${esc(g.meaning)}</span></p>
      <p class="sub">접속: ${esc(g.connection)}</p>${g.explain ? `<p>${esc(g.explain)}</p>` : ''}</div>
    <div class="key"><b>정답 근거</b><p>${esc(q.why)}</p></div>
    <div class="key"><b>오답 해설</b><ul class="wl">${q.wrong.map((w, j) => {
      const m = w.match(/^(.+?): (.*)$/), c = wrongC[j];
      if (m) return `<li><span class="ja">${esc(m[1])}</span> ${esc(m[2])}</li>`;
      if (w.startsWith(c)) return `<li><span class="ja">${esc(c)}</span>${esc(w.slice(c.length))}</li>`;
      return `<li><span class="ja">${esc(c)}</span> ${esc(w)}</li>`; }).join('')}</ul></div>
    <p class="meta"><span class="tag">${esc(SRC[q.src] || q.src)}</span>${q.url ? `<a href="${esc(q.url)}" target="_blank" rel="noopener">출처</a>` : ''}${q.fixed ? '<span class="tag exam">원문 수정</span>' : ''}<span>${esc(q.id)}</span></p>`;
  exp.hidden = false;
  const nb = $('#next'); nb.disabled = false; nb.focus({ preventScroll: true });
}
function next() {
  if (R.picked === null) return;
  R.i++; R.picked = null;
  if (R.mode === 'day') { ds(R.day).pos = R.i; }
  save();
  if (R.i >= R.list.length) return finishList();
  renderQuiz();
}
function finishList() {
  const m = R.mode, d = R.day;
  if (m === 'day') { const st = ds(d); st.main = true; st.pos = R.list.length; save(); return startRound(d); }
  if (m === 'round') {
    S.sess = null; save();
    const left = S.wrong.filter(id => dayOf(id) === d);
    return left.length ? startRound(d) : completeDay(d);
  }
  if (m === 'review') {
    const scope = R.scope, left = scope ? S.wrong.filter(id => scope.includes(id)) : S.wrong.slice();
    if (left.length) {
      const r = R.round + 1, then = R.then;
      return ask(`<h3>오답 라운드 ${r}</h3><p>아직 <b>${left.length}문제</b>가 남았어요. 전부 맞힐 때까지 다시 풉니다.</p>`,
        [{ label: '계속', value: 1, cls: 'primary' }, { label: '그만하기', value: 0 }])
        .then(v => v ? startList({ mode: 'review', list: shuffle(left), i: 0, round: r, then, scope }) : (then ? startMain(then) : setTab('home')));
    }
    toast('오답을 모두 해결했어요!');
    return R.then ? startMain(R.then) : setTab('home');
  }
  if (m === 'grammar') { toast('이 문법 10문제를 다 풀었어요'); return setTab('wrong'); }
  toast(`Day ${d} 연습 끝!`); setTab('home');
}
function completeDay(d) {
  const st = ds(d); st.done = true; st.doneAt = new Date().toISOString(); S.sess = null; save();
  R = null; $('#hdr').hidden = false;
  $$('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === 'home'));
  const s = dayStats(d), top = topWrong(dayGrammars(d), 3), nd = AVAIL.find(x => x > d && !ds(x).done);
  $('#view').innerHTML = `
  <section class="result">
    <p class="rk">🎉</p>
    <h2>Day ${d} 완료</h2>
    <p class="racc">정답률 <b>${s.acc}%</b> <small>(첫 시도 ${s.ok}/${s.n})</small></p>
    <h3 class="sec">많이 틀린 문법 3개</h3>
    ${top.length ? `<ol class="rtop">${top.map(x => `<li><button class="link" data-g="${x.g.id}"><span class="ja">${esc(x.g.pattern)}</span> <small>${esc(x.g.meaning)}</small></button><em>${x.w}회</em></li>`).join('')}</ol>` : '<p class="note">틀린 문법이 없어요. 완벽!</p>'}
    <div class="homebtns">${nd ? `<button class="btn primary" id="nd">Day ${nd} 시작</button>` : ''}<button class="btn" id="hm">홈으로</button></div>
  </section>`;
  $('#hm').onclick = () => setTab('home');
  if ($('#nd')) $('#nd').onclick = () => openDay(nd);
  $$('.rtop button').forEach(b => b.onclick = () => startGrammar(b.dataset.g));
  celebrate();
}

/* ---------- 폭죽 ---------- */
function loadConfetti() {
  if (window.confetti) return Promise.resolve(window.confetti);
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = CONFETTI; s.async = true;
    const t = setTimeout(() => rej(new Error('timeout')), 4000);
    s.onload = () => { clearTimeout(t); window.confetti ? res(window.confetti) : rej(new Error('no confetti')); };
    s.onerror = () => { clearTimeout(t); rej(new Error('load')); };
    document.head.appendChild(s);
  });
}
function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  loadConfetti().then(c => {
    const end = Date.now() + 1800;
    c({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
    (function f() {
      c({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 } });
      c({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(f);
    })();
  }).catch(cssConfetti);
}
function cssConfetti() {
  const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  const col = ['#23366e', '#b98a1b', '#2f7a52', '#b04a3a', '#9fb2ea', '#e2b64a'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw'; p.style.background = col[i % col.length];
    p.style.animationDelay = (Math.random() * .8).toFixed(2) + 's'; p.style.animationDuration = (2 + Math.random() * 1.5).toFixed(2) + 's';
    p.style.setProperty('--r', (Math.random() * 720 - 360).toFixed(0) + 'deg');
    box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 4200);
}

/* ---------- 오답 탭 ---------- */
function renderWrong() {
  const rows = topWrong(G, 999), nw = S.wrong.length;
  $('#view').innerHTML = `
  <div class="homebtns"><button class="btn no" id="rv" ${nw ? '' : 'disabled'}>오답 다시 풀기 (${nw}개)</button></div>
  <h3 class="sec">많이 틀린 문법 TOP <span>누르면 그 문법 10문제를 다시 풉니다</span></h3>
  ${rows.length ? `<ol class="rank">${rows.map((x, i) => {
    const un = S.wrong.filter(id => id.startsWith(x.g.id + '-')).length;
    return `<li><button data-g="${x.g.id}"><span class="no">${i + 1}</span><span class="t"><b class="ja">${esc(x.g.pattern)}</b><small>${esc(x.g.meaning)}</small></span><span class="c"><b>${x.w}회</b><small>Day ${x.g.day}${un ? ` · 미해결 ${un}` : ''}</small></span></button></li>`;
  }).join('')}</ol>` : '<p class="empty">아직 틀린 문제가 없어요.</p>'}`;
  $('#rv').onclick = () => startReview();
  $$('.rank button').forEach(b => b.onclick = () => startGrammar(b.dataset.g));
}

/* ---------- 설정 ---------- */
function renderSettings() {
  $('#view').innerHTML = `
  <h3 class="sec">화면</h3>
  <div class="seg" role="group" aria-label="테마">${[['auto', '자동'], ['light', '라이트'], ['dark', '다크']].map(([v, l]) => `<button data-th="${v}" aria-pressed="${S.theme === v}">${l}</button>`).join('')}</div>
  <h3 class="sec">진도 <span>이 기기 브라우저에만 저장돼요</span></h3>
  <div class="settings">
    <button class="btn" id="ex">진도 내보내기 (JSON)</button>
    <label class="btn" for="imf">진도 불러오기</label><input type="file" id="imf" accept="application/json,.json" hidden>
    <button class="btn no" id="rs">초기화</button>
  </div>
  <p class="note">다른 기기로 옮길 때는 내보낸 파일을 그 기기에서 불러오세요. 불러오면 지금 기록을 덮어씁니다.</p>
  <h3 class="sec">자료</h3>
  <p class="note">문법 ${G.length}개 · 예문 출처: 쉐도잉 일본어 문법·문형마스터 N1, 스피드 문법(보강), AI 작성 예문(표시됨).</p>`;
  $$('[data-th]').forEach(b => b.onclick = () => { S.theme = b.dataset.th; save(); applyTheme(); renderSettings(); });
  $('#ex').onclick = () => {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), a = document.createElement('a');
    const t = new Date(); a.href = URL.createObjectURL(blob);
    a.download = `n1quiz-${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#imf').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const o = JSON.parse(await f.text());
      if (!o || typeof o !== 'object' || !o.ans || !o.days) throw new Error('형식');
      const v = await ask('<h3>진도 불러오기</h3><p>지금 기록을 이 파일 내용으로 바꿀까요?</p>', [{ label: '불러오기', value: 1, cls: 'primary' }, { label: '취소', value: 0 }]);
      if (!v) return;
      S = o; normalize(); save(); applyTheme(); toast('불러왔어요'); setTab('home');
    } catch (er) { toast('이 파일은 진도 파일이 아니에요'); }
    e.target.value = '';
  };
  $('#rs').onclick = async () => {
    const v = await ask('<h3>초기화</h3><p>모든 풀이 기록과 오답 목록이 지워지고 되돌릴 수 없어요. 먼저 내보내기를 해 두는 걸 권해요.</p>', [{ label: '모두 지우기', value: 1, cls: 'no' }, { label: '취소', value: 0 }]);
    if (!v) return;
    try { localStorage.removeItem(KEY); } catch (er) { }
    load(); applyTheme(); toast('초기화했어요'); setTab('home');
  };
}

/* ---------- 시작 ---------- */
document.addEventListener('keydown', e => {
  if (!R || !$('#modal').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^[1-4]$/.test(e.key) && R.picked === null) { e.preventDefault(); pick(+e.key - 1); }
  else if (e.key === 'Enter' && R.picked !== null) { e.preventDefault(); next(); }
});
$$('#tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
(async function init() {
  load(); applyTheme();
  $('#dday').textContent = dday();
  try {
    [G, AVAIL] = await Promise.all([getJSON('data/grammar.json'), getJSON('data/questions/index.json')]);
    G.forEach(g => { GM[g.id] = g; });
  } catch (e) {
    $('#view').innerHTML = '<p class="empty">데이터를 불러오지 못했어요. 새로고침해 주세요.</p>'; return;
  }
  setTab('home');
})();
