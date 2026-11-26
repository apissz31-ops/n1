/* N1 문법 스와이프 — ← 순접 / → 역접 / ↑ 강조·한정 / ↓ 문말·태도 */
(() => {
  'use strict';
  const KEY = 'n1swipe.v1';
  const EXAM = new Date(2026, 11, 6); // 2026-12-06 (현지 시간)
  const CAT = {
    L: { name: '순접', arrow: '←' },
    R: { name: '역접', arrow: '→' },
    U: { name: '강조·한정', arrow: '↑' },
    D: { name: '문말·태도', arrow: '↓' },
  };
  const DAYS = { 1: 'N1 문법 1~80', 2: 'N1 문법 81~160', 3: 'N1 문법 161~234' };
  const $ = (id) => document.getElementById(id);

  let DATA = [], BY = {};
  let S = load();
  let cur = null;        // 현재 카드 id
  let locked = false;    // 결과 시트 표시 중

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && typeof s === 'object') return Object.assign({ days: {}, stat: {}, sess: null }, s);
    } catch (e) {}
    return { days: {}, stat: {}, sess: null };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- 홈 ---------- */
  function dday() {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const n = Math.round((EXAM - t) / 864e5);
    $('dday').textContent = n > 0 ? `D-${n}` : n === 0 ? 'D-DAY' : '시험 끝';
  }

  function renderHome() {
    show('home');
    dday();
    const box = $('days'); box.innerHTML = '';
    for (const d of [1, 2, 3]) {
      const ids = DATA.filter((g) => g.day === d).map((g) => g.id);
      const info = S.days[d] || {};
      const live = S.sess && S.sess.key === 'day' + d ? S.sess : null;
      let pct = 0, label = '시작';
      if (live) { pct = (live.total - live.queue.length) / live.total; label = '이어서'; }
      else if (info.done) { pct = 1; label = '다시'; }
      const stat = info.done ? `완료 · 첫 시도 정답률 ${info.acc}%` : live ? `남은 카드 ${live.queue.length}장` : `${ids.length}장`;
      const b = document.createElement('button');
      b.className = 'day' + (info.done ? ' done' : '');
      b.innerHTML = `<span class="num">${info.done ? '✓' : d}</span>
        <span class="meta"><b>Day ${d}</b><small>${DAYS[d]} · ${stat}</small>
        <div class="meter"><i style="width:${Math.round(pct * 100)}%"></i></div></span>
        <span class="go">${label}</span>`;
      b.onclick = () => startDay(d, !!live);
      box.appendChild(b);
    }
    const wn = Object.values(S.stat).filter((s) => s.w > 0).length;
    $('btnWrong').textContent = `오답 목록 (${wn})`;
  }

  function show(id) { for (const s of ['home', 'play', 'wrongs']) $(s).hidden = s !== id; window.scrollTo(0, 0); }

  /* ---------- 세션 ---------- */
  function newSess(key, title, ids) {
    S.sess = { key, title, queue: shuffle(ids), total: ids.length, firstOk: 0, seen: {}, wrong: [] };
    save();
  }
  function startDay(d, resume) {
    if (!(resume && S.sess && S.sess.key === 'day' + d)) {
      newSess('day' + d, `Day ${d}`, DATA.filter((g) => g.day === d).map((g) => g.id));
    }
    play();
  }
  function startCustom(key, title, ids) {
    if (!ids.length) return;
    newSess(key, title, ids);
    play();
  }

  function play() {
    show('play');
    nextCard();
  }

  function nextCard() {
    const s = S.sess;
    $('pTitle').textContent = s.title;
    const doneN = s.total - s.queue.length;
    $('pCount').textContent = `${doneN}/${s.total}`;
    $('pBar').style.width = (doneN / s.total * 100) + '%';
    if (!s.queue.length) return finish();
    cur = s.queue[0];
    const g = BY[cur];
    const card = $('card');
    card.className = 'card enter';
    card.style.transform = '';
    card.style.background = '';
    $('hint').style.opacity = 0;
    $('pattern').textContent = g.p;
    $('again').hidden = !s.seen[cur];
    edges(null);
  }

  function answer(dir) {
    if (locked || !cur) return;
    locked = true;
    const s = S.sess, g = BY[cur];
    const ok = dir === g.cat;
    const first = !s.seen[cur];
    s.seen[cur] = true;
    const st = S.stat[cur] || (S.stat[cur] = { w: 0, c: 0 });
    s.queue.shift();
    if (ok) {
      st.c++;
      if (first) s.firstOk++;
    } else {
      st.w++;
      s.queue.push(cur);               // 틀리면 덱 맨 뒤로
      if (!s.wrong.includes(cur)) s.wrong.push(cur);
    }
    save();
    const n = s.total - s.queue.length;
    $('pCount').textContent = `${n}/${s.total}`;
    $('pBar').style.width = (n / s.total * 100) + '%';
    showResult(g, ok, dir);
  }

  function showResult(g, ok, dir) {
    $('verdict').className = 'verdict ' + (ok ? 'ok' : 'ng');
    $('verdict').textContent = ok ? '○ 정답' : '✕ 오답 · 덱 맨 뒤로 보냈어';
    const c = CAT[g.cat];
    let a = `<span class="chip ${g.cat}">${c.arrow} ${c.name} · ${esc(g.sub)}</span>`;
    if (!ok) a += `<span class="chip mine">내 선택: ${CAT[dir].arrow} ${CAT[dir].name}</span>`;
    $('ans').innerHTML = a;
    $('sPattern').textContent = g.p;
    $('sMeaning').textContent = g.m;
    $('sConn').textContent = g.conn ? '접속: ' + g.conn : '';
    $('sJa').innerHTML = g.ex ? g.ex.html : '';
    $('sKo').textContent = g.ex ? g.ex.ko : '';
    $('sNote').textContent = g.note || '';
    $('sheet').querySelector('details').open = false;
    $('sheet').hidden = false;
    $('sheetIn').scrollTop = 0;
    $('btnNext').focus({ preventScroll: true });
  }

  function closeResult() {
    if ($('sheet').hidden) return;
    $('sheet').hidden = true;
    locked = false;
    nextCard();
  }

  function finish() {
    const s = S.sess;
    const acc = Math.round(s.firstOk / s.total * 100);
    if (s.key.startsWith('day')) {
      const d = +s.key.slice(3);
      S.days[d] = { done: true, acc, at: Date.now() };
    }
    const wrong = s.wrong.slice();
    const byCat = {};
    for (const id of wrong) byCat[BY[id].cat] = (byCat[BY[id].cat] || 0) + 1;
    S.lastWrong = wrong;
    S.sess = null;
    save();
    $('dTitle').textContent = `${s.title} 완료`;
    $('dStat').textContent = `${s.total}장 · 첫 시도 정답률 ${acc}% · 틀린 문법 ${wrong.length}개`;
    $('dCats').innerHTML = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a])
      .map((k) => `<span class="chip ${k}">${CAT[k].arrow} ${CAT[k].name}에서 ${byCat[k]}개 틀림</span>`).join('');
    $('btnDoneWrong').hidden = !wrong.length;
    $('done').hidden = false;
    if (window.confetti) confetti({ particleCount: 140, spread: 75, origin: { y: .6 }, colors: ['#e0784a', '#2a9d7c', '#d99a10', '#7b62c8', '#e05a47'] });
  }

  /* ---------- 오답 목록 ---------- */
  function renderWrongs() {
    show('wrongs');
    const list = Object.entries(S.stat).filter(([, s]) => s.w > 0).sort((a, b) => b[1].w - a[1].w);
    $('wrongSum').textContent = list.length ? `한 번이라도 틀린 문법 ${list.length}개 (많이 틀린 순)` : '';
    $('btnWrongPlay').hidden = !list.length;
    $('wlist').innerHTML = list.length ? list.map(([id, s]) => {
      const g = BY[id]; const c = CAT[g.cat];
      return `<li><span class="chip ${g.cat}">${c.arrow}</span><span class="wp">${esc(g.p)}<small>${esc(c.name)} · ${esc(g.sub)} · ${esc(g.m)}</small></span><span class="wn">✕${s.w}</span></li>`;
    }).join('') : '<li class="empty">아직 틀린 문법이 없어</li>';
  }

  /* ---------- 스와이프 ---------- */
  const TH = 80;
  let drag = null;
  function dirOf(dx, dy) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < TH * 0.6) return null;
    return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'L' : 'R') : (dy < 0 ? 'U' : 'D');
  }
  function edges(d) {
    document.querySelectorAll('.edge').forEach((e) => e.classList.remove('on'));
    if (d) document.querySelector('.e-' + { L: 'left', R: 'right', U: 'up', D: 'down' }[d]).classList.add('on');
  }
  const SOFT = { L: 'var(--L-soft)', R: 'var(--R-soft)', U: 'var(--U-soft)', D: 'var(--D-soft)' };
  const INK = { L: 'var(--L)', R: 'var(--R)', U: '#a87500', D: 'var(--D)' };

  function onDown(e) {
    if (locked || !cur) return;
    const card = $('card');
    card.setPointerCapture(e.pointerId);
    card.className = 'card';
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    const card = $('card');
    card.style.transform = `translate(${dx}px,${dy}px) rotate(${dx / 18}deg)`;
    const d = dirOf(dx, dy);
    const h = $('hint');
    if (d) {
      h.textContent = `${CAT[d].arrow} ${CAT[d].name}`;
      h.style.opacity = 1; h.style.color = INK[d];
      card.style.background = SOFT[d];
    } else { h.style.opacity = 0; card.style.background = ''; }
    edges(d);
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag = null;
    const card = $('card');
    const far = Math.max(Math.abs(dx), Math.abs(dy)) >= TH;
    const d = far ? dirOf(dx, dy) : null;
    if (d) fly(d);
    else { card.className = 'card snap'; card.style.transform = ''; card.style.background = ''; $('hint').style.opacity = 0; edges(null); }
  }
  function fly(d) {
    const card = $('card');
    const v = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[d];
    card.style.background = SOFT[d];
    card.className = 'card fly';
    card.style.transform = `translate(${v[0] * 520}px,${v[1] * 720}px) rotate(${v[0] * 18}deg)`;
    edges(d);
    setTimeout(() => answer(d), 180);
  }

  /* ---------- 이벤트 ---------- */
  function bind() {
    const card = $('card');
    card.addEventListener('pointerdown', onDown);
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerup', onUp);
    card.addEventListener('pointercancel', onUp);
    document.querySelectorAll('.dir').forEach((b) => b.onclick = () => { if (!locked && cur) fly(b.dataset.dir); });
    $('btnNext').onclick = closeResult;
    $('sheet').addEventListener('click', (e) => { if (e.target === $('sheet')) closeResult(); });
    $('btnHome').onclick = () => { cur = null; renderHome(); };
    $('btnHome2').onclick = renderHome;
    $('btnWrong').onclick = renderWrongs;
    $('btnAll').onclick = () => startCustom('all', '전체 234', DATA.map((g) => g.id));
    $('btnWrongPlay').onclick = () => {
      const ids = Object.entries(S.stat).filter(([, s]) => s.w > 0).map(([id]) => id);
      startCustom('wrong', '오답 다시', ids);
    };
    $('btnDoneHome').onclick = () => { $('done').hidden = true; cur = null; renderHome(); };
    $('btnDoneWrong').onclick = () => { $('done').hidden = true; startCustom('retry', '이번 오답 다시', S.lastWrong || []); };
    $('btnReset').onclick = () => {
      if (!window.confirm('진도와 오답 기록을 모두 지울까?')) return;
      S = { days: {}, stat: {}, sess: null }; save(); renderHome();
    };
    document.addEventListener('keydown', (e) => {
      if (!$('done').hidden) return;
      if (!$('sheet').hidden) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeResult(); } return; }
      if ($('play').hidden) return;
      const d = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D' }[e.key];
      if (d && !locked && cur) { e.preventDefault(); fly(d); }
    });
  }

  fetch('data.json').then((r) => r.json()).then((d) => {
    DATA = d; BY = Object.fromEntries(d.map((g) => [g.id, g]));
    bind();
    renderHome();
  }).catch(() => { document.body.innerHTML = '<p style="padding:24px">데이터를 불러오지 못했어. 새로고침해 줘.</p>'; });
})();
