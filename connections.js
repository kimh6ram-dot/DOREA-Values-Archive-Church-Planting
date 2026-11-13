/* OUR CONNECTIONS — 사람 중심 협력 관계 탐색. 관계는 모두 D.ministryAreas 에서 자동 계산(별도 하드코딩 없음). */
(function () {
  'use strict';
  var conn = { id: 'p02', mode: 'person', sort: 'count' }; // 기본 선택: 김하람

  window.ChurchConnections = function (env) {
    var D = env.D, person = env.person, axis = env.axis, nm = env.nm, esc = env.esc, chips = env.chips;
    var order = D.participants.map(function (p) { return p.participantId; });
    if (!person[conn.id]) conn.id = order[0];
    var graph = { edges: [], nodes: {} };

    function involved(id) { return D.ministryAreas.filter(function (m) { return m.recommendedLeaders.indexOf(id) > -1 || m.collaborators.indexOf(id) > -1; }); }
    function calc(id) {
      var lead = [], col = [], partners = {};
      D.ministryAreas.forEach(function (m) {
        var isL = m.recommendedLeaders.indexOf(id) > -1, isC = m.collaborators.indexOf(id) > -1;
        if (!isL && !isC) return;
        (isL ? lead : col).push(m);
        m.recommendedLeaders.concat(m.collaborators).forEach(function (o) {
          if (o === id) return;
          var r = partners[o] || (partners[o] = { id: o, ms: [] });
          if (!r.ms.some(function (x) { return x.m.id === m.id; })) r.ms.push({ m: m, lead: m.recommendedLeaders.indexOf(o) > -1 });
        });
      });
      var list = Object.keys(partners).map(function (k) { return partners[k]; });
      list.sort(function (a, b) {
        var oi = order.indexOf(a.id) - order.indexOf(b.id);
        return conn.sort === 'count' ? (b.ms.length - a.ms.length || oi) : oi;
      });
      return { lead: lead, col: col, partners: list };
    }
    function sw(id, cls) { var a = axis[(person[id] || {}).axisId]; return '<button class="ptag sw ' + (cls || '') + '" data-conn="' + id + '"' + (a ? ' style="--ac:' + a.color + '"' : '') + '>' + esc(nm(id)) + '</button>'; }
    function rb(lead) { return '<i class="rb' + (lead ? ' lead' : '') + '">' + (lead ? '추천 책임' : '협력') + '</i>'; }

    /* ----- PC 네트워크(SVG): 선택한 사람 → 사역 → 함께하는 사람 ----- */
    function svgGraph(id, cd) {
      var ms = cd.lead.concat(cd.col), pitch = 60, nh = 46;
      var pIdx = {}; cd.partners.forEach(function (p) { var s = 0, c = 0; ms.forEach(function (m, i) { if (p.ms.some(function (x) { return x.m.id === m.id; })) { s += i; c++; } }); pIdx[p.id] = c ? s / c : 0; });
      var ps = cd.partners.slice().sort(function (a, b) { return pIdx[a.id] - pIdx[b.id] || order.indexOf(a.id) - order.indexOf(b.id); });
      var rows = Math.max(ms.length, ps.length, 1), H = rows * pitch + 16, cy = H / 2;
      function ys(n, i) { return (H - n * pitch) / 2 + i * pitch + (pitch - nh) / 2; }
      var X = { c: 10, cw: 180, m: 330, mw: 250, p: 740, pw: 250 };
      var a = axis[(person[id] || {}).axisId] || { color: '#856F5A' };
      var edges = [], out = '';
      graph = { edges: [], nodes: {}, ms: {}, ps: {} };
      ms.forEach(function (m, i) {
        var y = ys(ms.length, i) + nh / 2, lead = cd.lead.indexOf(m) > -1;
        out += '<path class="gedge ' + (lead ? 'lead' : 'col') + '" data-a="C" data-b="M:' + m.id + '" d="M' + (X.c + X.cw) + ' ' + cy + ' C' + (X.c + X.cw + 70) + ' ' + cy + ',' + (X.m - 70) + ' ' + y + ',' + X.m + ' ' + y + '"/>';
        graph.edges.push(['C', 'M:' + m.id]);
      });
      ps.forEach(function (p, j) {
        var py = ys(ps.length, j) + nh / 2;
        ms.forEach(function (m, i) {
          if (!p.ms.some(function (x) { return x.m.id === m.id; })) return;
          var my = ys(ms.length, i) + nh / 2;
          out += '<path class="gedge thin" data-a="M:' + m.id + '" data-b="Q:' + p.id + '" d="M' + (X.m + X.mw) + ' ' + my + ' C' + (X.m + X.mw + 60) + ' ' + my + ',' + (X.p - 60) + ' ' + py + ',' + X.p + ' ' + py + '"/>';
          graph.edges.push(['M:' + m.id, 'Q:' + p.id]);
        });
      });
      out += '<g class="gnode gc" data-k="C"><rect x="' + X.c + '" y="' + (cy - 32) + '" width="' + X.cw + '" height="64" rx="14" style="fill:' + a.color + '"/><text x="' + (X.c + X.cw / 2) + '" y="' + (cy - 3) + '" class="t1">' + esc(nm(id)) + '</text><text x="' + (X.c + X.cw / 2) + '" y="' + (cy + 16) + '" class="t2">' + esc((person[id] || {}).role || '') + '</text></g>';
      ms.forEach(function (m, i) {
        var y = ys(ms.length, i), lead = cd.lead.indexOf(m) > -1;
        graph.nodes['M:' + m.id] = 'ministry:' + m.id;
        out += '<g class="gnode gm ' + (lead ? 'lead' : 'col') + '" data-k="M:' + m.id + '"><rect x="' + X.m + '" y="' + y + '" width="' + X.mw + '" height="' + nh + '" rx="10"/><text x="' + (X.m + 14) + '" y="' + (y + 20) + '" class="t1 l">' + esc(m.name) + '</text><text x="' + (X.m + 14) + '" y="' + (y + 37) + '" class="t2 l">' + (lead ? '추천 책임 사역' : '협력 참여 사역') + '</text></g>';
      });
      ps.forEach(function (p, j) {
        var y = ys(ps.length, j), pa = axis[(person[p.id] || {}).axisId] || { color: '#856F5A' };
        out += '<g class="gnode gp" data-k="Q:' + p.id + '" data-conn="' + p.id + '" style="--ac:' + pa.color + '"><rect x="' + X.p + '" y="' + y + '" width="' + X.pw + '" height="' + nh + '" rx="10"/><text x="' + (X.p + 14) + '" y="' + (y + 20) + '" class="t1 l">' + esc(nm(p.id)) + '</text><text x="' + (X.p + 14) + '" y="' + (y + 37) + '" class="t2 l">공통 참여 사역 ' + p.ms.length + '개 · 누르면 이 사람 중심으로</text></g>';
      });
      var heads = '<text x="' + X.c + '" y="12" class="th">선택한 사람</text><text x="' + X.m + '" y="12" class="th">사역 영역</text><text x="' + X.p + '" y="12" class="th">함께 협력하는 사람</text>';
      return '<div class="cn-graph"><svg class="cn-svg" viewBox="0 0 1000 ' + (H + 20) + '" role="img" aria-label="' + esc(nm(id)) + ' 중심 협력 관계"><g transform="translate(0,20)">' + out + '</g>' + heads + '</svg><p class="cn-cap" id="cn-cap">노드에 마우스를 올리면 관련 관계가 강조됩니다. 오른쪽 사람을 누르면 그 사람 중심 관계로 바뀝니다.</p></div>';
    }

    /* ----- 개인별 ----- */
    function personView() {
      var id = conn.id, p = person[id], cd = calc(id), a = axis[p.axisId];
      var who = '<div class="cn-card" style="--ac:' + a.color + '"><div class="cn-who"><b>' + esc(nm(id)) + '</b><span>' + esc(p.role) + ' <small>(가상 추천)</small></span></div>' + chips(p.values) +
        '<a class="more-link" href="#/story/' + esc(id) + '">개인 가치관 분석 보기 →</a></div>';
      var leadHTML = cd.lead.length ? cd.lead.map(function (m) {
        var others = m.recommendedLeaders.concat(m.collaborators).filter(function (x) { return x !== id; });
        return '<div class="cn-item lead"><b>' + esc(m.name) + '</b><div class="cn-sub">함께 협력하는 사람</div><div>' + others.map(function (o) { return sw(o); }).join('') + '</div></div>';
      }).join('') : '<p class="cn-none">이 구상안에서는 추천 책임 사역이 배치되어 있지 않습니다.</p>';
      var colHTML = cd.col.length ? cd.col.map(function (m) {
        var others = m.collaborators.filter(function (x) { return x !== id; });
        return '<div class="cn-item"><b>' + esc(m.name) + '</b><div class="cn-sub">추천 책임자</div><div>' + m.recommendedLeaders.map(function (o) { return sw(o, 'hl'); }).join('') + '</div>' +
          (others.length ? '<div class="cn-sub">함께 협력</div><div>' + others.map(function (o) { return sw(o); }).join('') + '</div>' : '') + '</div>';
      }).join('') : '<p class="cn-none">이 구상안에서는 협력 참여 사역이 배치되어 있지 않습니다.</p>';
      var pcards = cd.partners.map(function (q) {
        var pa = axis[(person[q.id] || {}).axisId] || { color: '#856F5A' };
        return '<article class="cp" style="--ac:' + pa.color + '"><div class="cp-top"><b>' + esc(nm(q.id)) + '</b><span class="cp-n">공통 참여 사역 ' + q.ms.length + '개</span></div><ul class="cp-list">' +
          q.ms.map(function (x) { return '<li><span>' + esc(x.m.name) + '</span>' + rb(x.lead) + '</li>'; }).join('') + '</ul>' +
          '<p class="cp-why">' + q.ms.map(function (x) { return '‘' + esc(x.m.name) + '’'; }).join(', ') + '에서 함께 협력하도록 추천되었습니다.</p>' +
          '<div class="cp-btns"><button class="btn sm" data-conn="' + q.id + '">관계 보기</button><a class="btn sm" href="#/story/' + esc(q.id) + '">가치관 보기 →</a></div></article>';
      }).join('');
      return who + svgGraph(id, cd) +
        '<div class="cn-cols"><div class="cn-block"><h3>추천 책임 사역 <small>' + cd.lead.length + '</small></h3>' + leadHTML + '</div><div class="cn-block"><h3>협력 참여 사역 <small>' + cd.col.length + '</small></h3>' + colHTML + '</div></div>' +
        '<div class="cn-phead"><h3>협력 파트너 <small>' + cd.partners.length + '명</small></h3><div class="fchips"><button class="fchip' + (conn.sort === 'count' ? ' on' : '') + '" data-sort="count">공통 사역 많은 순</button><button class="fchip' + (conn.sort === 'order' ? ' on' : '') + '" data-sort="order">참여자 순</button></div></div>' +
        '<p class="fine">공통 참여 사역 수는 같은 사역에 함께 추천된 횟수일 뿐, 성격 궁합이나 친밀도를 뜻하지 않습니다.</p><div class="cn-partners">' + pcards + '</div>';
    }

    /* ----- 전체 ----- */
    function allView() {
      var heads = D.participants.map(function (p) { return '<th><button class="cm-name" data-conn="' + p.participantId + '">' + esc(nm(p.participantId)) + '</button></th>'; }).join('');
      var rows = D.ministryAreas.map(function (m) {
        var a = axis[m.axisId];
        return '<tr><th class="cm-m" style="--ac:' + a.color + '"><i></i>' + esc(m.name) + '</th>' + D.participants.map(function (p) {
          var id = p.participantId, l = m.recommendedLeaders.indexOf(id) > -1, c = m.collaborators.indexOf(id) > -1;
          return '<td>' + (l ? '<span class="mk lead" title="추천 책임">●</span>' : c ? '<span class="mk col" title="협력">○</span>' : '') + '</td>';
        }).join('') + '</tr>';
      }).join('');
      var list = D.ministryAreas.map(function (m) {
        var a = axis[m.axisId];
        return '<div class="cn-item" style="--ac:' + a.color + '"><b>' + esc(m.name) + '</b><div class="cn-sub">추천 책임자</div><div>' + m.recommendedLeaders.map(function (o) { return sw(o, 'hl'); }).join('') + '</div><div class="cn-sub">협력</div><div>' + m.collaborators.map(function (o) { return sw(o); }).join('') + '</div></div>';
      }).join('');
      return '<div class="legend"><span><span class="mk lead">●</span> 추천 책임</span><span><span class="mk col">○</span> 협력</span><span class="fine">이름을 누르면 그 사람 중심의 개인별 관계로 이동합니다</span></div>' +
        '<div class="tablewrap cm-wide"><table class="cm-matrix"><thead><tr><th></th>' + heads + '</tr></thead><tbody>' + rows + '</tbody></table></div><div class="cm-list">' + list + '</div>';
    }

    function html() {
      return '<div class="sec-head cn-head"><div><div class="label">OUR CONNECTIONS</div><h2>우리는 어떻게 연결되어 있을까?</h2><p>한 사람을 선택하면 함께 사역할 사람들과 협력 영역을 살펴볼 수 있습니다.</p></div><span class="cn-badge">가상 협력 구상</span></div><div id="conn-root">' + inner() + '</div>';
    }
    function inner() {
      var seg = '<div class="seg" role="tablist"><button data-mode="person" class="' + (conn.mode === 'person' ? 'on' : '') + '">개인별 관계</button><button data-mode="all" class="' + (conn.mode === 'all' ? 'on' : '') + '">전체 관계</button></div>';
      var sel = conn.mode === 'person' ? '<div class="cn-select">' + D.participants.map(function (p) {
        var id = p.participantId, a = axis[p.axisId];
        return '<button class="cn-pick' + (conn.id === id ? ' on' : '') + '" data-conn="' + id + '" style="--ac:' + a.color + '" aria-pressed="' + (conn.id === id) + '">' + esc(nm(id)) + '</button>';
      }).join('') + '</div>' : '';
      return seg + sel + '<div class="cn-body swap">' + (conn.mode === 'person' ? personView() : allView()) + '</div>';
    }
    function redraw() { var r = document.getElementById('conn-root'); if (r) r.innerHTML = inner(); }

    function setHl(ch, k) {
      var svg = ch.querySelector('.cn-svg'); if (!svg) return;
      var nodes = svg.querySelectorAll('.gnode'), edges = svg.querySelectorAll('.gedge'), cap = document.getElementById('cn-cap');
      var def = '노드에 마우스를 올리면 관련 관계가 강조됩니다. 오른쪽 사람을 누르면 그 사람 중심 관계로 바뀝니다.';
      if (!k) { nodes.forEach(function (n) { n.classList.remove('dim'); }); edges.forEach(function (e) { e.classList.remove('dim'); }); if (cap) cap.textContent = def; return; }
      var on = { C: 1 }; on[k] = 1;
      graph.edges.forEach(function (e) { if (e[0] === k) on[e[1]] = 1; if (e[1] === k) on[e[0]] = 1; });
      nodes.forEach(function (n) { n.classList.toggle('dim', !on[n.dataset.k]); });
      edges.forEach(function (e) { var a = e.dataset.a, b = e.dataset.b; e.classList.toggle('dim', !(a === k || b === k || (a === 'C' && on[b]))); });
      if (cap) {
        var t = k === 'C' ? '' : k.charAt(0) === 'M' ? (function () { var m = D.ministryAreas.filter(function (x) { return 'M:' + x.id === k; })[0]; return m.name + ' — 추천 책임자: ' + m.recommendedLeaders.map(nm).join(', ') + ' · 협력: ' + m.collaborators.map(nm).join(', '); })() :
          (function () { var id = k.slice(2), cd = calc(conn.id), q = cd.partners.filter(function (x) { return x.id === id; })[0]; return nm(id) + ' — 공통 참여 사역 ' + q.ms.length + '개: ' + q.ms.map(function (x) { return x.m.name; }).join(', '); })();
        cap.textContent = t || def;
      }
    }

    function bind(ch) {
      ch.addEventListener('click', function (e) {
        var t = e.target;
        var m = t.closest('[data-mode]'); if (m) { conn.mode = m.dataset.mode; redraw(); return; }
        var s = t.closest('[data-sort]'); if (s) { conn.sort = s.dataset.sort; redraw(); return; }
        var c = t.closest('[data-conn]');
        if (c && c.closest('#conn-root')) { conn.id = c.dataset.conn; conn.mode = 'person'; redraw(); var sec = document.getElementById('sec-connections'); if (sec && c.closest('.cm-matrix,.cm-list,.cn-partners,.cn-cols,.cn-graph')) { var r = document.getElementById('conn-root').getBoundingClientRect(); if (r.top < 0 || r.top > window.innerHeight * .5) document.getElementById('conn-root').scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
      });
      ch.addEventListener('mouseover', function (e) { var n = e.target.closest('.gnode'); if (n) setHl(ch, n.dataset.k); });
      ch.addEventListener('mouseout', function (e) { if (e.target.closest('.gnode')) setHl(ch, null); });
    }
    return { html: html, bind: bind };
  };
})();
