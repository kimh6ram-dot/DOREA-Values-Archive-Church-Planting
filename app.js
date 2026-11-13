(function () {
  'use strict';
  var DATA = window.VALUES_DATA || { participants: [] };
  var P = DATA.participants.map(function (p, i) { p._idx = i; return p; });
  var A = P.filter(function (p) { return !p.pending; }); // 분석 입력 완료자
  var EXPECTED = P.length; // 전체 참여 인원
  var app = document.getElementById('app');
  var byId = {}; P.forEach(function (p) { byId[p.id] = p; });

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>'); }
  // 원문(간단한 마크다운) 렌더: 문단 / > 인용 / - 목록 / ## 소제목 / **굵게**
  function paras(t) {
    return String(t).split(/\n{2,}/).map(function (x) {
      x = x.trim(); if (!x) return '';
      var ls = x.split('\n');
      if (/^>/.test(x)) return '<blockquote class="mq">' + inline(x.replace(/^>\s?/gm, '')).replace(/\n/g, '<br>') + '</blockquote>';
      if (ls.every(function (l) { return /^\s*[-•]\s+/.test(l); })) return '<ul>' + ls.map(function (l) { return '<li>' + inline(l.replace(/^\s*[-•]\s+/, '')) + '</li>'; }).join('') + '</ul>';
      var h = /^#{1,6}\s*(.+)$/.exec(x); if (h && ls.length === 1) return '<h4 class="sub-h">' + inline(h[1]) + '</h4>';
      return '<p>' + inline(x).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }
  function num(p) { return String(p._idx + 1).padStart(2, '0'); }
  function tags(list, cls) { if (!list || !list.length) return '<div class="tags"><span class="tag ghost">원문에 기재 없음</span></div>'; return '<div class="tags">' + (list || []).map(function (w) { return '<span class="tag ' + (cls ? cls(w) : '') + '">' + esc(w) + '</span>'; }).join('') + '</div>'; }
  function has(v) { return v != null && String(v).trim() !== ''; }
  function pending(msg) { return '<div class="pending">' + (msg || '분석 원문이 아직 입력되지 않았습니다.') + '</div>'; }
  function isDone(p) { return Array.isArray(p.final_positive_5) && p.final_positive_5.length === 5; }

  var freq = {};
  P.forEach(function (p) { (p.final_positive_5 || []).forEach(function (w) { (freq[w] = freq[w] || []).push(p.id); }); });
  var words = Object.keys(freq).sort(function (a, b) { return freq[b].length - freq[a].length || a.localeCompare(b, 'ko'); });
  function ranked() {
    var out = [], prev = null, rank = 0;
    words.forEach(function (w, i) { var c = freq[w].length; if (c !== prev) { rank = i + 1; prev = c; } out.push({ w: w, c: c, rank: rank }); });
    return out;
  }
  function link(p) { return '<a href="#/story/' + esc(p.id) + '">' + esc(p.name) + '</a>'; }

  /* ---------- HOME ---------- */
  function home() {
    var done = A.length, finals = A.filter(isDone).length, finalTotal = A.reduce(function (n, p) { return n + (p.final_positive_5 || []).length; }, 0);
    var top = ranked().filter(function (r) { return r.rank <= 5; }).slice(0, 8);
    var max = top.length ? top[0].c : 1;
    var maxF = words.length ? freq[words[0]].length : 1;
    var denom = Math.max(finals, 1);

    var facts = [];
    if (words.length) {
      var topW = words.filter(function (w) { return freq[w].length === maxF; });
      facts.push(['가장 많이 선택된 가치', maxF > 1 ? '‘' + esc(topW.join('’, ‘')) + '’ — ' + maxF + '명이 최종 가치로 선택했습니다.' : '모든 가치가 한 명씩만 선택되었습니다.']);
      var uniq = words.filter(function (w) { return freq[w].length === 1; });
      if (uniq.length) facts.push(['단 한 명만 선택한 가치', uniq.length + '개의 가치가 한 사람에게서만 나타났습니다. ' + esc(uniq.slice(0, 5).join(', ')) + (uniq.length > 5 ? ' 외' : '')]);
      var best = null;
      for (var i = 0; i < P.length; i++) for (var j = i + 1; j < P.length; j++) {
        if (!isDone(P[i]) || !isDone(P[j])) continue;
        var sh = P[i].final_positive_5.filter(function (w) { return P[j].final_positive_5.indexOf(w) > -1; });
        if (sh.length && (!best || sh.length > best.sh.length)) best = { a: P[i], b: P[j], sh: sh };
      }
      if (best) facts.push(['가장 많은 공통 가치를 가진 쌍', esc(best.a.name) + ' · ' + esc(best.b.name) + ' — ' + best.sh.length + '개 (' + esc(best.sh.join(', ')) + ')']);
    }

    app.innerHTML = '<div class="view">' +
      '<section class="hero"><div class="eyebrow">Our Values</div><h1>우리는 무엇을<br>따라 살아가는가</h1>' +
      '<p class="sub">열 사람의 선택으로 그려낸 서로 다른 삶의 방향</p>' +
      '<div class="stats">' +
      stat(EXPECTED, '명', '참여 인원') + stat(done, '명', '입력 완료', done < EXPECTED ? (EXPECTED - done) + '명 입력 대기' : '') +
      stat(5, '개', '개인 핵심 가치') + stat(finalTotal, '개', '등록된 최종 가치 선택', finals + '명 기준') +
      '</div></section>' +
      '<section class="block home-people"><div class="sec-head row"><div><h2>우리의 가치관</h2><p>열 사람의 서로 다른 이야기</p></div><a class="more-link" href="#/people">전체 보기 →</a></div><div class="grid people">' + P.map(function (p) { return card(p); }).join('') + '</div><a class="btn wide only-mobile" href="#/people">' + P.length + '명 전체 보기 →</a></section>' +
      '<section class="block"><div class="sec-head"><h2>가장 많이 선택한 가치 TOP 5</h2><p>최종 가치 5개를 합산한 결과이며, 동률은 같은 순위로 표시합니다.</p></div>' +
      (top.length ? '<div class="bars">' + top.map(function (r) {
        return '<div class="bar"><span class="rank">' + r.rank + '</span><b>' + esc(r.w) + '</b><div class="track"><div class="fill" style="width:' + (r.c / max * 100) + '%"></div></div><span class="meta">' + r.c + '명 / ' + Math.round(r.c / denom * 100) + '%</span></div>';
      }).join('') + '</div>' : '<div class="empty">아직 입력된 데이터가 없습니다.</div>') + '</section>' +
      '<section class="block"><div class="sec-head"><h2>우리들의 가치 키워드</h2><p>자주 선택될수록 크게 보입니다. 단어를 누르면 선택한 사람이 나타납니다.</p></div>' +
      '<div class="cloud" id="cloud">' + words.map(function (w) {
        var c = freq[w].length, lv = Math.min(5, Math.max(1, Math.round(1 + (c - 1) / Math.max(maxF - 1, 1) * 4)));
        var size = 15 + (c - 1) / Math.max(maxF - 1, 1) * 24;
        return '<button class="f' + lv + '" data-w="' + esc(w) + '" style="font-size:calc(' + size.toFixed(1) + 'px * var(--cs))">' + esc(w) + '</button>';
      }).join('') + '</div><div class="cloud-detail" id="cloud-detail" aria-live="polite"></div></section>' +
            (facts.length ? '<section class="block"><div class="sec-head"><h2>흥미로운 발견</h2><p>입력된 데이터에서 계산된 사실만 보여줍니다.</p></div><div class="facts">' +
        facts.map(function (f) { return '<div class="fact"><div class="k">' + f[0] + '</div><p>' + f[1] + '</p></div>'; }).join('') + '</div></section>' : '') + '</div>';

    var cloud = document.getElementById('cloud'), det = document.getElementById('cloud-detail');
    cloud.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      cloud.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      var w = b.dataset.w;
      det.innerHTML = '<b>‘' + esc(w) + '’</b>을(를) 선택한 사람 (' + freq[w].length + '명): ' + freq[w].map(function (id) { return link(byId[id]); }).join('');
    });
  }
  function stat(n, unit, label, small) { return '<div class="stat"><div class="n">' + n + '<i>' + unit + '</i></div><span>' + label + '</span>' + (small ? '<small>' + small + '</small>' : '') + '</div>'; }
  function card(p) {
    if (p.pending) return '<div class="card pending"><div class="top"><span class="name">' + esc(p.name) + '</span><span class="num">No.' + num(p) + '</span></div></div>';
    return '<a class="card" href="#/story/' + esc(p.id) + '"><div class="top"><span class="name">' + esc(p.name) + '</span><span class="num">No.' + num(p) + '</span></div>' +
      '<div class="ttl">' + esc(p.title) + '</div>' + (p.final_positive_5 && p.final_positive_5.length ? tags(p.final_positive_5) : '<div class="tags"><span class="tag ghost">최종 가치 미입력</span></div>') + '<div class="more">상세 보기 <span>→</span></div></a>';
  }

  /* ---------- PEOPLE ---------- */
  var peopleState = { q: '', v: '', sort: 'order' };
  function people() {
    app.innerHTML = '<div class="view"><div class="page-head"><div class="eyebrow">People</div><h1>' + P.length + '명의 가치관</h1></div>' +
      '<div class="toolbar"><input id="q" type="search" placeholder="이름 검색" aria-label="이름 검색">' +
      '<select id="v" aria-label="가치 단어로 필터"><option value="">전체 가치</option>' + words.slice().sort(function (a, b) { return a.localeCompare(b, 'ko'); }).map(function (w) { return '<option>' + esc(w) + '</option>'; }).join('') + '</select>' +
      '<select id="s" aria-label="정렬"><option value="order">참여자 순서</option><option value="name">이름순</option><option value="reg">등록순</option></select>' +
      '<button class="btn" id="reset">전체 보기</button></div><div class="grid people" id="plist"></div></div>';
    var q = document.getElementById('q'), v = document.getElementById('v'), s = document.getElementById('s');
    q.value = peopleState.q; v.value = peopleState.v; s.value = peopleState.sort;
    function draw() {
      peopleState = { q: q.value, v: v.value, sort: s.value };
      var l = P.filter(function (p) { return (!q.value || p.name.toLowerCase().indexOf(q.value.trim().toLowerCase()) > -1) && (!v.value || (p.final_positive_5 || []).indexOf(v.value) > -1); });
      if (s.value === 'name') l.sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
      else if (s.value === 'reg') l.sort(function (a, b) { return (a.created_at || '').localeCompare(b.created_at || '') || a._idx - b._idx; });
      document.getElementById('plist').innerHTML = l.length ? l.map(function (p) { return card(p); }).join('') : '<div class="empty" style="grid-column:1/-1">조건에 맞는 참여자가 없습니다.</div>';
    }
    [q, v, s].forEach(function (el) { el.addEventListener('input', draw); });
    document.getElementById('reset').onclick = function () { q.value = ''; v.value = ''; s.value = 'order'; draw(); };
    draw();
  }

  /* ---------- STORY ---------- */
  function story(id) {
    var p = byId[id];
    if (!p) { app.innerHTML = '<div class="view"><div class="page-head"><h1>참여자를 찾을 수 없습니다</h1></div><a class="btn" href="#/people">PEOPLE로 돌아가기</a></div>'; return; }
    if (p.pending) { app.innerHTML = '<div class="view"><div class="page-head"><div class="eyebrow">Person ' + num(p) + '</div><h1>' + esc(p.name) + '</h1></div><a class="btn" href="#/people">목록으로</a></div>'; return; }
    var ai = A.indexOf(p), prev = A[(ai - 1 + A.length) % A.length], next = A[(ai + 1) % A.length];
    var n = (p.negative_core_5 || []).length;
    var sc = p.scenes || {}, ca = p.cautions || {};
    var tabsDef = [['alone', '혼자 있을 때의 나', '혼자'], ['friends', '친구들과 함께 있을 때의 나', '친구'], ['work', '직장이나 역할 속의 나', '직장·역할']];
    var cDef = [['trap', '빠지기 쉬운 함정'], ['relationship', '관계에서 주의할 점'], ['drain', '스스로를 소진시키는 방식'], ['practice', '성장을 위해 필요한 연습']];
    var hasCaut = cDef.some(function (c) { return ca[c[0]]; });

    app.innerHTML = '<div class="view">' +
      '<div class="story-top"><a class="btn sm" href="#/people">← 목록</a><div class="grp"><a class="btn sm" href="#/story/' + esc(prev.id) + '" aria-label="이전 참여자 ' + esc(prev.name) + '">← ' + esc(prev.name) + '</a><a class="btn sm" href="#/story/' + esc(next.id) + '" aria-label="다음 참여자 ' + esc(next.name) + '">' + esc(next.name) + ' →</a></div></div>' +
      '<header class="story-hero"><div class="eyebrow">Person ' + num(p) + '</div><div class="name">' + esc(p.name) + '</div><h1>' + esc(p.title) + '</h1>' +
      ((p.final_positive_5 || []).length ? '<div class="vals">' + tags(p.final_positive_5, function () { return 'accent'; }) + '</div>' : '') + (has(p.intro) ? '<p class="intro">' + esc(p.intro) + '</p>' : '') +
      (has(p.preface) ? '<details class="preface"><summary>분석을 읽기 전에</summary><div class="prose">' + paras(p.preface) + '</div></details>' : '') + '</header>' +

      '<section class="sec"><div class="label">SECTION 01</div><h2>인생 타이틀</h2>' + (has(p.title_highlight) ? '<p class="highlight">' + esc(p.title_highlight) + '</p>' : '<p class="highlight">' + esc(p.title) + '</p>') +
      (has(p.title_analysis) ? '<div class="prose">' + paras(p.title_analysis) + '</div>' : pending()) + '</section>' +

      '<section class="sec"><div class="label">SECTION 02</div><h2>확신의 가치 vs 열망의 가치</h2><div class="two">' +
      '<div class="panel"><h3>확신의 가치</h3><span class="en">CONFIDENT</span>' + tags(p.positive_core_5, function () { return 'big dark'; }) + '</div>' +
      '<div class="panel"><h3>열망의 가치</h3><span class="en">ASPIRING</span>' + tags(p.opposite_choices, function () { return 'big line'; }) + '</div></div>' +
      (has(p.confident_analysis) ? '<div class="prose">' + paras(p.confident_analysis) + '</div>' : pending()) + '</section>' +

      '<section class="sec"><div class="label">SECTION 03</div><h2>내면의 과제</h2><div class="note">이 항목은 성격의 결함이 아니라, 본인이 스스로 경계하겠다고 고른 가치입니다. 왼쪽은 경계하는 가치, 오른쪽은 그 반대편에서 지향하는 가치입니다.</div>' +
      (has(p.shadow_intro) ? '<div class="prose" style="margin-bottom:20px">' + paras(p.shadow_intro) + '</div>' : '') +
      (!(p.shadow_analysis || []).length && has(p.shadow_intro) ? '' : '') + '<div class="pairs">' +
      (p.negative_core_5 || []).map(function (w, i) {
        var a = (p.shadow_analysis || [])[i];
        if (!(p.shadow_analysis || []).length) return '<div class="pair static"><span class="from">' + esc(w) + '</span><span class="arrow">→</span><span class="to">' + esc((p.opposite_choices || [])[i] || '') + '</span></div>';
        return '<details class="pair"><summary><span class="from">' + esc(w) + '</span><span class="arrow">→</span><span class="to">' + esc((p.opposite_choices || [])[i] || '') + '</span><span class="chev">▾</span></summary><div class="body">' + (has(a) ? paras(a) : pending()) + '</div></details>';
      }).join('') + (n ? '' : '<div class="empty">입력된 데이터가 없습니다.</div>') + '</div></section>' +

      '<section class="sec"><div class="label">SECTION 04</div><h2>세 가지 장면 속의 나</h2><div class="tabs" role="tablist">' +
      tabsDef.map(function (t, i) { return '<button role="tab" id="tab-' + t[0] + '" aria-selected="' + (i === 0) + '" aria-controls="pn-' + t[0] + '" data-t="' + t[0] + '" title="' + t[1] + '">' + t[2] + '</button>'; }).join('') + '</div>' +
      tabsDef.map(function (t, i) {
        var s = sc[t[0]];
        return '<div class="tabpanel" role="tabpanel" id="pn-' + t[0] + '" aria-labelledby="tab-' + t[0] + '"' + (i ? ' hidden' : '') + '>' + (s ?
          '<h3 class="scene-title">' + esc(s.title || t[1]) + '</h3>' + (has(s.quote) ? '<blockquote class="quote" style="margin-left:0">' + esc(s.quote) + '</blockquote>' : '') + (has(s.analysis) ? '<div class="prose">' + paras(s.analysis) + '</div>' : '') : pending()) + '</div>';
      }).join('') + '</section>' +

      '<section class="sec"><div class="label">SECTION 05</div><h2>이 사람이 주의해야 할 점</h2>' +
      (hasCaut ? '<div class="cautions">' + cDef.map(function (c, i) {
        var x = ca[c[0]]; if (!x) return '';
        return '<div class="caution"><span class="n">0' + (i + 1) + '</span><h3>' + esc(x.title || c[1]) + '</h3>' + (has(x.body) ? '<p>' + esc(x.body).replace(/\n/g, '<br>') + '</p>' : '') + (has(x.example) ? '<div class="ex"><b>구체적 사례</b>' + esc(x.example) + '</div>' : '') + '</div>';
      }).join('') + '</div>' : (has(p.caution_raw) ? '<div class="prose">' + paras(p.caution_raw) + '</div>' : pending())) + '</section>' +

      '<section class="letter"><div class="label">SECTION 06</div><h2>' + esc(p.name) + '에게 건네는 말</h2>' + (has(p.letter) ? '<div class="prose">' + paras(p.letter) + '</div>' : pending()) + '</section>' +

      '<div class="story-foot"><div class="grp"><a class="btn" href="#/story/' + esc(prev.id) + '">← 이전 참여자</a><a class="btn" href="#/story/' + esc(next.id) + '">다음 참여자 →</a><a class="btn" href="#/people">다른 참여자 이야기 보기</a></div>' +
      '<div class="grp"><button class="btn" id="addcmp">비교에 추가</button><button class="btn" id="copy">링크 복사</button><button class="btn" id="print">인쇄 / PDF</button></div></div></div>';

    var tabs = app.querySelectorAll('.tabs button');
    tabs.forEach(function (b) {
      b.addEventListener('click', function () {
        tabs.forEach(function (x) { var on = x === b; x.setAttribute('aria-selected', on); document.getElementById('pn-' + x.dataset.t).hidden = !on; });
      });
    });
    document.getElementById('addcmp').onclick = function (e) {
      var ids = getCmp();
      if (ids.indexOf(p.id) > -1) { location.hash = '#/compare'; return; }
      if (ids.length >= 3) ids.shift();
      ids.push(p.id); setCmp(ids); e.target.textContent = '비교에 추가됨 ✓';
    };
    document.getElementById('copy').onclick = function (e) {
      var done = function () { e.target.textContent = '복사됨 ✓'; };
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, function () { prompt('링크를 복사하세요', location.href); });
      else prompt('링크를 복사하세요', location.href);
    };
    document.getElementById('print').onclick = function () { window.print(); };
  }

  /* ---------- COMPARE ---------- */
  function getCmp() { try { var a = JSON.parse(localStorage.getItem('va-cmp') || '[]'); return a.filter(function (i) { return byId[i] && !byId[i].pending; }); } catch (e) { return []; } }
  function setCmp(a) { try { localStorage.setItem('va-cmp', JSON.stringify(a)); } catch (e) { } }
  function compare(query) {
    var ids = [];
    var m = /ids=([^&]+)/.exec(query || '');
    if (m) ids = m[1].split(',').filter(function (i) { return byId[i] && !byId[i].pending; });
    else ids = getCmp();
    if (!ids.length && A.length >= 2) ids = [A[0].id, A[1].id];
    ids = ids.slice(0, 3); setCmp(ids);
    var sel = ids.map(function (i) { return byId[i]; });

    var all = [];
    sel.forEach(function (p) { (p.final_positive_5 || []).forEach(function (w) { if (all.indexOf(w) < 0) all.push(w); }); });
    var cnt = function (w) { return sel.filter(function (p) { return (p.final_positive_5 || []).indexOf(w) > -1; }).length; };
    var common = all.filter(function (w) { return cnt(w) === sel.length; });
    var partial = all.filter(function (w) { return cnt(w) > 1 && cnt(w) < sel.length; });
    var names = sel.map(function (p) { return esc(p.name); });

    function head(t, cls) { return '<section class="block ' + cls + '"><div class="sec-head"><h2>' + t + '</h2></div>'; }
    var h = '<div class="view"><div class="page-head"><div class="eyebrow">Compare</div><h1>서로의 가치관 비교</h1><p>2~3명을 선택해 비교합니다. 차이는 우열이 아니라 서로 다른 방향입니다.</p></div>' +
      '<div class="picker">' + sel.map(function (p) { return '<span class="chip">' + esc(p.name) + '<button data-rm="' + esc(p.id) + '" aria-label="' + esc(p.name) + ' 제거"' + (sel.length <= 2 ? ' disabled style="opacity:.3;cursor:default"' : '') + '>×</button></span>'; }).join('') +
      (sel.length < 3 ? '<select id="add" aria-label="비교 대상 추가"><option value="">+ 참여자 추가</option>' + A.filter(function (p) { return ids.indexOf(p.id) < 0; }).map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; }).join('') + '</select>' : '') + '</div>' +
      '<div class="cmp">';

    if (sel.length < 2) { app.innerHTML = h + '</div><div class="empty">비교할 참여자를 2명 이상 선택해 주세요.</div></div>'; bindCmp(ids); return; }

    var cl = function (w) { var c = cnt(w); return c === sel.length ? 'accent' : c > 1 ? 'common' : ''; };
    h += head('가치 비교 테이블', 's-table') + '<div class="legend"><span class="tag accent">모두 공통</span><span class="tag common">일부 공통</span><span class="tag">고유</span></div>' +
      '<div class="tablewrap"><table><thead><tr><th></th>' + sel.map(function (p) { return '<th>' + esc(p.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      [0, 1, 2, 3, 4].map(function (i) { return '<tr><th>' + (i + 1) + '</th>' + sel.map(function (p) { var w = (p.final_positive_5 || [])[i]; return '<td>' + (w ? '<span class="tag ' + cl(w) + '">' + esc(w) + '</span>' : '—') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></section>';

    h += head('공통 가치', 's-common') + (common.length ? '<div class="callout">' + (sel.length === 2 ? '두 사람은' : '세 사람은') + ' ' + common.map(function (w) { return '‘' + esc(w) + '’'; }).join(', ') + ' 가치를 함께 선택했습니다.</div>' : '<div class="callout">' + (sel.length === 2 ? '두 사람' : '세 사람') + '이 함께 선택한 최종 가치는 없습니다. 각자 다른 방향에서 같은 삶을 바라보고 있습니다.</div>') +
      (sel.length === 3 && partial.length ? '<p style="color:var(--sub);font-size:15px">일부가 공유한 가치: ' + partial.map(function (w) { var who = sel.filter(function (p) { return (p.final_positive_5 || []).indexOf(w) > -1; }).map(function (p) { return esc(p.name); }).join('·'); return '<span class="tag common">' + esc(w) + ' (' + who + ')</span>'; }).join(' ') + '</p>' : '') + '</section>';

    h += head('서로 다른 가치', 's-diff') + '<div class="diff">' + sel.map(function (p) {
      var u = (p.final_positive_5 || []).filter(function (w) { return cnt(w) === 1; });
      return '<div><h3>' + esc(p.name) + '만의 가치</h3>' + (u.length ? tags(u) : '<span style="color:var(--sub);font-size:14px">고유한 가치 없음</span>') + '</div>';
    }).join('') + '</div></section>';

    h += '<section class="block s-cards"><div class="sec-head"><h2>참여자별 가치</h2></div><div class="journey">' + sel.map(function (p) { return '<div class="jcard"><h3>' + esc(p.name) + '</h3>' + tags(p.final_positive_5, cl) + '</div>'; }).join('') + '</div></section>';
    h += head('가치관 비교 시각화', 's-viz');
    if (sel.length === 2) {
      var VA = sel[0].final_positive_5 || [], VB = sel[1].final_positive_5 || [];
      var oa = VA.filter(function (w) { return VB.indexOf(w) < 0; }), ob = VB.filter(function (w) { return VA.indexOf(w) < 0; });
      h += '<div class="venn"><div class="a"><small>' + esc(sel[0].name) + '</small>' + oa.map(esc).join('<br>') + '</div><div class="b"><small>' + esc(sel[1].name) + '</small>' + ob.map(esc).join('<br>') + '</div><div class="x"><small>공통</small>' + (common.length ? common.map(esc).join('<br>') : '—') + '</div></div>';
    }
    h += '<div class="tablewrap" style="margin-top:16px"><table class="matrix"><thead><tr><th>가치 \\ 참여자</th>' + sel.map(function (p) { return '<th>' + esc(p.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      all.slice().sort(function (a, b) { return cnt(b) - cnt(a) || a.localeCompare(b, 'ko'); }).map(function (w) {
        return '<tr><td>' + esc(w) + '</td>' + sel.map(function (p) { return '<td class="hit' + '">' + ((p.final_positive_5 || []).indexOf(w) > -1 ? '<span class="dot"></span>' : '<span class="dot" style="background:transparent;border:1px solid var(--line)"></span>') + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div></section>';

    var inAny = function (key, w) { return sel.filter(function (p) { return (p[key] || []).indexOf(w) > -1; }).length > 1; };
    var rows = [['positive_selected_20', '처음 선택한 긍정 가치 20개'], ['positive_core_5', '마지막까지 남은 긍정 핵심 가치 5개'], ['negative_core_5', '경계하는 부정 핵심 가치 5개'], ['final_positive_5', '최종 가치 5개'], ['dropped_positive', '덜어낸 가치']];
    h += head('선택 여정 비교', 's-journey') + '<div class="legend"><span class="tag accent">최종 가치로 남음</span><span class="tag common">비교 대상과 같은 단어</span></div><div class="journey">' +
      sel.map(function (p) {
        return '<div class="jcard"><h3>' + esc(p.name) + '</h3>' + rows.map(function (r) {
          return '<div><span class="jl">' + r[1] + '</span>' + tags(p[r[0]], function (w) { return (r[0] !== 'final_positive_5' && r[0] !== 'dropped_positive' && (p.final_positive_5 || []).indexOf(w) > -1) ? 'accent' : inAny(r[0], w) ? 'common' : (r[0] === 'dropped_positive' ? 'ghost' : ''); }) + '</div>';
        }).join('') + '</div>';
      }).join('') + '</div></section></div></div>';

    app.innerHTML = h; bindCmp(ids);
  }
  function bindCmp(ids) {
    app.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { if (ids.length <= 2) return; go(ids.filter(function (i) { return i !== b.dataset.rm; })); }; });
    var add = document.getElementById('add');
    if (add) add.onchange = function () { if (add.value) go(ids.concat(add.value)); };
  }
  function go(ids) { setCmp(ids); location.hash = '#/compare?ids=' + ids.join(','); }

  /* ---------- router ---------- */
  function route() {
    var h = location.hash.replace(/^#/, '') || '/', parts = h.split('?'), path = parts[0].split('/').filter(Boolean);
    var r = path[0] || 'home';
    document.querySelectorAll('.nav nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.route === (r === 'story' ? 'people' : r)); });
    if (r === 'people') people(); else if (r === 'story') story(decodeURIComponent(path[1] || '')); else if (r === 'compare') compare(parts[1]); else if (r === 'church' && window.renderChurch) window.renderChurch(app, { esc: esc, byId: byId }); else home();
    document.getElementById('nav').classList.remove('open');
    var tg = document.getElementById('nav-toggle'); if (tg) tg.setAttribute('aria-expanded', 'false');
    window.scrollTo(0, 0);
  }
  if (P.some(function (p) { return p.is_sample; })) document.getElementById('sample-note').hidden = false;
  var navToggle = document.getElementById('nav-toggle');
  if (navToggle) navToggle.addEventListener('click', function () { var o = document.getElementById('nav').classList.toggle('open'); navToggle.setAttribute('aria-expanded', o); });
  window.addEventListener('hashchange', route);
  route();
})();
