'use strict';
// Run: node verify-melon-jelly.cjs [path/to/melon-jelly.html]
// DOM-free numerical tests; browser/WGSL validation is separate.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const file = process.argv[2] || path.join(__dirname, 'melon-jelly.html');
const html = fs.readFileSync(file, 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(js, { filename: file });
console.log('PASS JavaScript syntax');
const simulation = js.split('/*SIM-BEGIN*/')[1].split('/*SIM-END*/')[0];
const ctx = vm.createContext({ console });
vm.runInContext(simulation + ';globalThis.api={createSpecimen,cutSpecimenMesh,SoftBody,Skin,SPEC,mulberry32};', ctx);
const { createSpecimen, cutSpecimenMesh, SoftBody, Skin, SPEC, mulberry32 } = ctx.api;
function adopt(s, cut) {
  const O = s.O;
  const stiff = (x,y,z) => {
    let t = (SPEC.R-Math.hypot(x-O[0],z-O[1])-(SPEC.paleT+0.18))/(-0.22);
    t = Math.max(0,Math.min(1,t)); return 1+2*t*t*(3-2*t);
  };
  const body = new SoftBody({...cut.tm,positions:cut.positions,velocities:cut.velocities},stiff);
  const next = {...s,tm:cut.tm,body,jelly:cut.jelly,seeds:cut.seeds,bubbles:cut.bubbles,skins:{}};
  for (const key of ['jelly','seeds','bubbles']) {
    next.skins[key] = new Skin(cut.embeddings[key],cut[key].idx,cut[key].count);
    next.skins[key].update(body.x);
    for (let i=0;i<cut[key].idx.length;i+=3) {
      const comps = Array.from(cut[key].idx.subarray(i,i+3),v=>body.components[cut.embeddings[key].ids[4*v]]);
      assert(comps.every(c=>c===comps[0]),key+' triangle bridges disconnected pieces');
    }
  }
  return next;
}
function check(body,label) {
  const st = body.stats();
  assert(Number.isFinite(st.ke+st.volRatio),label+' nonfinite');
  assert.equal(st.inverted,0,label+' inverted tetrahedra');
  assert(st.minY>=-1e-7,label+' floor penetration');
  assert(st.volRatio>0.65 && st.volRatio<1.35,label+' excessive volume change');
  return st;
}
for (const [label,normal,offset] of [['cross',[1,0,0],-0.031],['diagonal',[0.6,0,0.8],0.021],['horizontal',[0,1,0],-0.371]]) {
  let s = createSpecimen();
  const originalMass = s.body.mass;
  const cut = cutSpecimenMesh(s,normal,offset);
  assert(cut,label+' cut was rejected');
  s = adopt(s,cut);
  assert(s.body.componentCount>=2,label+' did not disconnect');
  assert(Math.abs(s.body.mass/originalMass-1)<1e-6,label+' mass not conserved');
  for(let i=0;i<90;i++) s.body.step(1/60);
  check(s.body,label+' settled');
  const pick = s.body.componentNodes[0][0], p = Array.from(s.body.x.subarray(3*pick,3*pick+3));
  s.body.startGrab(p,0.5,[0,0,1]);
  const grabbed = Array.from(s.body.grab.ids.subarray(0,s.body.grab.count));
  assert(grabbed.every(i=>s.body.components[i]===s.body.components[pick]),'grab crosses cut');
  for(let i=0;i<45;i++) { s.body.moveGrab([p[0]+0.4*i/45,p[1]+0.8*i/45,p[2]]); s.body.step(1/60); }
  s.body.endGrab();
  for(let i=0;i<180;i++) s.body.step(1/60);
  console.log('PASS',label,check(s.body,label+' release'));
  if(label==='cross') {
    const cut2 = cutSpecimenMesh(s,[0,0,1],-0.043);
    assert(cut2,'repeated cut rejected');
    const twice = adopt(s,cut2);
    assert(twice.body.componentCount>s.body.componentCount,'repeated cut did not split');
    assert(Math.abs(twice.body.mass/originalMass-1)<1e-6,'repeated cut lost mass');
    check(twice.body,'repeated cut');
    console.log('PASS repeated cut');
  }
}
const intact = createSpecimen(), before = intact.body.mass;
assert.equal(cutSpecimenMesh(intact,[1,0,0],100),null,'miss must be rejected');
assert.equal(intact.body.mass,before,'rejected cut mutated body');
console.log('PASS missed cut is transactional');
console.log('Numerical tests passed. Still test WebGPU, mouse/touch, all controls and visual cut seams in a browser.');
