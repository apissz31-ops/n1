'use strict';
/* N1 암기장 — 하나의 카드 엔진(카드/퀴즈/목록)을 파트 어댑터(문법·단어·한자·읽기 어휘)가 공유한다. */
const KEY = 'n1app.v1', EXAM = '2026-12-06', NEW_UNTIL = '2026-11-22', NEW_STOP = '2026-12-01';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RUBY_SRC = '([\\u4e00-\\u9fff々〆ヶ]+)\\(([\\u3040-\\u309fー]+)\\)';
const rb = s => esc(s).replace(new RegExp(RUBY_SRC, 'g'), '<ruby>$1<rt>$2</rt></ruby>');
const noRuby = s => String(s ?? '').replace(new RegExp(RUBY_SRC, 'g'), '$1');
/* 단어+읽기 → 한자 위 후리가나 HTML (맞출 수 없으면 null). 단어장 화면 전용, 퀴즈에는 쓰지 않음 */
const KJ_RUN = /[一-鿿々〆ヶ]+|[^一-鿿々〆ヶ]+/g, IS_KJ = /[一-鿿々〆ヶ]/;
const toHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
function furi(word, reading) {
  const w = String(word ?? ''), r = String(reading ?? '').replace(/\s+/g, '');
  if (!IS_KJ.test(w)) return esc(w);
  if (!r || r === w || NO_FURI) return null;
  const segs = w.match(KJ_RUN);
  const re = new RegExp('^' + segs.map(s => IS_KJ.test(s) ? '(.+?)' : '(' + toHira(s.replace(/\s+/g, '')).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')').join('') + '$');
  const m = toHira(r).match(re);
  return m ? segs.map((s, i) => IS_KJ.test(s) ? `<ruby>${esc(s)}<rt>${esc(m[i + 1])}</rt></ruby>` : esc(s)).join('') : null;
}
let NO_FURI = false; // 퀴즈 해설을 만들 때 잠깐 켬
let FURI = true; try { FURI = localStorage.getItem('n1-furi') !== '0'; } catch (e) {}
const AI = '<i class="tag ai" title="교재에 없는 내용을 AI가 작성">AI</i>';

/* ---------- 날짜 ---------- */
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => ymd(new Date());
const parse = s => { const [y, m, d] = s.split('-').map(Number); return [y, m - 1, d]; };
const addDays = (s, n) => { const [y, m, d] = parse(s); return ymd(new Date(y, m, d + n)); };
const diffDays = (a, b) => (Date.UTC(...parse(b)) - Date.UTC(...parse(a))) / 864e5;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- 저장 (localStorage 키 하나, 모든 접근 try/catch) ---------- */
const blank = () => ({ v: 1, c: {}, theme: '' });
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1 && s.c && typeof s.c === 'object') return Object.assign(blank(), s); } catch (e) { }
  return blank();
}
let ST = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) { toast('저장하지 못했어요 (브라우저 저장소 차단)'); } }
const rec = id => ST.c[id];

/* Leitner: 모름=오늘, 애매=+1일, 외움=3→7→14일 */
function rate(id, r) {
  const t = today(); let c = ST.c[id];
  if (!c) c = ST.c[id] = { b: 0, miss: 0, first: t };
  if (r === 'no') { c.s = 'no'; c.b = 0; c.due = t; }
  else if (r === 'vague') { c.s = 'vague'; c.b = 0; c.due = addDays(t, 1); }
  else { c.b = Math.min((c.b || 0) + 1, 3); c.s = 'yes'; c.due = addDays(t, [0, 3, 7, 14][c.b]); }
  save();
}
function markWrong(id) { rate(id, 'no'); const c = ST.c[id]; c.miss = (c.miss || 0) + 1; c.lastMiss = today(); save(); }

/* ---------- 파트 어댑터 ---------- */
const srcTag = it => it.page ? 'p.' + it.page : '';
const sec = (title, html) => `<div class="key"><b>${title}</b>${html}</div>`;
const chunks = (items, size, labelOf) => {
  const out = []; for (let i = 0; i < items.length; i += size) {
    const part = items.slice(i, i + size), set = new Set(part.map(x => x.id));
    out.push({ v: 'c' + i, label: labelOf(part[0]) + '–' + labelOf(part[part.length - 1]), f: it => set.has(it.id) });
  } return out;
};
function variantsOf(p) { return String(p).split('・').map(s => s.replace(/^[＝=]/, '').trim()).filter(Boolean); }
const choiceForm = v => v.replace(/^[～〜]/, '');

const GRAMMAR = {
  id: 'grammar', name: '문법', file: 'data/grammar.json', tab: 'grammar',
  label: it => it.pattern, sub: it => it.meaning,
  meta: it => it.sno
    ? `<span>No.${esc(it.no)}<i class="tag exam">스피드 ${esc(it.sno)}</i></span><span>스피드 p.${esc(it.page)}</span>`
    : `<span>No.${esc(it.no)}${it.speed ? '<i class="tag exam">스피드</i>' : ''}</span><span>${srcTag(it)}</span>`,
  front: (it, v) => `<p class="term">${rb(it.pattern)}</p><div class="hintwrap">${v.hint
    ? `<p class="sub">${it.connection ? '접속: ' + esc(it.connection) : '교재에 접속 정보가 없는 문형이에요'}</p>`
    : '<button class="hintbtn" data-act="hint">접속 힌트</button>'}</div>`,
  back(it) {
    let h = `<p class="term sm">${rb(it.pattern)}</p><p class="def">${esc(it.meaning)}</p>`;
    if (it.connection) h += sec('접속', `<p>${esc(it.connection)}</p>`);
    h += sec('예문', it.examples.map(e => `<div class="ex"><p class="ja" lang="ja">${rb(e.ja)}</p><p class="ko">${esc(e.ko)}${e.src ? ` <i class="tag exam">스피드 p.${e.page}</i>` : ''}</p></div>`).join(''));
    if (it.similar && it.similar.length) h += sec('비슷한 표현', it.similar.map(s => `<p class="sim"><b lang="ja">${rb(s.pattern)}</b> ${s.ai ? AI : ''}<br>${esc(s.diff)}</p>`).join(''));
    if (it.point) h += sec('시험 포인트' + (it.point_ai ? AI : ''), `<p>${esc(it.point)}</p>`);
    return h;
  },
  text: it => [it.no, it.sno, it.pattern, it.meaning, it.connection, ...it.examples.map(e => noRuby(e.ja) + ' ' + e.ko), ...(it.similar || []).map(s => s.pattern)].join(' '),
  groups: items => chunks(items, 10, it => it.no),
  chips: ['speed'],
  quiz: grammarQuiz,
};

const WORDS = {
  id: 'words', name: '단어', file: 'data/words.json', tab: 'words',
  head: it => it.word || it.ai_kanji || it.reading,
  label: it => WORDS.head(it), sub: it => it.meaning,
  meta: it => `<span>${it.year ? esc(it.year) + ' 기출' : ''}${it.part ? `<i class="tag">${esc(it.part)}</i>` : ''}</span><span>${srcTag(it)}</span>`,
  front: (it, v) => v.dir === 'rev'
    ? `<p class="term ko">${esc(it.meaning)}</p><div class="hintwrap"></div>`
    : `<p class="term" lang="ja">${FURI && furi(WORDS.head(it), it.reading) || esc(WORDS.head(it))}</p><div class="hintwrap">${!it.word && it.ai_kanji ? `<p class="sub">교재엔 히라가나만 있어 한자 표기는 ${AI}</p>` : ''}</div>`,
  listLabel: it => furi(WORDS.head(it), it.reading),
  back: it => { const f = furi(WORDS.head(it), it.reading); return `<p class="term sm" lang="ja">${f || esc(WORDS.head(it))}</p>${!f && it.reading !== WORDS.head(it) ? `<p class="rd" lang="ja">${esc(it.reading)}</p>` : ''}<p class="def">${esc(it.meaning)}${it.meaning_ai ? ' ' + AI : ''}</p>` +
    (it.meaning_ai ? '<p class="sub">교재에 뜻이 비어 있어 AI가 채웠어요</p>' : '') + (it.note ? sec('메모', `<p>${esc(it.note)}</p>`) : ''); },
  text: it => [it.word, it.ai_kanji, it.reading, it.meaning].join(' '),
  groups(items) {
    const ys = [...new Set(items.map(i => i.year).filter(Boolean))].sort().reverse(), ps = [...new Set(items.map(i => i.part).filter(Boolean))];
    return [...ys.map(y => ({ v: 'y' + y, label: '연도 ' + y, f: it => it.year === y })), ...ps.map(p => ({ v: 'p' + p, label: '유형 ' + p, f: it => it.part === p }))];
  },
  chips: ['dir', 'furi'],
  quiz: meaningQuiz,
};

const KANJI = {
  id: 'kanji', name: '한자', file: 'data/kanji.json', tab: 'kanji',
  label: it => it.kanji, sub: it => it.meaning,
  meta: it => `<span>Day ${esc(it.day)}</span><span>${srcTag(it)}</span>`,
  front: () => '', frontTerm: it => `<p class="term big" lang="ja">${esc(it.kanji)}</p>`,
  back(it) {
    let h = `<p class="term sm" lang="ja">${esc(it.kanji)}</p><p class="def">${esc(it.meaning)}</p>`;
    if (it.on && it.on.length) h += sec('음독', `<p class="rd" lang="ja">${esc(it.on.join('・'))}</p>`);
    if (it.kun && it.kun.length) h += sec('훈독', `<p class="rd" lang="ja">${esc(it.kun.join('・'))}</p>`);
    const row = v => { const f = furi(v.word, v.reading); return `<span class="ja" lang="ja">${f || esc(v.word)}</span><span class="r" lang="ja">${f ? '' : esc(v.reading)}</span><span>${esc(v.meaning)}${v.ai ? ' ' + AI : ''}</span>`; };
    const main = (it.vocab || []).filter(v => !v.tip), tips = (it.vocab || []).filter(v => v.tip);
    if (main.length) h += sec('어휘', `<div class="vocab">${main.map(row).join('')}</div>`);
    if (tips.length) h += sec('함께 알아두기', `<div class="vocab">${tips.map(row).join('')}</div>`);
    return h;
  },
  text: it => [it.kanji, it.meaning, ...(it.on || []), ...(it.kun || []), ...(it.vocab || []).map(v => v.word + ' ' + v.reading + ' ' + v.meaning)].join(' '),
  groups(items) { const ds = [...new Set(items.map(i => i.day))].sort((a, b) => a - b); return ds.map(d => ({ v: 'd' + d, label: 'Day ' + d, f: it => it.day === d })); },
  chips: [],
  quiz: readingQuiz,
};

const READING = {
  id: 'reading', name: '읽기 어휘', file: 'data/reading.json', tab: 'kanji',
  label: it => it.word, sub: it => it.meaning,
  meta: it => `<span>핀포인트<i class="tag">${esc(it.part)}</i></span><span>${srcTag(it)}</span>`,
  front: it => `<p class="term" lang="ja">${FURI && furi(it.word, it.reading) || esc(it.word)}</p><div class="hintwrap">${FURI && it.reading_ai && furi(it.word, it.reading) ? `<p class="sub">후리가나 ${AI}</p>` : ''}</div>`,
  listLabel: it => furi(it.word, it.reading),
  back(it) {
    const pr = it.pair && READING.byId[it.pair], f = furi(it.word, it.reading);
    return `<p class="term sm" lang="ja">${f || esc(it.word)}</p>` + (!f && it.reading !== it.word ? `<p class="rd" lang="ja">${esc(it.reading)}${it.reading_ai ? ' ' + AI : ''}</p>` : '') +
      `<p class="def">${esc(it.meaning)}</p>` + (it.reading_ai ? '<p class="sub">교재에 후리가나가 없어 AI가 읽기를 채웠어요</p>' : '') +
      (pr ? sec('유의어 ≒', `<p><b lang="ja">${furi(pr.word, pr.reading) || esc(pr.word)}</b> <span class="r" lang="ja">${pr.reading !== pr.word && !furi(pr.word, pr.reading) ? esc(pr.reading) : ''}</span> — ${esc(pr.meaning)}</p>`) : '');
  },
  text: it => [it.word, it.reading, it.meaning].join(' '),
  groups(items) { const ps = [...new Set(items.map(i => i.part))]; return ps.map(p => ({ v: 'p' + p, label: '유형 ' + p, f: it => it.part === p })); },
  chips: ['furi'],
  quiz: readingQuiz,
};

const PARTS = { grammar: GRAMMAR, words: WORDS, kanji: KANJI, reading: READING };
const PREFIX = { g: 'grammar', w: 'words', k: 'kanji', r: 'reading' };
const partOf = id => PARTS[PREFIX[id[0]]];
const item = id => { const p = partOf(id); return p && p.byId && p.byId[id]; };

/* ---------- 오늘의 학습량 ---------- */
function stats(p) {
  const t = today(), its = p.items || [];
  let yes = 0, due = 0, unseen = 0, intro = 0;
  for (const it of its) { const c = rec(it.id); if (!c) { unseen++; continue; } if (c.s === 'yes') yes++; if (c.due <= t) due++; if (c.first === t) intro++; }
  return { total: its.length, yes, due, unseen, intro };
}
/* 오늘 새로 볼 카드 목록 */
function newList(p) {
  const t = today(), its = p.items || [];
  if (t >= NEW_STOP) return [];
  const unseen = its.filter(it => !rec(it.id));
  if (p.id === 'kanji') { // 하루치씩 day 순서
    const touched = its.filter(it => rec(it.id) && rec(it.id).first === t).map(it => it.day);
    const day = touched.length ? Math.min(...touched) : (unseen.length ? Math.min(...unseen.map(it => it.day)) : null);
    return day == null ? [] : unseen.filter(it => it.day === day);
  }
  const s = stats(p), days = Math.max(1, diffDays(t, NEW_UNTIL) + 1);
  const target = Math.ceil((s.unseen + s.intro) / days);
  return unseen.slice(0, Math.max(0, target - s.intro));
}
function dueList(p) { const t = today(); return (p.items || []).filter(it => { const c = rec(it.id); return c && c.due <= t; }).sort((a, b) => rec(a.id).due < rec(b.id).due ? -1 : 1); }

/* ---------- 화면 상태 ---------- */
let TAB = 'home', KDECK = 'kanji';
const VS = {};
const vs = p => VS[p.id] || (VS[p.id] = { mode: 'card', range: 'today', bad: false, speed: false, shuf: false, dir: 'fw', order: null, i: 0, flip: false, hint: false, q: null, search: '' });
const curPart = () => TAB === 'kanji' ? PARTS[KDECK] : PARTS[TAB];

function filtered(p) {
  const v = vs(p); let xs;
  if (v.range === 'today') xs = [...dueList(p), ...newList(p)];
  else if (v.range === 'all') xs = p.items.slice();
  else { const g = (p.groupList || []).find(g => g.v === v.range); xs = g ? p.items.filter(g.f) : p.items.slice(); }
  if (v.bad) xs = xs.filter(it => { const c = rec(it.id); return c && c.s !== 'yes'; });
  if (v.speed) xs = xs.filter(it => it.speed);
  return xs;
}
function rebuild(p) {
  const v = vs(p), ids = filtered(p).map(it => it.id);
  v.order = v.shuf ? shuffle(ids) : ids; v.i = 0; v.flip = false; v.hint = false; v.q = null;
}

/* ---------- 렌더: 탭 ---------- */
function setTab(t) {
  TAB = t;
  $$('#tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  $('#p-home').hidden = t !== 'home'; $('#p-wrong').hidden = t !== 'wrong'; $('#p-part').hidden = t === 'home' || t === 'wrong';
  render(); window.scrollTo(0, 0);
}
function render() {
  if (TAB === 'home') renderHome(); else if (TAB === 'wrong') renderWrong(); else renderPart();
}

/* ---------- 홈 ---------- */
function renderHome() {
  const t = today(), dd = diffDays(t, EXAM);
  const all = Object.values(PARTS).filter(p => p.items);
  const tot = all.reduce((a, p) => a + p.items.length, 0), yes = all.reduce((a, p) => a + stats(p).yes, 0);
  let h = `<div class="hero"><div><span class="big">${dd > 0 ? 'D-' + dd : dd === 0 ? 'D-DAY' : '끝'}</span><span class="lbl">시험 12월 6일 (일)</span></div>
    <div><span class="big">${tot ? Math.round(yes / tot * 100) : 0}%</span><span class="lbl">외움 ${yes} / ${tot}</span></div></div>`;
  h += `<h3 class="sec">오늘 할 일 <span>${t >= NEW_STOP ? '12/1부터는 복습만' : '새 카드는 11/22까지 모두 소개'}</span></h3>`;
  for (const p of Object.values(PARTS)) {
    if (!p.items) { h += `<div class="prow"><h4>${p.name} <em>준비 중</em></h4><div class="today">다음 단계에서 데이터가 추가돼요</div><button class="btn sm" disabled>바로 시작</button></div>`; continue; }
    const s = stats(p), nw = newList(p).length, pct = s.total ? s.yes / s.total * 100 : 0;
    h += `<div class="prow"><h4>${p.name} <em>${s.yes} / ${s.total}</em></h4>
      <div class="today">복습 <b>${s.due}</b> · 새 카드 <b>${nw}</b>${p.id === 'kanji' && nw ? ` (Day ${newList(p)[0].day})` : ''}</div>
      <button class="btn sm primary" data-start="${p.id}" ${s.due + nw ? '' : 'disabled'}>바로 시작</button>
      <div class="progress"><div class="bar"><i style="width:${pct}%"></i></div><span>${Math.round(pct)}%</span></div></div>`;
  }
  h += `<h3 class="sec">설정 <span>진행 상황은 이 기기에만 저장돼요</span></h3>
    <div class="settings">
      <button class="btn sm" data-set="export">진행 내보내기</button>
      <button class="btn sm" data-set="import">진행 가져오기</button>
      <button class="btn sm" data-set="theme">화면: ${{ '': '시스템', light: '라이트', dark: '다크' }[ST.theme || '']}</button>
      <button class="btn sm no" data-set="reset">초기화</button>
      <input type="file" id="importFile" accept="application/json,.json" hidden>
    </div>
    <p class="note">PC 단축키: Space 뒤집기 · 1/2/3 모름/애매/외움 · ←→ 이동 · 퀴즈 1–4 선택, Enter 다음</p>`;
  $('#p-home').innerHTML = h;
}

/* ---------- 파트 화면 ---------- */
function renderPart() {
  const p = curPart(), v = vs(p), el = $('#p-part');
  let h = '';
  if (TAB === 'kanji') h += `<div class="decks"><button class="chip" data-deck="kanji" aria-pressed="${KDECK === 'kanji'}">한자</button><button class="chip" data-deck="reading" aria-pressed="${KDECK === 'reading'}">읽기 어휘 (핀포인트)</button></div>`;
  if (!p.items) { el.innerHTML = h + `<div class="empty">${p.name} 데이터는 다음 단계에서 추가됩니다.</div>`; return; }
  if (!v.order) rebuild(p);
  h += `<div class="seg" role="group">${[['card', '카드'], ['quiz', '퀴즈'], ['list', '목록']].map(([m, l]) => `<button data-mode="${m}" aria-pressed="${v.mode === m}">${l}</button>`).join('')}</div>`;
  if (v.mode !== 'list') {
    const s = stats(p);
    h += `<div class="controls"><select id="range" aria-label="범위">
      <option value="today"${v.range === 'today' ? ' selected' : ''}>오늘 학습 (복습 ${s.due} + 새 ${newList(p).length})</option>
      <option value="all"${v.range === 'all' ? ' selected' : ''}>전체 ${p.items.length}</option>
      ${(p.groupList || []).map(g => `<option value="${esc(g.v)}"${v.range === g.v ? ' selected' : ''}>${esc(g.label)}</option>`).join('')}</select>
      <button class="chip warn" data-chip="bad" aria-pressed="${v.bad}">모르는 것만</button>
      ${p.chips.includes('speed') ? `<button class="chip gold" data-chip="speed" aria-pressed="${v.speed}">스피드 문법만</button>` : ''}
      ${p.chips.includes('dir') ? `<button class="chip" data-chip="dir" aria-pressed="${v.dir === 'rev'}">뜻→단어</button>` : ''}
      ${p.chips.includes('furi') && v.mode === 'card' ? `<button class="chip" data-chip="furi" aria-pressed="${FURI}">후리가나</button>` : ''}
      <button class="chip" data-chip="shuf" aria-pressed="${v.shuf}">섞기</button></div>`;
  }
  el.innerHTML = h + '<div id="body"></div>';
  if (v.mode === 'card') renderCard(p); else if (v.mode === 'quiz') renderQuizFor(p); else renderList(p);
}

function cardFront(p, it, v) { return (p.frontTerm ? p.frontTerm(it) : '') + p.front(it, v); }
function renderCard(p) {
  const v = vs(p), body = $('#body'), n = v.order.length;
  if (!n) { body.innerHTML = `<div class="empty">${v.range === 'today' ? '오늘 할 카드를 모두 끝냈어요.' : '조건에 맞는 카드가 없어요.'}${v.range === 'today' ? '<br><button class="btn" data-range="all">전체 보기</button>' : ''}</div>`; return; }
  if (v.i >= n) {
    body.innerHTML = `<div class="empty">이 묶음 ${n}장을 다 봤어요.<br><button class="btn" data-act="restart">처음부터</button><button class="btn primary" data-act="reshuffle">다시 만들기</button></div>`; return;
  }
  const id = v.order[v.i], it = p.byId[id], c = rec(id);
  const known = v.order.filter(x => rec(x) && rec(x).s === 'yes').length;
  const st = c ? { no: '<i class="tag bad">모름</i>', vague: '<i class="tag exam">애매</i>', yes: '<i class="tag good">외움</i>' }[c.s] || '' : '<i class="tag">NEW</i>';
  body.innerHTML = `<div class="progress"><span>${v.i + 1} / ${n}</span><div class="bar"><i style="width:${(v.i + 1) / n * 100}%"></i></div><span>외움 ${known}</span></div>
    <div class="card ${v.flip ? 'back' : 'front'}" id="card" role="button" tabindex="0" aria-label="카드 뒤집기">
      <div class="meta">${p.meta(it)}</div><div class="meta" style="margin-top:-8px"><span>${st}</span></div>
      ${v.flip ? p.back(it) : cardFront(p, it, v) + '<p class="hint">탭해서 뒤집기</p>'}
    </div>
    <div class="actions"><button data-act="prev" aria-label="이전" ${v.i ? '' : 'disabled'}>←</button>
      <button class="no" data-rate="no">모름<small>1</small></button><button class="mid" data-rate="vague">애매<small>2</small></button><button class="yes" data-rate="yes">외움<small>3</small></button>
      <button data-act="next" aria-label="다음">→</button></div>`;
}
function doRate(p, r) {
  const v = vs(p), id = v.order[v.i]; if (!id) return;
  rate(id, r); if (r === 'no') v.order.push(id);
  v.i++; v.flip = false; v.hint = false; renderPart();
}

/* ---------- 목록 ---------- */
function renderList(p) {
  const v = vs(p);
  $('#body').innerHTML = `<input type="search" id="search" placeholder="${p.name} 검색 (일본어·한국어)" value="${esc(v.search)}" autocomplete="off"><div class="list" id="listBox"></div>`;
  fillList(p);
}
function fillList(p) {
  const v = vs(p), q = v.search.trim().toLowerCase();
  const xs = q ? p.items.filter(it => (it._t || (it._t = p.text(it).toLowerCase())).includes(q)) : p.items;
  $('#listBox').innerHTML = (xs.length ? '' : '<div class="empty">검색 결과가 없어요</div>') + xs.slice(0, 400).map(it => {
    const c = rec(it.id);
    return `<details data-id="${it.id}"><summary><i class="dot ${c ? c.s : ''}"></i><span class="l" lang="ja">${p.listLabel && p.listLabel(it) || esc(noRuby(p.label(it)))}</span><span class="m">${esc(p.sub(it))}</span><span class="n">${esc(it.no || it.id)}</span></summary><div class="body"></div></details>`;
  }).join('') + (xs.length > 400 ? `<p class="note">${xs.length}개 중 400개만 표시 — 검색어를 더 입력하세요</p>` : '');
}

/* ---------- 퀴즈 ---------- */
function pickN(pool, n, avoid) {
  const out = [], seen = new Set(avoid);
  for (const x of shuffle(pool)) { if (out.length >= n) break; if (x && !seen.has(x)) { seen.add(x); out.push(x); } }
  return out;
}
function mkQuiz(stem, ask, correct, wrongs, explain, ja = true) {
  const opts = shuffle([correct, ...wrongs.slice(0, 3)]);
  return { stem, ask, choices: opts, correct: opts.indexOf(correct), explain, ja };
}
/* 예문 속 문형을 빈칸으로 */
function tokens(ja) {
  const t = [], re = new RegExp(RUBY_SRC, 'g'); let m, last = 0;
  while ((m = re.exec(ja))) { for (const ch of ja.slice(last, m.index)) t.push({ b: ch }); t.push({ b: m[1], rt: m[2] }); last = re.lastIndex; }
  for (const ch of ja.slice(last)) t.push({ b: ch });
  return t;
}
function findPieces(plain, ps) {
  let from = 0; const out = [];
  for (const p of ps) {
    let found = null; const minK = p.length <= 3 ? p.length : Math.max(3, p.length - 3);
    for (let k = p.length; k >= minK && !found; k--) {
      const idx = plain.indexOf(p.slice(0, k), from);
      if (idx < 0) continue;
      let e = idx + k;
      if (k < p.length) { let ext = 0; while (e < plain.length && ext < p.length - k + 2 && /[ぁ-ゟ]/.test(plain[e])) { e++; ext++; } }
      found = [idx, e];
    }
    if (!found) return null; out.push(found); from = found[1];
  }
  return out;
}
function blankHTML(tok, ranges) {
  let pos = 0, h = '', inB = false;
  for (const t of tok) {
    const s = pos, e = pos + t.b.length; pos = e;
    if (ranges.some(([a, b]) => s < b && e > a)) { if (!inB) { h += '<span class="blank">（　）</span>'; inB = true; } continue; }
    inB = false; h += t.rt ? `<ruby>${esc(t.b)}<rt>${esc(t.rt)}</rt></ruby>` : esc(t.b);
  }
  return h;
}
/* 교재 표기(한자/가나)와 예문 표기가 다르거나 활용된 경우를 위한 대체 형태 */
const ALT = [[/否/, 'いな'], [/皮切り/, 'かわきり'], [/限り/, 'かぎり'], [/言わ/g, 'いわ'], [/いわ/g, '言わ'], [/越した/, 'こした'], [/なる$/, '成'],
  [/^た/, 'だ'], [/きる$/, 'きっ'], [/めく$/, 'めい'], [/かねる$/, 'かね']];
function altForms(forms) {
  const out = [...new Set(forms)];
  for (const [re, to] of ALT) for (const f of out.slice()) if (re.test(f)) { const g = f.replace(re, to); if (!out.includes(g)) out.push(g); }
  return out;
}
function grammarQuiz(it) {
  const items = GRAMMAR.items, n = +it.no;
  const own = variantsOf(it.pattern);
  const neigh = items.filter(x => x.id !== it.id && Math.abs(+x.no - n) <= 6).map(x => choiceForm(variantsOf(x.pattern)[0]));
  const sims = (it.similar || []).map(s => choiceForm(variantsOf(s.pattern)[0])).filter(s => !own.some(o => choiceForm(o) === s));
  const explain = ex => (ex ? `<div class="ex"><p class="ja" lang="ja">${rb(ex.ja)}</p><p class="ko">${esc(ex.ko)}</p></div>` : '') +
    `<p><b lang="ja">${rb(it.pattern)}</b> — ${esc(it.meaning)}</p>${it.point ? `<p class="sub">${esc(it.point)}${it.point_ai ? ' ' + AI : ''}</p>` : ''}`;
  for (const ex of shuffle(it.examples)) {
    const tok = tokens(ex.ja), plain = tok.map(t => t.b).join('');
    for (const v of own) {
      const v0 = v.replace(/^[～〜]/, ''), keep = v0.replace(/[()（）]/g, ''), drop = v0.replace(/\([^)]*\)|（[^）]*）/g, '');
      for (const form of altForms([keep, drop])) {
        const ps = form.split(/[～〜]/).map(s => s.trim()).filter(Boolean);
        if (!ps.length) continue;
        const r = findPieces(plain, ps);
        if (!r) continue;
        const correct = choiceForm(v), wrongs = [...pickN(sims, 2, [correct]), ...pickN(neigh, 3, [correct, ...sims])];
        return mkQuiz(`<span class="ja" lang="ja">${blankHTML(tok, r)}</span>`, '（　）에 들어갈 가장 알맞은 것은?', correct, pickN(wrongs, 3, [correct]).length >= 3 ? pickN(wrongs, 3, [correct]) : pickN([...wrongs, ...neigh], 3, [correct]), explain(ex));
      }
    }
  }
  const correct = choiceForm(own[0]);
  return mkQuiz(`<span>${esc(it.meaning)}</span>`, '이 뜻에 맞는 문형은?', correct, pickN([...sims, ...neigh], 3, [correct]), explain(it.examples[0]));
}
function meaningQuiz(it) {
  const p = partOf(it.id), same = p.items.filter(x => x.id !== it.id && x.part && x.part === it.part).map(x => x.meaning);
  const wr = pickN(same, 3, [it.meaning]); if (wr.length < 3) wr.push(...pickN(p.items.map(x => x.meaning), 3 - wr.length, [it.meaning, ...wr]));
  NO_FURI = true; let ex; try { ex = p.back(it); } finally { NO_FURI = false; }
  return mkQuiz(`<span class="ja" lang="ja">${esc(p.label(it))}</span>`, '뜻으로 알맞은 것은?', it.meaning, wr, ex, false);
}
/* 읽기 함정: 장음·탁음/반탁음·촉음·요음 */
const DAK = {}; ['かが', 'きぎ', 'くぐ', 'けげ', 'こご', 'さざ', 'しじ', 'すず', 'せぜ', 'そぞ', 'ただ', 'ちぢ', 'つづ', 'てで', 'とど', 'はばぱ', 'ひびぴ', 'ふぶぷ', 'へべぺ', 'ほぼぽ']
  .forEach(g => { for (const c of g) DAK[c] = [...g].filter(x => x !== c); });
const OU = new Set('こごそぞとどのほぼぽもよろょくぐすずつづぬふぶぷむゆるゅ');
const SOKU = new Set('かきくけこさしすせそたちつてとぱぴぷぺぽ');
function readingTraps(r) {
  const ch = [...r], out = new Set();
  const rep = (i, s) => [...ch.slice(0, i), s, ...ch.slice(i + 1)].join(''), ins = (i, s) => [...ch.slice(0, i), s, ...ch.slice(i)].join(''), del = i => [...ch.slice(0, i), ...ch.slice(i + 1)].join('');
  ch.forEach((c, i) => {
    (DAK[c] || []).forEach(a => out.add(rep(i, a)));
    if (c === 'う' && i > 0 && OU.has(ch[i - 1])) out.add(del(i));
    if (OU.has(c) && ch[i + 1] !== 'う' && 'ゃゅょ'.indexOf(ch[i + 1]) < 0 && i < ch.length - 1) out.add(ins(i + 1, 'う'));
    if (c === 'っ') out.add(del(i)); else if (i > 0 && SOKU.has(c) && !'っんー'.includes(ch[i - 1])) out.add(ins(i, 'っ'));
    if ('ゃゅょ'.includes(c)) { out.add(rep(i, { 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ' }[c])); }
  });
  out.delete(r); return [...out].filter(x => x && x[0] !== 'っ');
}
function readingQuiz(it) {
  const p = partOf(it.id);
  let w = it;
  if (p.id === 'kanji') { const vv = (it.vocab || []).filter(v => v.reading && !v.ai && !/・/.test(v.reading) && v.word.includes(it.kanji)); if (!vv.length) return meaningQuiz(it); w = vv[Math.random() * vv.length | 0]; }
  else if (w.reading === w.word) return meaningQuiz(it);
  const others = p.id === 'kanji' ? p.items.flatMap(x => (x.vocab || []).map(v => v.reading)) : p.items.map(x => x.reading);
  let wr = pickN(readingTraps(w.reading), 3, [w.reading]);
  if (wr.length < 3) wr.push(...pickN(others, 3 - wr.length, [w.reading, ...wr]));
  return mkQuiz(`<span class="ja ul" lang="ja">${esc(w.word)}</span>`, '밑줄 친 어휘의 읽기로 알맞은 것은?', w.reading, wr,
    `<p><b class="ja" lang="ja">${esc(w.word)}</b> <span class="rd" lang="ja">${esc(w.reading)}</span> — ${esc(w.meaning)}</p>` + (p.id === 'kanji' ? `<p class="sub">한자 <b lang="ja">${esc(it.kanji)}</b> ${esc(it.meaning)}</p>` : ''));
}

function newQuiz(ids) { return { ids: shuffle(ids), i: 0, cur: null, ans: null, right: 0, done: 0 }; }
function renderQuiz(box, q, wrongMode) {
  if (!q.ids.length) { box.innerHTML = `<div class="empty">${wrongMode ? '다시 풀 오답이 없어요.' : '조건에 맞는 문제가 없어요.'}</div>`; return; }
  if (q.i >= q.ids.length) {
    box.innerHTML = `<div class="empty">끝! ${q.done}문제 중 <b>${q.right}</b>개 정답<br><button class="btn primary" data-q="again">다시 풀기</button>${wrongMode ? '<button class="btn" data-q="exit">오답 목록</button>' : ''}</div>`; return;
  }
  const id = q.ids[q.i], it = item(id), p = partOf(id);
  if (!q.cur) q.cur = p.quiz(it);
  const z = q.cur, ans = q.ans;
  box.innerHTML = `<div class="progress"><span>${q.i + 1} / ${q.ids.length}</span><div class="bar"><i style="width:${(q.i + 1) / q.ids.length * 100}%"></i></div><span>정답 ${q.right}/${q.done}</span></div>
    <div class="qcard"><div class="meta"><span>${wrongMode ? p.name + ' · ' : ''}${esc(it.no ? 'No.' + it.no : it.id)}</span><span>${p.meta(it).replace(/<span>|<\/span>/g, '').includes('스피드') ? '<i class="tag exam">스피드</i>' : ''}</span></div>
    <div class="qstem">${z.stem}</div><p class="qask">${z.ask}</p>
    <div class="choices" style="margin-top:10px">${z.choices.map((c, i) => `<button class="choice${ans == null ? '' : i === z.correct ? ' r' : i === ans ? ' w' : ''}" data-choice="${i}" ${ans == null ? '' : 'disabled'}><i>${i + 1}</i><span${z.ja ? ' class="ja" lang="ja"' : ''}>${esc(c)}</span></button>`).join('')}</div>
    ${ans == null ? '' : `<div class="explain"><p class="verdict ${ans === z.correct ? 'r' : 'w'}">${ans === z.correct ? '정답' : '오답 — 모름으로 표시했어요'}</p>${z.explain}</div>`}</div>
    <div class="actions two"><button data-q="prev" ${q.i ? '' : 'disabled'} aria-label="이전">←</button><button class="primary" data-q="next" ${ans == null ? 'disabled' : ''}>다음 문제</button><button data-q="skip" aria-label="건너뛰기">→</button></div>`;
}
function answer(q, i) {
  if (q.ans != null || !q.cur) return;
  q.ans = i; q.done++;
  const id = q.ids[q.i];
  if (i === q.cur.correct) q.right++; else markWrong(id);
}
function quizNav(q, d) { q.i = Math.max(0, q.i + d); q.cur = null; q.ans = null; }
function renderQuizFor(p) { const v = vs(p); if (!v.q) v.q = newQuiz(filtered(p).map(it => it.id)); renderQuiz($('#body'), v.q, false); }

/* ---------- 오답 ---------- */
const WR = { part: 'all', q: null };
function wrongIds() {
  return Object.keys(ST.c).filter(id => ST.c[id].miss > 0 && item(id) && (WR.part === 'all' || partOf(id).id === WR.part))
    .sort((a, b) => ST.c[b].miss - ST.c[a].miss || (ST.c[b].lastMiss || '').localeCompare(ST.c[a].lastMiss || ''));
}
function renderWrong() {
  const el = $('#p-wrong');
  const chips = [['all', '전체'], ...Object.values(PARTS).filter(p => p.items).map(p => [p.id, p.name])]
    .map(([k, l]) => `<button class="chip" data-wpart="${k}" aria-pressed="${WR.part === k}">${l}</button>`).join('');
  if (WR.q) { el.innerHTML = `<div class="controls">${chips}</div><div id="wbody"></div>`; renderQuiz($('#wbody'), WR.q, true); return; }
  const ids = wrongIds();
  el.innerHTML = `<div class="controls">${chips}</div>
    <button class="btn primary" style="width:100%" data-q="startwrong" ${ids.length ? '' : 'disabled'}>틀린 것만 다시 풀기 (${ids.length})</button>
    <div class="list" id="listBox">${ids.length ? ids.map(id => {
      const it = item(id), p = partOf(id), c = ST.c[id];
      return `<details data-id="${id}"><summary><i class="dot ${c.s}"></i><span class="l" lang="ja">${esc(noRuby(p.label(it)))}</span><span class="m">${esc(p.sub(it))}</span><span class="n">${p.name} · ${c.miss}회</span></summary><div class="body"></div></details>`;
    }).join('') : '<div class="empty">아직 틀린 문제가 없어요. 퀴즈에서 틀리면 여기 모여요.</div>'}</div>`;
}

/* ---------- 설정 ---------- */
function applyTheme() { if (ST.theme) document.documentElement.dataset.theme = ST.theme; else delete document.documentElement.dataset.theme; }
let toastT;
function toast(msg) { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2200); }
function doExport() {
  const blob = new Blob([JSON.stringify(ST)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'n1-progress-' + today() + '.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function doImport(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const s = JSON.parse(fr.result);
      if (!s || s.v !== 1 || typeof s.c !== 'object') throw 0;
      if (!confirm(`가져온 진행(${Object.keys(s.c).length}장)으로 지금 기록을 덮어쓸까요?`)) return;
      ST = Object.assign(blank(), s); save(); applyTheme(); Object.keys(VS).forEach(k => delete VS[k]); render(); toast('가져오기 완료');
    } catch (e) { toast('올바른 진행 파일이 아니에요'); }
  };
  fr.readAsText(file);
}

/* ---------- 이벤트 ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button,[data-id] summary,#card');
  if (!b) return;
  const d = b.dataset;
  if (d.tab) return setTab(d.tab);
  if (d.start) { const p = PARTS[d.start]; if (p.tab === 'kanji') KDECK = p.id; const v = vs(p); v.mode = 'card'; v.range = 'today'; v.bad = v.speed = false; rebuild(p); return setTab(p.tab); }
  if (d.set) {
    if (d.set === 'export') doExport();
    else if (d.set === 'import') $('#importFile').click();
    else if (d.set === 'theme') { ST.theme = { '': 'light', light: 'dark', dark: '' }[ST.theme || '']; save(); applyTheme(); renderHome(); }
    else if (d.set === 'reset' && confirm('모든 진행 기록을 지울까요? 되돌릴 수 없어요.')) { ST = Object.assign(blank(), { theme: ST.theme }); save(); Object.keys(VS).forEach(k => delete VS[k]); WR.q = null; renderHome(); toast('초기화했어요'); }
    return;
  }
  if (d.wpart) { WR.part = d.wpart; WR.q = null; return renderWrong(); }
  if (d.q) {
    if (d.q === 'startwrong') { WR.q = newQuiz(wrongIds()); return renderWrong(); }
    if (d.q === 'exit') { WR.q = null; return renderWrong(); }
    const inWrong = TAB === 'wrong', p = curPart(), q = inWrong ? WR.q : vs(p).q;
    if (d.q === 'again') { if (inWrong) WR.q = newQuiz(wrongIds()); else vs(p).q = null; }
    else if (d.q === 'next' || d.q === 'skip') quizNav(q, 1);
    else if (d.q === 'prev') quizNav(q, -1);
    return render();
  }
  if (d.choice != null) { const q = TAB === 'wrong' ? WR.q : vs(curPart()).q; answer(q, +d.choice); return render(); }
  if (d.deck) { KDECK = d.deck; return renderPart(); }
  const p = TAB === 'home' || TAB === 'wrong' ? null : curPart();
  if (b.tagName === 'SUMMARY') {
    const det = b.parentElement, body = $('.body', det);
    if (!body.innerHTML) { const id = det.dataset.id; body.innerHTML = partOf(id).back(item(id)); }
    return;
  }
  if (!p) return;
  const v = vs(p);
  if (d.mode) { v.mode = d.mode; v.q = null; return renderPart(); }
  if (d.chip === 'furi') { FURI = !FURI; try { localStorage.setItem('n1-furi', FURI ? '1' : '0'); } catch (e) {} return renderPart(); }
  if (d.chip) { if (d.chip === 'dir') v.dir = v.dir === 'rev' ? 'fw' : 'rev'; else v[d.chip] = !v[d.chip]; if (d.chip !== 'dir') rebuild(p); return renderPart(); }
  if (d.range) { v.range = d.range; rebuild(p); return renderPart(); }
  if (d.rate) return doRate(p, d.rate);
  if (d.act === 'hint') { v.hint = true; return renderPart(); }
  if (d.act === 'prev') { v.i = Math.max(0, v.i - 1); v.flip = v.hint = false; return renderPart(); }
  if (d.act === 'next') { v.i++; v.flip = v.hint = false; return renderPart(); }
  if (d.act === 'restart') { v.i = 0; return renderPart(); }
  if (d.act === 'reshuffle') { rebuild(p); return renderPart(); }
  if (b.id === 'card') { v.flip = !v.flip; return renderPart(); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'range') { const p = curPart(), v = vs(p); v.range = e.target.value; rebuild(p); renderPart(); }
  if (e.target.id === 'importFile' && e.target.files[0]) doImport(e.target.files[0]);
});
document.addEventListener('input', e => { if (e.target.id === 'search') { const p = curPart(); vs(p).search = e.target.value; fillList(p); } });
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (TAB === 'home') return;
  const k = e.key;
  const p = TAB === 'wrong' ? null : curPart(), v = p && vs(p);
  const q = TAB === 'wrong' ? WR.q : v && v.mode === 'quiz' ? v.q : null;
  if (q) {
    if (/^[1-4]$/.test(k) && q.ans == null && q.cur) { answer(q, +k - 1); render(); e.preventDefault(); }
    else if ((k === 'Enter' || k === 'ArrowRight') && q.ans != null) { quizNav(q, 1); render(); e.preventDefault(); }
    else if (k === 'ArrowLeft') { quizNav(q, -1); render(); e.preventDefault(); }
    return;
  }
  if (!v || v.mode !== 'card' || !p.items) return;
  if (k === ' ') { v.flip = !v.flip; renderPart(); e.preventDefault(); }
  else if (k === '1' || k === '2' || k === '3') { doRate(p, ['no', 'vague', 'yes'][+k - 1]); e.preventDefault(); }
  else if (k === 'ArrowLeft') { v.i = Math.max(0, v.i - 1); v.flip = v.hint = false; renderPart(); e.preventDefault(); }
  else if (k === 'ArrowRight') { v.i++; v.flip = v.hint = false; renderPart(); e.preventDefault(); }
});

/* ---------- 시작 ---------- */
function updateDday() { const dd = diffDays(today(), EXAM); $('#dday').textContent = (dd > 0 ? 'D-' + dd : dd === 0 ? 'D-DAY' : '시험 끝') + ' · 12.6'; }
async function init() {
  applyTheme(); updateDday();
  await Promise.all(Object.values(PARTS).map(async p => {
    try {
      const r = await fetch(p.file, { cache: 'no-cache' }); if (!r.ok) return;
      const items = await r.json(); if (!Array.isArray(items) || !items.length) return;
      p.items = items; p.byId = Object.fromEntries(items.map(it => [it.id, it])); p.groupList = p.groups(items);
    } catch (e) { }
  }));
  render();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { updateDday(); if (TAB === 'home') renderHome(); } });
init();
