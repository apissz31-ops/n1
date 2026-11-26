/* N1 특강 단어 — 3회독(1회독 뜻 고르기 / 2회독 읽기 고르기 / 3회독 단어 고르기) + 실전 예상 문제 */
(() => {
  'use strict';
  const KEY = 'n1vocab.v1';
  const EXAM = new Date(2026, 11, 6);      // 시험일
  const GOAL = new Date(2026, 11, 5);      // 3회독 마감(시험 전날)
  const NSET = 6, NROUND = 3;
  const SEC = { 1: '기출 예시', 2: '빈출 2·3회', 3: '재출제 유력', 4: '예상 명사', 5: '예상 형용사', 6: '예상 동사', 7: '부사·가타카나' };
  const QT = {
    '読み': { name: '한자 읽기', jp: '漢字読み', label: '밑줄 친 단어의 읽기로 가장 알맞은 것은?' },
    '文脈': { name: '문맥 규정', jp: '文脈規定', label: '（　）에 들어갈 가장 알맞은 것은?' },
    '言換': { name: '유의 표현', jp: '言い換え', label: '밑줄 친 말과 의미가 가장 가까운 것은?' },
    '用法': { name: '용법', jp: '用法', label: '다음 단어를 가장 바르게 쓴 문장은?' },
  };
  const ROUND = {
    1: { name: '뜻 고르기', desc: '단어를 보고 뜻 고르기' },
    2: { name: '읽기 고르기', desc: '한자 단어의 읽기 고르기 (가나 단어는 단어 고르기)' },
    3: { name: '단어 고르기', desc: '뜻을 보고 단어 고르기' },
  };
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hasKanji = (s) => /[一-龯々]/.test(s);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

  let W = [], Q = [], BY = {}, QBY = {}, SETS = [];
  let S = load();
  let tab = 'home', listSec = 0, listQ = '';
  let cur = null, locked = false;

  function load() {
    const base = { prog: { 1: {}, 2: {}, 3: {} }, stat: {}, qstat: {}, sess: null, mode: 'quiz', log: { d: '', n: 0 } };
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && typeof s === 'object') return Object.assign(base, s);
    } catch (e) {}
    return base;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  /* ---------- 진도 계산 ---------- */
  const setDone = (r, k) => !!(S.prog[r] && S.prog[r][k]);
  function curRound() { for (let r = 1; r <= NROUND; r++) for (let k = 0; k < NSET; k++) if (!setDone(r, k)) return r; return 0; }
  function nextSet(r) { for (let k = 0; k < NSET; k++) if (!setDone(r, k)) return k; return -1; }
  function doneCount() { let n = 0; for (let r = 1; r <= NROUND; r++) for (let k = 0; k < NSET; k++) if (setDone(r, k)) n++; return n; }
  function todayN() { return S.log.d === today() ? S.log.n : 0; }
  function daysLeft(to) { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((to - t) / 864e5); }

  /* ---------- 헤더·탭 ---------- */
  function dday() {
    const n = daysLeft(EXAM);
    $('dday').textContent = n > 0 ? `D-${n}` : n === 0 ? 'D-DAY' : '시험 끝';
  }
  function render() {
    for (const b of $('tabs').children) b.classList.toggle('on', b.dataset.tab === tab);
    ({ home: renderHome, test: renderTest, weak: renderWeak, list: renderList })[tab]();
  }
  $('tabs').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.tab; render(); window.scrollTo(0, 0); };

  /* ---------- 홈 (회독) ---------- */
  function renderHome() {
    const r = curRound();
    const live = S.sess && S.sess.kind === 'set' ? S.sess : null;
    let rows = '';
    for (let i = 1; i <= NROUND; i++) {
      let cells = '';
      const nk = i === r ? nextSet(i) : -1;
      for (let k = 0; k < NSET; k++) {
        const isLive = live && live.round === i && live.set === k;
        const cls = setDone(i, k) ? 'ok' : isLive ? 'live' : k === nk ? 'next' : '';
        cells += `<button class="set ${cls}" data-r="${i}" data-k="${k}">${setDone(i, k) ? '✓' : k + 1}</button>`;
      }
      const n = [...Array(NSET).keys()].filter((k) => setDone(i, k)).length;
      rows += `<div class="round ${i === r ? 'cur' : ''}"><div class="rl">${i}회독<small>${ROUND[i].name} · ${n}/${NSET}</small></div><div class="sets">${cells}</div></div>`;
    }
    const remain = NSET * NROUND - doneCount();
    const days = Math.max(1, daysLeft(GOAL) + 1);
    const per = Math.ceil(remain / days);
    const tn = todayN();
    const pace = r === 0
      ? '<b>3회독 완료!</b> 이제 실전 문제와 약점 단어만 돌리세요.'
      : `12/5까지 남은 세트 <b>${remain}개</b> · ${days}일 → 하루 <b>${per}세트</b> 권장. 오늘 ${tn}세트 했어요.${tn >= per ? ' 오늘 목표 달성 ✓' : ''}`;
    let label = '';
    if (live) label = `${live.round}회독 세트 ${live.set + 1} 이어서 (${live.total - live.queue.length}/${live.total})`;
    else if (r) label = `${r}회독 세트 ${nextSet(r) + 1} 시작 (${SETS[nextSet(r)].length}단어)`;
    $('view').innerHTML = `
      <div class="panel">
        <h2>3회독 진도 <small>세트당 23~24단어</small></h2>
        <div class="rounds">${rows}</div>
        <p class="pace">${pace}</p>
      </div>
      ${label ? `<button class="btn" id="go">${label}</button>` : `<button class="btn" id="goTest">실전 문제 풀기</button>`}
      <div class="panel">
        <h2>방식</h2>
        <div class="mode">
          <button data-m="quiz" class="${S.mode === 'quiz' ? 'on' : ''}"><b>4지선다</b>회독마다 뜻→읽기→단어로 바뀜</button>
          <button data-m="card" class="${S.mode === 'card' ? 'on' : ''}"><b>빠른 카드</b>보고 떠올린 뒤 앎/모름</button>
        </div>
        <ul class="how" style="margin-top:12px">
          <li>틀리거나 모른 단어는 세 장 뒤에 다시 나와요. 다 맞혀야 세트가 끝나요.</li>
          <li>회독마다 묻는 방향이 달라서 같은 단어를 세 번 다른 각도로 봐요.</li>
          <li>세트 칸을 누르면 그 세트를 아무 때나 다시 할 수 있어요.</li>
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

  /* ---------- 실전 문제 ---------- */
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
        <ul class="how"><li>특강 단어로 만든 실제 N1 형식 문제예요. 강의 연습문제 유형을 따랐어요.</li>
        <li>회독을 한 번 끝낸 뒤 풀면 효과가 커요. 3회독 사이사이에 섞어 풀어도 좋아요.</li></ul></div>
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
    const weak = W.filter((w) => S.stat[w.id] && S.stat[w.id].w > 0).sort((a, b) => score(b.id) - score(a.id));
    const top = weak.slice(0, 20);
    $('view').innerHTML = `
      <div class="panel"><h2>약점 단어 <small>${weak.length}개</small></h2>
        <ul class="how"><li>한 번이라도 틀렸거나 모른다고 한 단어예요. 많이 틀린 순서예요.</li>
        <li>마무리 주(11/30~12/5)엔 새 세트보다 이걸 먼저 돌리세요.</li></ul></div>
      <button class="btn" id="wGo" ${top.length ? '' : 'disabled'}>약점 ${top.length}단어 퀴즈</button>
      <ul class="wlist">${weak.length ? weak.map(item).join('') : '<li class="empty">아직 틀린 단어가 없어요.</li>'}</ul>`;
    $('wGo').onclick = () => top.length && startCustom('약점 단어', top.map((w) => w.id));
  }
  function item(w) {
    const s = S.stat[w.id];
    const n = s ? (s.w ? `<span class="wl-n bad">✕${s.w}</span>` : `<span class="wl-n good">○${s.c}</span>`) : '';
    return `<li><div class="wl-top"><span class="wl-w">${w.star ? '<span class="star">★</span>' : ''}${esc(w.w)}</span>${w.r !== w.w ? `<span class="wl-r">${esc(w.r)}</span>` : ''}${n}</div>
      <div class="wl-m">${esc(w.m)}</div><div class="wl-p">${esc(w.p)}</div></li>`;
  }

  /* ---------- 단어장 ---------- */
  function renderList() {
    let chips = `<button data-s="0" class="${listSec === 0 ? 'on' : ''}">전체</button>`;
    for (const k of Object.keys(SEC)) chips += `<button data-s="${k}" class="${listSec === +k ? 'on' : ''}">${SEC[k]}</button>`;
    $('view').innerHTML = `<input class="search" id="q" placeholder="단어·읽기·뜻 검색" value="${esc(listQ)}">
      <div class="secs">${chips}</div><ul class="wlist" id="wl"></ul>`;
    const draw = () => {
      const q = listQ.trim();
      const ws = W.filter((w) => (!listSec || w.sec === listSec) && (!q || (w.w + w.r + w.m + w.p).includes(q)));
      $('wl').innerHTML = ws.length ? ws.map(item).join('') : '<li class="empty">없어요.</li>';
    };
    $('q').oninput = (e) => { listQ = e.target.value; draw(); };
    for (const b of document.querySelectorAll('.secs button')) b.onclick = () => { listSec = +b.dataset.s; renderList(); };
    draw();
  }

  /* ---------- 세션 ---------- */
  function newSess(o) {
    S.sess = Object.assign({ firstOk: 0, seen: {}, wrong: [], streak: 0, best: 0 }, o, { total: o.queue.length, queue: shuffle(o.queue) });
    save(); play();
  }
  function startSet(r, k) { newSess({ kind: 'set', round: r, set: k, title: `${r}회독 · 세트 ${k + 1} · ${ROUND[r].name}`, mode: S.mode, queue: SETS[k].map((w) => w.id) }); }
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
    const w = BY[cur];
    if (s.mode === 'card') return askCard(w);
    askWord(w, qtype(w, s.round));
  }

  /* 단어 문제 유형 */
  function qtype(w, r) {
    const kan = hasKanji(w.w) && w.r !== w.w;
    if (r === 1) return 'mean';
    if (r === 2) return kan ? 'read' : 'rev';
    if (r === 3) return 'rev';
    return shuffle(kan ? ['mean', 'read', 'rev'] : ['mean', 'rev'])[0];
  }

  function pickOthers(w, field, n, ok) {
    const same = shuffle(W.filter((x) => x.id !== w.id && x.sec === w.sec && ok(x)));
    const rest = shuffle(W.filter((x) => x.id !== w.id && x.sec !== w.sec && ok(x)));
    const out = [];
    for (const x of same.slice(0, 2).concat(rest, same.slice(2))) {
      if (out.length >= n) break;
      if (!out.includes(x[field]) && x[field] !== w[field]) out.push(x[field]);
    }
    return out;
  }

  const DAK = { か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ', た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ' };
  const HAN = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ', ば: 'ぱ', び: 'ぴ', ぶ: 'ぷ', べ: 'ぺ', ぼ: 'ぽ' };
  const UNDAK = {}; for (const k in DAK) UNDAK[DAK[k]] = k; for (const k in HAN) if (!UNDAK[HAN[k]]) UNDAK[HAN[k]] = k;
  const OROW = 'おこごそぞとどのほぼぽもよろょ', UROW = 'うくぐすずつづぬふぶぷむゆるゅ';
  const SMALL = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ' };
  function variants(r) {
    const out = new Set(), a = [...r];
    a.forEach((c, i) => {
      const sw = (x) => out.add(a.slice(0, i).join('') + x + a.slice(i + 1).join(''));
      if (DAK[c]) sw(DAK[c]);
      if (UNDAK[c]) sw(UNDAK[c]);
      if (HAN[c] && c !== 'ぱ') sw(HAN[c]);
      if (c === 'っ') { sw('つ'); sw(''); }
      if (SMALL[c]) { sw(SMALL[c]); sw(''); }
      if ((OROW.includes(c) || UROW.includes(c)) && a[i + 1] !== 'う') sw(c + 'う');
      if (c === 'う' && i > 0 && (OROW.includes(a[i - 1]) || UROW.includes(a[i - 1]))) sw('');
      if (i > 0 && 'かきくけこさしすせそたちつてとぱぴぷぺぽ'.includes(c) && a[i - 1] !== 'っ' && i === a.length - 2) {
        out.add(a.slice(0, i).join('') + 'っ' + a.slice(i).join(''));
      }
    });
    out.delete(r);
    for (const x of [...out]) if (x.length < 2 || /^[ぁぃぅぇぉっゃゅょー]/.test(x)) out.delete(x);
    return shuffle([...out]);
  }

  function askWord(w, t) {
    let label, html, ans, opts, jp = false;
    if (t === 'mean') {
      label = '이 단어의 뜻은?';
      html = `<div class="qword">${esc(w.w)}</div>`;
      ans = w.m; opts = pickOthers(w, 'm', 3, () => true);
    } else if (t === 'read') {
      label = '이 단어의 읽기는?';
      html = `<div class="qword">${esc(w.w)}</div>`;
      ans = w.r; jp = true;
      opts = variants(w.r).slice(0, 3);
      if (opts.length < 3) opts = opts.concat(pickOthers(w, 'r', 3 - opts.length, (x) => x.r !== x.w && Math.abs(x.r.length - w.r.length) <= 2));
    } else {
      label = '이 뜻의 단어는?';
      html = `<div class="qmean">${esc(w.m)}</div>`;
      ans = w.w; jp = true; opts = pickOthers(w, 'w', 3, (x) => x.m !== w.m);
    }
    const again = S.sess.seen[w.id] ? '<span class="again">다시 나온 문제</span>' : '';
    $('qbox').innerHTML = `<div class="qlabel">${label}</div>${html}${again}`;
    choices(shuffle([ans].concat(opts)), ans, jp ? 'jp' : '', (ok) => resultWord(w, ok));
  }

  function choices(list, ans, cls, cb) {
    const box = $('choices'); box.innerHTML = '';
    list.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'ch ' + cls;
      b.innerHTML = `<span class="n">${i + 1}</span><span>${esc(c)}</span>`;
      b.onclick = () => {
        if (locked) return; locked = true;
        const ok = c === ans;
        for (const x of box.children) { x.disabled = true; if (x.textContent.slice(1) === ans) x.classList.add('right'); }
        if (!ok) b.classList.add('wrong');
        setTimeout(() => cb(ok), 260);
      };
      box.appendChild(b);
    });
  }

  function askCard(w) {
    const again = S.sess.seen[w.id] ? '<span class="again">다시 나온 카드</span>' : '';
    $('qbox').innerHTML = `<div class="flip" id="flip"><div class="qword">${esc(w.w)}</div><div class="tap">뜻과 읽기를 떠올린 뒤 눌러서 확인</div>${again}</div>`;
    $('choices').innerHTML = '<button class="btn ghost" id="cShow">정답 보기</button>';
    const show = () => {
      $('flip').innerHTML = `<div class="qword">${esc(w.w)}</div><div class="back">${w.r !== w.w ? `<div class="sr">${esc(w.r)}</div>` : ''}<div class="sm">${esc(w.m)}</div><div class="wl-p">${esc(w.p)}</div></div>`;
      $('choices').innerHTML = '<div class="row"><button class="btn bad" id="cNo">몰라요</button><button class="btn good" id="cYes">알아요</button></div>';
      $('cNo').onclick = () => mark(w, false);
      $('cYes').onclick = () => mark(w, true);
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
      if (s.mode !== 'test') s.queue.splice(Math.min(3, s.queue.length), 0, id);
    }
    save(); progress();
  }

  function mark(w, ok) { if (locked) return; locked = true; record(w.id, ok, S.stat); next(); }

  function resultWord(w, ok) {
    record(w.id, ok, S.stat);
    sheet(ok, ok ? (S.sess.streak >= 3 ? `○ 정답 · ${S.sess.streak}연속!` : '○ 정답') : '✕ 오답 · 세 문제 뒤에 다시 나와요',
      `<div class="sw">${w.star ? '<span class="star">★</span>' : ''}${esc(w.w)}</div>
       ${w.r !== w.w ? `<div class="sr">${esc(w.r)}</div>` : ''}
       <div class="sm">${esc(w.m)}</div><div class="sp">${esc(w.p)}</div>`);
  }

  function askTest(q) {
    const t = QT[q.t];
    const again = '';
    let html = `<span class="qtype">${t.jp} · ${t.name}</span><div class="qlabel">${t.label}</div>`;
    html += q.t === '用法' ? `<div class="qword">${q.q.replace(/<\/?u>/g, '')}</div>` : `<div class="qsent">${q.q}</div>`;
    $('qbox').innerHTML = html + again;
    const ans = q.c[0];
    choices(shuffle(q.c), ans, q.t === '用法' ? 'long' : 'jp', (ok) => {
      record(q.id, ok, S.qstat);
      const w = BY[q.wid];
      sheet(ok, ok ? '○ 정답' : `✕ 오답 · 정답: ${ans}`,
        `<div class="sm">${esc(q.e)}</div>
         <div class="sp"><b class="ja">${esc(w.w)}</b>${w.r !== w.w ? ` (${esc(w.r)})` : ''} · ${esc(w.m)}<br>${esc(w.p)}</div>`);
    });
  }

  function sheet(ok, verdict, body) {
    $('sheetIn').className = 'sheet-in ' + (ok ? 'ok' : 'ng');
    $('verdict').className = 'verdict ' + (ok ? 'ok' : 'ng');
    $('verdict').textContent = verdict;
    $('sBody').innerHTML = body;
    $('btnNext').className = 'btn ' + (ok ? 'good' : 'bad');
    $('sheet').hidden = false;
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
    $('dStat').textContent = s.mode === 'test'
      ? `${s.total}문제 중 ${s.firstOk}문제 정답 (${acc}%)`
      : `첫 시도 정답률 ${acc}% · 최고 연속 ${s.best}`;
    const btns = $('dBtns'); btns.innerHTML = '';
    if (wrong.length) {
      const b = document.createElement('button'); b.className = 'btn ghost'; b.textContent = `틀린 ${wrong.length}개 다시`;
      b.onclick = () => { $('done').hidden = true; s.mode === 'test' ? startTest('틀린 문제', wrong) : startCustom('이번 오답', wrong); };
      btns.appendChild(b);
    }
    const h = document.createElement('button'); h.className = 'btn'; h.textContent = '홈으로';
    h.onclick = quit; btns.appendChild(h);
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
    W = d.words; Q = d.quiz;
    for (const w of W) BY[w.id] = w;
    for (const q of Q) QBY[q.id] = q;
    const size = Math.ceil(W.length / NSET);
    // 섹션이 고르게 섞이도록 원래 순서를 지그재그로 나눔
    SETS = Array.from({ length: NSET }, () => []);
    W.forEach((w, i) => SETS[i % NSET].push(w));
    void size;
    dday(); render();
  });
})();
