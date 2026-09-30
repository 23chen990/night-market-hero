import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ExperienceComplaintTriageSchema, ExperienceReproductionMatrixSchema } from '../../../../../../src/schemas/experience-complaint.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.resolve(root, '../../../workspace/night-market-hero');
const targetGame = '夜市飞侠：护印突围';
const reference = path.join(workspace, 'reference-evidence/verified/00_FINAL_STYLE_AUTHORITY_USER-3a97a6703f2c.png');
const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const evidence = [
  { path: reference, sha256: sha(reference), kind: 'reference' as const, provenance: 'verified-reference' as const },
  { path: path.join(root, 'screen.png'), sha256: sha(path.join(root, 'screen.png')), kind: 'qa-artifact' as const, provenance: 'verified-run-artifact' as const },
];
const createdAt = new Date().toISOString();
const triage = ExperienceComplaintTriageSchema.parse({
  schemaVersion: 1, artifactType: 'experience-complaint-triage', targetGame, workspace,
  report: '续接原窗口被中断的代码门面一屏研究；补完已写出的 surfaces.js，修正屋檐、棚布、木楼、灯串的比例和连接，并交付独立审查证据与可复现源码。原窗口当前范围仍为离线美术研究。',
  classification: ['reference-fidelity', 'visual-hierarchy'],
  scope: { route: 'formal-fixer', rationale: '继承已验证美术投诉和既有 formal-fixer 路由；本次完成离线候选研究，不完成或冒充游戏运行时 FIX。', generatedWorkspaceModified: false,
    contextIntentionallyOmitted: ['其他游戏、共享工厂重构', '无关玩法、存档、经济历史', '未核验来源的图像与录屏'] },
  reproduction: { status: 'REPRODUCED', steps: ['恢复原窗口最后一轮用户指令', '打开 facade-study-v5 及已核验定稿', '检查 surfaces.js 未进入 build.py / scene.js 的候选分支'],
    observed: ['近景仍使用放大的同一屋檐和棚布素材。', '门面上层窗格、右侧拱门比例与目标差异明显。', 'surfaces.js 已生成代码大轮廓但未被构建或绘制。'], evidence },
  acceptanceCriteria: ['代码屋檐与三种棚布轮廓进入离线候选，单图与组合分支均有真实像素证据。', '灯串、棚布、挑廊的连接关系经独立审查。', '桌面、横屏手机、竖屏手机正常按钮操作，无外部请求或页面异常。', '透明代码部件验证有效 alpha，检查三种底色合成。', '记录整体相似度仍未获确认及任何独立审查缺口；运行时接入状态明确。', '游戏源码保持原样，所有代码与研究候选在目标游戏公开仓库可复现。'],
  status: 'READY_FOR_REPAIR', createdAt,
});
const axes = { objectTypes: ['facade', 'roof', 'canopy', 'lantern-mount', 'scaffold'], lifecycleStateBranches: ['isolated-code-part', 'assembled-study', 'default-game-runtime'], rendererPaths: ['offline-canvas', 'Phaser-FlightScene'], viewports: [{ label: 'desktop', width: 1672, height: 941 }, { label: 'phone-landscape', width: 844, height: 390 }, { label: 'phone-portrait', width: 390, height: 844 }] };
const cells = axes.objectTypes.flatMap(objectType => axes.lifecycleStateBranches.flatMap(branch => axes.viewports.map(viewport => ({
  id: `${objectType}-${branch}-${viewport.label}`, objectType, lifecycleStateBranch: branch,
  rendererPath: branch === 'default-game-runtime' ? 'Phaser-FlightScene' : 'offline-canvas', viewport,
  status: branch === 'default-game-runtime' ? 'NOT_APPLICABLE' : 'BLOCKED',
  expected: branch === 'default-game-runtime' ? '本次仅离线研究，保留游戏运行时审查状态。' : '观察精确对象与分支；几何、比例、连接及视觉层次与已核验定稿对照。',
  observed: branch === 'default-game-runtime' ? '候选尚未进入默认游戏旅程，不能以候选结果闭合运行时投诉。' : '等待本轮候选与独立像素审查。', evidence,
}))));
const matrix = ExperienceReproductionMatrixSchema.parse({ schemaVersion: 1, artifactType: 'experience-reproduction-matrix', targetGame, workspace, axes, cells,
  confirmedFindings: triage.reproduction.observed, remainingGaps: ['整体90%相似度未被量化或确认。', '候选未接入默认游戏运行时；微信、抖音、TapTap无新发布证明。'], createdAt });
writeFileSync(path.join(root, 'qa/resume-triage.json'), JSON.stringify(triage, null, 2) + '\n');
writeFileSync(path.join(root, 'qa/resume-matrix.json'), JSON.stringify(matrix, null, 2) + '\n');
console.log('Validated resume triage and 45 exact-branch reproduction cells.');
