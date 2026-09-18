/* Night Market / hybrid visual study v02
 * Input: scene.json + 8 cropped components from the user's source archive.
 * Output: real Canvas2D drawing. No complete background image is ever loaded.
 * Coordinates are global; camera translation is applied once for every layer.
 */
'use strict';
(() => {
const PAL = {
 dark:    {wall:'#050e13',panel:'#071117',beam:'#040d12',roof:'#060f15',line:'#0b1a22',soft:'#0a1720',lo:[4,11,16],hi:[10,21,28]},
 near:    {wall:'#07141a',panel:'#091a22',beam:'#050f15',roof:'#06131a',line:'#0a1c26',soft:'#091922',lo:[4,12,17],hi:[10,23,31]},
 frontmid:{wall:'#0b2029',panel:'#0e2833',beam:'#081a23',roof:'#0b222d',line:'#163744',soft:'#102a36',lo:[8,23,31],hi:[20,44,55]},
 mid:     {wall:'#102a35',panel:'#163643',beam:'#0d2530',roof:'#102c39',line:'#1c3c48',soft:'#173442',lo:[12,30,39],hi:[26,52,64]},
 back:    {wall:'#153441',panel:'#183a47',beam:'#102e3b',roof:'#133340',line:'#214552',soft:'#1b3c4b',lo:[15,37,47],hi:[30,58,69]},
 far:     {wall:'#1a3d4b',panel:'#1d424f',beam:'#163847',roof:'#193c4c',line:'#204653',soft:'#1e4250',lo:[24,54,65],hi:[33,64,75]},
 farther: {wall:'#214553',panel:'#254a58',beam:'#1d4050',roof:'#204553',line:'#254b57',soft:'#234856',lo:[29,61,73],hi:[39,73,85]},
};
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
class SceneRenderer {
 constructor(scene, images){
  this.scene=scene; this.images=images; this.tintCache=new Map(); this.skyCache=null;
  this.hideArt=false; this.hiddenLayers=new Set(); this.debug=false; this.spriteBounds=[]; this.overrides={};
 }
 palette(n){return PAL[n]||PAL.near;}
 rect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(x,y,w,h);}
 path(c,d,col,stroke=null,width=1){const p=new Path2D(d);if(col){c.fillStyle=col;c.fill(p);}if(stroke){c.lineWidth=width;c.strokeStyle=stroke;c.stroke(p);}}
 line(c,x1,y1,x2,y2,col,w=1){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=col;c.lineWidth=w;c.stroke();}
 tinted(id,palette){
  if(id==='lamp')return this.images[id];
  const key=id+'-'+palette;if(this.tintCache.has(key))return this.tintCache.get(key);
  const im=this.images[id];if(!im)throw new Error('Missing component '+id);
  const a=document.createElement('canvas');a.width=im.width;a.height=im.height;
  const ctx=a.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
  const data=ctx.getImageData(0,0,a.width,a.height), p=this.palette(palette);
  for(let k=0;k<data.data.length;k+=4){const t=data.data[k]/255;
   for(let ch=0;ch<3;ch++)data.data[k+ch]=Math.round(p.lo[ch]+t*(p.hi[ch]-p.lo[ch]));}
  ctx.putImageData(data,0,0);this.tintCache.set(key,a);return a;
 }
 sprite(c,id,x,y,w,h,palette,flip=false,owner=''){
  const key=owner+':'+id, d=this.overrides[key]||{};x+=d.dx||0;y+=d.dy||0;
  this.spriteBounds.push({key,owner,asset:id,x,y,w,h,palette});
  if(this.hideArt)return;
  c.save();c.translate(x+(flip?w:0),y);if(flip)c.scale(-1,1);
  c.drawImage(this.tinted(id,palette),0,0,w,h);c.restore();
 }
 roof(c,x,y,w,h,p,detail=true){
  // A slightly uneven, weight-bearing silhouette; no material lighting.
  const d=`M ${x} ${y+h*.61} Q ${x+w*.055} ${y+h*.90} ${x+w*.17} ${y+h*.59}
    Q ${x+w*.25} ${y+h*.29} ${x+w*.285} ${y}
    Q ${x+w*.47} ${y+3} ${x+w*.70} ${y+1}
    Q ${x+w*.76} ${y+h*.38} ${x+w*.865} ${y+h*.57}
    Q ${x+w*.962} ${y+h*.74} ${x+w} ${y+h*.50}
    Q ${x+w*.987} ${y+h*.98} ${x+w*.90} ${y+h}
    L ${x+w*.10} ${y+h} Q ${x+w*.013} ${y+h*.96} ${x} ${y+h*.61} Z`;
  this.path(c,d,p.roof);
  this.path(c,`M ${x+w*.03} ${y+h*.82} Q ${x+w*.47} ${y+h*1.065} ${x+w*.97} ${y+h*.84}`,null,p.line,1.6);
  this.line(c,x+w*.28,y+2,x+w*.71,y+3,p.line,3.0);
  if(detail){
   // A few restrained roof plane divisions, not rows of individually lit tiles.
   c.save();c.globalAlpha=.24;
   for(let t=.19;t<.89;t+=.071){
    const bx=x+w*t,tx=x+w*(.285+(t-.19)*.585);
    this.path(c,`M ${tx} ${y+5} Q ${(bx+tx)/2} ${y+h*.52} ${bx} ${y+h*.91}`,null,p.line,1.2);
   }c.restore();
  }
  for(let t=.15;t<.91;t+=.09){this.rect(c,x+w*t,y+h-1,w*.027,7,p.beam);}
 }
 beam(c,x,y,w,h,p){
  this.path(c,`M${x},${y}L${x+w},${y-1}L${x+w-1},${y+h}L${x+2},${y+h+1}Z`,p.beam);
  this.line(c,x+2,y+1,x+w-1,y,p.line,1);
 }
 post(c,x,y,base,w,p,foot=true){
  this.path(c,`M${x-w*.47},${y}L${x+w*.47},${y-1}L${x+w*.53},${base}L${x-w*.5},${base}Z`,p.beam);
  this.line(c,x-w*.35,y+3,x-w*.39,base-3,p.line,.8);
  if(foot)this.rect(c,x-w*.78,base-5,w*1.56,7,p.soft);
 }
 brace(c,x,y,dx,dy,p,w=7){
  this.line(c,x,y,x+dx,y+dy,p.beam,w);
 }
 window(c,x,y,w,h,p,warm=false,intensity=1){
  this.rect(c,x,y,w,h,p.beam);
  this.rect(c,x+3,y+3,w-6,h-6,warm?`rgba(186,119,53,${intensity})`:p.panel);
  // Asymmetric closed shutters and lattice lend scale without a dense line drawing.
  const bw=Math.max(2,w*.043);
  for(let t=1/3;t<.99;t+=1/3)this.rect(c,x+w*t,y+2,bw,h-4,p.wall);
  this.rect(c,x+2,y+h*.35,w-4,bw,p.wall);this.rect(c,x+2,y+h*.7,w-4,bw,p.wall);
  this.rect(c,x-2,y+h,w+4,4,p.beam);
 }
 rail(c,o){
  const p=this.palette(o.palette),{x,y,w,h}=o;
  this.beam(c,x,y+5,w,5,p);this.beam(c,x,y+h*.58,w,4,p);this.beam(c,x,y+h,w,9,p);
  const count=Math.ceil(w/(o.step||52));
  for(let i=0;i<=count;i++){const xx=x+i*w/count;
   this.post(c,xx,y-(i%3===0?7:1),y+h+6,i%3===0?8:5,p,false);
   if(i%3===0)this.rect(c,xx-5,y-8,10,6,p.beam);
  }
 }
 house(c,o){
  const p=this.palette(o.palette),{x,y,w,h}=o;
  const rh=o.roofHeight||70, wallY=y+rh-2, bx=x+w*.095,bw=w*.81,base=y+h;
  this.rect(c,bx,wallY,bw,base-wallY,p.wall);
  this.rect(c,bx+bw*.06,wallY+12,bw*.90,base-wallY-16,p.panel);
  const stories=o.floors||1,sh=(base-wallY)/stories;
  for(let j=0;j<stories;j++){
   const fy=wallY+j*sh;
   for(let i=0;i<4;i++){
    const wx=bx+bw*.1+i*bw*.22;
    if(o.palette==='far'||o.palette==='farther'){
     this.rect(c,wx,fy+sh*.27,bw*.038,sh*.14,p.beam);
     if(o.windows && i===1){this.rect(c,wx+1,fy+sh*.27+1,bw*.033,sh*.13,'#585b46');}
    }else this.window(c,wx,fy+sh*.19,bw*.10,sh*.38,p,!!o.windows && (i===1||i===2),.27);
   }
   this.beam(c,bx-9,fy+sh-15,bw+18,10,p);
   if(stories>1&&j===0&&o.palette!=='far'&&o.palette!=='farther')this.rail(c,{x:bx-8,y:fy+sh-57,w:bw+16,h:40,palette:o.palette,step:46});
  }
  for(let i=0;i<=4;i++){
   const px=bx+(bw*i/4);this.post(c,px,wallY,base,Math.max(5,w*.016),p,false);
   this.brace(c,px,wallY+28,(i===4?-1:1)*w*.035,-24,p,Math.max(3,w*.011));
  }
  if(o.artRoof){
   // Roof halves meet at the same ridge; the walls and support beams are code.
   const ww=w*.52,hh=rh*1.35;
   this.sprite(c,'eave',x,y-4,ww,hh,o.palette,true,o.id+'-left');
   this.sprite(c,'eave',x+ww-4,y-4,ww,hh,o.palette,false,o.id+'-right');
  } else this.roof(c,x,y,w,rh,p,o.palette!=='farther');
  this.beam(c,bx-5,base-5,bw+10,12,p);
 }
 tower(c,o){
  const p=this.palette(o.palette),{x,y,w,h,tiers}=o;
  this.rect(c,x+w*.33,y+60,w*.36,h-60,p.wall);
  for(let i=0;i<tiers;i++){
   const t=i/(tiers-1),ww=w*(.60+.4*t),yy=y+i*h/(tiers+1);
   this.rect(c,x+(w-ww*.60)/2,yy+20,ww*.6,72,p.wall);
   this.roof(c,x+(w-ww)/2,yy,ww,ww*.24,p,false);
   if(i===1||i===2){
    this.rect(c,x+w*.47,yy+ww*.24+13,4,10,'#5b5740');
   }
  }
  this.line(c,x+w*.50,y-15,x+w*.50,y+5,p.beam,3);
 }
 citygate(c,o){
  const p=this.palette(o.palette),{x,y,w,h}=o;
  this.rect(c,x+w*.10,y+100,w*.80,h-100,p.wall);
  this.rect(c,x+w*.16,y+104,w*.68,h-104,p.panel);
  const ax=x+w*.40,aw=w*.27,ay=y+h*.49,bot=y+h;
  // Single restrained distant arch; no heavy stone shading.
  const ar=`M${ax},${bot}L${ax},${ay+aw/2}C${ax},${ay-aw*.12} ${ax+aw},${ay-aw*.12} ${ax+aw},${ay+aw/2}L${ax+aw},${bot}Z`;
  const ag=c.createLinearGradient(0,ay,0,bot);ag.addColorStop(0,`rgba(139,99,57,${o.warmth||.24})`);ag.addColorStop(1,`rgba(204,130,52,${Math.min(.75,(o.warmth||.24)*1.5)})`);this.path(c,ar,ag);
  this.roof(c,x,y,w,95,p,false);
  for(let i=0;i<6;i++)this.window(c,x+w*.23+i*w*.09,y+116,w*.036,22,p,i%3!==2,.37);
  this.beam(c,x+w*.12,y+165,w*.76,11,p);
  // No facade lines across the open gate arch.
 }
 paifang(c,o){
  const p=this.palette(o.palette),{x,y,w,base}=o;
  const roofH=113,beamY=y+103, beamH=166;
  const left=x+w*.093,right=x+w*.875;
  // Pillars are continuous down to visible footings.
  for(const xx of [left,right]){
   this.post(c,xx,beamY+70,base,32,p);
   this.rect(c,xx-28,base-20,56,21,p.soft);
   this.rect(c,xx-21,base-37,42,22,p.wall);
  }
  this.sprite(c,'crossbeam',x+15,beamY,w-30,beamH,o.palette,false,o.id);
  this.roof(c,x-7,y,w+14,roofH,p,true);
  this.beam(c,x+w*.10,beamY+151,w*.76,14,p);
 }
 foregroundHouse(c,o){
  const p=this.palette(o.palette),{bodyX:bx,bodyW:bw,roofBase:ry,floor:fy,base}=o;
  this.rect(c,bx,ry,bw,fy-ry,p.wall);
  this.rect(c,bx+24,ry+15,bw-50,fy-ry-25,p.panel);
  // An uneven series of shutters and open bays, rather than tiled identical windows.
  const bays=Math.max(3,Math.round(bw/155)),step=bw/bays;
  for(let i=0;i<bays;i++){
   const xx=bx+i*step+18;
   this.window(c,xx,ry+32,step*.56,(fy-ry)*.55,p,o.windows&&i===0,.13);
   if(i===1||!o.windows)this.rect(c,xx+step*.34,ry+34,step*.18,(fy-ry)*.55-4,p.wall);
  }
  for(let i=0;i<=bays;i++){
   const xx=bx+i*step;
   this.post(c,xx,ry-25,base,18+(i%2)*3,p);
   this.brace(c,xx,ry+37,(i===bays?-1:1)*42,-36,p,11);
   if(i===0||i===bays)this.brace(c,xx,fy+68,(i===bays?-1:1)*59,-57,p,10);
   // Short brackets support the eaves without huge decorative Xs.
   this.beam(c,xx-30,ry-4,62,8,p);
   this.beam(c,xx-22,ry+7,47,7,p);
  }
  this.beam(c,bx-24,ry-1,bw+48,20,p);
  this.beam(c,bx-20,fy-5,bw+40,23,p);
  this.rail(c,{x:bx-24,y:fy-98,w:bw+48,h:82,palette:o.palette,step:45});
  this.sprite(c,'eave',o.x,o.y,o.w,ry-o.y+39,o.palette,o.facing==='left',o.id);
  if(o.returnW){
   // A roof ridge that becomes visible in the adjacent view must have its other wing.
   this.sprite(c,'eave',o.x+o.w-12,o.y,o.returnW+9,ry-o.y+39,o.palette,false,o.id+'-return-wing');
  }
  // Bracket undersides keep the large top silhouette readable.
  for(let xx=bx+20;xx<bx+bw;xx+=58){
   this.rect(c,xx,ry+4,12,19,p.beam);
   this.rect(c,xx-9,ry+5,31,7,p.beam);
  }
 }
 fabric(c,o){
  const p=this.palette(o.palette),{x,y,w,base}=o,s=o.sag||45;
  const yl=y+8,yr=y-7;
  this.post(c,x+14,yl-22,base,8,p);this.post(c,x+w-12,yr-18,base,8,p);
  this.beam(c,x+2,y+15,w-1,5,p);
  this.brace(c,x+14,y+87,45,-54,p,5);this.brace(c,x+w-12,y+77,-36,-50,p,5);
  this.path(c,`M${x},${yl}Q${x+w*.43},${y+s} ${x+w},${yr}
    L${x+w+7},${yr+41}Q${x+w*.55},${y+s+69} ${x-8},${yl+36}Z`,p.roof);
  this.path(c,`M${x},${yl+3}Q${x+w*.41},${y+s+9} ${x+w},${yr+4}`,null,p.line,1.1);
  // Just two broad cloth planes, no high-frequency folds.
  this.path(c,`M${x+9},${yl+8}Q${x+w*.35},${y+s+14} ${x+w*.9},${yr+20}Q${x+w*.49},${y+s+44} ${x+9},${yl+8}Z`,p.soft);
  this.line(c,x+4,yl-5,x+22,yl+10,p.line,2);
  this.line(c,x+w-20,yr+8,x+w,yr-4,p.line,2);
 }
 artCanopy(c,o){
  const p=this.palette(o.palette);
  // Source cloth comes with poles. Extra code extensions make their load path explicit.
  const left=o.x+o.w*.062,right=o.x+o.w*.951;
  const foot=o.y+o.h*.986;
  this.post(c,left,o.y+o.h*.78,o.base,9,p);this.post(c,right,o.y+o.h*.78,o.base,9,p);
  this.beam(c,left,o.y+o.h*.27,right-left,5,p);
  this.brace(c,left,o.y+o.h*.63,36,-51,p,5);
  this.brace(c,right,o.y+o.h*.63,-34,-49,p,5);
  this.sprite(c,'canopy',o.x,o.y,o.w,o.h,o.palette,false,o.id);
 }
 scaffold(c,o){
  const p=this.palette(o.palette);
  this.post(c,o.x+o.w*.13,o.y+o.h*.82,o.base,9,p);
  this.post(c,o.x+o.w*.89,o.y+o.h*.82,o.base,9,p);
  this.sprite(c,'scaffold',o.x,o.y,o.w,o.h,o.palette,false,o.id);
 }
 sign(c,o){
  const p=this.palette(o.palette);
  this.beam(c,Math.min(o.x,o.postX)-8,o.y+6,Math.abs(o.postX-o.x)+o.w+12,7,p);
  this.sprite(c,'banner',o.x,o.y,o.w,o.h,o.palette,false,o.id);
 }
 lamp(c,o){
  const x=o.x,y=o.y,s=o.scale||.5,drop=o.drop||0;
  this.line(c,x,y,x,y+drop+9*s,'#10232a',Math.max(1,1.7*s));
  const lx=x-22*s,ly=y+drop,ww=44*s,hh=101*s;
  // Small glow is a decorative halo, not a volumetric lighting system.
  if(!this.hideArt){
   const radius=54*s,g=c.createRadialGradient(x,ly+38*s,3*s,x,ly+38*s,radius);
   g.addColorStop(0,`rgba(190,110,38,${(o.warmth||.5)*.20})`);g.addColorStop(.43,`rgba(183,102,34,${(o.warmth||.5)*.08})`);g.addColorStop(1,'rgba(183,102,34,0)');
   c.fillStyle=g;c.fillRect(x-radius,ly+38*s-radius,2*radius,2*radius);
  }
  this.sprite(c,'lamp',lx,ly,ww,hh,'near',false,o.id);
 }
 cable(c,o){
  const p=this.palette(o.palette),{x1,y1,x2,y2,sag}=o;
  const cx=(x1+x2)/2,cy=(y1+y2)/2+sag*2;
  this.path(c,`M${x1},${y1}Q${cx},${cy} ${x2},${y2}`,null,p.beam,o.width||2);
  for(const a of o.lanterns||[]){const t=a.t;
   const x=(1-t)*(1-t)*x1+2*(1-t)*t*cx+t*t*x2;
   const y=(1-t)*(1-t)*y1+2*(1-t)*t*cy+t*t*y2;
   this.lamp(c,{id:o.id+'-lamp-'+t,x,y,scale:a.scale,drop:a.drop,warmth:.40});
   this.line(c,x-3,y-2,x+3,y+4,p.beam,2);
  }
  for(const t of [.09,.34,.62,.91]){
   const xx=x1+(x2-x1)*t,yy=(1-t)**2*y1+2*(1-t)*t*cy+t*t*y2;
   this.path(c,`M${xx},${yy}q-3,12 -1,25`,null,p.beam,1.2);
  }
 }
 jar(c,x,y,s,p,kind=0){
  const w=s,h=s*1.28;
  this.path(c,`M${x+w*.29},${y-h}L${x+w*.71},${y-h}L${x+w*.67},${y-h*.79}
   C${x+w*1.04},${y-h*.6} ${x+w*.98},${y-h*.13} ${x+w*.76},${y}
   L${x+w*.19},${y}C${x-w*.04},${y-h*.13} ${x-w*.09},${y-h*.64} ${x+w*.34},${y-h*.80}Z`,p.soft);
  this.rect(c,x+w*.26,y-h-3,w*.5,4,p.beam);
  if(kind%2)this.path(c,`M${x+w*.15},${y-h*.45}q${w*.35},3 ${w*.75},-1`,null,p.line,1);
 }
 counter(c,o){
  const p=this.palette(o.palette),{x,y,w,base}=o;
  this.beam(c,x-9,y,w+18,12,p);
  this.post(c,x+12,y+7,base,10,p,false);this.post(c,x+w-12,y+7,base,10,p,false);
  this.rect(c,x+18,y+12,w-36,Math.max(12,base-y-22),p.wall);
  for(const [i,t] of (o.props||[]).entries()){
   const xx=x+w*t;
   if(i===1){
    this.rect(c,xx,y-24,39,23,p.soft);this.beam(c,xx-2,y-26,43,4,p);
    this.line(c,xx+11,y-22,xx+11,y-2,p.line,.8);this.line(c,xx+28,y-22,xx+28,y-2,p.line,.8);
   }else this.jar(c,xx,y-1,22+i*3,p,i);
  }
 }
 alley(c,o){
  const p=this.palette(o.palette);
  this.beam(c,o.x+5,o.base-6,o.w-10,9,p);
  this.sprite(c,'alley',o.x,o.y,o.w,o.h,o.palette,false,o.id);
 }
 street(c,o){
  const p=this.palette(o.palette),{x,y,w}=o;
  this.path(c,`M${x},${y}L${x+w*.21},${y-2}L${x+w*.43},${y+6}L${x+w*.74},${y+1}L${x+w},${y+5}L${x+w},${y+34}L${x},${y+28}Z`,p.beam);
  this.line(c,x,y+2,x+w,y+5,p.line,1);
  for(let xx=-115;xx<x+w;xx+=187){
   this.post(c,xx,y+15,960,13,p,false);this.brace(c,xx,y+93,81,-62,p,10);
  }
  this.beam(c,x,y+62,w,11,p);
 }
 bank(c,o){
  const p=this.palette(o.palette),{x,y,w}=o;
  this.path(c,`M${x},${y+21}L${x+280},${y+17}L${x+534},${y+2}L${x+711},${y+12}
    L${x+1115},${y-5}L${x+1338},${y+17}L${x+1813},${y+12}L${x+2070},${y+24}
    L${x+2463},${y+5}L${x+2810},${y+16}L${x+3300},${y+8}L${x+w},${y+23}
    L${x+w},1000L${x},1000Z`,p.wall);
 }
 sky(c,o){
  if(!this.skyCache){
   const a=document.createElement('canvas');a.width=o.w;a.height=o.h;
   const k=a.getContext('2d');
   const gr=k.createLinearGradient(0,0,0,941);
   gr.addColorStop(0,'#07151f');gr.addColorStop(.30,'#113142');gr.addColorStop(.62,'#1d4656');gr.addColorStop(1,'#122d3a');
   k.fillStyle=gr;k.fillRect(0,0,o.w,o.h);
   // Seam-independent low-amplitude blue atmosphere; computed once in world space.
   const rand=mulberry32(o.seed||1);
   for(let oct=0;oct<4;oct++){
    const n=document.createElement('canvas');n.width=26*(1<<oct);n.height=9*(1<<oct);
    const nc=n.getContext('2d');const img=nc.createImageData(n.width,n.height);
    for(let i=0;i<img.data.length;i+=4){const t=rand();img.data[i]=t>.5?69:3;img.data[i+1]=t>.5?109:17;img.data[i+2]=t>.5?125:24;img.data[i+3]=Math.round(10/(1+oct));}
    nc.putImageData(img,0,0);k.imageSmoothingEnabled=true;k.imageSmoothingQuality='high';k.drawImage(n,0,0,o.w,o.h);
   }
   this.skyCache=a;
  }
  c.drawImage(this.skyCache,0,0);
 }
 render(canvas,cameraX=0,{width=1672,height=941,debug=this.debug}={}){
  if(width<=0||height<=0||!Number.isFinite(cameraX))throw new Error('Invalid viewport');
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const cacheKey=JSON.stringify([this.hideArt,[...this.hiddenLayers].sort(),this.overrides,this.scene]);
  if(!this.worldCanvas||this.worldKey!==cacheKey){
   // The cache is created from individual draw commands and eight source components.
   // It is invalidated by a layout/layer/component change, never loaded as artwork.
   this.worldCanvas=document.createElement('canvas');
   this.worldCanvas.width=this.scene.design.worldWidth;this.worldCanvas.height=941;
   const wc=this.worldCanvas.getContext('2d',{alpha:false});
   wc.fillStyle='#07151e';wc.fillRect(0,0,this.worldCanvas.width,941);
   wc.imageSmoothingEnabled=true;wc.imageSmoothingQuality='high';this.spriteBounds=[];
   for(const o of [...this.scene.objects].sort((a,b)=>a.layer-b.layer)){
    if(this.hiddenLayers.has(this.scene.layers[o.layer]))continue;
    if(o.type==='sprite')this.sprite(wc,o.asset,o.x,o.y,o.w,o.h,o.palette,!!o.flip,o.id);
    else{if(typeof this[o.type]!=='function')throw new Error('Unknown object '+o.type);this[o.type](wc,o);}
   }
   this.worldKey=cacheKey;
  }
  const c=canvas.getContext('2d',{alpha:false});
  c.setTransform(1,0,0,1,0,0);c.fillStyle='#07151e';c.fillRect(0,0,width,height);
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  const scale=height/941;
  c.drawImage(this.worldCanvas,cameraX,0,width/scale,941,0,0,width,height);
  if(debug){
   c.save();c.scale(scale,scale);c.translate(-cameraX,0);c.lineWidth=1.5/scale;
   c.strokeStyle='#a6bcac';c.fillStyle='#c6dac9';c.font='12px monospace';
   for(const r of this.spriteBounds){c.strokeRect(r.x,r.y,r.w,r.h);c.fillText(r.asset,r.x+3,r.y+14);}
   c.strokeStyle='#e7ad6b';c.setLineDash([6,6]);this.line(c,1672,0,1672,941,'#e7ad6b',1.3/scale);c.restore();
  }
  return {cameraX,width,height,artInstances:this.spriteBounds.length,sceneObjects:this.scene.objects.length};
 }
}
window.NightMarketRenderer=SceneRenderer;
})();
