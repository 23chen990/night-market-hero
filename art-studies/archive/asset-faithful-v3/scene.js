/* Isolated art candidate: detailed silhouettes belong to existing image materials. */
const WORLD_W=5016,WORLD_H=941;
const $=s=>document.querySelector(s);
const images={},tinted=new Map(),sceneLog=[],materialUsage=new Set();
let ctx,mode='full',seed=9272;
function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
function line(x,y,xx,yy,c,w=2){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();}
function beam(x,y,w,h,c='#091a21'){
 rect(x,y,w,h,c);rect(x,y,Math.min(w,2),h,'rgba(52,75,82,.20)');
 for(let i=0;i<Math.max(w,h)/50;i++){
  if(w>h)line(x+rand()*w,y+2+rand()*Math.max(1,h-4),x+rand()*w,y+h*.65,'rgba(0,4,8,.18)',1);
  else line(x+2+rand()*Math.max(1,w-4),y+rand()*h,x+w*.55,y+rand()*h,'rgba(0,4,8,.18)',1);
 }
}
function glow(x,y,r,a=.12){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(235,160,73,${a})`);g.addColorStop(.28,`rgba(233,138,55,${a*.35})`);g.addColorStop(1,'rgba(220,117,38,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function sprite(id,x,y,w,flip=false,tint=null){
 const source=images[id],h=w*source.height/source.width;
 if(mode!=='full')return h;
 let im=source;
 if(tint){const key=id+tint;if(!tinted.has(key)){const t=canvas(im.width,im.height),c=t.getContext('2d');c.drawImage(im,0,0);c.globalCompositeOperation='source-atop';c.fillStyle=tint;c.fillRect(0,0,t.width,t.height);tinted.set(key,t);}im=tinted.get(key);}
 ctx.save();if(flip){ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(im,0,0,w,h);}else ctx.drawImage(im,x,y,w,h);ctx.restore();
 materialUsage.add(id);sceneLog.push({id,x,y,w,h,flip,tint});return h;
}
function lamp(x,y,h=92){const im=images.lantern,w=h*im.width/im.height;glow(x,y+h*.48,h*.8,.17);sprite('lantern',x-w/2,y,w);}
function rail(x,y,w,scale=1,c='#07161c'){
 beam(x,y,w,10*scale,c);beam(x,y+53*scale,w,10*scale,c);
 for(let xx=x+12;xx<x+w;xx+=39*scale){beam(xx,y-15*scale,9*scale,96*scale,c);rect(xx-2,y-18*scale,13*scale,5*scale,c);}
 for(let xx=x+26;xx<x+w-20;xx+=78*scale){line(xx,y+11*scale,xx+42*scale,y+50*scale,c,5*scale);}
}
function windowPanel(x,y,w,h,lit=false){
 rect(x,y,w,h,lit?'#9d6d36':'#142027');
 if(lit){rect(x+3,y+3,w-6,h-6,'#bd8949');glow(x+w/2,y+h/2,w*1.6,.055);}
 for(let xx=x+6;xx<x+w;xx+=12)beam(xx,y,4,h,'#081519');
 for(let yy=y+10;yy<y+h;yy+=29)beam(x,yy,w,5,'#081519');
 beam(x-5,y-7,w+10,8);beam(x-5,y+h-1,w+10,8);
}
function wall(x,y,w,h,lit=false){
 rect(x,y,w,h,'#08171e');
 for(let xx=x;xx<x+w;xx+=31){rect(xx,y,25,h,rand()>.5?'#0c1d25':'#101d23');line(xx+2,y,xx+2,y+h,'#18262d',1);}
 for(let xx=x+16;xx<x+w;xx+=103)beam(xx,y,15,h,'#050e14');
 for(let yy=y+19;yy<y+h-45;yy+=185){
  beam(x,yy,w,13,'#071219');
  for(let xx=x+35;xx<x+w-30;xx+=102)windowPanel(xx,yy+22,55,106,lit&&xx>x+w*.6);
 }
}
function roofPair(x,y,w,tint=null){
 // Each half retains the source silhouette and aspect; no generated roof shape.
 const half=w*.515;const h=sprite('eave',x,y,half,true,tint);sprite('eave',x+w-half,y,half,false,tint);return h;
}
function distantHouse(x,y,w,levels=1){
 const tint='rgba(36,67,80,.72)',rh=images.eave.height/images.eave.width*w*.515;
 rect(x+w*.11,y+rh*.62,w*.78,180*levels,'#1b3743');
 for(let xx=x+w*.15;xx<x+w*.9;xx+=w*.2)beam(xx,y+rh*.65,6,180*levels,'#17303b');
 for(let i=0;i<5;i++)if(rand()>.45){const xx=x+w*(.18+i*.13);rect(xx,y+rh+47,11,24,'#736344');rect(xx+4,y+rh+47,2,24,'#283b3e');}
 roofPair(x,y,w,tint);rail(x+w*.08,y+rh+95,w*.85,.5,'#1a3440');
}
function fog(y,h,a){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'rgba(46,79,95,0)');g.addColorStop(.55,`rgba(46,79,95,${a})`);g.addColorStop(1,'rgba(46,79,95,0)');ctx.fillStyle=g;ctx.fillRect(0,y,WORLD_W,h);}
function gate(x,y,w){
 const bh=w*images.beam.height/images.beam.width;
 const py=y+bh*.30,base=760;
 beam(x+w*.074,py,27,base-py,'#10232d');beam(x+w*.863,py,31,base-py,'#0b2029');
 sprite('beam',x,y,w,false,'rgba(17,43,55,.16)');
 // An independent eave pair belongs to this single gate, above the beam.
 const rw=w*.86,rh=rw*.515*images.eave.height/images.eave.width;
 roofPair(x+(w-rw)/2,y-rh*.59,rw,'rgba(6,24,32,.32)');
 sprite('support',x+w*.65,y+bh*.45,w*.19,false,'rgba(14,36,47,.18)');
 for(const xx of [x+w*.078,x+w*.87])for(let yy=py+25;yy<base;yy+=81)beam(xx-7,yy,37,10,'#0a1d27');
}
function overhead(x,y,w,flip=false){
 const h=sprite('lanternCable',x,y,w,flip);
 // This source contains the whole rope and its lanterns; avoid a second rope over it.
 for(const f of [.20,.50,.78])glow(x+w*f,y+h*.64,w*.055,.10);
 return h;
}
function canopy(x,y,w,flip=false,shade='rgba(2,14,22,.36)'){
 const h=sprite('canopy',x,y,w,flip,shade);
 const fy=y+h;
 beam(x+w*.15,fy-70,w*.69,12,'#0c1d22');
 for(let i=0;i<3;i++){const xx=x+w*(.20+i*.2);rect(xx,fy-99,24,29,'#0b1920');rect(xx-3,fy-100,30,5,'#19262a');}
 if(y<550){const xx=x+w*.72,ly=y+h*.35;line(xx,y+h*.24,xx,ly,'#14252c',2);lamp(xx,ly,w*.115);}
}
function nearHouse(x,flip=false,roofY=-275,w=580){
 const left=flip?x+w*.36:x-80;
 wall(left,175,w*.64,670,false);
 rail(left-25,388,w*.75,1.35,'#06131a');beam(left-25,470,w*.75,30,'#050f16');
 // Source roof remains full; viewport naturally crops the top like the approved composition.
 sprite('innerEave',x,roofY,w,flip,'rgba(1,9,15,.46)');
 sprite('support',flip?left+15:left+w*.41,475,95,flip,'rgba(0,8,14,.35)');
 const lx=flip?left+w*.37:left+w*.62;
 line(lx,192,lx,242,'#08161b',3);lamp(lx,242,112);
}
function pavilion(x,y,w){
 const h=images.innerEave.height/images.innerEave.width*w;
 beam(x+w*.36,y+h*.65,25,540-y-h*.65,'#06161f');
 sprite('innerEave',x,y,w,true,'rgba(1,12,20,.46)');
 sprite('scaffold',x+w*.28,385,w*.33,false,'rgba(3,18,27,.18)');
 rail(x+w*.25,533,w*.40,.9,'#06171f');
 sprite('banner',x+w*.21,287,62,false,'rgba(1,12,19,.18)');
}
function drawScene(target,drawMode){
 ctx=target.getContext('2d');mode=drawMode;seed=9272;
 ctx.drawImage(images.sky,0,0,WORLD_W,WORLD_H);
 if(mode==='sky')return;
 rect(0,0,WORLD_W,WORLD_H,'rgba(17,35,46,.05)');
 // Far layers use the same roof materials, muted by distance.
 for(const [x,y,w] of [[200,435,340],[735,374,430],[1325,365,340],[1875,428,480],[2510,345,420],[3060,465,400],[3640,390,500],[4270,336,450],[4740,405,350]])distantHouse(x,y,w);
 fog(350,420,.24);
 for(let x=-50;x<WORLD_W;x+=340){beam(x,600,7,283,'#18343f');beam(x-4,590,15,11,'#19353e');rail(x-150,673,340,.65,'#19343e');}
 // Midground gate sequence; scale and height differ through the continuous street.
 gate(430,180,600);gate(2200,227,570);gate(3880,167,620);
 overhead(518,264,480);overhead(1990,287,488,true);overhead(3685,276,500);
 line(383,270,518,264,'#08181f',2);line(998,264,1310,185,'#08181f',2);
 line(1780,221,1990,287,'#08181f',2);line(2478,287,3000,220,'#08181f',2);
 line(3490,225,3685,276,'#08181f',2);line(4185,276,4630,213,'#08181f',2);
 sprite('banner',383,294,62,false,'rgba(13,36,47,.10)');
 sprite('banner',2281,346,54,true,'rgba(13,36,47,.20)');
 sprite('banner',3750,310,65,false,'rgba(13,36,47,.10)');
 // The complete stall asset supplies detailed posts, containers and joinery.
 for(const [x,y,w] of [[285,617,320],[819,590,365],[1550,631,370],[2130,612,340],[2820,569,390],[3410,619,360],[4020,630,340],[4590,578,420]]){
  const hh=sprite('stall',x,y,w,false,'rgba(22,47,59,.35)');
  beam(x+30,y+hh-5,w-65,10,'#0e2731');
 }
 fog(520,360,.10);
 // Asymmetric foreground architecture frames the airborne passage.
 nearHouse(-12,false,-157,590);
 pavilion(1115,-213,740);
 nearHouse(1680,true,-143,570);
 pavilion(2750,-267,755);
 nearHouse(3360,false,-151,580);
 pavilion(4460,-255,725);
 // Cloth and full support geometry stay intact. Variations are positions and size, not reshaping.
 for(const a of [[-120,508,660,false],[597,450,633,true],[1140,656,650,false],[1770,527,600,true],[2370,465,670,false],[2910,637,670,true],[3440,498,655,false],[4030,455,610,true],[4560,634,680,false]])canopy(...a);
 // Lower market objects remain readable against the dark base.
 for(const [x,y,w,f] of [[525,748,225,false],[850,738,204,true],[1615,765,192,false],[2110,766,240,true],[2640,739,210,false],[3650,748,218,false],[4270,745,216,true]])sprite('cart',x,y,w,Boolean(f),'rgba(4,17,24,.08)');
 for(const [x,y,w,f] of [[331,569,180,true],[1033,535,178,false],[1930,573,171,false],[3077,552,192,true],[3622,585,178,true],[4400,544,184,false]])sprite('scaffold',x,y,w,Boolean(f),'rgba(5,21,30,.16)');
 // Small source-derived crown fragments finish local ends without replacing whole roofs.
 // Crown is already present inside the intact eave; no detached duplicate fragment.
 for(let x=-120;x<WORLD_W;x+=305){const y=837+Math.sin(x/480)*14;rail(x,y,335,1.13,'#041018');beam(x,y+65,340,35,'#050e13');}
 const ground=ctx.createLinearGradient(0,820,0,941);ground.addColorStop(0,'rgba(1,7,12,0)');ground.addColorStop(1,'rgba(1,7,12,.86)');ctx.fillStyle=ground;ctx.fillRect(0,820,WORLD_W,121);
 const top=ctx.createLinearGradient(0,0,0,140);top.addColorStop(0,'rgba(0,6,11,.25)');top.addColorStop(1,'rgba(0,6,11,0)');ctx.fillStyle=top;ctx.fillRect(0,0,WORLD_W,140);
}

const worlds={};
let cameraX=0,playing=false,lastTime=0,showRoute=false,playbackDirection=1;
const view=$('#view'),position=$('#position');
function maxCamera(){return Math.max(0,WORLD_W-WORLD_H*view.width/view.height);}
function paint(){
  const c=view.getContext('2d'),worldVisible=WORLD_H*view.width/view.height;
  cameraX=Math.max(0,Math.min(cameraX,maxCamera()));
  c.clearRect(0,0,view.width,view.height);c.drawImage(worlds.full,cameraX,0,worldVisible,WORLD_H,0,0,view.width,view.height);
  if(showRoute){c.save();c.scale(view.height/WORLD_H,view.height/WORLD_H);c.translate(-cameraX,0);c.strokeStyle='rgba(224,191,116,.65)';c.setLineDash([6,10]);c.lineWidth=2;c.beginPath();for(let x=0;x<=WORLD_W;x+=20){const y=414+Math.sin(x/430)*21;x?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();c.restore();}
  position.max=Math.round(maxCamera());position.value=Math.round(cameraX);
  $('#progress').textContent=`${Math.round(cameraX/maxCamera()*100)||0}%`;
  window.previewInfo={worldWidth:WORLD_W,worldHeight:WORLD_H,cameraX,maxCameraX:maxCamera(),completePanoramaInputs:0,sceneLayers:['existing-sky','simple-code-connections','complete-environment-materials'],materialIds:Array.from(materialUsage),codeRoofGeometry:false,playing,view:[view.width,view.height],runtimeIntegrated:false};
}
function resize(){view.width=Math.round(view.clientWidth);view.height=Math.round(view.clientHeight);paint();}
function animate(t){if(playing){if(lastTime){cameraX+=(t-lastTime)*.10*playbackDirection;if(cameraX>=maxCamera()){cameraX=maxCamera();playbackDirection=-1;}if(cameraX<=0){cameraX=0;playbackDirection=1;}}paint();}lastTime=t;requestAnimationFrame(animate);}
function nav(delta){cameraX=Math.max(0,Math.min(maxCamera(),cameraX+delta));paint();}
function download(name,url){const a=document.createElement('a');a.href=url;a.download=name;a.click();}
async function start(){
  await Promise.all(Object.entries(MATERIAL_DATA).map(([id,src])=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>{images[id]=im;res();};im.onerror=rej;im.src=src;})));
  for(const m of ['full','structure','sky']){worlds[m]=canvas(WORLD_W,WORLD_H);drawScene(worlds[m],m);}
  $('#loading').hidden=true;
  for(const m of ['sky','structure','full']){const c=$('#'+m+'-thumb');c.width=720;c.height=405;c.getContext('2d').drawImage(worlds[m],1700,0,1672,941,0,0,720,405);}
  $('#previous').onclick=()=>nav(-900);$('#next').onclick=()=>nav(900);
  $('#play').onclick=()=>{playing=!playing;if(playing&&cameraX>=maxCamera())playbackDirection=-1;$('#play').textContent=playing?'暂停漫游':'自动漫游';paint();};
  position.oninput=()=>{cameraX=Number(position.value);paint();};
  $('#layers').onclick=()=>{$('#breakdown').hidden=!$('#breakdown').hidden;$('#layers').setAttribute('aria-expanded',String(!$('#breakdown').hidden));};
  $('#route').onchange=e=>{showRoute=e.target.checked;paint();};
  $('#save').onclick=()=>download('夜市飞侠-混合长街-全貌.png',worlds.full.toDataURL('image/png'));
  let drag=null;view.onpointerdown=e=>{drag={x:e.clientX,camera:cameraX};view.setPointerCapture(e.pointerId);};
  view.onpointermove=e=>{if(drag){cameraX=drag.camera+(drag.x-e.clientX)*WORLD_H/view.height;paint();}};
  view.onpointerup=view.onpointercancel=()=>{drag=null;};
  window.addEventListener('resize',resize);resize();requestAnimationFrame(animate);
  window.exportPreview=(x=0,w=1672,h=941,layer='full')=>{const c=canvas(w,h);const ww=WORLD_H*w/h;const xx=Math.min(Math.max(0,x),WORLD_W-ww);c.getContext('2d').drawImage(worlds[layer],xx,0,ww,WORLD_H,0,0,w,h);return c.toDataURL('image/png');};
  window.exportWorld=()=>worlds.full.toDataURL('image/png');
  window.previewReady=true;
}
start().catch(e=>{$('#loading').textContent='素材加载失败，请重新打开预览。';console.error(e);});
