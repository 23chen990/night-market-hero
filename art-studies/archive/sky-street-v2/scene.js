/* Independent art study. Only sky and atomic materials are loaded. */
const WORLD_W=5016, WORLD_H=941;
const $=s=>document.querySelector(s);
let ctx,mode='full',seed=22817;
const images={},tinted=new Map(),sceneLog=[];
function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function range(a,b){return a+(b-a)*rand();}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
function line(x,y,x2,y2,c,width=1){ctx.strokeStyle=c;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
function poly(points,c){ctx.fillStyle=c;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function glow(x,y,r,color,alpha=.15){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${color},${alpha})`);g.addColorStop(.45,`rgba(${color},${alpha*.35})`);g.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function asset(id,x,y,w,h,flip=false,tint=null){
  if(mode!=='full')return;
  let im=images[id];
  if(tint){const key=id+tint;if(!tinted.has(key)){const t=canvas(im.width,im.height);const c=t.getContext('2d');c.drawImage(im,0,0);c.globalCompositeOperation='source-atop';c.fillStyle=tint;c.fillRect(0,0,t.width,t.height);tinted.set(key,t);}im=tinted.get(key);}
  ctx.save();if(id==='stall')ctx.filter='blur(.35px)';if(flip){ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(im,0,0,w,h);}else ctx.drawImage(im,x,y,w,h);ctx.restore();
  sceneLog.push({id,x,y,w,h,flip});
}
function wood(x,y,w,h,c='#0d222b',light='#213541'){
  rect(x,y,w,h,c);rect(x,y,Math.min(2,w),h,light);
  for(let j=0;j<Math.ceil(w/14);j++)line(x+3+j*14,y+2,x+3+j*14+range(-1,1),y+h-1,'rgba(0,0,0,.16)',1);
  for(let j=0;j<h/40;j++){const yy=y+range(1,h);line(x+2,yy,x+w-2,yy,`rgba(74,85,83,${range(.06,.16)})`,1);}
}
function windowGrid(x,y,w,h,depth=1,lit=true){
  rect(x-4,y-5,w+8,h+10,depth>.7?'#06161c':'#17313d');
  if(lit){const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,depth>.7?'#6a4122':'#455247');g.addColorStop(.35,depth>.7?'#c88b42':'#697063');g.addColorStop(1,depth>.7?'#986c38':'#43544e');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
    for(let i=0;i<60*depth;i++)rect(x+range(0,w),y+range(0,h),range(1,3),range(1,10),'rgba(253,190,90,.07)');
  }else rect(x,y,w,h,depth>.7?'#071921':'#1a3641');
  const c=depth>.7?'#10202a':'#243e46';
  for(let xx=x+4;xx<x+w;xx+=7)rect(xx,y,1.5,h,c);
  for(let yy=y+8;yy<y+h;yy+=14)rect(x,yy,w,2,c);
  rect(x+w*.49,y,3,h,c);rect(x-4,y+h,w+8,4,'#10222c');
}
function roof(x,y,w,h,depth=1){
  // The whole solid roof is one geometry. Detailed eaves share its outline.
  const col=depth<.5?'#233d49':depth<.8?'#15313f':'#091c27';
  ctx.beginPath();ctx.moveTo(x,y+h*.64);ctx.quadraticCurveTo(x+w*.07,y+h*.95,x+w*.49,y);ctx.quadraticCurveTo(x+w*.54,y+h*.12,x+w*.65,y+h*.28);ctx.quadraticCurveTo(x+w*.9,y+h*.91,x+w,y+h*.64);ctx.lineTo(x+w*.96,y+h);ctx.lineTo(x+w*.04,y+h);ctx.closePath();ctx.fillStyle=col;ctx.fill();
  ctx.save();ctx.clip();
  for(let row=0;row<9;row++){
    const yy=y+h*.11+row*h*.105;
    for(let xx=x-20;xx<x+w+20;xx+=w/26){
      ctx.beginPath();ctx.ellipse(xx+(row%2)*5,yy,Math.max(4,w/54),Math.max(2,h/30),-.28,0,Math.PI);ctx.strokeStyle=depth<.5?'rgba(69,101,112,.18)':'rgba(75,100,114,.20)';ctx.lineWidth=1;ctx.stroke();
    }
  }ctx.restore();
  rect(x+w*.04,y+h-6,w*.92,13,depth<.5?'#233c46':'#0d232d');
  if(depth>.65){
    // Clean transparent material halves meet over the continuous code mass.
    asset('eave',x+w*.5-2,y-4,w*.54,h+27,false,'rgba(3,19,27,.08)');
    asset('eave',x-w*.04,y-4,w*.54,h+27,true,'rgba(3,19,27,.08)');
    for(let xx=x+w*.11;xx<x+w*.9;xx+=w*.2)asset('support',xx,y+h+1,Math.min(45,w*.10),Math.min(42,w*.095),false,'rgba(4,20,28,.2)');
  }
  line(x+w*.47,y+4,x+w*.52,y+4,depth<.5?'#304f5b':'#172c38',5);
  for(const p of [x+w*.48,x+w*.515]){rect(p,y-8,3,13,col);ctx.fillStyle=col;ctx.beginPath();ctx.arc(p+2,y-8,4,0,Math.PI*2);ctx.fill();}
}
function rail(x,y,w,scale=1,depth=1){
  const c=depth<.6?'#284650':'#081a23';
  const step=34*scale;
  for(let xx=x;xx<x+w;xx+=step){wood(xx,y-38*scale,5*scale,62*scale,c,'rgba(56,82,95,.28)');rect(xx-2,y-40*scale,9*scale,4*scale,c);}
  for(const yy of [y-30*scale,y-7*scale]){wood(x,yy,w,5*scale,c,'rgba(56,82,95,.23)');}
  for(let xx=x+10*scale;xx<x+w-18;xx+=step)line(xx,y-6*scale,xx+21*scale,y-27*scale,c,2*scale);
}
function building(x,top,w,h,depth=1,tiers=1){
  const rh=w*.235;
  const bodyY=top+rh*.87, bottom=top+h;
  const bodyW=w*.80, left=x+w*.1;
  const grad=ctx.createLinearGradient(left,bodyY,left+bodyW,bottom);
  grad.addColorStop(0,depth<.6?'#233c48':depth<.85?'#16303b':'#101f26');
  grad.addColorStop(.7,depth<.6?'#213b46':depth<.85?'#102630':'#0b1820');
  grad.addColorStop(1,depth<.6?'#213a44':'#061820');ctx.fillStyle=grad;ctx.fillRect(left,bodyY,bodyW,bottom-bodyY);
  if(depth>.6){
    const side=ctx.createLinearGradient(left,bodyY,left+bodyW,bodyY);
    side.addColorStop(0,'rgba(0,7,11,.36)');side.addColorStop(.17,'rgba(0,7,11,0)');side.addColorStop(.7,'rgba(0,7,11,.03)');side.addColorStop(1,'rgba(0,7,11,.42)');ctx.fillStyle=side;ctx.fillRect(left,bodyY,bodyW,bottom-bodyY);
    for(let yy=bodyY+5;yy<bottom;yy+=14){
      if(yy>bottom-70){for(let xx=left+(Math.round(yy)%2)*13;xx<left+bodyW;xx+=31){line(xx,yy,xx+27,yy,'rgba(75,79,76,.12)',1);line(xx,yy,xx,yy+11,'rgba(2,11,17,.24)',1);}}
    }
  }
  // Broken plaster, narrow boards, masonry and exposed timber give body mass.
  for(let i=0;i<(w*h)/270;i++){const px=range(left,left+bodyW),py=range(bodyY,bottom);rect(px,py,range(1,8),range(3,28),rand()<.5?'rgba(109,115,108,.045)':'rgba(0,0,0,.05)');}
  for(let xx=left+12;xx<left+bodyW;xx+=22)line(xx,bodyY,xx+range(-2,2),bottom,'rgba(1,8,13,.20)',1);
  for(let yy=bodyY+12;yy<bottom;yy+=78)wood(left,yy,bodyW,6*depth,depth<.6?'#263f49':'#10212a');
  const floorH=(bottom-bodyY)/tiers;
  for(let floor=0;floor<tiers;floor++){
    const wy=bodyY+25+floorH*floor;
    const ww=Math.min(36,w*.1), wh=Math.min(56,floorH*.39);
    for(let xx=left+bodyW*.13;xx<left+bodyW*.87;xx+=bodyW*.27){
      const lit=rand()>(depth<.6?.79:.56);
      if(depth<.6){if(lit){rect(xx+3,wy+7,ww*.45,wh*.55,'#69705a');rect(xx+ww*.23,wy+7,2,wh*.55,'#263c43');}}
      else windowGrid(xx,wy,ww,wh,depth,lit);
      if(lit&&depth>.75){glow(xx+ww/2,wy+wh/2,65,'224,143,63',.065);}
    }
    if(floor<tiers-1&&depth>.6){wood(left-13,bodyY+(floor+1)*floorH-16,bodyW+26,15,'#0b202a');rail(left-10,bodyY+(floor+1)*floorH-22,bodyW+20,.65,depth);}
  }
  for(const px of [left+3,left+bodyW*.49,left+bodyW-12])wood(px,bodyY,depth<.6?5:10,bottom-bodyY,depth<.6?'#213c47':'#0c1e27');
  roof(x,top,w,rh,depth);
  if(depth>.85&&tiers>2){
    for(let i=1;i<tiers;i++){
      const by=bodyY+floorH*i-28;
      rect(left-21,by,bodyW+42,9,'#0c2029');
      for(let xx=left-17;xx<left+bodyW+22;xx+=12){line(xx,by-10,xx+4,by,'#233744',2);line(xx+4,by,xx+13,by,'#071923',2);}
      line(left-25,by-7,left+bodyW+25,by-7,'#132d3b',4);
    }
  }
}
function lantern(x,y,h=84,depth=1){
  const w=h*.40,bulb=y+h*.46;
  glow(x,bulb,h*.95,'245,162,62',.13*depth);
  glow(x,bulb,h*.4,'254,177,63',.22*depth);
  asset('lantern',x-w/2,y,w,h,false,depth<.7?'rgba(26,63,77,.35)':null);
  // Light inside the actual sprite, restrained to its paper body.
  if(mode==='full'){ctx.save();ctx.globalCompositeOperation='screen';glow(x,bulb,h*.16,'245,171,83',.26*depth);ctx.restore();}
}
function cable(points,sag,lights,depth=1){
  const [a,b]=points.map(([x,y])=>[x,y-72]);
  ctx.beginPath();ctx.moveTo(...a);ctx.quadraticCurveTo((a[0]+b[0])/2,Math.max(a[1],b[1])+sag,...b);ctx.strokeStyle=depth<.7?'#213b45':'#0a1b22';ctx.lineWidth=depth<.7?2:3.5;ctx.stroke();
  // Small overhead highlight gives rope volume without glowing a route.
  ctx.beginPath();ctx.moveTo(a[0],a[1]-1);ctx.quadraticCurveTo((a[0]+b[0])/2,Math.max(a[1],b[1])+sag-1,b[0],b[1]-1);ctx.strokeStyle='rgba(87,98,88,.22)';ctx.lineWidth=1;ctx.stroke();
  for(let i=1;i<=lights;i++){
    if(i>1&&rand()<.16)continue;
    const t=(i+range(-.17,.17))/(lights+1),x=a[0]*(1-t)+b[0]*t,y=(1-t)*(1-t)*a[1]+2*(1-t)*t*(Math.max(a[1],b[1])+sag)+t*t*b[1];
    line(x,y,x,y+10,'#14252b',2);lantern(x,y+7,depth<.7?40:range(57,89),depth);
  }
}
function post(x,y,bottom,width=12){
  wood(x-width/2,y,width,bottom-y,width>=12?'#18313d':'#0b2029',width>=12?'#29434d':'#233d49');
  for(let yy=y+12;yy<bottom;yy+=65){rect(x-width/2-2,yy,width+4,4,'#2a3736');rect(x-width/2-2,yy+4,width+4,2,'#061922');}
  rect(x-width/2-4,y+24,width+8,7,'#0b1a20');
}
function banner(x,y,w=48,h=150){
  asset('banner',x,y,w,h,false,'rgba(3,17,24,.15)');
}
function pot(x,y,s=1){
  ctx.fillStyle='#0b1820';ctx.beginPath();ctx.ellipse(x,y,10*s,13*s,0,0,Math.PI*2);ctx.fill();rect(x-5*s,y-16*s,10*s,7*s,'#13232a');line(x-8*s,y-9*s,x+8*s,y-9*s,'#344040',1);ctx.beginPath();ctx.ellipse(x-3*s,y-4*s,2*s,6*s,0,0,Math.PI*2);ctx.fillStyle='rgba(141,110,73,.12)';ctx.fill();
}
function person(x,feet,s=1){
  const c='#10222a';ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,feet-37*s,5*s,6*s,0,0,7);ctx.fill();
  if(rand()>.4)poly([[x-11*s,feet-39*s],[x,feet-47*s],[x+12*s,feet-39*s]],c);
  poly([[x-5*s,feet-31*s],[x+6*s,feet-31*s],[x+12*s,feet-7*s],[x-12*s,feet-7*s]],c);
  line(x-4*s,feet-8*s,x-7*s,feet,c,4*s);line(x+4*s,feet-8*s,x+7*s,feet,c,4*s);
}
function stall(x,top,w,base=910){
  if(x===315||x===2140||x===3940){
    wood(x+18,base-8,w-36,20,'#0b1d25');
    asset('stall',x,top-35,w,base-top+35,false,'rgba(39,62,71,.31)');
    const lx=x+w*.65,ly=top+83;line(lx,top+43,lx,ly+3,'#162c34',2);lantern(lx,ly,64,.85);glow(x+w*.65,base-86,95,'227,141,61',.11);
    person(x+w*.43,base-4,1.05);return;
  }
  const postL=x+12,postR=x+w-12;
  post(postL,top,base,9);post(postR,top+16,base,10);
  const h=w*range(.20,.29);
  // The cloth is an existing small material. Posts and counter extend it coherently.
  asset('canopy',x,top,w,h,false,'rgba(4,22,29,.22)');
  wood(x+8,base-105,w-16,14,'#13252b');wood(x+13,base-91,w-26,83,'#0c2028');
  for(let xx=x+30;xx<x+w-20;xx+=23)line(xx,base-88,xx,base-12,'#22333a',1);
  const lampX=x+w*.74,lampY=top+h+19;
  wood(x+w*.68,top+h*.79,w*.29-12,5,'#12262d');
  line(lampX,top+h*.79,lampX,lampY+3,'#152931',2);
  lantern(lampX,lampY,range(52,75),.8);
  glow(x+w*.70,base-86,115,'227,141,61',.12);
  for(let i=0;i<4;i++){const px=x+range(30,w-25);if(rand()>.4)pot(px,base-119,range(.55,1.15));else{rect(px-12,base-127,24,10,'#17252a');line(px-14,base-127,px+14,base-127,'#394038',2);}}
  for(let i=0;i<3;i++)person(x+range(14,w-14),base-5,range(.8,1.35));
}
function atmosphericBand(y,h,alpha){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'rgba(63,92,107,0)');g.addColorStop(.55,`rgba(63,92,107,${alpha})`);g.addColorStop(1,'rgba(63,92,107,0)');ctx.fillStyle=g;ctx.fillRect(0,y,WORLD_W,h);}
function noisePattern(){const n=canvas(256,256),c=n.getContext('2d'),d=c.createImageData(256,256);for(let i=0;i<d.data.length;i+=4){let v=rand()*255;d.data[i]=v;d.data[i+1]=v;d.data[i+2]=v;d.data[i+3]=16;}c.putImageData(d,0,0);return n;}
function drawScene(target,drawMode){
  ctx=target.getContext('2d');mode=drawMode;seed=22817;sceneLog.length=0;
  ctx.fillStyle='#263e4b';ctx.fillRect(0,0,WORLD_W,WORLD_H);
  // One existing atmosphere plate spans the continuous world; never two scene plates.
  ctx.save();ctx.filter='saturate(.57) brightness(1.14)';ctx.drawImage(images.sky,0,-15,WORLD_W,WORLD_H+30);ctx.restore();
  rect(0,0,WORLD_W,WORLD_H,'rgba(53,70,83,.10)');
  if(mode==='sky')return;
  // Distant roofs: solid low-contrast shapes, in the same scene, no transparency ghosts.
  for(let x=-80;x<WORLD_W+100;x+=range(105,165)){const w=range(100,193),t=range(490,640);building(x,t,w,range(115,205),.4,rand()>.6?2:1);}
  atmosphericBand(465,350,.23);
  for(let x=60;x<WORLD_W;x+=range(235,390)){const w=range(240,390),t=range(557,658);building(x,t,w,range(195,300),.72,rand()>.46?2:1);}
  // Far timber walkways connect building feet. They never cross the flight corridor.
  for(let x=-30;x<WORLD_W;x+=360){rail(x,760+Math.sin(x*.003)*30,400,.55,.5);rect(x,766+Math.sin(x*.003)*30,400,7,'#1b3541');}
  atmosphericBand(625,270,.16);
  // Middle street: grounded posts, narrow banners, warmly lit market counters.
  for(const [x,y,w] of [[-100,666,310],[315,691,320],[790,650,380],[1230,710,270],[1760,673,300],[2140,640,400],[2675,724,235],[3040,676,375],[3500,709,270],[3940,680,330],[4400,649,415],[4860,734,235]])stall(x,y,w);
  // Varied structural landmarks break repetition across the three-screen study.
  const landmarks=[{x:-324,y:-35,w:600,h:1000,t:3},{x:1470,y:552,w:385,h:403,t:2},{x:2880,y:546,w:420,h:416,t:2},{x:4765,y:-19,w:560,h:981,t:3}];
  for(const p of landmarks)building(p.x,p.y,p.w,p.h,1,p.t);
  for(const [x,y,b] of [[412,289,925],[1100,250,930],[1920,320,945],[2480,241,945],[3510,280,945],[4230,330,945]]){
    post(x,y-72,b,12);wood(x-30,y-40,100,8,'#142c36');banner(x+17,y-32,37,112);
    // Lower diagonal support is on the same post and rests below the play space.
    line(x,740,x+54,840,'#14262d',6);
  }
  for(const [x,y] of [[1560,349],[3040,294]]){
    post(x,y-77,917,12);wood(x-15,y-75,31,6,'#142c36');
  }
  // Each cable terminates at an existing building or one named support post.
  cable([[165,210],[412,323]],65,2,1);
  cable([[412,323],[1100,283]],87,4,1);
  cable([[1100,283],[1560,349]],64,2,1);
  cable([[1560,349],[1920,355]],66,2,1);
  cable([[1920,355],[2480,275]],92,3,1);
  cable([[2480,275],[3040,294]],75,3,1);
  cable([[3040,294],[3510,314]],76,2,1);
  cable([[3510,314],[4230,364]],78,4,1);
  cable([[4230,364],[4860,227]],91,4,1);
  // Side architecture lighting belongs to the assembled facade.
  for(const [x,y] of [[117,320],[1602,687],[3080,695],[4887,322]]){
    wood(x+25,y-47,5,45,'#0b1d24');line(x+27,y-39,x,y-23,'#091b23',4);
    line(x,y-23,x,y+3,'#0a1a21',2);line(x+27,y-16,x,y-23,'#13272e',2);
    lantern(x,y,112,1);glow(x,y+57,130,'224,143,63',.10);
  }
  for(const [sx,sy] of [[575,805],[2170,814],[3700,805],[4540,809]]){
    for(let i=0;i<18;i++)glow(sx+Math.sin(i*.65)*11,sy-i*4,12+i*.7,'143,151,137',.057);
    glow(sx,sy+8,87,'235,148,60',.18);
    wood(sx-26,sy+22,54,30,'#0d2029');
    for(let i=0;i<12;i++){const xx=sx+range(-19,20),yy=sy+range(8,21);rect(xx,yy,range(2,4),range(2,5),rand()>.5?'#e49d48':'#996238');}
    ctx.beginPath();ctx.ellipse(sx,sy+10,29,6,0,0,Math.PI*2);ctx.strokeStyle='#17282e';ctx.lineWidth=4;ctx.stroke();
  }
  // Ground traffic, carts, stacked crates and water jars provide market detail.
  for(let x=10;x<WORLD_W;x+=range(45,95))person(x,range(850,912),range(.8,1.3));
  for(const x of [240,975,1980,2680,3650,4540])asset('cart',x,790,140,116,false,'rgba(4,20,28,.24)');
  for(let x=190;x<WORLD_W;x+=range(160,280)){
    const y=range(865,907);wood(x,y-24,48,29,'#13242b');wood(x+7,y-48,36,24,'#10232c');line(x+3,y-20,x+44,y-1,'#29363b',2);
  }
  // Foreground architecture occludes by opaque surfaces; no faded whole scene.
  for(const [x,y,w] of [[1600,815,540],[3260,825,510]]){
    if(y<100){roof(x,y,w,180,1);wood(x+44,y+180,18,900-y,'#061820');}
    else {roof(x,y,w,125,1);rect(x+60,y+113,w-120,200,'#071922');}
  }
  for(let x=-30;x<WORLD_W;x+=range(290,410)){
    const y=range(908,930);rail(x,y,range(225,350),1.12,1);wood(x,y+5,280,16,'#071921');
  }
  const floor=ctx.createLinearGradient(0,865,0,941);floor.addColorStop(0,'rgba(3,12,18,0)');floor.addColorStop(1,'rgba(3,12,18,.95)');ctx.fillStyle=floor;ctx.fillRect(0,865,WORLD_W,76);
  // A small film grain unifies code surfaces and raster material.
  ctx.save();ctx.globalCompositeOperation='soft-light';ctx.fillStyle=ctx.createPattern(noisePattern(),'repeat');ctx.fillRect(0,0,WORLD_W,WORLD_H);ctx.restore();
}
const worlds={};
let cameraX=0,playing=false,lastTime=0,showRoute=false,playbackDirection=1;
const view=$('#view'),position=$('#position');
function maxCamera(){return Math.max(0,WORLD_W-WORLD_H*view.width/view.height);}
function paint(){
  const c=view.getContext('2d'),worldVisible=WORLD_H*view.width/view.height;
  cameraX=Math.max(0,Math.min(cameraX,maxCamera()));
  c.clearRect(0,0,view.width,view.height);c.drawImage(worlds.full,cameraX,0,worldVisible,WORLD_H,0,0,view.width,view.height);
  if(showRoute){c.save();c.scale(view.height/WORLD_H,view.height/WORLD_H);c.translate(-cameraX,0);c.strokeStyle='rgba(224,191,116,.65)';c.setLineDash([6,10]);c.lineWidth=2;c.beginPath();for(let x=0;x<=WORLD_W;x+=20){const y=435+Math.sin(x/430)*17;x?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();c.restore();}
  position.max=Math.round(maxCamera());position.value=Math.round(cameraX);
  $('#progress').textContent=`${Math.round(cameraX/maxCamera()*100)||0}%`;
  window.previewInfo={worldWidth:WORLD_W,worldHeight:WORLD_H,cameraX,maxCameraX:maxCamera(),completePanoramaInputs:0,sceneLayers:['existing-sky','code-architecture','atomic-materials'],playing,view:[view.width,view.height],runtimeIntegrated:false};
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
