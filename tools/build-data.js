// assets/*.txt (AI 보고서 원문) + tools/extracted/*.json (구조화 값) → data/participants.js
// 실행: node tools/build-data.js   (원문은 가공 없이 그대로 두고, 인용 출처 찌꺼기 줄만 제거)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const assets = path.join(root, 'assets'), extracted = path.join(__dirname, 'extracted');
const strip = s => s.replace(/\*\*|^#+\s*/g, '').replace(/^[“"'‘]|[”"'’]$/g, '').trim();

const isJunk = l => /^\[.*\]\(https?:.*\)\s*$/.test(l) || /^[\w.-]+\.(com|net|org|it|io|kr|co\.kr)$/i.test(l.trim()) || /^\[[\w.-]+\.(com|net|org|it|io|kr)\]\(/.test(l);
const clean = t => t.split('\n').filter(l => !isJunk(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();

const files = fs.readdirSync(assets).filter(f => f.endsWith('.txt')).sort((a, b) => a.localeCompare(b, 'ko'));
const order = fs.existsSync(path.join(__dirname, 'order.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'order.json'), 'utf8')) : null;
if (order) files.sort((a, b) => order.indexOf(a.replace('.txt', '')) - order.indexOf(b.replace('.txt', '')));

function sections(raw) {
  const lines = raw.replace(/\r/g, '').split('\n'), idx = [];
  lines.forEach((l, i) => { const m = /^[\s*#]*([1-6])\.\s*【/.exec(l); if (m) idx.push([+m[1], i]); });
  const out = { pre: clean(lines.slice(0, idx[0][1]).join('\n')) };
  idx.forEach(([n, i], k) => { out[n] = lines.slice(i + 1, k + 1 < idx.length ? idx[k + 1][1] : lines.length).join('\n'); });
  return out;
}
const paras = t => t.split(/\n{2,}/).map(x => x.trim()).filter(Boolean);

function splitScenes(t) {
  const keys = [['alone', /혼자 있을 때의 나/], ['friends', /친구들과 함께 있을 때의 나/], ['work', /직장이나 역할 속의 나/]];
  const lines = t.split('\n'), pos = [];
  keys.forEach(([k, re]) => { const i = lines.findIndex(l => l.trim().length < 90 && re.test(l) && !pos.some(p => p.i === lines.indexOf(l))); if (i > -1) pos.push({ k, i }); });
  pos.sort((a, b) => a.i - b.i);
  const res = {};
  pos.forEach((p, n) => {
    const title = strip(lines[p.i]).replace(/^[①②③]\s*/, '').replace(/^\*|\*$/g, '').trim();
    let body = clean(lines.slice(p.i + 1, n + 1 < pos.length ? pos[n + 1].i : lines.length).join('\n'));
    let quote = '';
    const bp = paras(body);
    const qi = bp.findIndex(x => /^>/.test(x) || /^[“"‘'].{6,}[”"’']$/.test(x));
    if (qi > -1) { quote = bp[qi].replace(/^>\s*/gm, '').replace(/^[“"‘']|[”"’']$/g, '').trim(); bp.splice(qi, 1); body = bp.join('\n\n'); }
    res[p.k] = { title, analysis: body, quote };
  });
  return res;
}

function splitShadow(t, neg) {
  const ps = paras(clean(t));
  const starts = neg.map(w => ps.findIndex(p => p.replace(/[*#①-⑤→\d.\s]/g, '').slice(0, 14).includes(w)));
  if (neg.length < 5 || starts.some(s => s < 0) || new Set(starts).size < 5) return { pre: ps.join('\n\n'), items: [] };
  const sorted = starts.slice().sort((a, b) => a - b);
  const items = starts.map(s => { const e = sorted[sorted.indexOf(s) + 1]; return ps.slice(s, e == null ? ps.length : e).join('\n\n'); });
  return { pre: ps.slice(0, sorted[0]).join('\n\n'), items };
}

const people = files.map((f, i) => {
  const name = f.replace('.txt', '');
  const raw = fs.readFileSync(path.join(assets, f), 'utf8');
  const s = sections(raw);
  const xp = path.join(extracted, name + '.json');
  const x = fs.existsSync(xp) ? JSON.parse(fs.readFileSync(xp, 'utf8')) : {};
  const s1 = paras(clean((s[1] || '').split('\n').filter(l => !/^\s*(MY|YOUR) LIFE TITLE\s*$/i.test(l)).join('\n')));
  const title = strip(s1[0] || '');
  const neg = x.negative_core_5 || [];
  const sh = splitShadow(s[3] || '', neg);
  const sc = splitScenes(s[4] || '');
  const p = {
    id: 'p' + String(i + 1).padStart(2, '0'), name,
    title,
    final_positive_5: x.final_positive_5 || [],
    positive_core_5: x.positive_core_5 || [],
    negative_core_5: neg,
    opposite_choices: x.opposite_choices || [],
    positive_selected_20: x.positive_selected_20 || [],
    dropped_positive: x.dropped_positive || [],
    preface: clean(s.pre || ''),
    title_analysis: s1.slice(1).join('\n\n'),
    confident_analysis: clean(s[2] || ''),
    shadow_intro: sh.pre, shadow_analysis: sh.items,
    scenes: sc,
    caution_raw: clean(s[5] || ''),
    letter: clean(s[6] || ''),
  };
  return p;
});
// 이미 부여된 id 는 이름 기준으로 유지(새 참여자가 추가돼도 기존 id 가 밀리지 않도록)
const prevIds = {};
try { const vm = require('vm'), ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'data', 'participants.js'), 'utf8'), ctx); ctx.window.VALUES_DATA.participants.forEach(p => { prevIds[p.name] = p.id; }); } catch (e) { }
const PENDING = ['이시온', '서재현']; // 이름만 등록된 참여자(분석 결과 입력 전)
PENDING.forEach(n => people.push({ id: 'p' + String(people.length + 1).padStart(2, '0'), name: n, pending: true }));
(function () {
  const used = new Set(Object.values(prevIds));
  let max = Math.max(0, ...[...used].map(i => +i.slice(1)));
  const fixed = people.map(p => prevIds[p.name]);
  people.forEach((p, i) => { p.id = fixed[i] || 'p' + String(++max).padStart(2, '0'); });
})();
// 표시 순서: 위 PRIORITY 순서대로 앞에 두고, 나머지는 기존 순서
const PRIORITY = ['장성경', '민혜린', '진일진', '서재현', '김지영', '오유미', '김하람', '이시온'];
people.sort((a, c) => { const r = n => { const i = PRIORITY.indexOf(n.name); return i > -1 ? i : 100; }; return r(a) - r(c); });
const header = ["// THE VALUES ARCHIVE 데이터 (tools/build-data.js 로 assets/*.txt 에서 생성).", "// 필수: id, name, title, final_positive_5, positive_core_5, negative_core_5, opposite_choices, positive_selected_20, dropped_positive", "// 선택: preface, title_analysis, confident_analysis, shadow_intro, shadow_analysis[5], scenes, caution_raw, letter, created_at, pending(이름만 등록)"].join(String.fromCharCode(10));
const js = header + String.fromCharCode(10) + "window.VALUES_DATA = {" + String.fromCharCode(10) + "  participants: " + JSON.stringify(people, null, 2) + String.fromCharCode(10) + "};" + String.fromCharCode(10);
fs.writeFileSync(path.join(root, 'data', 'participants.js'), js);
people.forEach(p => console.log(p.id, p.name, '|', (p.title || '').slice(0, 24), '| final', (p.final_positive_5||[]).length, 'core', (p.positive_core_5||[]).length, 'opp', (p.opposite_choices||[]).length, 'neg', (p.negative_core_5||[]).length, '| pairs', (p.shadow_analysis||[]).length, '| scenes', Object.keys(p.scenes||{}).join(','), '| q', Object.values(p.scenes||{}).filter(x => x.quote).length));
