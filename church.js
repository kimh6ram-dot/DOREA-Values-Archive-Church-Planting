/* CHURCH PLANTING 페이지 — 데이터(data/churchPlantingData.js)만 바꾸면 내용이 바뀝니다. */
(function () {
  'use strict';
  var D = window.CHURCH_DATA;
  var state = { focus: null, axis: null, sel: null };

  var ICONS = {
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.2 1.2.8 2 1.6 2.4C10.2 8.6 10.6 5.6 12 3z"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    send: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>'
  };
  function icon(n) { return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + '</svg>'; }

  function render(app, ctx) {
    var esc = ctx.esc, byId = ctx.byId;
    var person = {}; D.participants.forEach(function (p) { person[p.participantId] = p; });
    var axis = {}; D.axes.forEach(function (a) { axis[a.id] = a; });
    function nm(id) { return byId[id] ? byId[id].name : id; }
    function ptag(id, extra) {
      var p = person[id], a = p && axis[p.axisId];
      return '<a class="ptag ' + (extra || '') + '" href="#/story/' + esc(id) + '"' + (a ? ' style="--ac:' + a.color + '"' : '') + '>' + esc(nm(id)) + '</a>';
    }
    function chips(list, cls) { return '<div class="tags">' + list.map(function (w) { return '<span class="tag ' + (cls || '') + '">' + esc(w) + '</span>'; }).join('') + '</div>'; }
    function head(n, t, sub) { return '<div class="sec-head"><div class="label">SECTION 0' + n + '</div><h2>' + t + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>'; }
    // 표시 순서: priorityOrder(1번 장성경, 2번 민혜린)를 항상 앞에, 나머지는 데이터 순서 유지
    var PR = D.priorityOrder || [];
    function rank(id) { var i = PR.indexOf(id); return i > -1 ? i : PR.length; }
    function ord(ids) { return ids.map(function (x, i) { return [x, i]; }).sort(function (a, b) { return rank(a[0]) - rank(b[0]) || a[1] - b[1]; }).map(function (x) { return x[0]; }); }
    D = Object.assign({}, D, { participants: D.participants.slice().sort(function (a, b) { return rank(a.participantId) - rank(b.participantId); }), axes: D.axes.map(function (a) { return Object.assign({}, a, { participantIds: ord(a.participantIds) }); }),
      ministryAreas: D.ministryAreas.map(function (m) { return Object.assign({}, m, { recommendedLeaders: ord(m.recommendedLeaders), collaborators: ord(m.collaborators) }); }) });
    var wide = window.matchMedia('(min-width:1000px)').matches;

    function leaderOf(id) { return D.ministryAreas.filter(function (m) { return m.recommendedLeaders.indexOf(id) > -1; }); }
    function collabOf(id) { return D.ministryAreas.filter(function (m) { return m.collaborators.indexOf(id) > -1; }); }

    /* ---------- detail (S2) ---------- */
    function mDetail(m) {
      var l = m.recommendedLeaders[0], lp = person[l] || {};
      return '<dl class="mdl"><dt>추천 책임자</dt><dd>' + m.recommendedLeaders.map(function (i) { return ptag(i); }).join('') + '<span class="mrole">' + esc(lp.role || '') + '</span></dd>' +
        '<dt>함께 협력할 사람</dt><dd>' + m.collaborators.map(function (i) { return ptag(i); }).join('') + '</dd>' +
        '<dt>사역의 역할</dt><dd class="txt">' + esc(lp.contribution || '') + '</dd>' +
        '<dt>추천 이유</dt><dd>' + chips(lp.rationale || [], 'line') + '</dd></dl>';
    }
    function mapCard(m, grid) {
      var a = axis[m.axisId], l = m.recommendedLeaders[0];
      return '<div class="mcard' + (state.sel === m.id ? ' sel' : '') + '" data-m="' + m.id + '" style="--ac:' + a.color + ';' + (grid || '') + '"><button class="mhead" aria-expanded="' + (state.sel === m.id) + '"><span class="mname">' + esc(m.name) + '</span><span class="mlead"><small>추천</small>' + esc(nm(l)) + '</span></button><div class="mdetail">' + mDetail(m) + '</div></div>';
    }
    function mapHTML() {
      var ms = D.ministryAreas, cells = [];
      var pos = ['', '', '', '', 'grid-column:1;grid-row:2', 'grid-column:4;grid-row:2', '', '', ''];
      ms.forEach(function (m, i) {
        // 정돈된 그리드: 1행 4개, 2행 좌우 1개씩(가운데 허브), 3행 3개
        var gr = i < 4 ? 'grid-row:1;grid-column:' + (i + 1) : i < 6 ? 'grid-row:2;grid-column:' + (i === 4 ? 1 : 4) : 'grid-row:3;grid-column:' + (i - 5);
        cells.push(mapCard(m, wide ? gr : ''));
      });
      var hub = '<div class="hub"><span>DOREA</span><b>COMMUNITY</b><small>가상 구상안</small></div>';
      var legend = '<div class="legend-cell">' + D.axes.map(function (a) { return '<span><i style="background:' + a.color + '"></i>' + esc(a.name) + '</span>'; }).join('') + '</div>';
      return '<div class="mapgrid">' + cells.join('') + hub + legend + '</div><div class="map-panel" id="map-panel"></div>';
    }
    function drawPanel() {
      var el = document.getElementById('map-panel'); if (!el) return;
      var m = D.ministryAreas.filter(function (x) { return x.id === state.sel; })[0];
      el.innerHTML = m ? '<div class="mpanel" style="--ac:' + axis[m.axisId].color + '"><h3>' + esc(m.name) + '</h3>' + mDetail(m) + '</div>' : '';
      el.style.display = (m && window.matchMedia('(min-width:1000px)').matches) ? 'block' : 'none';
    }

    /* ---------- S3 people ---------- */
    function peopleCard(p) {
      var a = axis[p.axisId], id = p.participantId;
      var lead = leaderOf(id), col = collabOf(id);
      return '<article class="pcard" data-p="' + id + '" style="--ac:' + a.color + '"><div class="ptop"><a class="pname" href="#/story/' + esc(id) + '">' + esc(nm(id)) + '</a><span class="prole">' + esc(p.role) + '</span></div>' +
        '<p class="pdesc">' + esc(p.contribution) + '</p>' + chips(p.values) +
        '<button class="ptoggle" aria-expanded="false">추천 이유 보기 <span>▾</span></button>' +
        '<div class="pmore"><div class="pm-l">추천 근거 가치</div>' + chips(p.rationale, 'line') +
        '<div class="pm-l">구상안에서의 자리</div><ul class="pm-list">' + lead.map(function (m) { return '<li><b>추천 책임자</b> ' + esc(m.name) + '</li>'; }).join('') + col.map(function (m) { return '<li><b>협력</b> ' + esc(m.name) + '</li>'; }).join('') + '</ul>' +
        '<a class="more-link" href="#/story/' + esc(id) + '">개인 가치관 분석 보기 →</a></div></article>';
    }

    /* ---------- S4 structure ---------- */
    function relevant(m) {
      var ok = true;
      if (state.focus) ok = ok && (m.recommendedLeaders.indexOf(state.focus) > -1 || m.collaborators.indexOf(state.focus) > -1);
      if (state.axis) ok = ok && m.axisId === state.axis;
      return ok;
    }
    function structHTML() {
      var filtered = !!(state.focus || state.axis);
      var bar = '<div class="fbar"><span class="fl">참여자 선택</span><div class="fchips"><button class="fchip' + (!state.focus ? ' on' : '') + '" data-f="">전체</button>' +
        D.participants.map(function (p) { return '<button class="fchip' + (state.focus === p.participantId ? ' on' : '') + '" data-f="' + p.participantId + '">' + esc(nm(p.participantId)) + '</button>'; }).join('') + '</div>' +
        (state.axis ? '<div class="axis-on">영역 필터: <b>' + esc(axis[state.axis].name) + '</b> <button class="fchip" data-axis-clear="1">해제 ✕</button></div>' : '') + '</div>';
      var wideNow = window.matchMedia('(min-width:700px)').matches;
      var cards = D.ministryAreas.map(function (m) {
        var rel = relevant(m), a = axis[m.axisId];
        var role = '';
        if (state.focus) role = m.recommendedLeaders.indexOf(state.focus) > -1 ? '<span class="rb lead">추천 책임자</span>' : m.collaborators.indexOf(state.focus) > -1 ? '<span class="rb">협력 인물</span>' : '';
        var lp = person[m.recommendedLeaders[0]] || {};
        return '<details class="scard' + (filtered && !rel ? ' dim' : '') + '" style="--ac:' + a.color + '"' + (wideNow || (filtered && rel) ? ' open' : '') + '><summary><span class="sname"><i></i>' + esc(m.name) + '</span>' + role + '<span class="chev">▾</span></summary><div class="sbody">' +
          '<div class="srow"><span class="sl">추천 책임자</span><div>' + m.recommendedLeaders.map(function (i) { return ptag(i, state.focus === i ? 'hl' : ''); }).join('') + '</div></div>' +
          '<div class="srow"><span class="sl">협력 추천 인물</span><div>' + m.collaborators.map(function (i) { return ptag(i, state.focus === i ? 'hl' : ''); }).join('') + '</div></div>' +
          '<div class="sl sl2">각자의 강점</div><ul class="strengths"><li><b>' + esc(nm(m.recommendedLeaders[0])) + '</b><span>' + esc(lp.contribution || '') + '</span></li>' +
          m.collaborators.map(function (i) { return '<li><b>' + esc(nm(i)) + '</b><span>' + esc((person[i] || {}).contribution || '') + '</span></li>'; }).join('') + '</ul></div></details>';
      }).join('');
      return bar + '<div class="sgrid">' + cards + '</div>';
    }
    function drawStruct() { var el = document.getElementById('struct-body'); if (el) el.innerHTML = structHTML(); }

    /* ---------- S5 ---------- */
    var P5 = D.collaborationPrinciples;
    var princ = '<div class="groups">' + P5.groups.map(function (g, i) {
      return '<div class="group"><div class="gnum">0' + (i + 1) + '</div><h3>' + esc(g.title) + '</h3>' + g.members.map(function (m) { return '<div class="gm">' + ptag(m.participantId) + '<p>' + esc(m.text) + '</p></div>'; }).join('') + '</div>';
    }).join('') + '</div><blockquote class="closing">' + esc(P5.closing) + '</blockquote><p class="closing-note">' + esc(P5.note) + '</p>';

    var CN = window.ChurchConnections({ D: D, person: person, axis: axis, nm: nm, esc: esc, chips: chips });
    app.innerHTML = '<div class="view church">' +
      '<div class="prov-bar"><b>가상 구상안</b> 확정된 조직이나 직책이 아닙니다</div>' +
      '<div class="page-head"><div class="eyebrow">Church Planting</div><h1>우리가 함께 교회를 세운다면?</h1><p class="lead-sub">서로 다른 가치관으로 그려본, 하나의 공동체</p>' +
      '<div class="notice">' + esc(D.notice) + '</div></div>' +

      '<section class="block" id="sec-community">' + head(1, '서로 다른 우리가, 함께 하나의 교회를 세운다면') +
      '<div class="axes">' + D.axes.map(function (a, i) {
        return '<button class="axis" data-axis="' + a.id + '" style="--ac:' + a.color + '"><span class="aico">' + icon(a.icon) + '</span><span class="abody"><span class="an">0' + (i + 1) + ' ' + esc(a.name) + '</span><span class="as">' + esc(a.summary) + '</span><span class="ap">' + a.participantIds.map(function (id) { return esc(nm(id)); }).join(' · ') + '</span></span></button>';
      }).join('') + '</div><p class="fine">' + esc(D.axesNote) + ' 카드를 누르면 아래 영역별 협력 구조로 이동합니다.</p></section>' +

      '<section class="block" id="sec-map">' + head(2, '한눈에 보는 개척 구상도', '9개 사역 영역을 눌러 추천 책임자와 협력 관계를 확인해 보세요. 책임자 표기는 모두 추천 역할이며, 누가 누구의 위에 있는 구조가 아닙니다.') + mapHTML() + '</section>' +
      '<section class="block" id="sec-connections">' + CN.html() + '</section>' +

      '<section class="block" id="sec-people">' + head(3, '사람별 추천 역할', '이름을 누르면 개인 가치관 분석 페이지로 이동합니다.') + '<div class="pgrid">' + D.participants.map(peopleCard).join('') + '</div></section>' +

      '<section class="block" id="sec-structure">' + head(4, '영역별 협력 구조', '참여자를 선택하면 그 사람이 추천된 모든 사역 영역이 강조됩니다.') + '<div id="struct-body">' + structHTML() + '</div></section>' +

      '<section class="block" id="sec-principles">' + head(5, esc(P5.title)) + princ + '</section></div>';

    drawPanel();
    CN.bind(app.querySelector('.church'));

    function scrollTo(id) { var el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    app.querySelector('.church').addEventListener('click', function (e) {
      var t = e.target;
      var ax = t.closest('.axis');
      if (ax) { state.axis = ax.dataset.axis; drawStruct(); scrollTo('sec-structure'); return; }
      if (t.closest('[data-axis-clear]')) { state.axis = null; drawStruct(); return; }
      var fc = t.closest('.fchip[data-f]');
      if (fc) { state.focus = fc.dataset.f || null; drawStruct(); return; }
      var mh = t.closest('.mhead');
      if (mh) { var id = mh.parentNode.dataset.m; state.sel = state.sel === id ? null : id;
        app.querySelectorAll('.mcard').forEach(function (c) { var on = c.dataset.m === state.sel; c.classList.toggle('sel', on); c.querySelector('.mhead').setAttribute('aria-expanded', on); });
        drawPanel(); return; }
      var tg = t.closest('.ptoggle');
      if (tg) { var card = tg.closest('.pcard'), open = card.classList.toggle('open'); tg.setAttribute('aria-expanded', open); return; }
    });
  }
  window.renderChurch = function (app, ctx) { if (!D) { app.innerHTML = '<div class="view"><div class="empty">churchPlantingData.js 를 불러오지 못했습니다.</div></div>'; return; } render(app, ctx); };
})();
