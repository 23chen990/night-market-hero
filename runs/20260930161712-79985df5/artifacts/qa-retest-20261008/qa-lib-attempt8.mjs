import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { inflateSync } from 'node:zlib';
export const sha=(b)=>crypto.createHash('sha256').update(b).digest('hex');
export const selectors=['#title','#status','#mission','#toast','#coins','#cash-pile','#level','#order-lines','#order-product','#order-route','#order-status','#order-stock','#settlement'];
export function decode(buffer){
 const w=buffer.readUInt32BE(16),h=buffer.readUInt32BE(20),type=buffer[25],channels=type===6?4:3;
 if(buffer[24]!==8||![2,6].includes(type))throw Error('Unsupported PNG');
 let p=8;const parts=[];while(p<buffer.length){const n=buffer.readUInt32BE(p);if(buffer.toString('ascii',p+4,p+8)==='IDAT')parts.push(buffer.subarray(p+8,p+8+n));p+=12+n;}
 const raw=inflateSync(Buffer.concat(parts)),stride=w*channels,data=Buffer.alloc(stride*h);
 const paeth=(a,b,c)=>{const q=a+b-c,x=Math.abs(q-a),y=Math.abs(q-b),z=Math.abs(q-c);return x<=y&&x<=z?a:y<=z?b:c;};
 for(let y=0;y<h;y++){const f=raw[y*(stride+1)],row=y*stride;for(let x=0;x<stride;x++){const a=x>=channels?data[row+x-channels]:0,b=y?data[row+x-stride]:0,c=y&&x>=channels?data[row+x-stride-channels]:0;const pred=f===0?0:f===1?a:f===2?b:f===3?Math.floor((a+b)/2):f===4?paeth(a,b,c):NaN;if(!Number.isFinite(pred))throw Error('Unsupported filter');data[row+x]=(raw[y*(stride+1)+1+x]+pred)&255;}}
 return{w,h,channels,data};
}
export function components(image,rgb,tolerance=8,minArea=12){
 const{w,h,channels,data}=image,mask=new Uint8Array(w*h),out=[];
 const hit=i=>{const j=i*channels;return Math.abs(data[j]-rgb[0])<=tolerance&&Math.abs(data[j+1]-rgb[1])<=tolerance&&Math.abs(data[j+2]-rgb[2])<=tolerance;};
 for(let i=0;i<mask.length;i++){if(mask[i]||!hit(i))continue;const q=[i];mask[i]=1;let sx=0,sy=0,minX=w,minY=h,maxX=0,maxY=0;for(let a=0;a<q.length;a++){const j=q[a],x=j%w,y=Math.floor(j/w);sx+=x;sy+=y;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);for(const k of[j-1,j+1,j-w,j+w]){if(k<0||k>=mask.length||mask[k]||Math.abs(k%w-x)>1||!hit(k))continue;mask[k]=1;q.push(k);}}if(q.length>=minArea)out.push({n:q.length,x:sx/q.length,y:sy/q.length,box:[minX,minY,maxX,maxY]});}
 return out.sort((a,b)=>b.n-a.n);
}
// The image must be a current Canvas crop, not the complete page. Station positions
// are authored presentation coordinates supplied by the caller, never game state.
export function detectGullTarget(image,stationPositions,landscape=false){
 const {w,h,channels,data}=image;
 if(!(w>0&&h>0&&[3,4].includes(channels)&&data.length===w*h*channels))throw Error('Invalid decoded Canvas image');
 const pixelArea=540*960/(w*h),candidates=[];
 for(const [stationId,position] of Object.entries(stationPositions).filter(([id])=>id.endsWith('shelf'))){
  const ring={pixels:0,sectors:new Set()},triangle={pixels:0},white={pixels:0,x:0,y:0},gray={pixels:0,x:0,y:0};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const world=landscape?{x:(y+.5)/h*540,y:(1-(x+.5)/w)*960}:{x:(x+.5)/w*540,y:(y+.5)/h*960};
   const dx=world.x-position.x,dy=world.y-position.y;
   if(Math.abs(dx)>55||Math.abs(dy)>55)continue;
   const j=(y*w+x)*channels,r=data[j],g=data[j+1],b=data[j+2],radius=Math.hypot(dx,dy);
   // Alpha-blended orange (not the shelf's yellow border), spread around the
   // actual authored 46-unit alert annulus. A single orange object cannot pass.
   if(radius>=41&&radius<=51&&r>140&&g>60&&g<160&&b<110&&r-g>40&&g-b>20){
    ring.pixels++;ring.sectors.add(Math.floor((Math.atan2(dy,dx)+Math.PI)/(2*Math.PI)*16)%16);
   }
   // Cream triangle is a second independent cue, on the upper-right side of
   // this shelf in world presentation space, including in the rotated view.
   const halfWidth=(dy+52)*.6;
   if(dy>=-52&&dy<=-32&&Math.abs(dx-34)<=halfWidth+2&&r>205&&g>195&&b>130&&b<218&&r-g<40&&g-b>20)triangle.pixels++;
   if(Math.abs(dx)<=24&&Math.abs(dy)<=14){
    if(r>225&&g>225&&b>220&&Math.max(r,g,b)-Math.min(r,g,b)<25){white.pixels++;white.x+=dx;white.y+=dy;}
    if(r>=90&&r<=125&&g>=105&&g<=142&&b>=125&&b<=165&&g>r&&b>g){gray.pixels++;gray.x+=dx;gray.y+=dy;}
   }
  }
  const sectors=[...ring.sectors].sort((a,b)=>a-b),quadrants=new Set(sectors.map(s=>Math.floor(s/4)));
  const annulusVisible=ring.pixels*pixelArea>=80&&sectors.length>=10&&quadrants.size>=3;
  const triangleVisible=triangle.pixels>=4&&triangle.pixels*pixelArea>=80;
  const whiteCenter=white.pixels?{x:white.x/white.pixels,y:white.y/white.pixels}:null;
  const grayCenter=gray.pixels?{x:gray.x/gray.pixels,y:gray.y/gray.pixels}:null;
  const pairedBirdVisible=white.pixels>=2&&gray.pixels>=3&&white.pixels*pixelArea>=8&&gray.pixels*pixelArea>=25&&Math.hypot(whiteCenter.x-grayCenter.x,whiteCenter.y-grayCenter.y)<=18;
  const matched=pairedBirdVisible||(annulusVisible&&triangleVisible);
  candidates.push({stationId,position:{...position},matched,bird:{pairedVisible:pairedBirdVisible,whitePixels:white.pixels,grayPixels:gray.pixels,whiteCenter,grayCenter},alert:{annulus:{visible:annulusVisible,pixels:ring.pixels,coveredSectors:sectors},triangle:{visible:triangleVisible,pixels:triangle.pixels}}});
 }
 const matches=candidates.filter(c=>c.matched);
 return{targetId:matches.length===1?matches[0].stationId:null,candidates,reason:matches.length===1?'unique-visible-target':matches.length?'ambiguous-visible-target':'no-visible-target'};
}
export async function visible(page){return page.evaluate(selectors=>{
 const show=n=>n&&n.getClientRects().length&&getComputedStyle(n).display!=='none';
 const result=Object.fromEntries(selectors.map(s=>{const n=document.querySelector(s);return[s,show(n)?n.textContent.trim():null];}));
 const panel=document.querySelector('#settlement'),selection=show(panel)&&panel.querySelector('strong')?.textContent.includes('航标选市场');
 return{...result,settlementVisible:!!show(panel)&&!selection,selectionVisible:!!selection,buttons:[...document.querySelectorAll('button')].filter(show).map(n=>{const r=n.getBoundingClientRect();return{id:n.id,text:n.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,hidden:n.hidden};}),viewport:{width:innerWidth,height:innerHeight},overflow:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}};
 },selectors);}
export async function observeDom(page){await page.evaluate(selectors=>{
 const show=n=>n&&n.getClientRects().length&&getComputedStyle(n).display!=='none';
 const q={events:[],last:'',start:performance.now()};window.__NATURAL_VISIBLE_EVIDENCE=q;
 const sample=()=>{const v=Object.fromEntries(selectors.map(s=>{const n=document.querySelector(s);return[s,show(n)?n.textContent.trim():null];}));const sig=JSON.stringify(v);if(sig!==q.last){q.last=sig;q.events.push({atMs:Math.round(performance.now()-q.start),ui:v});}};
 new MutationObserver(sample).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class','style']});sample();
 },selectors);}
export class Driver{
 constructor(page,dir){this.page=page;this.dir=dir;this.trace=[];this.screens=[];this.seq=0;this.prior=null;this.holds=[];}
 async capture(name){const file=path.join(this.dir,`${String(++this.seq).padStart(3,'0')}-${name}.png`);await fs.mkdir(this.dir,{recursive:true});await this.page.screenshot({path:file,timeout:30000,animations:'disabled',caret:'hide',scale:'css'});this.screens.push({path:file,sha256:sha(await fs.readFile(file))});return file;}
 async read(){return visible(this.page);}
 async player(){
  const started=Date.now();
  const readGeometry=()=>this.page.locator('#game canvas').evaluate(n=>{const r=n.getBoundingClientRect();return{rect:{x:r.x,y:r.y,width:r.width,height:r.height},landscape:document.body.classList.contains('is-landscape')};});
  const geometryChanged=(a,b)=>a.landscape!==b.landscape||['x','y','width','height'].some(k=>Math.abs(a.rect[k]-b.rect[k])>.5);
  for(let captureAttempt=0;captureAttempt<3;captureAttempt++){
  const geometry=await readGeometry();
  const png=await this.page.screenshot({clip:geometry.rect,timeout:30000,animations:'disabled',caret:'hide',scale:'css'});
  const observation=await this.read(),afterGeometry=await readGeometry();
  if(observation.settlementVisible||observation.selectionVisible){
   const result={stoppedByOverlay:true,observation,geometry:afterGeometry,observationMs:Date.now()-started};
   this.trace.push({phase:'player-observation-overlay-transition',beforeGeometry:geometry,...result,screenshotSha256:sha(png)});
   return result;
  }
  if(geometryChanged(geometry,afterGeometry)){
   this.trace.push({phase:'player-observation-layout-recapture',beforeGeometry:geometry,afterGeometry,screenshotSha256:sha(png)});
   continue;
  }
  const im=decode(png);
  const map=(c,offset,marker)=>({...c,marker,world:geometry.landscape?{x:c.y/im.h*540,y:(1-c.x/im.w)*960+offset}:{x:c.x/im.w*540,y:c.y/im.h*960+offset}});
  const bodies=components(im,[44,155,155],8,12).filter(c=>c.n<2500&&(c.box[2]-c.box[0])>=3&&(c.box[3]-c.box[1])>=3).map(c=>map(c,-11,'body'));
  const heads=components(im,[255,235,190],4,12).filter(c=>c.n<1500).map(c=>map(c,22,'head'));
  const pairedBodies=bodies.filter(b=>heads.some(h=>Math.hypot(b.world.x-h.world.x,b.world.y-h.world.y)<12));
  const matches=pairedBodies.length?pairedBodies:[...bodies,...heads].filter(c=>!this.prior||Math.hypot(c.world.x-this.prior.x,c.world.y-this.prior.y)<=160);
  if(!matches.length){const fail=path.join(this.dir,'locator-failure.png');await fs.mkdir(this.dir,{recursive:true});await fs.writeFile(fail,png);console.log({bodies,heads,prior:this.prior});}
  if(!matches.length)throw Error('Rendered teal avatar body not observed; no prior-coordinate fallback');
  matches.sort((a,b)=>this.prior?Math.hypot(a.world.x-this.prior.x,a.world.y-this.prior.y)-Math.hypot(b.world.x-this.prior.x,b.world.y-this.prior.y):b.n-a.n);
  const m=matches[0],point={...m.world,at:Date.now(),component:m,geometry,observationMs:Date.now()-started};
  this.prior=point;return point;
  }
  throw Error('Canvas layout did not stabilize across three pixel observations');
 }
 async pulse(key,hold){await this.page.keyboard.down(key);try{await this.page.waitForTimeout(hold);}finally{await this.page.keyboard.up(key);}this.holds.push({key,hold,released:true});await this.page.waitForTimeout(25);}
 async move(target,label,{tolerance=28,maxMs=180000}={}){
  const started=Date.now(),samples=[];let reached=false,overlay=false;
  while(Date.now()-started<maxMs){const ui=await this.read();if(ui.settlementVisible||ui.selectionVisible){overlay=true;break;}const p=await this.player();if(p.stoppedByOverlay){overlay=true;break;}const dx=target.x-p.x,dy=target.y-p.y,distance=Math.hypot(dx,dy);samples.push({x:p.x,y:p.y,distance,observationMs:p.observationMs});if(distance<=tolerance){reached=true;break;}
   const horizontal=Math.abs(dx)>Math.abs(dy),axis=horizontal?dx:dy;const key=p.geometry.landscape?(horizontal?(axis>0?'ArrowDown':'ArrowUp'):(axis>0?'ArrowLeft':'ArrowRight')):(horizontal?(axis>0?'ArrowRight':'ArrowLeft'):(axis>0?'ArrowDown':'ArrowUp'));
   const hold=Math.min(500,Math.max(50,Math.abs(axis)/220*1000*.7));await this.pulse(key,hold);
  }
  const result={phase:label,target,reached,stoppedByOverlay:overlay,elapsedMs:Date.now()-started,samples,observation:await this.read()};this.trace.push(result);console.log(JSON.stringify({phase:label,reached,overlay,elapsedMs:result.elapsedMs,last:samples.at(-1)}));if(!reached&&!overlay)throw Error(`Normal movement did not reach ${label}`);return result;
 }
 async idle(ms,label){await this.page.waitForTimeout(ms);const out={phase:label,elapsedMs:ms,observation:await this.read(),screenshot:await this.capture(label)};this.trace.push(out);console.log(JSON.stringify({phase:label,coins:out.observation['#coins'],status:out.observation['#status'],toast:out.observation['#toast'],overlay:out.observation.settlementVisible||out.observation.selectionVisible}));return out;}
 async wait(predicate,label,maxMs=7000){const t=Date.now();let v=await this.read();while(!predicate(v)&&Date.now()-t<maxMs){await this.page.waitForTimeout(80);v=await this.read();}const out={phase:label,found:!!predicate(v),elapsedMs:Date.now()-t,observation:v,screenshot:await this.capture(label)};this.trace.push(out);return out;}
 async dom(){return this.page.evaluate(()=>window.__NATURAL_VISIBLE_EVIDENCE?.events??[]);}
}
