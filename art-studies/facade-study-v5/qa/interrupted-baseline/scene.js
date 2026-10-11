/* Offline art study. Existing art owns detailed shapes; code owns simple connections. */
const W=1672,H=941;
const images={},cache=new Map(),placements=[];
const labels={nearFacade:'近处木楼试绘',midFacade:'中景门面试绘',innerEave:'完整内檐',eave:'曲檐局部',support:'复杂木支撑',beam:'牌坊横梁',scaffold:'竹架',banner:'布幡',canopy:'完整摊棚',cart:'推车',stall:'带顶摊位',lanternCable:'既有灯串',lantern:'已确认单灯笼'};
const gaps=[{x:0,y:174,w:343,h:486,label:'近处门面：代码试绘，待视觉评审'},{x:1310,y:370,w:362,h:550,label:'中景门面：代码试绘，待视觉评审'}];
const $=s=>document.querySelector(s);
let ctx,layer='full',selected=null,showGaps=false,inspect=false;
const worlds={};
function canvas(w=W,h=H){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function line(x,y,xx,yy,color='#081923',width=3){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();}
function beam(x,y,w,h,color='#071822'){rect(x,y,w,h,color);rect(x,y,Math.min(2,w),h,'rgba(52,78,90,.15)');}
function sprite(id,x,y,w,flip=false,tint=null,role='场景局部'){
  const src=images[id],h=w*src.height/src.width;
  if(layer!=='full')return h;
  let im=src;
  if(tint){const k=id+tint;if(!cache.has(k)){const c=canvas(src.width,src.height),g=c.getContext('2d');g.drawImage(src,0,0);g.globalCompositeOperation='source-atop';g.fillStyle=tint;g.fillRect(0,0,c.width,c.height);cache.set(k,c);}im=cache.get(k);}
  ctx.save();if(flip){ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(im,0,0,w,h);}else ctx.drawImage(im,x,y,w,h);ctx.restore();
  placements.push({id,x,y,w,h,flip,role});return h;
}
function glow(x,y,r,strength=.16){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(243,170,79,${strength})`);g.addColorStop(.3,`rgba(208,127,56,${strength*.36})`);g.addColorStop(1,'rgba(200,120,45,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function lamp(x,y,h,depth=false){const w=h*images.lantern.width/images.lantern.height;glow(x,y+h*.44,h*.78,depth?.06:.18);sprite('lantern',x-w/2,y,w,false,depth?'rgba(26,51,63,.35)':null,'完整灯笼与挂环');}
function rail(x,y,w,s=1,far=false){
  const color=far?'#15313d':'#06131b';beam(x,y,w,8*s,color);beam(x,y+40*s,w,7*s,color);
  for(let xx=x+10;xx<x+w;xx+=36*s){beam(xx,y-13*s,7*s,83*s,color);beam(xx-2,y-17*s,11*s,5*s,color);}
  for(let xx=x+16;xx<x+w-25;xx+=72*s)line(xx,y+6*s,xx+45*s,y+40*s,color,3*s);
}
function fog(y,h,opacity){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'rgba(42,72,86,0)');g.addColorStop(.55,`rgba(42,72,86,${opacity})`);g.addColorStop(1,'rgba(42,72,86,0)');ctx.fillStyle=g;ctx.fillRect(0,y,W,h);}
function rope(a,b,sag,stops=[]){
  const cy=Math.max(a[1],b[1])+sag;ctx.strokeStyle='#06151e';ctx.lineWidth=2.8;ctx.beginPath();ctx.moveTo(...a);ctx.quadraticCurveTo((a[0]+b[0])/2,cy,...b);ctx.stroke();
  for(const [t,h] of stops){const x=a[0]*(1-t)+b[0]*t,y=(1-t)**2*a[1]+2*(1-t)*t*cy+t*t*b[1];line(x,y,x,y+13,'#0a1d26',1.5);lamp(x,y+12,h);}
}
function canopy(x,y,w,flip=false,depth=false){
  const h=sprite('canopy',x,y,w,flip,depth?'rgba(24,49,61,.45)':'rgba(2,13,21,.34)','整张棚布及原有立柱');
  const base=y+h;beam(x+w*.13,base-30,w*.69,9,depth?'#122a34':'#091a22');
  for(let i=0;i<3;i++){const xx=x+w*(.2+i*.18);rect(xx,base-55,19,25,depth?'#1a3039':'#10212a');beam(xx-3,base-56,25,4,'#182b33');}
}
function draw(target,mode){
  ctx=target.getContext('2d');layer=mode;
  ctx.drawImage(images.sky,0,0,W,H);
  if(mode==='sky')return;
  rect(0,0,W,H,'rgba(5,22,32,.08)');
  // Far structures use existing complete stall imagery, softened locally by distance.
  for(const [x,y,w] of [[260,532,310],[668,477,345],[1065,511,320],[1395,504,390]]){
    sprite('stall',x,y,w,false,'rgba(38,65,77,.79)','雾中远处已有摊位');
  }
  for(const [x,y,w] of [[232,696,174],[919,716,167]]){
    rail(x,y,w,.45,true);
  }
  fog(398,406,.25);
  sprite('stall',1308,326,367,false,'rgba(30,55,69,.54)','中景建筑屋顶，立柱被同一门面遮挡');
  sprite('midFacade',1310,371,362,false,'rgba(35,58,70,.24)','中景门窗与拱门代码试绘');
  // Off-center timber gate. One beam owns its joinery; straight posts connect underneath.
  beam(441,242,21,483,'#142c38');beam(808,233,24,495,'#102735');
  sprite('beam',405,190,450,false,'rgba(14,36,48,.25)','跨街横梁');
  sprite('eave',340,-16,528,false,'rgba(8,27,40,.25)','跨街结构右侧曲檐，左侧接入近景屋檐');
  sprite('banner',385,306,52,false,'rgba(8,26,37,.2)','左侧悬挂布幡');
  fog(337,418,.12);
  // Several depths of complete canopies and stalls; each remains a local object.
  canopy(328,488,360,false,true);canopy(607,524,404,true,true);canopy(944,505,360,false,true);
  for(const [x,y,w] of [[209,667,245],[535,647,261],[841,657,289],[1322,651,288]])sprite('stall',x,y,w,false,'rgba(14,36,48,.35)','下层夜市完整摊位');
  fog(538,322,.09);
  // Code trial uses reference-specific irregular panels and a complete balcony structure.
  sprite('nearFacade',-43,167,374,false,null,'近处木楼门窗、挑廊及立柱代码试绘');
  sprite('nearFacade',1535,173,326,true,'rgba(0,9,16,.2)','右侧同风格临街门面');
  sprite('innerEave',-113,-145,639,false,'rgba(1,11,20,.31)','左侧近景屋檐接入木楼门面');
  sprite('support',210,446,97,true,'rgba(0,9,17,.35)','左挑廊局部连接');
  sprite('innerEave',1214,-125,584,true,'rgba(1,12,21,.39)','右侧近景屋檐接入临街门面');
  beam(1148,377,16,397,'#071722');beam(1289,225,24,613,'#05141f');
  sprite('scaffold',1119,346,205,false,'rgba(3,17,28,.27)','右侧复杂竹架');
  rail(1099,523,222,.82);beam(1096,571,463,21,'#05131c');
  line(1115,591,1298,712,'#0a1d29',13);line(1323,592,1528,697,'#0a1c27',12);
  sprite('banner',1170,281,62,false,'rgba(1,13,24,.18)','右側布幡');
  // Main rope remains simple code, each complete approved lamp has its own mount.
  rope([327,278],[1203,234],72,[[.12,64],[.36,86],[.62,62],[.83,94]]);
  line(211,207,211,238,'#071720',2);lamp(211,237,113);
  rope([993,105],[1319,59],28,[]);
  beam(662,443,7,197,'#16313b');beam(976,443,7,171,'#193340');
  line(662,453,680,453,'#102734',2);line(947,453,979,453,'#102734',2);
  sprite('lanternCable',678,453,271,false,'rgba(18,41,53,.30)','远处灯串连接两侧摊棚立柱');
  // Full canopy images extend down to the lower deck, with varying scale and overlap.
  canopy(-127,527,591,false);canopy(675,510,497,true);canopy(1201,686,633,false);
  sprite('scaffold',350,586,188,true,'rgba(7,25,35,.39)','下层木架');
  for(const [x,y,w,flip] of [[517,746,224,false],[832,771,184,true],[1003,734,201,false]])sprite('cart',x,y,w,Boolean(flip),'rgba(4,20,29,.10)','夜市推车');
  line(1038,625,1038,648,'#091c26',2);lamp(1038,648,68);
  line(407,664,407,695,'#0c2330',2);lamp(407,695,48,true);
  // Foreground deck is simple opaque geometry; it never duplicates a painted panorama.
  rail(-13,825,570,.99);rail(585,846,577,.93);rail(1171,862,518,1.04);
  beam(-10,894,1720,47,'#030c13');
  const floor=ctx.createLinearGradient(0,790,0,941);floor.addColorStop(0,'rgba(0,6,12,0)');floor.addColorStop(1,'rgba(0,5,11,.74)');ctx.fillStyle=floor;ctx.fillRect(0,790,W,151);
}
function outline(g,b,color,text){
  const x=Math.max(3,b.x),y=Math.max(4,b.y),w=Math.max(0,Math.min(W-3,b.x+b.w)-x),h=Math.max(0,Math.min(H-3,b.y+b.h)-y);
  g.strokeStyle=color;g.lineWidth=2;g.setLineDash([8,5]);g.strokeRect(x,y,w,h);g.setLineDash([]);g.font='18px sans-serif';
  const tw=g.measureText(text).width;g.fillStyle='rgba(5,19,29,.94)';g.fillRect(x,y,tw+18,32);g.fillStyle=color;g.fillText(text,x+9,y+23);
}
function paint(){
  const c=$('#view'),g=c.getContext('2d');g.clearRect(0,0,W,H);g.drawImage(worlds[layer==='sky'?'sky':'full'],0,0);
  if(layer!=='sky'&&selected)for(const b of placements.filter(p=>p.id===selected))outline(g,b,'#edc785',labels[selected]);
  if(layer!=='sky'&&showGaps)for(const b of gaps)outline(g,b,'#e8a47e',b.label);
  window.previewInfo={worldSize:[W,H],mode:layer,materialIds:Array.from(new Set(placements.map(p=>p.id))),placements,selectedMaterial:selected,selectionCount:placements.filter(p=>p.id===selected).length,showGaps,completePanoramaInputs:0,codeComplexFacades:true,facadeTechnique:'code-study',runtimeIntegrated:false};
}
function reset(){layer='full';selected=null;showGaps=false;$('#reference').hidden=true;$('#view').hidden=false;$('#compare').textContent='对照定稿';$('#compare').setAttribute('aria-pressed','false');paint();}
async function start(){
  await Promise.all(Object.entries(MATERIAL_DATA).map(([id,src])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[id]=im;resolve();};im.onerror=reject;im.src=src;})));
  for(const [id,art] of Object.entries(createFacadeArt())){images[id]=art;MATERIAL_DATA[id]=art.toDataURL('image/png');}
  for(const m of ['sky','full']){worlds[m]=canvas();draw(worlds[m],m);}
  $('#loading').hidden=true;
  for(const [id,title] of Object.entries(labels)){
    const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',title);b.className='material';
    const im=document.createElement('img');im.src=MATERIAL_DATA[id];im.alt='';const t=document.createElement('span');t.textContent=title;
    b.append(im,t);b.onclick=()=>{reset();selected=id;paint();$('#selection').textContent=`${title} · 画面中 ${window.previewInfo.selectionCount} 处`;};$('#material-grid').append(b);
  }
  $('#full').onclick=reset;
  $('#sky').onclick=()=>{reset();layer='sky';paint();};
  $('#inspect').onclick=()=>{inspect=!inspect;$('#materials').hidden=!inspect;$('#inspect').setAttribute('aria-expanded',String(inspect));};
  $('#gaps').onclick=()=>{const next=!showGaps;reset();showGaps=next;paint();};
  $('#compare').onclick=()=>{const show=$('#reference').hidden;$('#reference').hidden=!show;$('#view').hidden=show;$('#compare').textContent=show?'返回预览':'对照定稿';$('#compare').setAttribute('aria-pressed',String(show));};
  window.exportPreview=()=>worlds.full.toDataURL('image/png');
  window.exportSky=()=>worlds.sky.toDataURL('image/png');
  window.exportFacade=id=>images[id].toDataURL('image/png');
  layer='full';paint();window.previewReady=true;
}
start().catch(e=>{console.error(e);$('#loading').textContent='素材加载失败';});
