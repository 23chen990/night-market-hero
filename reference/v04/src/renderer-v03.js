/* v03 extends the actual v02 component renderer. Static batches and live actors are
 * interleaved in world space. No complete scene PNG is an input to this renderer.
 * This finite visual prototype is NOT an infinite-streaming implementation.
 */
'use strict';
(() => {
const Base=window.NightMarketRenderer,{motion,PeopleAtlases,clamp}=window.NightAmbient;
class AmbientRenderer extends Base{
 constructor(scene,images,ambient){
  super(scene,images);this.ambient=ambient;this.atlases=new PeopleAtlases(ambient);
  this.caches=[];this.cacheRevision=0;this.recording=false;this.lastActors={people:[],boats:[]};this.compile();
 }
 compile(){
  const all=this.scene.objects;this.highLamps=[];this.stallLamps=[];this.signs=all.filter(o=>o.type==='sign');
  for(const o of all){
   if(o.type==='lamp')(o.layer>=55?this.stallLamps:this.highLamps).push({...o});
   if(o.type==='cable')for(const a of o.lanterns||[]){
    const t=a.t,cx=(o.x1+o.x2)/2,cy=(o.y1+o.y2)/2+o.sag*2;
    this.highLamps.push({id:o.id+'-lamp-'+t,x:(1-t)**2*o.x1+2*(1-t)*t*cx+t*t*o.x2,y:(1-t)**2*o.y1+2*(1-t)*t*cy+t*t*o.y2,scale:a.scale,drop:a.drop,warmth:.40,anchor:{owner:o.id}});
   }
  }
  this.waterPath=new Path2D();
  for(const points of [this.scene.water.underWalkway,...this.scene.water.basins.map(b=>b.polygon)]){
   points.forEach(([x,y],i)=>i?this.waterPath.lineTo(x,y):this.waterPath.moveTo(x,y));this.waterPath.closePath();
  }
  for(const p of this.ambient.people)this.atlases.get(p.kind,p.color==='far');
  this.cacheKey='';
 }
 sprite(c,id,x,y,w,h,palette,flip=false,owner=''){
  const key=owner+':'+id,d=this.overrides[key]||{};x+=d.dx||0;y+=d.dy||0;
  if(this.recording)this.spriteBounds.push({key,owner,asset:id,x,y,w,h,palette});
  if(this.hideArt)return;
  c.save();c.translate(x+(flip?w:0),y);if(flip)c.scale(-1,1);c.drawImage(this.tinted(id,palette),0,0,w,h);c.restore();
 }
 cable(c,o){
  super.cable(c,{...o,lanterns:[]});const p=this.palette(o.palette),cx=(o.x1+o.x2)/2,cy=(o.y1+o.y2)/2+o.sag*2;
  for(const a of o.lanterns||[]){let t=a.t,x=(1-t)**2*o.x1+2*(1-t)*t*cx+t*t*o.x2,y=(1-t)**2*o.y1+2*(1-t)*t*cy+t*t*o.y2;this.line(c,x-3,y-2,x+3,y+4,p.beam,2);}
 }
 // Two halves of a foreground building are cached on opposite sides of street actors.
 foregroundHouse(c,o){c.save();c.beginPath();c.rect(-600,-200,5000,o.floor+220);c.clip();super.foregroundHouse(c,o);c.restore();}
 foregroundFeet(c,o){c.save();c.beginPath();c.rect(-600,o.floor+20,5000,1100);c.clip();super.foregroundHouse(c,o);c.restore();}
 // Same load-bearing structure, less uniform cloth outlines than v02.
 fabric(c,o){
  const p=this.palette(o.palette),{x,y,w,base}=o,s=o.sag||45,v=o.shapeVariant||0,yl=y+8,yr=y-7;
  this.post(c,x+14,yl-22,base,8,p);this.post(c,x+w-12,yr-18,base,8,p);
  this.beam(c,x+2,y+15,w-1,5,p);this.brace(c,x+14,y+87,45,-54,p,5);this.brace(c,x+w-12,y+77,-36,-50,p,5);
  const a=v===0?.34:v===1?.58:.43,depth=v===1?29:39;
  this.path(c,`M${x},${yl}C${x+w*.18},${y+s*.43} ${x+w*a},${y+s} ${x+w},${yr}L${x+w+5},${yr+depth}C${x+w*.66},${y+s+55} ${x+w*.30},${y+s+56} ${x-6},${yl+32}Z`,p.roof);
  this.path(c,`M${x+3},${yl+4}C${x+w*.23},${y+s*.56} ${x+w*a},${y+s+6} ${x+w-2},${yr+5}`,null,p.line,1.05);
  c.save();c.globalAlpha=.65;
  this.path(c,`M${x+5},${yl+7}Q${x+w*.25},${y+s*.75+14} ${x+w*.77},${y+s*.31+15}Q${x+w*.39},${y+s+29} ${x+5},${yl+7}Z`,p.soft);c.restore();
 }
 staticWater(c){
  c.save();c.clip(this.waterPath);const g=c.createLinearGradient(0,735,0,941);
  g.addColorStop(0,'#173845');g.addColorStop(.38,'#12313f');g.addColorStop(1,'#091d29');c.fillStyle=g;c.fillRect(0,730,this.scene.design.worldWidth,220);
  // Broad, quiet bands. There is no high-frequency glitter or white fog overlay.
  c.fillStyle='#16333e';c.globalAlpha=.32;
  for(let i=0;i<14;i++){const x=(i*283+97)%3344,y=765+(i*23)%156;c.fillRect(x,y,74+(i%4)*21,1);}
  c.restore();
  const p=this.palette('back');
  for(const b of this.scene.water.basins){
   const y=b.farBankY;this.rect(c,b.x,y-7,b.w,16,p.wall);this.beam(c,b.x-4,y-9,b.w+8,5,p);
   this.line(c,b.x+8,y+7,b.x+b.w-5,y+7,'#17323c',2);
   // Far-side parapet is deliberately sparse; all uprights meet the quay.
   for(let xx=b.x+28;xx<b.x+b.w-8;xx+=133){this.post(c,xx,y-33,y+3,4,p,false);}
   this.line(c,b.x+20,y-23,b.x+b.w-12,y-23,p.beam,3);
  }
  // A short stone return explains the bank/water corner at the first opening.
  this.path(c,'M1076,717L1110,732L1124,919L1090,929Z','#102b36');
  for(let i=0;i<5;i++)this.line(c,1080+i*3,748+i*26,1114+i,750+i*26,'#18343e',1);
 }
 drawObject(c,o){if(o.type==='sprite')this.sprite(c,o.asset,o.x,o.y,o.w,o.h,o.palette,!!o.flip,o.id);else{if(typeof this[o.type]!=='function')throw Error('Unknown object type '+o.type);this[o.type](c,o);}}
 makeCache(id,y,h,fn,opaque=false){
  const cv=document.createElement('canvas');cv.width=this.scene.design.worldWidth;cv.height=h;
  const c=cv.getContext('2d',{alpha:!opaque});c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.translate(0,-y);fn(c);return{id,canvas:cv,x:0,y};
 }
 ensureCaches(){
  const key=JSON.stringify([this.hideArt,this.overrides]);if(key===this.cacheKey)return;
  this.spriteBounds=[];this.recording=true;this.caches=[];
  const objects=[...this.scene.objects].sort((a,b)=>a.layer-b.layer),paint=(c,pred)=>objects.filter(pred).forEach(o=>this.drawObject(c,o));
  const backdrop=this.makeCache('backdrop',0,941,c=>{paint(c,o=>o.layer<=28);this.staticWater(c);},true);
  const architecture=this.makeCache('architecture',0,884,c=>{
   paint(c,o=>o.layer>=33&&o.layer<49&&!['lamp','sign','scaffold'].includes(o.type));
   // Sign poles and crossbars stay fixed while cloth moves independently.
   for(const o of this.signs){const p=this.palette(o.palette);this.beam(c,Math.min(o.x,o.postX)-8,o.y+6,Math.abs(o.postX-o.x)+o.w+12,7,p);}
   for(const o of this.ambient.boats.filter(o=>o.mooring)){this.post(c,o.mooring[0],o.mooring[1]-20,918,7,this.palette('frontmid'),false);}
  });
  const deck=this.makeCache('deck',807,134,c=>paint(c,o=>o.type==='street'));
  const stalls=this.makeCache('stalls',519,422,c=>paint(c,o=>o.layer>=51&&o.layer<=54&&o.type!=='lamp'));
  const frontPosts=this.makeCache('frontPosts',393,548,c=>{
   for(const o of objects.filter(o=>o.type==='foregroundHouse'))this.foregroundFeet(c,o);
   paint(c,o=>o.type==='scaffold');
  });
  const foreground=this.makeCache('foreground',640,301,c=>paint(c,o=>o.layer>=56));
  this.caches=[backdrop,architecture,deck,stalls,frontPosts,foreground];this.byCache=Object.fromEntries(this.caches.map(c=>[c.id,c]));
  this.skyCache=null;this.recording=false;this.cacheKey=key;this.cacheRevision++;
  // Duplicate upper/lower clipping of the same building isn't a new component instance.
  this.spriteBounds=[...new Map(this.spriteBounds.map(o=>[o.key,o])).values()];
 }
 drawCache(c,id){const b=this.byCache[id];c.drawImage(b.canvas,b.x,b.y);}
 waterMotion(c,time,enabled){
  const t=enabled?time:0;c.save();c.clip(this.waterPath);
  for(const a of this.ambient.waterLights){
   for(let j=0;j<9;j++){let d=j/9,yy=a.y+j*a.length/9,ww=a.width*(.30+.58*Math.sin(j*1.7+a.phase+t*.65)**2)*(1-d*.42),xx=a.x+Math.sin(j*2.1+t*.42+a.phase)*4;
    c.fillStyle=`rgba(172,126,63,${a.alpha*(1-d*.65)})`;c.fillRect(xx-ww/2,yy,ww,j%3===0?2:1.2);
   }
  }
  c.strokeStyle='rgba(42,75,86,0.27)';c.lineWidth=1;
  for(let j=0;j<12;j++){const x=(j*271+56)%3344,y=782+j%5*26;c.beginPath();c.moveTo(x+Math.sin(t*.22+j)*7,y);c.quadraticCurveTo(x+36,y+.6*Math.sin(t*.43+j),x+66+(j%4)*9,y);c.stroke();}
  c.restore();
 }
 boatState(o,time){const st=motion(o,time),bob=Math.sin(time*.89+o.phase)*o.bobbing+Math.sin(time*.43+o.phase)*o.bobbing*.25;return {...st,y:st.y+bob,rock:Math.sin(time*.69+o.phase)*.0035};}
 drawBoat(c,o,time){
  const st=this.boatState(o,time),im=this.images[o.asset],w=o.width,h=w*im.height/im.width;
  if(this.hideArt)return st;
  c.save();c.clip(this.waterPath);
  // Reflection stays in the water and is subsequently occluded by the same near architecture.
  c.save();c.globalAlpha=.11;c.translate(st.x,st.y+4);c.scale(1,-.24);c.drawImage(im,-w/2,-h*.88,w,h);c.restore();
  c.strokeStyle='rgba(39,70,80,.48)';c.lineWidth=.8;
  for(let i=0;i<2;i++){c.beginPath();c.ellipse(st.x,st.y+4+i*4,w*(.32+i*.09),1.5+i*.3,0,.12,Math.PI-.12);c.stroke();}
  c.restore();
  c.save();c.translate(st.x,st.y);c.rotate(st.rock);c.drawImage(im,-w/2,-h*.88,w,h);
  if(o.mode==='pass'){
   const u=w/198,q=Math.sin(time*.92+o.phase);c.scale(u,u);
   this.path(c,'M-71,-33Q-66,-35 -63,-30L-62,-18L-72,-18Z','#0e2833');
   this.path(c,'M-72,-37Q-73,-43 -68,-44Q-62,-42 -64,-36Z','#13303a');
   this.path(c,'M-80,-40L-69,-48L-57,-40Z','#102731');
   this.line(c,-68,-26,-84+q*3,-20,'#102832',4);
   this.line(c,-82+q*3,-20,-112+q*9,7,'#1c3540',2.2);
   this.line(c,-112+q*9,7,-116+q*10,12,'#1c3540',3);
  }
  c.restore();
  if(o.mooring){this.path(c,`M${st.x+w*.34},${st.y-8}Q${(st.x+w*.34+o.mooring[0])/2},${st.y+1} ${o.mooring[0]},${o.mooring[1]}`,null,'#18323b',1.2);}
  return{...st,id:o.id,w,h};
 }
 drawLamp(c,o,time,wind){
  const phase=[...o.id].reduce((a,ch)=>a+ch.charCodeAt(0),0)*.047;
  const angle=wind?(Math.sin(time*1.07+phase)*.018+Math.sin(time*.46+phase*.7)*.005):0;
  c.save();c.translate(o.x,o.y);c.rotate(angle);super.lamp(c,{...o,x:0,y:0});c.restore();
 }
 drawSigns(c,time,wind){
  if(this.hideArt)return;
  for(const o of this.signs){const im=this.tinted('banner',o.palette),split=Math.round(im.height*.115);
   c.drawImage(im,0,0,im.width,split,o.x,o.y,o.w,o.h*.115);
   // Cloth bends gently below a fixed crossbar. Adjacent strips overlap by a pixel only
   // for sampling; this is within one cloth object, not a background seam disguise.
   const rows=28;
   for(let n=0;n<rows;n++){const u=n/rows,sY=split+(im.height-split)*u,sh=(im.height-split)/rows,dy=o.h*.115+o.h*.885*u,dh=o.h*.885/rows;
    const dx=wind?Math.sin(time*.85+n*.14+o.x*.01)*1.8*u*u:0;
    c.drawImage(im,0,sY,im.width,Math.min(sh+1,im.height-sY),o.x+dx,o.y+dy,o.w,dh+.55);
   }
  }
 }
 people(c,time,layer,on){const out=[];if(!on)return out;for(const o of this.ambient.people.filter(p=>p.layer===layer)){const s=motion(o,time);const pose=this.atlases.draw(c,o,s,time);out.push({...pose,id:o.id,height:o.height,role:o.role});}return out;}
 debugOverlay(c,time,{width,height,cameraX,scale},actors){
  c.save();c.lineWidth=1.3/scale;c.font=`${12/scale}px system-ui`;c.setLineDash([5/scale,5/scale]);
  c.strokeStyle='#55aaa5';c.stroke(this.waterPath);
  for(const o of this.ambient.people){c.strokeStyle=o.layer==='far'?'#7299a3':'#caa166';c.beginPath();c.moveTo(...o.path[0]);c.lineTo(...o.path[1]);c.stroke();for(const v of o.path){c.beginPath();c.arc(v[0],v[1],3/scale,0,Math.PI*2);c.stroke();}}
  c.setLineDash([]);for(const o of actors.people){c.strokeStyle='#caa166';c.strokeRect(o.x-20,o.y-o.height-2,40,o.height+4);c.fillStyle='#d7bf96';c.fillText(o.id,o.x-20,o.y-o.height-9);}
  for(const o of actors.boats){c.strokeStyle='#6faea2';c.strokeRect(o.x-o.w/2,o.y-o.h*.88,o.w,o.h);}
  for(const r of this.spriteBounds){c.strokeStyle='rgba(146,164,175,.4)';c.strokeRect(r.x,r.y,r.w,r.h);}
  c.strokeStyle='#b89058';c.setLineDash([9,8]);c.beginPath();c.moveTo(1672,0);c.lineTo(1672,941);c.stroke();c.restore();
 }
 render(canvas,cameraX=0,options={}){
  const {width=1672,height=941,time=0,people=true,boats=true,wind=true,water=true,occlusion=true,debug=false,clean=false}=options;
  if(!Number.isFinite(time)||!Number.isFinite(cameraX)||width<=0||height<=0)throw Error('Invalid renderer coordinates');
  this.ensureCaches();if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const c=canvas.getContext('2d',{alpha:false}),scale=height/941;c.setTransform(1,0,0,1,0,0);c.fillStyle='#081b26';c.fillRect(0,0,width,height);
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.save();c.scale(scale,scale);c.translate(-cameraX,0);
  this.drawCache(c,'backdrop');this.waterMotion(c,clean?0:time,water&&!clean);
  const actors={people:this.people(c,time,'far',people&&!clean),boats:[]};
  if(boats&&!clean)for(const o of this.ambient.boats)actors.boats.push(this.drawBoat(c,o,time));
  this.drawCache(c,'architecture');for(const l of this.highLamps)this.drawLamp(c,l,clean?0:time,wind&&!clean);this.drawSigns(c,clean?0:time,wind&&!clean);
  this.drawCache(c,'deck');actors.people.push(...this.people(c,time,'street',people&&!clean));
  if(occlusion)this.drawCache(c,'stalls');actors.people.push(...this.people(c,time,'nearStreet',people&&!clean));
  if(occlusion)this.drawCache(c,'frontPosts');for(const l of this.stallLamps)this.drawLamp(c,l,clean?0:time,wind&&!clean);
  if(occlusion)this.drawCache(c,'foreground');
  if(debug)this.debugOverlay(c,time,{width,height,cameraX,scale},actors);c.restore();this.lastActors=actors;
  const visibleW=width/scale;
  return{time,cameraX,width,height,visiblePeople:actors.people.filter(a=>a.x>cameraX-25&&a.x<cameraX+visibleW+25).length,visibleBoats:actors.boats.filter(a=>a.x+a.w/2>cameraX&&a.x-a.w/2<cameraX+visibleW).length,peopleCount:actors.people.length,boatCount:actors.boats.length,staticCacheCount:this.caches.length,staticCacheBytes:this.caches.reduce((n,x)=>n+x.canvas.width*x.canvas.height*4,0),cacheRevision:this.cacheRevision,artInstances:this.spriteBounds.length,sceneObjects:this.scene.objects.length};
 }
}
window.NightMarketAmbientRenderer=AmbientRenderer;
})();
