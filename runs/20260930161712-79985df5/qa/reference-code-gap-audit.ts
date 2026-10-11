import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { verifyEvidenceFileBindings } from '../../../src/core/evidence-provenance.js';
import { ReferenceCodeAnalysisSchema } from '../../../src/schemas/reference-code.js';
import { ReferenceFidelityContractSchema } from '../../../src/schemas/reference-fidelity.js';

// Static inspection only: no game import, browser, provider call, or workspace mutation.
const runId = '20260930161712-79985df5';
const runRoot = path.resolve('runs', runId);
const workspace = path.join(runRoot, 'workspace/game');
const NL = String.fromCharCode(10);
const read = (file: string) => readFile(path.join(runRoot, file), 'utf8');
const json = async (file: string) => JSON.parse(await read(file));
const save = (file: string, value: unknown) => writeFile(path.join(runRoot, file), JSON.stringify(value, null, 2) + NL);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const before = await read('state.json');
const manifest = await json('reference-evidence/manifest.json');
const provenance = await verifyEvidenceFileBindings(manifest, { targetGame: 'continuation-v2', workspace }, { runRoot, requireRunLocal: true });
assert.equal(provenance.passed, true, JSON.stringify(provenance.blockers));
ReferenceCodeAnalysisSchema.parse(await json('artifacts/reference-code-analysis.json'));
ReferenceFidelityContractSchema.parse(await json('artifacts/reference-fidelity-contract.json'));
const entry = manifest.entries.find((item: { id: string }) => item.id === 'code-package-monkey-mart');
const packageText = await read(entry.storedPath);
assert.equal(hash(packageText), entry.sha256);
const pkg = JSON.parse(packageText);
const base = 'reference-code/monkey-mart/scripts/main/gamecore/';
const G = base + 'GameState.lua', P = base + 'Player.lua', D = base + 'DataMart1.lua';
const S = 'workspace/game/src/simulation.ts', M = 'workspace/game/src/main.ts';
const C = 'workspace/game/src/generated/game-config.json', T = 'workspace/game/src/simulation.test.ts', SEED = 'input/seed.yaml';
const files = [G, P, D, S, M, C, T, SEED];
const texts = new Map(await Promise.all(files.map(async file => [file, await read(file)] as const)));
for (const file of [G, P, D]) {
  const item = pkg.scripts.find((item: { path: string }) => item.path === file);
  assert.ok(item, 'script not in verified reference package');
  assert.equal(hash(texts.get(file)!), item.sha256, file);
}
const Text = z.string().min(1);
const Evidence = z.object({ path: Text, sha256: z.string().regex(/^[a-f0-9]{64}$/u), startLine: z.number().int().positive(), endLine: z.number().int().positive() }).strict();
function ev(file: string, startLine: number, endLine: number) {
  const text = texts.get(file)!;
  assert.ok(startLine <= endLine && endLine <= text.split(NL).length, file);
  return Evidence.parse({ path: file, sha256: hash(text), startLine, endLine });
}
const Finding = z.object({ id: Text, priority: z.enum(['P1', 'P2']), classification: z.enum(['implementation-defect', 'reference-mechanic-gap', 'scope-gap', 'verification-gap']), title: Text, referenceFact: Text, currentFact: Text, impactInference: Text, acceptance: Text, referenceEvidence: z.array(Evidence).min(1), currentEvidence: z.array(Evidence).min(1), runtimeVerified: z.literal(false) }).strict();
const findings = [
  {id:'REF-CASH-FLOW',priority:'P1',classification:'reference-mechanic-gap',title:'打包、现金堆和收钱被合并',referenceFact:'队首抵达后打包，货款延迟进入现金堆，玩家靠近另行收取；现金堆有独立数量和视图。',currentFact:'服务时间结束后直接增加钱包并令顾客离开；没有现金堆、打包阶段。',impactInference:'推断：卖出、入账、收钱和投资的反馈层次被压平。',acceptance:'分别证明打包、柜台存钱和玩家收钱，不以钱包增大代替整个链条。',referenceEvidence:[ev(G,1525,1583),ev(G,4091,4154)],currentEvidence:[ev(S,26,36),ev(S,180,185)],runtimeVerified:false},
  {id:'REF-SPATIAL-QUEUE',priority:'P1',classification:'reference-mechanic-gap',title:'队列有计数但没有站位和前移',referenceFact:'队首路径完成后才服务；出队会重新分配剩余顾客站位并移动。',currentFact:'所有顾客朝同一 checkout.position 移动，进入半径就 queued；queued 不更新位置，仅维护计数。',impactInference:'推断：有序排队及吞吐瓶颈缺少空间表达，顾客可能聚在收银范围边缘。',acceptance:'每个顾客有独立站位，队首到位才能服务，出队后其他人依次前移。',referenceEvidence:[ev(G,4132,4173)],currentEvidence:[ev(S,116,136),ev(S,180,184)],runtimeVerified:false},
  {id:'REF-OBJECT-FEEDBACK',priority:'P1',classification:'reference-mechanic-gap',title:'动作没有绑定各自的货物和货币反馈',referenceFact:'采集有站点到角色的物件动画；收钱和建设使用方向相反的货币动画端点。',currentFact:'库存即时改数；货架用进度条，背货用矩形堆；任意事件均触发同一玩家缩放和共用 toast，顾客没有携货图形。',impactInference:'推断：缺少货物从哪里来、钱花到哪里的局部因果反馈；不是只换素材就能补齐。',acceptance:'按采集、补货、顾客取货、打包、收钱、投资分别绑定来源、目的地和时刻，之后再做自然输入及感知验收。',referenceEvidence:[ev(G,3717,3727),ev(G,4349,4408),ev(G,3433,3444)],currentEvidence:[ev(M,88,97),ev(M,109,142),ev(S,173,188)],runtimeVerified:false},
  {id:'REF-SHOPPING-LIST',priority:'P2',classification:'scope-gap',title:'购物被压缩为一个商品一件',referenceFact:'购物清单有多项、每项数量、已取数量；全部完成才付款；大购物量才触发取篮，并非所有顾客都取篮。',currentFact:'顾客仅有单个 productId，取一件即去收银，无购物清单、数量或条件取篮。',impactInference:'推断：顾客停留和补货需求较简单；这是最小预览与完整参考的范围差距。',acceptance:'如果扩大经营深度，先锁定购物项数、数量和条件取篮分支，不擅自扩展当前构建。',referenceEvidence:[ev(P,810,875),ev(P,943,983)],currentEvidence:[ev(S,26,27),ev(S,86,113)],runtimeVerified:false},
  {id:'REF-PROGRESSION',priority:'P1',classification:'scope-gap',title:'首次扩建后没有下一建设目标',referenceFact:'主线建设逐个开放，支线和存档恢复区别处理，后续开放下一店铺标记。',currentFact:'配置仅两商品、一个建设点、一个容量升级点；continueRound 只恢复 operating；速度和收银升级只有代码分支，没有配置入口。',impactInference:'推断：循环可重复不等于成长持续发生；上游蓝图已压缩内容，不能全部归因于 Builder 或美术。',acceptance:'保留批准的结算规则；若扩展范围，声明下一可到达目标及速度和收银升级入口。',referenceEvidence:[ev(G,3320,3367),ev(G,8561,8581)],currentEvidence:[ev(C,44,159),ev(S,159,163),ev(S,186,195),ev(S,219,220)],runtimeVerified:false},
  {id:'REF-SYSTEM-DEPTH',priority:'P2',classification:'scope-gap',title:'没有加工依赖及雇员分工',referenceFact:'加工受一个或多个原料货架限制；收银员和搬运员有独立行为分支。',currentFact:'生产仅受解锁和容量约束，不消耗原料；状态中没有员工或自动服务分工。',impactInference:'推断：缺少后续自动化与瓶颈转移；这些超出当前首个最小切片，不作为本轮自动扩展项。',acceptance:'扩大范围前锁定最小加工依赖或雇员职责；仅参考机制，不移植原版代码。',referenceEvidence:[ev(G,8345,8373),ev(G,4132,4141),ev(P,1037,1085)],currentEvidence:[ev(S,7,36),ev(S,97,105)],runtimeVerified:false},
  {id:'BUG-LOCKED-DEMAND',priority:'P1',classification:'implementation-defect',title:'顾客可要求未解锁的海带',referenceFact:'已检查的原版首店只把 isActive 的商品加入购物候选；此结论限首店分支。',currentFact:'chooseDemand 使用所有权重，spawnCustomer 仅查货架存在、不查解锁；海带货架锁定但需求已配置。',impactInference:'推断：扩建前可能出现玩家无法满足的需求，随后被记为缺货离店。',acceptance:'新局锁定商品不进入需求，原子解锁后才能出现；真实开放货架缺货仍须保留。',referenceEvidence:[ev(D,1009,1045)],currentEvidence:[ev(S,79,94),ev(C,100,125),ev(C,160,182)],runtimeVerified:false},
  {id:'BUG-PATIENCE-START',priority:'P2',classification:'implementation-defect',title:'八秒缺货耐心从入店开始扣',referenceFact:'普通顾客等待没有本项目八秒规则；该规则是用户批准的原创改编。',currentFact:'入店初始化计时，每帧所有非 left 顾客都扣减，进入 waiting-shelf 不重置；走向货架的时间消耗缺货耐心。',impactInference:'推断：在空货架前实际等待短于八秒，且随路程变化。',acceptance:'进入真实缺货等待再计时；走路不扣，时间边界正确，补货可以恢复。',referenceEvidence:[ev(P,943,983),ev(SEED,45,49)],currentEvidence:[ev(S,86,92),ev(S,116,132)],runtimeVerified:false},
  {id:'BUG-MOVING-PAYMENT',priority:'P1',classification:'implementation-defect',title:'仍在移动也可建设扣款',referenceFact:'建设付款调用位于玩家速度为零的分支内。',currentFact:'移动后无条件 updateInteraction；付款候选只查距离和余额，移动时在范围内也累加付款进度。',impactInference:'推断：路过建设区可能意外花钱，削弱投资时机的控制。',acceptance:'移动穿过不扣钱；停步分次投资，离开中断，钱包和贡献守恒。',referenceEvidence:[ev(G,3820,3835)],currentEvidence:[ev(S,144,156),ev(S,166,172),ev(S,186,191),ev(S,199,207)],runtimeVerified:false},
  {id:'QA-TEST-COVERAGE',priority:'P2',classification:'verification-gap',title:'现有测试确认简化规则而非参考机制',referenceFact:'原版收银、空间队列和静止付款有各自条件。',currentFact:'测试注入库存、传送和加币，收银期望直接到账；耐心测试仅检查十二秒后离开；标题称保留继续经营的测试没有调用 continueRound。',impactInference:'推断：测试通过不能排除本次机制差距；没有据此否认此前测试运行。',acceptance:'按具体对象与状态分支增加断言；本次代码审查不替代未来自然输入和感知 QA。',referenceEvidence:[ev(G,4091,4154),ev(G,3820,3835)],currentEvidence:[ev(T,19,52),ev(T,55,84)],runtimeVerified:false}
].map(item => Finding.parse(item));
const config = JSON.parse(texts.get(C)!);
assert.equal(config.spatialShop.stations.filter((x: {kind:string}) => x.kind === 'construction').length, 1);
assert.equal(config.spatialShop.stations.filter((x: {kind:string}) => x.kind === 'upgrade').length, 1);
assert.equal(config.spatialShop.stations.find((x: {id:string}) => x.id === 'kelp-shelf').initiallyUnlocked, false);
assert.ok(config.spatialShop.customers.demand.some((x: {productId:string}) => x.productId === 'kelp'));
const Review = z.object({schemaVersion:z.literal(1),artifactType:z.literal('ReferenceCodeGapReview'),targetRunId:z.literal(runId),targetGame:z.literal('海滩渔货铺'),workspace:Text,scope:z.literal('CODE_ONLY'),route:z.literal('formal-fixer'),phase:z.literal('QA_DIAGNOSIS_ONLY'),fixerInvoked:z.literal(false),builderInvoked:z.literal(false),gameWorkspaceModified:z.literal(false),runtimeAndPerceptualStatus:z.literal('NOT_RUN_USER_SCOPE'),referencePackage:z.object({path:Text,sha256:Text}),findings:z.array(Finding),approvedDeviations:z.array(z.object({name:Text,evidence:Evidence})),limitations:z.array(Text),createdAt:z.string().datetime()}).strict();
const report = Review.parse({schemaVersion:1,artifactType:'ReferenceCodeGapReview',targetRunId:runId,targetGame:'海滩渔货铺',workspace,scope:'CODE_ONLY',route:'formal-fixer',phase:'QA_DIAGNOSIS_ONLY',fixerInvoked:false,builderInvoked:false,gameWorkspaceModified:false,runtimeAndPerceptualStatus:'NOT_RUN_USER_SCOPE',referencePackage:{path:entry.storedPath,sha256:entry.sha256},findings,approvedDeviations:[{name:'直接经营开局，不复制原版启动建设资金',evidence:ev(SEED,33,36)},{name:'缺货八秒离店是原创规则，不是原版事实',evidence:ev(SEED,45,49)},{name:'首次扩建后结算并继续或重开是批准改编',evidence:ev(SEED,30,36)}],limitations:['用户要求仅参考源码；本次没有浏览器、截图和自然输入验证。','范围差距不自动等于最小预览实现 bug；扩大功能范围须另行锁定。','源码包含反馈调用不等于已经核验画面；不报告视觉相似度百分比。','原版条件取篮此前摘要有简化；本次以直接读取的 Player.initWishFood 为准。','不修改已有失败状态，不认定正式 FULL_BUILD、FIX 或 QA 通过。'],createdAt:new Date().toISOString()});
const output = 'artifacts/reference-code-gap-review-20261001.json';
await save(output, report);
Review.parse(await json(output));
assert.equal(await read('state.json'), before);
const triageFile = 'artifacts/triage/reference-experience-gap-20261001.json';
const triage = await json(triageFile);
z.object({targetRunId:z.literal(runId),workspace:z.literal(`runs/${runId}/workspace/game`),classification:Text,acceptanceCriteria:z.array(Text).min(1)}).passthrough().parse(triage);
triage.status = 'CODE_REVIEW_COMPLETE_RUNTIME_UNVERIFIED';
triage.reviewArtifact = output;
triage.confirmedCodeIssueIds = findings.filter(x => x.classification === 'implementation-defect').map(x => x.id);
await save(triageFile, triage);
const matrixFile = 'artifacts/reproduction-matrix-reference-experience-gap-20261001.json';
const matrix = await json(matrixFile);
z.object({targetRunId:z.literal(runId),cells:z.array(z.object({id:Text,objectType:Text,stateBranch:Text,presentationPath:Text,status:Text})),viewports:z.array(z.object({width:z.number().positive(),height:z.number().positive(),device:Text}))}).passthrough().parse(matrix);
matrix.reviewArtifact = output;
matrix.cells = matrix.cells.map((cell: Record<string,unknown>) => ({...cell,status:'CODE_INSPECTED_RUNTIME_UNOBSERVED',runtimeVerified:false,perceptualVerified:false}));
await save(matrixFile, matrix);
console.log(JSON.stringify({report:output,validated:true,verifiedReferenceFiles:3,findings:findings.map(x => ({id:x.id,priority:x.priority,classification:x.classification})),factoryStateUnchanged:true,browserInvoked:false,gameWorkspaceModified:false},null,2));
