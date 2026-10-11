import {z} from 'zod';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {ReviewSchema} from './review-contract.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const evidence=rel=>({path:path.join(root,rel),sha256:sha(path.join(root,rel))});
const Ref=z.object({path:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const Manifest=z.object({schemaVersion:z.literal(1),targetGame:z.literal('夜市飞侠：护印突围'),workspace:z.string(),status:z.literal('ART_CANDIDATE_PENDING_USER_REVIEW'),route:z.literal('direct-builder'),scope:z.literal('offline art preview only'),runtimeIntegrated:z.literal(false),scene:z.object({width:z.literal(5016),height:z.literal(941),skySource:z.string(),completePanoramaInputs:z.literal(0),construction:z.string()}),sources:Ref,outputs:z.array(Ref),checks:z.object({lint:z.literal('PASS'),typecheck:z.literal('PASS'),previewBrowser:Ref,isolation:Ref,alpha:Ref,independentReviews:z.array(Ref)}),remainingGaps:z.array(z.string()),contextIntentionallyOmitted:z.array(z.string())}).strict();
const independent=[];
for(const name of ['luna-runtime-review.json','luna-visual-review.json','luna-visual-retest.json','luna-visual-final.json']){const p=path.join(root,'qa',name);try{ReviewSchema.parse(JSON.parse(readFileSync(p,'utf8')));independent.push(evidence('qa/'+name));}catch(e){if(e.code!=='ENOENT')throw e;}}
const finalReview=ReviewSchema.parse(JSON.parse(readFileSync(path.join(root,'qa/luna-visual-final.json'),'utf8')));
if(finalReview.status!=='PASS') throw new Error('Final visual review has not passed');
for(const file of ['street-start.png','street-center.png','street-end.png','phone-center.png']){
  if(!JSON.stringify(finalReview).includes(sha(path.join(root,file)))) throw new Error('Final visual review does not bind current '+file);
}
const codeChecks=JSON.parse(readFileSync(path.join(root,'qa/final-code-checks.json'),'utf8'));
if(codeChecks.status!=='PASS'||codeChecks.sourceSha256!==sha(path.join(root,'scene.js'))||codeChecks.previewSha256!==sha(path.join(root,'preview.html'))) throw new Error('Final code checks are stale');
const m=Manifest.parse({schemaVersion:1,targetGame:'夜市飞侠：护印突围',workspace:'/Users/kker/Documents/ChatGPT/妖怪夜市/runs/mobile-chart-adaptation-20260830/workspace/night-market-hero',status:'ART_CANDIDATE_PENDING_USER_REVIEW',route:'direct-builder',scope:'offline art preview only',runtimeIntegrated:false,scene:{width:5016,height:941,skySource:'existing v33 atmosphere plate',completePanoramaInputs:0,construction:'Code-built architecture and lighting, existing alpha material details, one assembled street.'},sources:evidence('source-manifest.json'),outputs:['preview.html','scene.js','street-start.png','street-center.png','street-end.png','phone-center.png','street-full-5016x941.png','street-overview.jpg','street-pan.gif','composition-breakdown.jpg'].map(evidence),checks:{lint:'PASS',typecheck:'PASS',previewBrowser:evidence('qa/browser-check.json'),isolation:evidence('qa/workspace-isolation.json'),alpha:evidence('qa/alpha-check.json'),independentReviews:independent},remainingGaps:['80–90% visual similarity is a user target, not a measured or approved result.','The flight corridor is a visual composition only. Gameplay/collision/mobile platform integration remain outside this isolated preview.','Final visual approval is pending; independent perceptual review findings are retained in QA records.'],contextIntentionallyOmitted:['Runtime game changes, economy and saves','Platform packaging and release','Prior runtime formal-FIX completion claims']});
writeFileSync(path.join(root,'preview-manifest.json'),JSON.stringify(m,null,2)+'\n');console.log(`Preview manifest: Zod PASS, ${independent.length} independent reviews, ${m.outputs.length} hashed outputs`);
