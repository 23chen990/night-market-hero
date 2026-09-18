/* Authored ambient animation: distance-driven walking, bounded routes, separate from gameplay.
 * All movement uses supplied scene time, not Date.now()/per-frame randomness.
 * A small rig produces the reusable transparent walking/idle sprite atlases at startup.
 */
'use strict';
(() => {
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mod=(n,m)=>((n%m)+m)%m;
function rampDistance(t,a,v){return v*.5*(t-a/Math.PI*Math.sin(Math.PI*t/a));}
function motion(o,time){
 const [A,B]=o.path,D=Math.hypot(B[0]-A[0],B[1]-A[1]);
 if(!o.speed||D<.001)return {x:A[0],y:A[1],speed:0,distance:0,dir:1,yaw:1,state:'idle'};
 const v=o.speed,a=Math.min(.85,D/(v*2)),T=D/v+a,wa=o.waitA??4,wb=o.waitB??4;
 const cycle=2*T+wa+wb,q=mod(time+(o.timeOffset||0),cycle);
 let d=0,dir=1,speed=0,state='idle',yaw=1;
 function travel(t){
  if(t<a)return [rampDistance(t,a,v),v*.5*(1-Math.cos(Math.PI*t/a))];
  if(t>T-a){const r=T-t;return [D-rampDistance(r,a,v),v*.5*(1-Math.cos(Math.PI*r/a))];}
  return [v*(t-a/2),v];
 }
 if(q<T){[d,speed]=travel(q);state='walk';}
 else if(q<T+wb){d=D;const turn=clamp((q-T-wb+.85)/.85,0,1);yaw=Math.cos(turn*Math.PI);dir=yaw>=0?1:-1;}
 else if(q<2*T+wb){const z=travel(q-T-wb);d=D-z[0];speed=z[1];dir=-1;yaw=-1;state='walk';}
 else{d=0;const turn=clamp((q-(2*T+wb)-wa+.85)/.85,0,1);yaw=-Math.cos(turn*Math.PI);dir=yaw>=0?1:-1;}
 const f=d/D;return {x:A[0]+(B[0]-A[0])*f,y:A[1]+(B[1]-A[1])*f,speed,distance:dir>0?d:D-d,dir,yaw,state};
}
function poly(c,d,fill,stroke=null,w=1){const p=new Path2D(d);if(fill){c.fillStyle=fill;c.fill(p);}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke(p);}}
function stroke(c,points,color,w){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.lineWidth=w;c.strokeStyle=color;c.lineCap='round';c.lineJoin='round';c.stroke();}
function foot(p){p=mod(p,1);if(p<.60)return {x:13.2-44*p,y:0};const u=(p-.60)/.40;return{x:-13.2+26.4*(u*u*(3-2*u)),y:-5.2*Math.sin(Math.PI*u)};}
function knee(hx,hy,fx,fy){const vx=fx-hx,vy=fy-hy,d=Math.min(46.8,Math.hypot(vx,vy)),l1=23.5,l2=24;const aa=(l1*l1-l2*l2+d*d)/(2*d),bb=Math.sqrt(Math.max(0,l1*l1-aa*aa));const norm=Math.hypot(vx,vy)||1;return [hx+vx/norm*aa+vy/norm*bb,hy+vy/norm*aa-vx/norm*bb];}
function rig(c,kind,p,idle,idlePhase,far){
 const ink=far?{coat:'#17343f',back:'#142e3a',edge:'#234652',head:'#1b3941',hat:'#15323e'}:{coat:'#102a34',back:'#0b222d',edge:'#1b3742',head:'#182f36',hat:'#0b222c'};
 const bob=idle?Math.sin(idlePhase*TAU)*.45:Math.cos(p*TAU*2)*.65;
 const f1=idle?{x:7,y:0}:foot(p),f2=idle?{x:-7,y:0}:foot(p+.5),hipY=-46+bob;
 const k2=knee(-1,hipY,f2.x,f2.y-2),k1=knee(1,hipY,f1.x,f1.y-2);
 stroke(c,[[-1,hipY],k2,[f2.x,f2.y-2]],ink.back,8);
 poly(c,`M${f2.x-4},${f2.y-4}L${f2.x+4},${f2.y-4}Q${f2.x+10},${f2.y-3} ${f2.x+10},${f2.y}L${f2.x-5},${f2.y}Z`,ink.back);
 stroke(c,[[1,hipY],k1,[f1.x,f1.y-2]],ink.coat,9);
 poly(c,`M${f1.x-4},${f1.y-4}L${f1.x+4},${f1.y-4}Q${f1.x+10},${f1.y-3} ${f1.x+10},${f1.y}L${f1.x-5},${f1.y}Z`,ink.coat);
 c.save();c.translate(0,bob);
 const swing=idle?Math.sin(idlePhase*TAU)*1.1:Math.sin(p*TAU)*9;
 // Far arm precedes the body. Wide sleeves, not a bare stick figure.
 stroke(c,[[-7,-72],[-12-swing*.36,-56],[-8-swing,-43]],ink.back,10);
 if(kind==='bundle'){
  poly(c,'M-14,-72Q-30,-78 -31,-62L-28,-45Q-20,-41 -12,-47Z',ink.back);
  poly(c,'M-24,-73Q-20,-53 -15,-47',null,ink.edge,1.2);
 }
 const hem=idle?0:Math.sin(p*TAU-.6)*1.4;
 poly(c,`M-9,-77Q0,-82 8,-75L12,-58Q13,-41 ${18+hem},-24Q3,-17 -18,-24L-12,-52Z`,ink.coat);
 poly(c,`M-7,-70Q-5,-45 ${-11+hem},-24L-17,-25L-12,-56Z`,ink.back);
 poly(c,'M-1,-76L7,-65L2,-58',null,ink.edge,1.1);
 // No bright skin or face details: a small profile, hat/cap, and collar suffice.
 poly(c,'M-4,-83L-5,-76L3,-73L5,-82Z',ink.head);
 poly(c,'M-7,-91Q-4,-97 4,-95Q10,-94 9,-88L12,-85L9,-83L9,-79Q4,-77 0,-80L-5,-83Z',ink.head);
 if(kind==='hat'||kind==='bundle'){
  poly(c,'M-22,-91Q-12,-94 -1,-105Q9,-96 22,-90Q5,-86 -22,-91Z',ink.hat);
  poly(c,'M-19,-91Q1,-88 20,-90',null,ink.edge,.8);
 }else{
  poly(c,'M-9,-91Q-10,-100 -2,-100Q8,-102 10,-93L14,-91L-9,-91Z',ink.hat);
  if(kind==='merchant')poly(c,'M-9,-93L-14,-88L-10,-84L-7,-91Z',ink.hat);
 }
 if(kind==='merchant'){
  const r=Math.sin(idlePhase*TAU);
  stroke(c,[[5,-70],[13,-55],[23+r*4,-51+r*3]],ink.coat,10);
  stroke(c,[[22+r*4,-51+r*3],[29+r*3,-50+r*4]],ink.head,4);
 }else{
  const sx=kind==='bundle'?3:swing;
  stroke(c,[[5,-69],[9+sx*.4,-53],[8+sx,-41]],ink.coat,10);
  stroke(c,[[8+sx,-44],[9+sx,-38]],ink.head,4);
 }
 c.restore();
}
class PeopleAtlases{
 constructor(config){this.config=config;this.cache=new Map();this.frameW=88;this.frameH=128;}
 get(kind,far=false){
  const key=kind+(far?'-far':'-near');if(this.cache.has(key))return this.cache.get(key);
  const W=this.frameW,H=this.frameH,N=this.config.animation.walkAtlasFrames,cols=8,rows=Math.ceil((N+8)/cols),cv=document.createElement('canvas');cv.width=W*cols;cv.height=H*rows;const c=cv.getContext('2d');
  for(let n=0;n<N+8;n++){c.save();c.translate((n%cols)*W+W/2,Math.floor(n/cols)*H+119);rig(c,kind,(n%N)/N,n>=N,(n-N)/8,far);c.restore();}
  const v={canvas:cv,key,W,H,N,cols};this.cache.set(key,v);return v;
 }
 draw(c,o,state,time){
  const a=this.get(o.kind,o.color==='far'),scale=o.height/105;
  const moving=state.state==='walk'&&state.speed>.12;
  const phase=mod(state.distance/(this.config.animation.localStride*scale),1);
  const n=moving?Math.floor(phase*a.N):a.N+Math.floor(mod((time+(o.timeOffset||0))/3.8,1)*8);
  c.save();c.translate(state.x,state.y);
  const yaw=(state.yaw<0?-1:1)*Math.max(.25,Math.abs(state.yaw));c.scale(scale*yaw,scale);
  c.drawImage(a.canvas,(n%a.cols)*a.W,Math.floor(n/a.cols)*a.H,a.W,a.H,-a.W/2,-119,a.W,a.H);c.restore();
  return{...state,phase,frame:n};
 }
}
window.NightAmbient={motion,PeopleAtlases,clamp,mod};
})();
