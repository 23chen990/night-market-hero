import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ArtDirections, GameBlueprint } from '../schemas/index.js';
import { ensureDir } from './files.js';

export async function createArtReview(runRoot: string, blueprint: GameBlueprint, artifact: ArtDirections) {
  const previewDir = path.join(runRoot, 'art-review/previews'); await ensureDir(previewDir);
  for (const direction of artifact.directions) {
    const bands = direction.palette.map((color, index) => `<rect x="${index * (800 / direction.palette.length)}" width="${800 / direction.palette.length + 1}" height="500" fill="${color}"/>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">${bands}<rect x="180" y="90" width="440" height="320" rx="70" fill="#1119"/><text x="400" y="230" text-anchor="middle" fill="white" font-family="sans-serif" font-size="50">${direction.name}</text><text x="400" y="295" text-anchor="middle" fill="white" font-family="sans-serif" font-size="24">${blueprint.title}</text></svg>`;
    await writeFile(path.join(previewDir, `${direction.id}.svg`), svg);
  }
  const cards = artifact.directions.map((direction) => `<article><img src="${direction.previewPath}" alt="${direction.name} preview"><h2>${direction.name}</h2><code>${direction.id}</code><p>${direction.keywords.join(' · ')}</p><dl><dt>角色比例</dt><dd>${direction.characterProportion}</dd><dt>UI</dt><dd>${direction.uiStyle}</dd><dt>场景</dt><dd>${direction.sceneStyle}</dd><dt>复杂度</dt><dd>${direction.productionComplexity}</dd><dt>禁止项</dt><dd>${direction.forbidden.join('、')}</dd></dl></article>`).join('');
  await writeFile(path.join(runRoot, 'art-review/index.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${blueprint.title} · 美术审批</title><style>body{font-family:system-ui;margin:0;background:#11101a;color:#fff;padding:32px}header{max-width:1100px;margin:auto}.grid{max-width:1100px;margin:24px auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}article{background:#201d2c;border:1px solid #ffffff20;border-radius:20px;padding:16px}img{width:100%;border-radius:12px}dt{color:#aaa;margin-top:8px}dd{margin:2px 0}code{color:#f6c768}</style><header><h1>${blueprint.title}：选择一个美术方向</h1><p>复制候选 id 到 human/art-approval.yaml，再运行 resume。这里只审批方向，不逐张审批素材。</p></header><main class="grid">${cards}</main></html>`);
  await writeFile(path.join(runRoot, 'art-review/art-directions.json'), `${JSON.stringify(artifact, null, 2)}\n`);
  await writeFile(path.join(runRoot, 'human/art-approval.example.yaml'), `selected_direction: direction_b\n\nkeep:\n  - character_proportion\n  - overall_palette\n  - ui_shape\n\nchange:\n  - reduce_saturation\n  - simplify_background\n\nnotes:\n  - 不要太像儿童游戏\n  - UI要简洁\n  - 图标要醒目\n`);
}
