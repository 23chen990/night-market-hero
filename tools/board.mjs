#!/usr/bin/env node
// 妖怪夜市 · 工厂看板（v2）按"游戏颗粒度"重组：自动判类型、同款折叠、真名优先。
// 用法：node tools/board.mjs   或   pnpm board
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.FACTORY_ROOT ? path.resolve(process.env.FACTORY_ROOT) : process.cwd();
const RUNS_DIR = path.join(ROOT, 'runs');
const PORT = Number(process.env.BOARD_PORT || 4173);
const HTML_PATH = fileURLToPath(new URL('./board.html', import.meta.url));

// 通用模板名（package.json 里出现这些说明只是占位，不是真游戏名）
const GENERIC_PKG = new Set(['generated-idle-shop', 'generated-spatial-shop', 'idle-shop-v1', 'spatial-shop-v1', 'spatial-shop-3d-v1']);

// 阶段 -> 负责 agent
const STAGE_AGENT = {
  CREATED: 'RequestRouter', ROUTE: 'RequestRouter',
  BLUEPRINT: 'ProducerAgent',
  COMPETITOR: 'ResearchAgent', REFERENCE: 'ResearchAgent', RESEARCH: 'ResearchAgent',
  OPEN_SOURCE: 'OpenSourceResearchAgent',
  ART_DIRECTIONS: 'ArtDirectorAgent', WAITING_FOR_ART: '你（人工）', STYLE_LOCK: 'StyleLockAgent',
  ASSETS: 'AssetProducerAgent',
  BUILD: 'BuilderAgent',
  QA: 'QAAgent',
  FIX: 'FixerAgent',
  RELEASE: 'ReleaseAgent',
  ACTION_EXPERIMENT: 'ActionLab', PROTOTYPE: 'PrototypeBuilder',
  NARRATIVE: 'NarrativeDesigner', REPLAY: 'ReplayDesigner', CHAPTER: 'ChapterBuilder',
};

// ---------- 解析一个 run 的元元（含类型与真名）----------
function detectType(dir, state) {
  if (fs.existsSync(path.join(dir, 'input', 'action-experiment.json'))) return 'action-experiment';
  if (state?.stage && state.stage.includes('ACTION_EXPERIMENT')) return 'action-experiment';
  if (state) return 'game'; // 有 state.json 的都算游戏产线（含早期 CREATED）
  return fs.existsSync(path.join(dir, 'artifacts')) || fs.existsSync(path.join(dir, 'screenshots')) ? 'archive' : 'draft';
}
const TYPE_LABEL = { 'game': '游戏', 'action-experiment': '动作实验', 'archive': '归档', 'draft': '草稿', 'other': '其他' };

// 读游戏清单 tools/games.txt：每行 "游戏名 = run1, run2 [| 描述]"；run-id 前加「-」表示废弃
function loadRegistry() {
  const p = path.join(ROOT, 'tools', 'games.txt');
  if (!fs.existsSync(p)) return null;
  const games = [];
  const abandoned = new Set();
  for (let line of fs.readFileSync(p, 'utf8').split('\n')) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const name = line.slice(0, eq).trim();
    const rhs = line.slice(eq + 1);
    const pipeIdx = rhs.indexOf('|');
    const runsStr = pipeIdx >= 0 ? rhs.slice(0, pipeIdx) : rhs;
    const description = pipeIdx >= 0 ? rhs.slice(pipeIdx + 1).trim() : '';
    const runs = [];
    for (const raw of runsStr.split(',')) {
      const t = raw.trim();
      if (!t) continue;
      const isAbandoned = t.startsWith('-');
      const id = isAbandoned ? t.slice(1) : t;
      runs.push({ id, abandoned: isAbandoned });
      if (isAbandoned) abandoned.add(id);
    }
    if (name) games.push({ name, runs, description });
  }
  return games.length ? { games, abandoned } : null;
}

// 阶段 -> [PM 友好名, agent 角色, 模型]（依据 architecture.md / operating-model 的角色与模型分层）
const STAGE_PM = {
  CREATED: ['需求接入', 'RequestRouter', 'Sol'],
  ROUTE: ['需求接入', 'RequestRouter', 'Sol'],
  BLUEPRINT: ['策划定玩法', 'ProducerAgent', 'Sol'],
  COMPETITOR_RESEARCH: ['竞品研究', 'ResearchAgent', 'Sol'],
  REFERENCE: ['参考机制锁定', 'ResearchAgent', 'Sol'],
  OPEN_SOURCE_RESEARCH: ['开源调研', 'OpenSourceResearchAgent', 'Sol'],
  ART_DIRECTIONS: ['美术定方向', 'ArtDirectorAgent', 'Luna'],
  WAITING_FOR_ART_APPROVAL: ['等你选美术', '你（产品经理）', '—'],
  STYLE_LOCK: ['锁定美术', 'StyleLockAgent', 'Luna'],
  ASSETS: ['出素材', 'AssetProducerAgent', 'Spark+Luna'],
  BUILD: ['程序实现', 'BuilderAgent', 'Terra'],
  FIX: ['修复问题', 'FixerAgent', 'Luna'],
  QA: ['自动质检', 'QAAgent', 'Luna'],
  RELEASE: ['打包发布', 'ReleaseAgent', 'Sol'],
  COMPLETED: ['已完成', '—', '—'],
  WAITING_FOR_PROTOTYPE_APPROVAL: ['等你选原型', '你（产品经理）', '—'],
  WAITING_FOR_REFERENCE_APPROVAL: ['等你确认参考', '你（产品经理）', '—'],
  WAITING_FOR_ACTION_APPROVAL: ['等你选动作方案', '你（产品经理）', '—'],
  ACTION_EXPERIMENT_SPEC: ['动作实验设计', 'ActionLab', 'Terra'],
  BUILD_ACTION_PROTOTYPES: ['做动作原型', 'BuilderAgent', 'Terra'],
  PLAYTEST_ACTION_PROTOTYPES: ['动作原型试玩', 'QAAgent', 'Luna'],
  ACTION_EXPERIMENT_APPROVED: ['动作实验完成', '—', '—'],
  NARRATIVE: ['叙事设计', 'NarrativeDesigner', 'Sol'],
  REPLAY: ['重玩设计', 'ReplayDesigner', 'Sol'],
  CHAPTER: ['章节扩展', 'ChapterBuilder', 'Terra'],
  PROFILE_QA: ['体验质检', 'QAAgent', 'Luna'],
};
function stagePm(name) { for (const k in STAGE_PM) if (name.indexOf(k) >= 0) return STAGE_PM[k]; return [name, '—', '—']; }

// PM 视角状态
const PM_LABELS = { playable: '✅ 可试玩验收', waiting_pm: '⏳ 等你拍板', building: '🔧 制作中', failed: '⛔ 卡住了', research: '📋 研究中', draft: '📝 还没开始' };
const PM_ORDER = ['playable', 'waiting_pm', 'failed', 'building', 'research', 'draft'];
function pmStatusOf(o) {
  if (o.playable) return 'playable';
  if (o.status === 'waiting' || (o.stage && o.stage.indexOf('WAITING') === 0)) return 'waiting_pm';
  if (o.status === 'failed') return 'failed';
  if (o.status === 'running' || o.status === 'pending' || o.hasState) return 'building';
  if (o.hasShots) return 'research';
  return 'draft';
}

// 找该 run 目录下所有 workspace/**/index.html（排除 node_modules），按"产线构建优先"返回最佳可玩 demo
const PLAY_CANDIDATES = [
  'workspace/game/dist/index.html',
  'workspace/game/build/web-mobile/index.html',
  'workspace/prototype-a/dist/index.html',
  'workspace/prototype-b/dist/index.html',
  'workspace/prototype-c/dist/index.html',
  'workspace/action-a/dist/index.html',
  'workspace/action-b/dist/index.html',
  'workspace/action-c/dist/index.html',
  'workspace/prototype-a/index.html',
  'workspace/prototype-b/index.html',
  'workspace/prototype-c/index.html',
  'workspace/action-a/index.html',
  'workspace/action-b/index.html',
  'workspace/action-c/index.html',
  'workspace/game/index.html',
];
function findPlayable(dir) {
  for (const c of PLAY_CANDIDATES) if (fs.existsSync(path.join(dir, c))) return c;
  try {
    function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const full = path.join(d, e.name);
        if (e.isDirectory()) { const r = walk(full); if (r) return r; }
        else if (e.name === 'index.html') return path.relative(dir, full);
      }
      return '';
    }
    const ws = path.join(dir, 'workspace');
    if (fs.existsSync(ws)) { const r = walk(ws); if (r) return r; }
  } catch {}
  return '';
}
function bestPlayUrl(runs) {
  for (const c of PLAY_CANDIDATES) {
    const r = runs.find((x) => x.playPath === c);
    if (r) return { url: '/files/' + encodeURIComponent(r.runId) + '/' + c, runId: r.runId, path: c };
  }
  const r = runs.find((x) => x.playUrl);
  return r ? { url: r.playUrl, runId: r.runId, path: r.playPath } : { url: '', runId: '', path: '' };
}

function parseMeta(dir, fallbackId) {
  let bp = null, seedTxt = null, pkgName = '', expId = '', expQuestion = '';
  try { bp = JSON.parse(fs.readFileSync(path.join(dir, 'artifacts', 'game-blueprint.json'), 'utf8')); } catch {}
  try { seedTxt = fs.readFileSync(path.join(dir, 'input', 'seed.yaml'), 'utf8'); } catch {}
  try { pkgName = JSON.parse(fs.readFileSync(path.join(dir, 'workspace', 'game', 'package.json'), 'utf8')).name || ''; } catch {}
  try {
    const ae = JSON.parse(fs.readFileSync(path.join(dir, 'input', 'action-experiment.json'), 'utf8'));
    expId = ae.experimentId || '';
    expQuestion = ae.question || '';
  } catch {}
  const seedField = (k) => {
    if (!seedTxt) return '';
    const m = seedTxt.match(new RegExp(`^${k}\\s*:\\s*(.+)$`, 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  };
  const bpName = bp ? (bp.title || bp.name || bp.gameName || bp.theme || '') : '';
  const seedTitle = seedField('title');
  // 真名优先级：蓝图名 > seed 标题 > 动作实验 ID > workspace 包名（仅当不是通用模板名）> 目录名
  const name = bpName
    || seedTitle
    || expId
    || (pkgName && !GENERIC_PKG.has(pkgName) ? pkgName : '')
    || fallbackId;
  const theme = (bp ? bp.theme : '') || seedField('theme') || '';
  const template = (bp ? bp.template : '') || seedField('template') || '';
  const state = (() => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8')); } catch { return null; } })();
  const type = detectType(dir, state);
  const subtitle = type === 'action-experiment' ? expQuestion : theme;
  return { name, theme, template, type, typeLabel: TYPE_LABEL[type], subtitle };
}

// ---------- 数据 ----------
const readJson = async (p) => { try { return JSON.parse(await fs.promises.readFile(p, 'utf8')); } catch { return null; } };

function tier(status, stage) {
  if (status === 'completed') return 'done';
  if (status === 'failed') return 'failed';
  if (status === 'waiting' || (stage && stage.startsWith('WAITING'))) return 'waiting';
  if (status === 'running' || status === 'pending') return 'running';
  return 'draft';
}
function gateInfo(run) {
  const s = run.stage || ''; const id = run.runId;
  if (s.includes('PROTOTYPE')) return { label: '从三个原型里选一个', cmd: `pnpm factory approve-prototype ${id} --decision APPROVE` };
  if (s.includes('REFERENCE')) return { label: '锁定参考机制', cmd: `pnpm factory approve-reference ${id} --decision APPROVE` };
  if (s.includes('ART')) return { label: '审批美术方向（先填 human/art-approval.yaml）', cmd: `pnpm factory approve ${id} --direction direction_b` };
  if (s.includes('ACTION')) return { label: '锁定动作实验方案', cmd: `pnpm factory approve-action ${id} --slot <A|B|C> --decision APPROVE --rationale "<理由>"` };
  if (run.status === 'failed') return { label: '这条线失败了，可用 retry 重跑某阶段', cmd: `pnpm factory retry ${id} <STAGE>` };
  return null;
}

// 聚合一批 run 成一个组
function buildGroup(name, type, runs, description = '') {
  const statusCounts = { done: 0, failed: 0, running: 0, waiting: 0, draft: 0 };
  let latestUpdatedAt = null, needsAttention = false;
  // PM 状态取"最可操作"的那个（playable 优先）
  let pmStatus = 'draft';
  for (const r of runs) {
    statusCounts[r.tier] = (statusCounts[r.tier] || 0) + 1;
    if (r.tier === 'waiting' || r.tier === 'failed') needsAttention = true;
    if (!latestUpdatedAt || (r.updatedAt && r.updatedAt > latestUpdatedAt)) latestUpdatedAt = r.updatedAt;
    if (PM_ORDER.indexOf(r.pmStatus) < PM_ORDER.indexOf(pmStatus)) pmStatus = r.pmStatus;
  }
  runs.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const active = runs.filter((r) => !r.abandoned);
  const abandoned = runs.filter((r) => r.abandoned);
  // 副标题：优先用 PM 自己写的描述；否则挑一个"不是动作实验、主题最有意义"的 run（活跃优先）
  const themeSrc = active.length ? active : runs;
  const themeRun = themeSrc.find((r) => r.meta.theme && r.meta.type !== 'action-experiment') || themeSrc.find((r) => r.meta.type !== 'action-experiment') || themeSrc[0];
  const themeText = themeRun ? (themeRun.meta.theme || '') : '';
  // 缩略图：优先活跃、游戏类 run 的 gameplay 截图
  const thumbRun = active.find((r) => r.thumbUrl && r.meta.type !== 'action-experiment') || active.find((r) => r.thumbUrl) || abandoned.find((r) => r.thumbUrl);
  // 试玩链接只从「活跃」run 中选
  const playMeta = bestPlayUrl(active);
  const lat = runs[0];
  return {
    key: type + '::' + name, type, typeLabel: TYPE_LABEL[type] || type, name,
    subtitle: description || themeText,
    theme: themeText, template: lat ? lat.meta.template : '',
    statusCounts, count: runs.length, abandonedCount: abandoned.length, needsAttention,
    latestRunId: lat ? lat.runId : '', latestStatus: lat ? lat.status : '', latestStage: lat ? lat.stage : '',
    latestTier: lat ? lat.tier : 'draft', latestProgress: lat ? lat.progress : 0, latestUpdatedAt,
    runIds: runs.map((r) => r.runId), activeRunIds: active.map((r) => r.runId), abandonedRunIds: abandoned.map((r) => r.runId),
    pmStatus, pmStatusLabel: PM_LABELS[pmStatus],
    playUrl: playMeta.url, playableRunId: playMeta.runId,
    thumbUrl: thumbRun ? thumbRun.thumbUrl : (lat ? lat.thumbUrl : ''),
  };
}

async function listGroups() {
  if (!fs.existsSync(RUNS_DIR)) return [];
  const dirs = await fs.promises.readdir(RUNS_DIR);
  const runs = [];
  for (const id of dirs) {
    const dir = path.join(RUNS_DIR, id);
    const st = await fs.promises.stat(dir).catch(() => null);
    if (!st || !st.isDirectory()) continue;
    const state = await readJson(path.join(dir, 'state.json'));
    const meta = parseMeta(dir, id);
    const t = tier(state?.status, state?.stage);
    let progress = 0, stageCount = 0;
    if (state?.stages) {
      const stages = Object.values(state.stages);
      stageCount = stages.length;
      const done = stages.filter((x) => x.status === 'completed').length;
      progress = stageCount ? Math.round((done / stageCount) * 100) : 0;
    }
    const distExists = fs.existsSync(path.join(dir, 'workspace', 'game', 'dist', 'index.html'));
    let buildOk = false, qaOk = false;
    try { buildOk = !!JSON.parse(fs.readFileSync(path.join(dir, 'artifacts', 'build-report.json'), 'utf8')).success; } catch {}
    try { qaOk = JSON.parse(fs.readFileSync(path.join(dir, 'artifacts', 'qa-report.json'), 'utf8')).passed === true; } catch {}
    const shots = fs.existsSync(path.join(dir, 'screenshots')) ? fs.readdirSync(path.join(dir, 'screenshots')).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort() : [];
    const thumb = shots.includes('gameplay.png') ? 'screenshots/gameplay.png' : (shots[0] ? 'screenshots/' + shots[0] : '');
    const playPath = findPlayable(dir);
    const playable = !!playPath;
    const pm = pmStatusOf({ playable, status: state?.status || 'draft', stage: state?.stage || '', hasState: !!state, hasShots: shots.length > 0 });
    runs.push({
      runId: id, meta, status: state?.status || 'draft', stage: state?.stage || '', tier: t, progress, stageCount,
      updatedAt: state?.updatedAt || state?.createdAt || null, hasState: !!state,
      playable, playPath, playUrl: playable ? '/files/' + encodeURIComponent(id) + '/' + playPath : '',
      thumbUrl: thumb ? '/files/' + encodeURIComponent(id) + '/' + thumb : '', buildOk, qaOk,
      pmStatus: pm, pmStatusLabel: PM_LABELS[pm],
    });
  }

  const reg = loadRegistry();
  if (reg) {
    const groups = [];
    const used = new Set();
    for (const g of reg) {
      const gruns = g.runs.map((rid) => runs.find((r) => r.runId === rid)).filter(Boolean);
      gruns.forEach((r) => used.add(r.runId));
      if (gruns.length) groups.push(buildGroup(g.name, 'game', gruns, g.description));
    }
    const others = runs.filter((r) => !used.has(r.runId));
    if (others.length) groups.push(buildGroup('其他 / 未归类', 'other', others));
    groups.sort((a, b) => (a.type === 'other' ? 1 : 0) - (b.type === 'other' ? 1 : 0) || (b.latestUpdatedAt || '').localeCompare(a.latestUpdatedAt || ''));
    return groups;
  }

  // 无清单时：按 (类型, 名字) 自动折叠
  const gmap = new Map();
  for (const r of runs) {
    const key = r.meta.type + '::' + r.meta.name;
    if (!gmap.has(key)) gmap.set(key, []);
    gmap.get(key).push(r);
  }
  const out = [...gmap.entries()].map(([k, rs]) => buildGroup(k.split('::')[1], k.split('::')[0], rs));
  out.sort((a, b) => (b.latestUpdatedAt || '').localeCompare(a.latestUpdatedAt || ''));
  return out;
}

async function runDetail(id) {
  const dir = path.join(RUNS_DIR, id);
  const state = await readJson(path.join(dir, 'state.json'));
  const meta = parseMeta(dir, id);
  const stages = state?.stages ? Object.entries(state.stages).map(([name, v]) => ({ name, ...v })) : [];
  let buildOk = false, qaOk = false;
  try { buildOk = !!JSON.parse(fs.readFileSync(path.join(dir, 'artifacts', 'build-report.json'), 'utf8')).success; } catch {}
  try { qaOk = JSON.parse(fs.readFileSync(path.join(dir, 'artifacts', 'qa-report.json'), 'utf8')).passed === true; } catch {}
  const shots = fs.existsSync(path.join(dir, 'screenshots')) ? fs.readdirSync(path.join(dir, 'screenshots')).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort().map((f) => 'screenshots/' + f) : [];
  const playPath = findPlayable(dir);
  const playable = !!playPath;
  const enc = encodeURIComponent(id);
  return {
    runId: id, meta, state, stages,
    gate: state ? gateInfo({ stage: state.stage, status: state.status, runId: id }) : null,
    playable, playPath, playUrl: playable ? '/files/' + enc + '/' + playPath : '',
    screenshots: shots.map((s) => ({ path: s, url: '/files/' + enc + '/' + s })),
    buildOk, qaOk,
  };
}

// ---------- 静态文件（带越权保护）----------
const CT = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.yaml': 'text/yaml; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
function serveFile(res, id, rel) {
  const base = path.join(RUNS_DIR, id);
  const target = path.normalize(path.join(base, rel));
  if (!target.startsWith(base)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(target, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': CT[path.extname(target).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------- 路由 ----------
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const p = u.pathname;
  try {
    if (p === '/' || p === '/index.html') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(await fs.promises.readFile(HTML_PATH, 'utf8')); return; }
    if (p === '/api/runs') { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(await listGroups())); return; }
    const m = p.match(/^\/api\/run\/(.+)$/);
    if (m) { const id = decodeURIComponent(m[1]); res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(await runDetail(id))); return; }
    const f = p.match(/^\/files\/([^/]+)\/(.+)$/);
    if (f) { serveFile(res, decodeURIComponent(f[1]), decodeURIComponent(f[2])); return; }
    res.writeHead(404); res.end('not found');
  } catch (e) { res.writeHead(500); res.end('error: ' + e.message); }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  妖怪夜市 · 工厂看板 v2 已启动 → ${url}\n  Ctrl+C 关闭。\n`);
  if (process.platform === 'darwin') exec(`open ${url}`);
});