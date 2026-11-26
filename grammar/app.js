/* N1 특강 문법 — 3회독(1회독 뜻 고르기 / 2회독 예문 빈칸 / 3회독 뜻 보고 문형 고르기) + 실전 예상 문제 */
(() => {
  'use strict';
  const KEY = 'n1tokkogram.v1';
  const EXAM = new Date(2026, 11, 6);
  const GOAL = new Date(2026, 11, 5);
  const NROUND = 3;
  const QT = {
    '形式': { name: '문법 형식 판단', jp: '文法形式の判断', label: '（　）에 들어갈 가장 알맞은 것은?' },
    '組立': { name: '문장 만들기', jp: '文の組み立て', label: '★에 들어갈 가장 알맞은 것은?' },
  };
  const ROUND = {
    1: { name: '뜻 고르기' },
    2: { name: '예문 빈칸' },
    3: { name: '문형 고르기' },
  };
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

  let G = [], Q = [], BY = {}, QBY = {}, SETS = [], SETNAME = [];
  let S = load();
  let tab = 'home', listQ = '';
  let cur = null, locked = false;

  function load() {
    const base = { prog: { 1: {}, 2: {}, 3: {} }, stat: {}, qstat: {}, sess: null, mode: 'quiz', log: { d: '', n: 0 } };
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') return Object.assign(base, s); } catch (e) {}
    return base;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  const NSET = () => SETS.length;
  const setDone = (r, k) => !!(S.prog[r] && S.prog[r][k]);
  function curRound() { for (let r = 1; r <= NROUND; r++) for (let k = 0; k < NSET(); k++) if (!setDone(r, k)) return r; return 0; }
  function nextSet(r) { for (let k = 0; k < NSET(); k++) if (!setDone(r, k)) return k; return -1; }
  function doneCount() { let n = 0; for (let r = 1; r <= NROUND; r++) for (let k = 0; k < NSET(); k++) if (setDone(r, k)) n++; return n; }
  const todayN = () => S.log.d === today() ? S.log.n : 0;
  function daysLeft(to) { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((to - t) / 864e5); }

  function dday() { const n = daysLeft(EXAM); $('dday').textContent = n > 0 ? `D-${n}` : n === 0 ? 'D-DAY' : '시험 끝'; }
  function render() {
    for (const b of $('tabs').children) b.classList.toggle('on', b.dataset.tab === tab);
    ({ home: renderHome, test: renderTest, weak: renderWeak, list: renderList })[tab]();
  }
  $('tabs').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.tab; render(); window.scrollTo(0, 0); };

  /* ---------- 홈 ---------- */
  function renderHome() {
    const r = curRound();
    const live = S.sess && S.sess.kind === 'set' ? S.sess : null;
    let rows = '';
    for (let i = 1; i <= NROUND; i++) {
      let cells = '';
      const nk = i === r ? nextSet(i) : -1;
      for (let k = 0; k < NSET(); k++) {
        const isLive = live && live.round === i && live.set === k;
        const cls = setDone(i, k) ? 'ok' : isLive ? 'live' : k === nk ? 'next' : '';
        cells += `<button class="set wide ${cls}" data-r="${i}" data-k="${k}">${setDone(i, k) ? '✓ ' : ''}${SETNAME[k]}</button>`;
      }
      const n = [...Array(NSET()).keys()].filter((k) => setDone(i, k)).length;
      rows += `<div class="round ${i === r ? 'cur' : ''}"><div class="rl">${i}회독<small>${ROUND[i].name} · ${n}/${NSET()}</small></div><div class="sets two">${cells}</div></div>`;
    }
    const remain = NSET() * NROUND - doneCount();
    const days = Math.max(1, daysLeft(GOAL) + 1);
    const per = Math.ceil(remain / days);
    const tn = todayN();
    const pace = r === 0
      ? '<b>3회독 완료!</b> 실전 문제와 약점 문형만 돌리세요.'
      : `12/5까지 남은 세트 <b>${remain}개</b> · ${days}일 → 하루 <b>${per}세트</b> 권장. 오늘 ${tn}세트 했어요.${tn >= per ? ' 오늘 목표 달성 ✓' : ''}`;
    let label = '';
    if (live) label = `${live.round}회독 · ${SETNAME[live.set]} 이어서 (${live.total - live.queue.length}/${live.total})`;
    else if (r) label = `${r}회독 · ${SETNAME[nextSet(r)]} 시작 (${SETS[nextSet(r)].length}문형)`;
    $('view').innerHTML = `
      <div class="panel">
        <h2>3회독 진도 <small>짝 표현 6 · 문말 표현 8</small></h2>
        <div class="rounds">${rows}</div>
        <p class="pace">${pace}</p>
      </div>
      ${label ? `<button class="btn" id="go">${label}</button>` : '<button class="btn" id="goTest">실전 문제 풀기</button>'}
      <div class="panel">
        <h2>방식</h2>
        <div class="mode">
          <button data-m="quiz" class="${S.mode === 'quiz' ? 'on' : ''}"><b>4지선다</b>회독마다 뜻→예문→문형으로 바뀜</button>
          <button data-m="card" class="${S.mode === 'card' ? 'on' : ''}"><b>빠른 카드</b>보고 떠올린 뒤 앎/모름</button>
        </div>
        <ul class="how" style="margin-top:12px">
          <li>정답을 고르면 <b>강사 포인트</b>와 비교 문형, 예문이 같이 나와요.</li>
          <li>틀린 문형은 두 문제 뒤에 다시 나와요. 다 맞혀야 세트가 끝나요.</li>
          <li>강사 조언: 시험 전엔 기출 문형, 경어표, 수수동사·수동·사역수동도 한 번 훑고 가세요.</li>
        </ul>
      </div>
      <button class="link" id="reset">진도 초기화</button>`;
    if ($('go')) $('go').onclick = () => live ? play() : startSet(r, nextSet(r));
    if ($('goTest')) $('goTest').onclick = () => { tab = 'test'; render(); };
    for (const b of document.querySelectorAll('.set')) b.onclick = () => {
      const i = +b.dataset.r, k = +b.dataset.k;
      if (live && live.round === i && live.set === k) play(); else startSet(i, k);
    };
    for (const b of document.querySelectorAll('.mode button')) b.onclick = () => { S.mode = b.dataset.m; save(); renderHome(); };
    $('reset').onclick = () => {
      if (!confirm('회독 진도와 기록을 모두 지울까요?')) return;
      S = Object.assign(load(), { prog: { 1: {}, 2: {}, 3: {} }, stat: {}, qstat: {}, sess: null, log: { d: '', n: 0 } }); save(); render();
    };
  }

  /* ---------- 실전 ---------- */
  function renderTest() {
    let html = '<div class="types">';
    for (const t of Object.keys(QT)) {
      const qs = Q.filter((q) => q.t === t);
      const ok = qs.filter((q) => S.qstat[q.id] && S.qstat[q.id].last).length;
      html += `<button class="type" data-t="${t}"><span class="jp">${QT[t].jp}</span><b>${QT[t].name}</b><small>${qs.length}문제 · 마지막에 맞힌 것 ${ok}</small><div class="meter"><i style="width:${ok / qs.length * 100}%"></i></div></button>`;
    }
    html += '</div>';
    const wrong = Q.filter((q) => S.qstat[q.id] && !S.qstat[q.id].last);
    $('view').innerHTML = `
      <div class="panel"><h2>예상 문제 <small>자작 ${Q.length}문제</small></h2>
        <ul class="how"><li>특강 문형으로 만든 N1 문법 파트 형식 문제예요.</li>
        <li>문장 만들기는 ★가 3번째 칸이에요. 팁: 문형 덩어리부터 묶고 구조로 찾기.</li></ul></div>
      ${html}
      <button class="btn" id="tAll">전체 섞어서 ${Q.length}문제</button>
      <button class="btn ghost" id="tWrong" ${wrong.length ? '' : 'disabled'}>틀린 문제만 다시 (${wrong.length})</button>`;
    for (const b of document.querySelectorAll('.type')) b.onclick = () => startTest(QT[b.dataset.t].name, Q.filter((q) => q.t === b.dataset.t).map((q) => q.id));
    $('tAll').onclick = () => startTest('실전 전체', Q.map((q) => q.id));
    $('tWrong').onclick = () => wrong.length && startTest('틀린 문제', wrong.map((q) => q.id));
  }

  /* ---------- 약점 ---------- */
  const score = (id) => { const s = S.stat[id]; return s ? s.w * 2 - s.c : -99; };
  function renderWeak() {
    const weak = G.filter((g) => S.stat[g.id] && S.stat[g.id].w > 0).sort((a, b) => score(b.id) - score(a.id));
    $('view').innerHTML = `
      <div class="panel"><h2>약점 문형 <small>${weak.length}개</small></h2>
        <ul class="how"><li>한 번이라도 틀렸거나 모른다고 한 문형이에요. 많이 틀린 순서예요.</li></ul></div>
      <button class="btn" id="wGo" ${weak.length ? '' : 'disabled'}>약점 ${weak.length}문형 퀴즈</button>
      <ul class="wlist">${weak.length ? weak.map(card).join('') : '<li class="empty">아직 틀린 문형이 없어요.</li>'}</ul>`;
    $('wGo').onclick = () => weak.length && startCustom('약점 문형', weak.map((g) => g.id));
  }

  function exHtml(ex, mark) {
    let ja = esc(ex.ja);
    if (mark) ja = ja.split(esc(ex.b)).join(`<mark>${esc(ex.b)}</mark>`);
    return `<div class="exl"><div class="ja">${ja}</div><div class="ko">${esc(ex.ko)}</div></div>`;
  }
  function detail(g) {
    return `<div class="gconn">${esc(g.conn)}</div>
      <div class="sm">${esc(g.m)}</div>
      <div class="tip-box"><b>👩‍🏫 강사 포인트</b>${esc(g.p)}</div>
      <div class="cmp"><b>비교</b> ${esc(g.cmp)}</div>
      ${g.ex.map((e) => exHtml(e, true)).join('')}`;
  }
  function card(g) {
    const s = S.stat[g.id];
    const n = s ? (s.w ? `<span class="wl-n bad">✕${s.w}</span>` : `<span class="wl-n good">○${s.c}</span>`) : '';
    return `<li><div class="wl-top"><span class="wl-w">${esc(g.pat)}</span><span class="wl-r">${esc(g.cat)}</span>${n}</div>${detail(g)}</li>`;
  }

  function renderList() {
    $('view').innerHTML = `<input class="search" id="q" placeholder="문형·뜻 검색" value="${esc(listQ)}">
      <div class="panel"><h2>강사 총평</h2><ul class="how">
        <li>문법은 가나다순 말고 카테고리(짝 표현, 문말 표현, 부정, 시간…)로 묶어서 공부하라.</li>
        <li>문법은 파트 5(문법)만이 아니라 청해(과제이해·즉시응답)에도 나온다.</li>
        <li>시험 전엔 기출 문형, 경어표, 수수동사·수동·사역수동을 꼭 훑고 가라.</li></ul></div>
      <ul class="wlist" id="wl"></ul>`;
    const draw = () => {
      const q = listQ.trim();
      const gs = G.filter((g) => !q || (g.pat + g.m + g.p + g.conn).includes(q));
      $('wl').innerHTML = gs.length ? gs.map(card).join('') : '<li class="empty">없어요.</li>';
    };
    $('q').oninput = (e) => { listQ = e.target.value; draw(); };
    draw();
  }

  /* ---------- 세션 ---------- */
  function newSess(o) {
    S.sess = Object.assign({ firstOk: 0, seen: {}, wrong: [], streak: 0, best: 0 }, o, { total: o.queue.length, queue: shuffle(o.queue) });
    save(); play();
  }
  function startSet(r, k) { newSess({ kind: 'set', round: r, set: k, title: `${r}회독 · ${SETNAME[k]} · ${ROUND[r].name}`, mode: S.mode, queue: SETS[k].map((g) => g.id) }); }
  function startCustom(title, ids) { newSess({ kind: 'custom', round: 0, title, mode: 'quiz', queue: ids }); }
  function startTest(title, ids) { newSess({ kind: 'test', title, mode: 'test', queue: ids }); }

  function play() { $('play').hidden = false; document.body.style.overflow = 'hidden'; next(); }
  function quit() { $('play').hidden = true; $('sheet').hidden = true; $('done').hidden = true; document.body.style.overflow = ''; locked = false; render(); }
  $('btnQuit').onclick = quit;

  function progress() {
    const s = S.sess, n = s.total - s.queue.length;
    $('pBar').style.width = (n / s.total * 100) + '%';
    $('pStreak').textContent = s.streak >= 2 ? `🔥${s.streak}` : '';
  }

  function next() {
    const s = S.sess;
    $('pTitle').textContent = s.title;
    progress();
    if (!s.queue.length) return finish();
    cur = s.queue[0];
    locked = false;
    if (s.mode === 'test') return askTest(QBY[cur]);
    const g = BY[cur];
    if (s.mode === 'card') return askCard(g);
    const t = s.round === 1 ? 'mean' : s.round === 2 ? 'cloze' : s.round === 3 ? 'rev' : shuffle(['mean', 'cloze', 'rev'])[0];
    askG(g, t);
  }

  // 예문 빈칸에 넣어도 말이 되는 비슷한 문형끼리는 서로 오답으로 내지 않음
  const FAM = [['～なり～なり', '～であれ～であれ', '～にしろ～にしろ'], ['～やら～やら', '～だの～だの'],
    ['～たものではない', '～たものでもない'], ['～までのことだ', '～たらそれまでだ']];
  const fam = (a, b) => FAM.some((f) => f.includes(a) && f.includes(b));
  function others(g, field, n, strict) {
    return shuffle(G.filter((x) => x.id !== g.id && x[field] !== g[field] && !(strict && fam(x.pat, g.pat)))).slice(0, n).map((x) => x[field]);
  }

  function askG(g, t) {
    let html, ans, opts, cls = 'jp';
    const again = S.sess.seen[g.id] ? '<span class="again">다시 나온 문제</span>' : '';
    if (t === 'mean') {
      html = `<div class="qlabel">이 문형의 뜻은?</div><div class="qword gp">${esc(g.pat)}</div>`;
      ans = g.m; opts = others(g, 'm', 3); cls = '';
    } else if (t === 'cloze') {
      const ex = shuffle(g.ex)[0];
      const ja = esc(ex.ja).split(esc(ex.b)).join('<span class="blank">（　　）</span>');
      html = `<div class="qlabel">빈칸에 들어갈 문형은?</div><div class="qsent">${ja}<div class="ko">${esc(ex.ko)}</div></div>`;
      ans = g.pat; opts = others(g, 'pat', 3, true);
    } else {
      html = `<div class="qlabel">이 뜻의 문형은?</div><div class="qmean">${esc(g.m)}</div>`;
      ans = g.pat; opts = others(g, 'pat', 3);
    }
    $('qbox').innerHTML = html + again;
    choices(shuffle([ans].concat(opts)), ans, cls, (ok) => resultG(g, ok));
  }

  function choices(list, ans, cls, cb) {
    const box = $('choices'); box.innerHTML = '';
    list.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'ch ' + cls;
      b.dataset.v = c;
      b.innerHTML = `<span class="n">${i + 1}</span><span>${esc(c)}</span>`;
      b.onclick = () => {
        if (locked) return; locked = true;
        const ok = c === ans;
        for (const x of box.children) { x.disabled = true; if (x.dataset.v === ans) x.classList.add('right'); }
        if (!ok) b.classList.add('wrong');
        setTimeout(() => cb(ok), 260);
      };
      box.appendChild(b);
    });
  }

  function askCard(g) {
    const again = S.sess.seen[g.id] ? '<span class="again">다시 나온 카드</span>' : '';
    $('qbox').innerHTML = `<div class="flip" id="flip"><div class="qword gp">${esc(g.pat)}</div><div class="tap">뜻과 접속, 강사 포인트를 떠올린 뒤 확인</div>${again}</div>`;
    $('choices').innerHTML = '<button class="btn ghost" id="cShow">정답 보기</button>';
    const show = () => {
      $('flip').innerHTML = `<div class="qword gp">${esc(g.pat)}</div><div class="back">${detail(g)}</div>`;
      $('flip').classList.add('open');
      $('choices').innerHTML = '<div class="row"><button class="btn bad" id="cNo">몰라요</button><button class="btn good" id="cYes">알아요</button></div>';
      $('cNo').onclick = () => mark(g, false);
      $('cYes').onclick = () => mark(g, true);
    };
    $('cShow').onclick = show; $('flip').onclick = () => $('cShow') && show();
  }

  function record(id, ok, store) {
    const s = S.sess, first = !s.seen[id];
    s.seen[id] = true;
    const st = store[id] || (store[id] = { c: 0, w: 0 });
    st.last = ok;
    s.queue.shift();
    if (ok) { st.c++; if (first) s.firstOk++; s.streak++; s.best = Math.max(s.best, s.streak); }
    else {
      st.w++; s.streak = 0;
      if (!s.wrong.includes(id)) s.wrong.push(id);
      if (s.mode !== 'test') s.queue.splice(Math.min(2, s.queue.length), 0, id);
    }
    save(); progress();
  }
  function mark(g, ok) { if (locked) return; locked = true; record(g.id, ok, S.stat); next(); }

  function resultG(g, ok) {
    record(g.id, ok, S.stat);
    sheet(ok, ok ? (S.sess.streak >= 3 ? `○ 정답 · ${S.sess.streak}연속!` : '○ 정답') : '✕ 오답 · 두 문제 뒤에 다시 나와요',
      `<div class="sw">${esc(g.pat)}</div>${detail(g)}`);
  }

  function askTest(q) {
    const t = QT[q.t];
    const sent = esc(q.q).replace('★', '<b class="star">★</b>');
    $('qbox').innerHTML = `<span class="qtype">${t.jp} · ${t.name}</span><div class="qlabel">${t.label}</div><div class="qsent">${sent}</div>`;
    const ans = q.ord ? q.ord[2] : q.c[0];
    choices(shuffle(q.c), ans, 'jp', (ok) => {
      record(q.id, ok, S.qstat);
      const g = BY[q.gid];
      const order = q.ord ? `<div class="sp"><b>정답 순서</b> ${q.ord.map((x, i) => i === 2 ? `<b>[★ ${esc(x)}]</b>` : esc(x)).join(' → ')}</div>` : '';
      sheet(ok, ok ? '○ 정답' : `✕ 오답 · 정답: ${ans}`,
        `<div class="sm">${esc(q.e)}</div>${order}
         <div class="sw">${esc(g.pat)}</div><div class="sm">${esc(g.m)}</div>
         <div class="tip-box"><b>👩‍🏫 강사 포인트</b>${esc(g.p)}</div>`);
    });
  }

  function sheet(ok, verdict, body) {
    $('sheetIn').className = 'sheet-in ' + (ok ? 'ok' : 'ng');
    $('verdict').className = 'verdict ' + (ok ? 'ok' : 'ng');
    $('verdict').textContent = verdict;
    $('sBody').innerHTML = body;
    $('btnNext').className = 'btn ' + (ok ? 'good' : 'bad');
    $('sheet').hidden = false;
    $('sheetIn').scrollTop = 0;
  }
  $('btnNext').onclick = () => { $('sheet').hidden = true; next(); };

  function finish() {
    const s = S.sess;
    if (s.kind === 'set') {
      S.prog[s.round][s.set] = true;
      const d = today();
      if (S.log.d !== d) S.log = { d, n: 0 };
      S.log.n++;
    }
    const wrong = s.wrong.slice();
    const acc = Math.round(s.firstOk / s.total * 100);
    S.sess = null; save();
    $('dTitle').textContent = s.kind === 'set' ? `${s.title.split(' · ').slice(0, 2).join(' · ')} 완료` : `${s.title} 완료`;
    $('dStat').textContent = s.mode === 'test' ? `${s.total}문제 중 ${s.firstOk}문제 정답 (${acc}%)` : `첫 시도 정답률 ${acc}% · 최고 연속 ${s.best}`;
    const btns = $('dBtns'); btns.innerHTML = '';
    if (wrong.length) {
      const b = document.createElement('button'); b.className = 'btn ghost'; b.textContent = `틀린 ${wrong.length}개 다시`;
      b.onclick = () => { $('done').hidden = true; s.mode === 'test' ? startTest('틀린 문제', wrong) : startCustom('이번 오답', wrong); };
      btns.appendChild(b);
    }
    const h = document.createElement('button'); h.className = 'btn'; h.textContent = '홈으로'; h.onclick = quit; btns.appendChild(h);
    $('done').hidden = false;
    if (window.confetti) confetti({ particleCount: 140, spread: 75, origin: { y: .6 }, colors: ['#e0784a', '#2a9d7c', '#d99a10', '#7b62c8'] });
  }

  document.addEventListener('keydown', (e) => {
    if ($('play').hidden) return;
    if (!$('sheet').hidden && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('btnNext').click(); return; }
    const n = +e.key;
    if (n >= 1 && n <= 4 && $('sheet').hidden) { const b = $('choices').querySelectorAll('.ch')[n - 1]; if (b) b.click(); }
  });

  fetch('data.json').then((r) => r.json()).then((d) => {
    G = d.grammar; Q = d.quiz;
    for (const g of G) BY[g.id] = g;
    for (const q of Q) QBY[q.id] = q;
    SETNAME = [...new Set(G.map((g) => g.cat))];
    SETS = SETNAME.map((c) => G.filter((g) => g.cat === c));
    dday(); render();
  });
})();
