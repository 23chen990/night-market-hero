/* Live v04 rendering extends v03's real component/canvas scene.
 * Interactive cable is excluded from the static batch. All its lanterns read the
 * same cablePoint() mapping as the moving physics anchor; no old cable remains.
 */
'use strict';
(()=>{
const Base=window.NightMarketAmbientRenderer,clamp=window.NightGrapple.clamp;
class GrappleRenderer extends Base{
 constructor(scene,images,ambient,simulation){super(scene,images,ambient);this.sim=simulation;this.platformCacheRevision=-1;}
 cable(c,o){if(o.interactive)return;super.cable(c,o);}
 ensureCaches(){
  super.ensureCaches();if(!this.sim||this.platformCacheRevision===this.cacheRevision)return;
  this.platformCache=this.makeCache('gameStructures',510,340,c=>this.drawStructures(c));this.platformCacheRevision=this.cacheRevision;
 }
 drawStructures(c){
  const p=this.palette('near');
  for(const f of this.sim.config.platforms){
   // Planked work decks, not cloth-as-collision. Every post meets the street/quay.
   for(const x of f.posts){this.post(c,x,f.y-6,f.base,9,p);this.brace(c,x,f.y+60,x===f.posts[0]?42:-42,-48,p,6);this.rect(c,x-9,f.base-5,18,7,p.soft);}
   this.beam(c,f.x-3,f.y+4,f.w+6,12,p);this.rect(c,f.x,f.y,f.w,5,'#17303a');
   this.line(c,f.x+2,f.y,f.x+f.w-2,f.y,'#6c6650',1.2);
   for(let x=f.x+26;x<f.x+f.w;x+=41)this.line(c,x,f.y+1,x-1,f.y+6,'#0a1c25',1);
   for(const x of [f.x+6,f.x+f.w-6]){this.rect(c,x-2,f.y+2,4,3,'#53533f');}
  }
 }
 drawLiveCable(c,time,debug){
  const s=this.sim,o=s.cable,a=s.elasticAnchor;
  if(debug){c.save();c.strokeStyle='rgba(149,183,185,.52)';c.lineWidth=1;c.setLineDash([6,6]);c.beginPath();for(let i=0;i<=80;i++){const q=s.restCablePoint(i/80);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y);}c.stroke();c.restore();}
  c.save();c.lineCap='round';c.lineJoin='round';c.strokeStyle='#040e16';c.lineWidth=3.2;c.beginPath();for(let i=0;i<=100;i++){const q=s.cablePoint(i/100);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y);}c.stroke();
  c.strokeStyle='rgba(51,66,67,.68)';c.lineWidth=.65;c.stroke();
  // End bindings use fixed world endpoints and visually connect to the building beams.
  for(const q of [{x:o.x1,y:o.y1},{x:o.x2,y:o.y2}]){this.line(c,q.x-12,q.y-1,q.x+11,q.y-1,'#0a1b23',9);for(let n=-1;n<=1;n++)this.line(c,q.x+n*3,q.y-6,q.x+n*3+2,q.y+4,'#625a41',1);}
  for(const t of [.10,.33,.65,.9]){const q=s.cablePoint(t);this.line(c,q.x,q.y,q.x-1,q.y+10,'#14222a',1.15);}
  c.restore();
 }
 drawLamp(c,o,time,wind){
  if(!this.sim||o.anchor?.owner!==this.sim.cable.id)return super.drawLamp(c,o,time,wind);
  const list=this.sim.cable.lanterns,l=list.find(v=>o.id.endsWith('-'+v.t)),t=l?.t??.48,q=this.sim.cablePoint(t),st=this.sim.lampStates.find(v=>v.t===t);
  c.save();c.translate(q.x,q.y);c.rotate((st?.angle||0)+(wind?Math.sin(time*.86+t*14)*.010:0));
  // Use v02 lamp directly to avoid adding a second independent rotation/pivot.
  window.NightMarketRenderer.prototype.lamp.call(this,c,{...o,x:0,y:0});c.restore();
 }
 drawAnchorHardware(c){
  for(const a of this.sim.anchors){
   c.save();c.translate(a.x,a.y);
   if(a.type==='fixed'){
    this.path(c,'M-17,-16L17,-16L17,-9L-17,-9Z','#17232a');
    for(const x of [-10,-5,0,5,10])this.line(c,x,-19,x+1,-6,'#655c41',1.5);
    this.line(c,0,-8,0,-2,'#9b8052',2.2);
   }else{
    // Four-turn reinforced binding, not a hook through the paper lantern body.
    this.path(c,'M-12,-4L11,-6L13,4L-10,6Z','#514b37');
    for(let x=-8;x<=8;x+=4)this.line(c,x,-5,x+2,5,'#a28b5b',1.3);
    this.line(c,-9,7,-17,17,'#8b744c',1);this.line(c,11,5,19,12,'#514b37',1);
   }
   c.strokeStyle='#b79a61';c.lineWidth=2.2;c.beginPath();c.ellipse(0,0,6,7,0,0,Math.PI*2);c.stroke();c.restore();
  }
 }
 drawGrapple(c,time,debug){
  const s=this.sim,p=s.player,a=p.attached?s.anchor(p.attached):null,h=s.hand;
  if(a){
   const d=Math.hypot(a.x-h.x,a.y-h.y),slack=Math.max(0,p.ropeLength-d),sag=Math.min(24,slack*.5);
   c.save();c.lineCap='round';c.strokeStyle='#16252a';c.lineWidth=3.1;c.beginPath();c.moveTo(h.x,h.y);c.quadraticCurveTo((h.x+a.x)/2,(h.y+a.y)/2+sag,a.x,a.y);c.stroke();
   c.strokeStyle=p.tension>20?'#c4a267':'#8f8062';c.lineWidth=1.4;c.stroke();c.restore();
  }
  if(s.pending){const a=s.anchor(s.pending.id),k=clamp(1-s.pending.remaining/.22,0,1),hx=h.x+(a.x-h.x)*k,hy=h.y+(a.y-h.y)*k;c.save();c.setLineDash([4,4]);this.line(c,h.x,h.y,hx,hy,'#c1a066',1.2);c.restore();}
  if(debug){
   c.save();c.font='13px system-ui';c.lineWidth=1;
   for(const t of s.trail){const age=(s.time-t.t)/1.6;c.fillStyle=`rgba(195,169,112,${.6*(1-age)})`;c.beginPath();c.arc(t.x,t.y,2,0,Math.PI*2);c.fill();}
   for(const f of s.config.platforms){c.strokeStyle='#6ca392';c.setLineDash([6,4]);c.strokeRect(f.x,f.y,f.w,6);c.setLineDash([]);c.fillStyle='#a6c1b5';c.fillText(f.label,f.x+6,f.y+27);}
   const a=s.elasticAnchor,e=s.elastic;c.strokeStyle='#74959c';c.setLineDash([4,6]);c.beginPath();c.ellipse(a.restX,a.restY,e.maxOffset*e.horizontalLimitRatio,e.maxOffset,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
   this.line(c,a.restX,a.restY,a.x,a.y,'#d7b37b',1.4);c.strokeStyle='#e1bf86';c.strokeRect(a.restX-3,a.restY-3,6,6);
   c.fillStyle='#e4d0a6';c.fillText(`偏移 ${Math.hypot(a.x-a.restX,a.y-a.restY).toFixed(1)} px`,a.x+20,a.y-16);
   c.strokeStyle='#78a7b3';c.beginPath();c.arc(p.x,p.y,4,0,Math.PI*2);c.stroke();c.fillStyle='#bdd1d0';c.fillRect(h.x-2,h.y-2,4,4);
   if(p.attached){const a=s.anchor(p.attached);this.line(c,p.x,p.y,p.x+p.vx*.13,p.y+p.vy*.13,'#73a3ac',1.1);c.fillText(`钩锁 ${p.ropeLength.toFixed(0)} px`,(a.x+h.x)/2+12,(a.y+h.y)/2);}
   c.restore();
  }
 }
 drawHero(c){
  const s=this.sim,p=s.player,h=s.hand,t=s.time,dir=p.facing,ink='#07151e',back='#0a1d27',edge='#29414b';
  // Authored silhouette rig: same root/hand as the solver, no detached rope end.
  c.save();c.translate(p.x,p.y);
  const lean=clamp(p.vx/1100,-.32,.32),hipX=-lean*13,headX=lean*6;
  const headY=-26,hipY=14;
  const stroke=(pts,col,w)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke();};
  let l1,l2;
  if(p.ground){const phase=p.walkDistance/39,amp=Math.min(1,Math.abs(p.vx)/105);l1=[Math.sin(phase)*13*amp,43-Math.max(0,Math.cos(phase))*6*amp];l2=[Math.sin(phase+Math.PI)*13*amp,43-Math.max(0,Math.cos(phase+Math.PI))*6*amp];}
  else{const a=clamp(p.vx/260,-1,1),u=Math.sin(t*4)*2;l1=[-dir*8-a*15,37+u];l2=[dir*15-a*17,25-u];}
  stroke([[hipX-4,hipY],[l2[0]-dir*9,hipY+13],l2],back,9);
  stroke([[l2[0]-4,l2[1]],[l2[0]+dir*7,l2[1]-1]],back,6);
  stroke([[hipX+4,hipY],[l1[0]+dir*8,hipY+14],l1],ink,10);
  stroke([[l1[0]-4,l1[1]],[l1[0]+dir*8,l1[1]-1]],ink,6);
  // Loose scarf responds to travel, and remains the single saturated accent.
  const tail=-dir*(33+Math.min(26,Math.abs(p.vx)*.055)),wave=Math.sin(t*5.1)*3+clamp(p.vy*.021,-6,8);
  this.path(c,`M${headX-4},-19Q${tail*.5},${-17+wave} ${tail},${-22+wave}L${tail-9*dir},${-28+wave}L${tail-4*dir},${-19+wave}Q${tail*.45},${-9+wave} ${headX},-15Z`,'#aa3027');
  this.path(c,`M-2,-18Q${tail*.4},-5 ${tail*.76},${2+wave}L${tail*.81},${-1+wave}Q${tail*.32},-13 3,-20Z`,'#802823');
  // Back arm, robe torso, belt. No metallic glint or bright skin.
  stroke([[-8,-10],[-15-dir*5,2],[-13-dir*10,12]],back,9);
  this.path(c,`M-9,-16Q0,-20 10,-14L12,7L${hipX+13},22L${hipX-15},20L-11,5Z`,ink);
  this.path(c,'M-7,-12L-2,3L-5,17',null,edge,1.2);
  this.path(c,`M-11,8L11,6L12,11L-12,13Z`,'#77312a');
  this.path(c,`M${headX-5},${headY-4}Q${headX-6},${headY-11} ${headX+1},${headY-10}Q${headX+7},${headY-9} ${headX+6},${headY-2}L${headX+4},${headY+5}L${headX-4},${headY+3}Z`,ink);
  this.path(c,`M${headX-6},${headY-4}L${headX+6},${headY-4}L${headX+5},${headY-1}L${headX-5},${headY-1}Z`,'#25323a');
  this.path(c,`M${headX-dir*5},${headY-7}Q${headX-dir*15},${headY-17} ${headX-dir*13},${headY-7}L${headX-dir*7},${headY-4}Z`,ink);
  let hand=p.attached?{x:h.x-p.x,y:h.y-p.y}:{x:dir*15,y:5};
  const sh={x:dir*7,y:-12},mx=(sh.x+hand.x)/2+dir*5,my=(sh.y+hand.y)/2+6;
  stroke([[sh.x,sh.y],[mx,my],[hand.x,hand.y]],ink,9);
  stroke([[hand.x-dir*3,hand.y+2],[hand.x,hand.y]],'#344341',4.4);
  this.path(c,`M8,-12L${mx},${my}`,null,edge,1);
  if(p.attached){c.strokeStyle='#a38a5a';c.lineWidth=1.4;c.beginPath();c.arc(hand.x,hand.y,3,0,Math.PI*2);c.stroke();}
  c.restore();
 }
 drawHints(c,options){
  const s=this.sim,p=s.player;
  for(const a of s.anchors){const active=p.attached===a.id,selected=s.station===a.id,reachable=Math.hypot(p.x-a.x,p.y-a.y)<=s.cfg.maxGrapple&&a.y<p.y-12;
   c.save();c.translate(a.x,a.y);c.globalAlpha=active?1:reachable?.8:.34;c.strokeStyle=active?'#ecd0a0':'#a88b57';c.lineWidth=active?2:1.4;
   c.beginPath();c.arc(0,0,active?14:12,0,Math.PI*2);c.stroke();
   if(selected){c.beginPath();c.arc(0,0,19,-2.8,-1.7);c.stroke();c.beginPath();c.arc(0,0,19,.3,1.4);c.stroke();}
   if(options.labels){c.font='13px system-ui';c.textAlign='center';c.fillStyle='#d2bb92';c.fillText(a.type==='fixed'?'梁环':'灯绳',0,-27);}
   c.restore();
  }
 }
 render(canvas,cameraX=0,options={}){
  const{width=1672,height=941,time=0,people=true,boats=true,wind=true,water=true,occlusion=true,debug=false,clean=false,gameplay=true,hints=true}=options;
  this.ensureCaches();if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const c=canvas.getContext('2d',{alpha:false}),scale=height/941;c.setTransform(1,0,0,1,0,0);c.fillStyle='#081b26';c.fillRect(0,0,width,height);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.save();c.scale(scale,scale);c.translate(-cameraX,0);
  this.drawCache(c,'backdrop');this.waterMotion(c,clean?0:time,water&&!clean);
  const actors={people:this.people(c,time,'far',people&&!clean),boats:[]};
  if(boats&&!clean)for(const o of this.ambient.boats)actors.boats.push(this.drawBoat(c,o,time));
  this.drawCache(c,'architecture');
  if(gameplay&&!clean)c.drawImage(this.platformCache.canvas,0,this.platformCache.y);
  this.drawLiveCable(c,time,debug);for(const l of this.highLamps)this.drawLamp(c,l,clean?0:time,wind&&!clean);this.drawSigns(c,clean?0:time,wind&&!clean);
  this.drawCache(c,'deck');actors.people.push(...this.people(c,time,'street',people&&!clean));
  if(occlusion)this.drawCache(c,'stalls');actors.people.push(...this.people(c,time,'nearStreet',people&&!clean));
  if(gameplay&&!clean){this.drawAnchorHardware(c);this.drawGrapple(c,time,debug);this.drawHero(c);}
  if(occlusion)this.drawCache(c,'frontPosts');for(const l of this.stallLamps)this.drawLamp(c,l,clean?0:time,wind&&!clean);
  if(occlusion)this.drawCache(c,'foreground');if(gameplay&&!clean&&hints)this.drawHints(c,options);
  if(debug&&options.ambientDebug)this.debugOverlay(c,time,{width,height,cameraX,scale},actors);
  c.restore();this.lastActors=actors;
  return{cacheCount:this.caches.length+(this.platformCache?1:0),cacheRevisions:this.cacheRevision,worldWidth:this.scene.design.worldWidth,simulation:this.sim.snapshot(),ambientActors:actors.people.length+actors.boats.length};
 }
}
window.NightMarketGrappleRenderer=GrappleRenderer;
})();
