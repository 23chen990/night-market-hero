import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { BuildReportSchema } from '../../../../../../src/schemas/index.ts';
import { ExperienceContractSchema } from '../../../../../../src/schemas/experience-contract.ts';
import { ProductExperienceContractSchema } from '../../../../../../src/schemas/product-experience.ts';
const dir = import.meta.dirname;
const workspace = path.resolve(dir, '../..');
const targetGame = '夜市飞侠：护印突围';
const targetRunId = 'mobile-chart-adaptation-20260830';
const runtimeEntrypoints = ['index.html', 'src/main.ts', 'src/game-core.ts', 'src/night-city-renderer.ts'].map(p => path.join(workspace,p));
const hash = async (p:string) => createHash('sha256').update(await readFile(p)).digest('hex');
const save = async (name:string,value:unknown) => writeFile(path.join(dir,name), JSON.stringify(value,null,2)+'\n');
const acceptanceIds = ['REMOVE-MARKET-GATE','OPEN-PATROL-CHECKPOINT','ROOF-NET-PREPARE','ROOF-NET-THROW','ROOF-NET-RESOLVED','NATURAL-JOURNEY','PORTRAIT-PAUSE'];
const experience = ExperienceContractSchema.parse({schemaVersion:1,contractId:'gate-removal-roof-net-continuation-20261008',targetGame,targetWorkspace:workspace,lockedBy:'human',pillars:[{id:'open-streets',name:'移除代码绘制城门',observable:'默认路径不显示城门和穿孔要求，终点与街区进度可达。'},{id:'roof-net',name:'官兵抛网反馈',observable:'举网瞄准、抛出飞行、落网消退形成可见的时间顺序。'},{id:'journey',name:'可继续试玩',observable:'自然操作抵达渡口，继续夜巡，失败后重开。'}],feedbackTiming:{impactMs:500,settleMs:5000,inputNeverBlocked:true},motionInvariants:['默认路径不产生隐藏城门碰撞','抛网形状遵循原有状态机','只有正常输入触发自然旅程'],causalRules:['飞索按住与松手保持原有操作','教学结束依据到达终点','夜巡失败后重开恢复可操作场景'],antiPatterns:['仅隐藏城门图像但保留碰撞','用静态网格代替抛网投射过程','用调试注入代替自然过程证明'],acceptanceIds});
await save('experience-contract.json',experience);
const landscapes=[{label:'desktop',width:1280,height:720},{label:'mobile-landscape',width:844,height:390}];
const definitions=[
 ['REMOVE-MARKET-GATE','market-gate','tutorial-approach','持续按住和松手飞索，经过原城门位置','街道保持开放，终点后显示结算',['startup','grapple traversal','settlement']],
 ['OPEN-PATROL-CHECKPOINT','market-gate','patrol-checkpoint','点击继续，按住和松手穿过夜巡第二段','开放道路和增加的街区计数',['continue','patrol','checkpoint']],
 ['ROOF-NET-PREPARE','roof-net','raise/aim','自然飞行进入屋顶抛网段','官兵投掷者与指向目标的瞄准信号，未提前铺满网格',['approach','raise or aim']],
 ['ROOF-NET-THROW','roof-net','release/travel','自然经过官兵瞄准位置','网包由投掷者位置向目标飞行，存在方向轨迹',['raise or aim','release or travel']],
 ['ROOF-NET-RESOLVED','roof-net','resolved','继续摆荡通过抛网区域','展开网或落网反馈，离开后网不再持续遮挡',['release or travel','active or missed','cleared']],
 ['NATURAL-JOURNEY','player','settlement/replay','抵达渡口、继续夜巡，失败后点击重新启程','结算和重玩按钮清楚，重开进入可操作画面',['startup','core-loop','settlement','continue','failure','replay']],
 ['PORTRAIT-PAUSE','orientation','orientation-pause','在竖屏打开页面','可读的横屏图示；游戏暂停',['startup portrait','orientation block and paused']],
];
const contract=ProductExperienceContractSchema.parse({schemaVersion:2,artifactType:'product-experience-contract',targetGame,targetRunId,targetWorkspace:workspace,runtime:'web-lite',runtimeEntrypoints,sourceArtifact:{kind:'experience-contract',path:path.join(dir,'experience-contract.json'),sha256:await hash(path.join(dir,'experience-contract.json'))},features:definitions.map(([id,objectType,stateBranch,playerAction,visibleSignal,expectedEventOrder])=>({id,sourceCheckIds:[id],objectType,stateBranch,playerAction,visibleSignal,naturalTrigger:playerAction,expectedEventOrder,requiredViewports:id==='PORTRAIT-PAUSE'?[{label:'mobile-portrait',width:390,height:844}]:landscapes,negativeAssertions:id.startsWith('ROOF-NET')?['无常驻矩形网格替代投掷过程','阶段不能仅有 fixture 证据']:['无代码绘制城门或隐藏城门碰撞','无 debug 状态注入'],sourceEvidence:[path.join(dir,'triage.json'),path.join(dir,'qa-baseline.json')],blockingIf:['缺少对应对象和状态的自然可见证据','手机尺寸下反馈不可辨识']}))});
await save('product-experience-contract.json',contract);
const buildHash=await hash(path.join(workspace,'dist/index.html'));
const build = BuildReportSchema.parse({schemaVersion:1,success:true,runtime:'web-lite',template:'night-market-hero-existing',codexThreadId:'01a11aaf-5f63-71b2-8916-370968ff1e21',workspace,webBuild:path.join(workspace,'dist'),files:runtimeEntrypoints,verification:['lint passed','typecheck passed','285 tests passed, 10 skipped','build-attempt-1.log: self-contained HTML generated'],builtAt:new Date().toISOString(),completion:{status:'CANDIDATE_BLOCKED',blockers:['normalFlow','visualEvidence','runtimeProductJourney']}});
await save('build-report.json',build);
const RepairSchema=z.object({schemaVersion:z.literal(1),artifactType:z.literal('formal-fixer-repair-evidence'),route:z.literal('formal-fixer'),targetGame:z.string(),targetWorkspace:z.string(),issueIds:z.array(z.string()),attempt:z.number().int().positive(),previousAttempt:z.number().int().nonnegative(),threadContinuity:z.object({original:z.string(),continuedIn:z.string(),basis:z.string()}),build:z.object({path:z.string(),sha256:z.string().length(64),log:z.string(),count:z.literal(1)}),sourceHashes:z.array(z.object({path:z.string(),sha256:z.string().length(64)})),routeReason:z.string(),contextIntentionallyOmitted:z.array(z.string()),hypothesis:z.string(),compatibilityOnly:z.array(z.string()),remainingGaps:z.array(z.string()),status:z.enum(['QA_PENDING','BLOCKED','PASS'])}).strict();
const evidence=RepairSchema.parse({schemaVersion:1,artifactType:'formal-fixer-repair-evidence',route:'formal-fixer',targetGame,targetWorkspace:workspace,issueIds:['REMOVE-MARKET-GATE','ROOF-NET-NATURAL-GAP'],attempt:1,previousAttempt:0,threadContinuity:{original:'01a0fd9c-3c6d-78d0-8e1c-849ceafc43ec',continuedIn:'01a11aaf-5f63-71b2-8916-370968ff1e21',basis:'User explicitly resumed the interrupted archived task in this workspace-scoped chat. Prior roof-net direct-builder handoff remains preserved; this is the first formal attempt for gate removal.'},build:{path:path.join(workspace,'dist/index.html'),sha256:buildHash,log:path.join(dir,'build-attempt-1.log'),count:1},sourceHashes:await Promise.all(runtimeEntrypoints.map(async p=>({path:p,sha256:await hash(p)}))),routeReason:'Gate removal changes default collision/settlement and saved-state presentation; prior roof-net exact-branch natural evidence was incomplete.',contextIntentionallyOmitted:['Other games and shared factory work','Unrelated artwork and platform publication','Chat screenshot authentication error'],hypothesis:'Disable legacy gates explicitly on default runtime; settle at finishX; retain final held-input recovery using finish position; normalize restored gate states before the next tick.',compatibilityOnly:['createGrappleGame without marketGates:false retains legacy gate fixtures for core compatibility tests.','main.ts explicitly uses marketGates:false. Legacy gate render method and asset import are removed.','Old tests/browser-smoke.ts gate fixture assertions are not default journey evidence.'],remainingGaps:['Independent current-build natural/perceptual acceptance pending; platform packages unverified.'],status:'QA_PENDING'});
await save('repair-attempt-1.json',evidence);
console.log(JSON.stringify({buildHash,contractHash:await hash(path.join(dir,'product-experience-contract.json')),validated:4}));
