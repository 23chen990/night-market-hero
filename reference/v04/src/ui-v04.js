/* Standalone offline UI. Asset data is embedded; no CDN, external network or modules.
 * RAF accumulates fixed ticks; visibility changes pause instead of catching up.
 */
'use strict';
(async()=>{
const $=id=>document.getElementById(id),clamp=window.NightGrapple.clamp;
try{
 const images={};await Promise.all(Object.entries(window.COMPONENT_DATA).map(([id,src])=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{images[id]=im;ok();};im.onerror=()=>no(Error('素材读取失败 '+id));im.src=src;})));
 const scene=JSON.parse(JSON.stringify(window.SCENE_DATA)),ambient=JSON.parse(JSON.stringify(window.AMBIENT_DATA));
 const sim=new window.NightGrapple.GrappleSimulation(window.GRAPPLE_DATA,scene),renderer=new window.NightMarketGrappleRenderer(scene,images,ambient,sim),canvas=$('scene');
 const state={cameraX:0,width:1672,height:941,time:0,ambientTime:0,ambient:true,timeScale:1,debug:false,follow:true,hints:true,labels:true,gameplay:true};
 let last=0,lastUi=0,rafOn=true,visibilityPaused=false,renderMs=0,frameCount=0,fps=0,fpsStart=performance.now(),keyState=new Set(),pointerAxes=new Map(),gripPointers=new Set(),drag=null;
 const maxCamera=()=>Math.max(0,scene.design.worldWidth-state.width);
 function sync(){
  const p=sim.player,a=sim.elasticAnchor,offset=Math.hypot(a.x-a.restX,a.y-a.restY);$('offset').textContent=offset.toFixed(1);$('attached').textContent=p.attached?sim.anchor(p.attached).label:sim.pending?'发钩中':'未挂住';$('length').textContent=p.attached?Math.round(p.ropeLength):'—';$('motion').textContent=sim.paused?'已暂停':p.ground?'已落脚':p.attached?'摆荡中':p.vy<0?'腾空中':'下落中';
  $('pause').textContent=sim.paused?'继续':'暂停';$('release').disabled=!p.attached&&!sim.pending;$('grip').textContent=p.attached?'松开 · 脱钩':'按住 · 挂住';
  $('mode-label').textContent=(sim.station==='beam'?'横梁挂点':'灯绳挂点')+(sim.autoTrial?' · 受力演示':' · 自由操作')+(sim.locked?' / 锁定对照':'');
  $('trial').textContent=sim.autoTrial?'重看一次':'看一次受力';$('camera').max=maxCamera();$('camera').value=state.cameraX;$('camera-value').textContent=Math.round(state.cameraX);
  document.querySelectorAll('[data-station]').forEach(b=>b.classList.toggle('selected',b.dataset.station===sim.station));
  let msg='按住挂点或「挂住」起跳发钩；松开脱钩，左右可助摆。';const m=sim.message;
  if(sim.paused)msg=visibilityPaused?'离开页面时已暂停；点「继续」恢复。':'已暂停：可以检查当前绳形与挂点位置。';
  else if(sim.autoTrial)msg=sim.autoTrial.released?'已松手：观察灯绳回位与灯笼余振。':'受力演示：挂点随人物重量下沉，1.25 秒时松手。';
  else if(m&&sim.time-m.time<2.2){const messages={rescue:'已安全复位。靠近挂点再起跳，或用 Q 收短钩锁。',finish:'已落在右侧木台。可以回摆，或重新就位。','out-of-range':'挂点太远或不在上方，请先靠近。',release:'已脱钩：保留当前速度，灯绳独立回弹。',attach:'已挂住。左右助摆，Q / E 调整绳长。','trial-end':'本次受力演示结束，可自由操作或换挂点对照。'};msg=messages[m.type]||msg;}
  $('context').textContent=msg;
 }
 function draw(){const start=performance.now();const m=renderer.render(canvas,state.cameraX,{width:state.width,height:state.height,time:state.ambientTime,people:state.ambient,boats:state.ambient,wind:state.ambient,water:state.ambient,debug:state.debug,hints:state.hints,labels:state.labels,gameplay:state.gameplay});renderMs=performance.now()-start;return m;}
 function resize(){const r=$('stage').getBoundingClientRect();if(r.width<1||r.height<1)return;state.width=Math.min(3344,Math.round(r.width/r.height*941));state.cameraX=clamp(state.cameraX,0,maxCamera());if(state.width<1300)state.cameraX=clamp(sim.player.x-state.width*.45,0,maxCamera());draw();sync();}
 new ResizeObserver(resize).observe($('stage'));resize();
 function updateInputs(){sim.input.axis=clamp((keyState.has('KeyD')||keyState.has('ArrowRight')?1:0)-(keyState.has('KeyA')||keyState.has('ArrowLeft')?1:0)+[...pointerAxes.values()].reduce((a,b)=>a+b,0),-1,1);sim.input.reel=(keyState.has('KeyQ')?1:0)-(keyState.has('KeyE')?1:0);}
 function advance(dt){updateInputs();if(!sim.paused){sim.advance(dt*state.timeScale);if(state.ambient)state.ambientTime+=Math.min(dt,.1)*state.timeScale;
  if(state.follow){const target=clamp(sim.player.x-state.width*.43,0,maxCamera());state.cameraX+=(target-state.cameraX)*(1-Math.exp(-dt*3.5));}
 }state.time=sim.time;}
 function loop(now){if(!rafOn)return;const dt=last?Math.max(0,(now-last)/1000):0;last=now;if(!document.hidden){advance(dt);draw();frameCount++;if(now-fpsStart>=1000){fps=1000*frameCount/(now-fpsStart);frameCount=0;fpsStart=now;}if(now-lastUi>95){sync();lastUi=now;}}requestAnimationFrame(loop);}requestAnimationFrame(loop);
 function manual(){sim.autoTrial=null;}
 function clearInput(){keyState.clear();pointerAxes.clear();gripPointers.clear();drag=null;document.querySelectorAll('.down').forEach(el=>el.classList.remove('down'));sim.input.axis=sim.input.reel=0;}
 function selectStation(id){visibilityPaused=false;clearInput();sim.reset(id);sim.paused=false;state.follow=true;$('follow').checked=true;state.cameraX=clamp(sim.player.x-state.width*.43,0,maxCamera());last=0;draw();sync();}
 document.querySelectorAll('[data-station]').forEach(b=>b.onclick=()=>selectStation(b.dataset.station));
 $('reset').onclick=()=>selectStation(sim.station);
 $('trial').onclick=()=>{visibilityPaused=false;clearInput();sim.beginTrial();state.follow=true;$('follow').checked=true;last=0;sync();};
 $('release').onclick=()=>{manual();sim.release();sync();};
 $('pause').onclick=()=>{sim.paused=!sim.paused;visibilityPaused=false;clearInput();last=0;sync();};
 function gripDown(id){if(sim.paused)return;manual();sim.attach(id||sim.station,true);sync();}
 function gripUp(){sim.release();sync();}
 function buttonHold(id,onDown,onUp){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();if(sim.paused)return;b.setPointerCapture(e.pointerId);b.classList.add('down');onDown(e);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,e=>{if(!b.classList.contains('down'))return;b.classList.remove('down');onUp?.(e);});}
 buttonHold('left',e=>{manual();pointerAxes.set(e.pointerId,-1);},e=>pointerAxes.delete(e.pointerId));
 buttonHold('right',e=>{manual();pointerAxes.set(e.pointerId,1);},e=>pointerAxes.delete(e.pointerId));
 buttonHold('jump',()=>{manual();sim.jump();});
 buttonHold('grip',e=>{gripPointers.add(e.pointerId);gripDown();},e=>{gripPointers.delete(e.pointerId);gripUp();});
 document.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
  const keys=['KeyA','KeyD','ArrowLeft','ArrowRight','KeyW','ArrowUp','KeyQ','KeyE','Space','KeyR','KeyP'];if(!keys.includes(e.code))return;e.preventDefault();if(e.repeat)return;
  if(e.code==='KeyP'){$('pause').click();return;}if(e.code==='KeyR'){$('reset').click();return;}if(sim.paused)return;keyState.add(e.code);manual();
  if(e.code==='KeyW'||e.code==='ArrowUp')sim.jump();if(e.code==='Space')gripDown();
 });
 document.addEventListener('keyup',e=>{if(keyState.has(e.code)){e.preventDefault();keyState.delete(e.code);if(e.code==='Space')gripUp();}});
 function worldPoint(e){const r=canvas.getBoundingClientRect();return{x:state.cameraX+(e.clientX-r.left)*state.width/r.width,y:(e.clientY-r.top)*941/r.height};}
 canvas.addEventListener('pointerdown',e=>{if(sim.paused)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);const q=worldPoint(e);let a=[...sim.anchors].sort((a,b)=>Math.hypot(a.x-q.x,a.y-q.y)-Math.hypot(b.x-q.x,b.y-q.y))[0];const r=canvas.getBoundingClientRect(),hit=48*941/r.height;
  if(Math.hypot(a.x-q.x,a.y-q.y)<hit){gripPointers.add(e.pointerId);gripDown(a.id);}else{state.follow=false;$('follow').checked=false;drag={id:e.pointerId,clientX:e.clientX,cameraX:state.cameraX};}
 });
 canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const r=canvas.getBoundingClientRect();state.cameraX=clamp(drag.cameraX-(e.clientX-drag.clientX)*state.width/r.width,0,maxCamera());});
 for(const k of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(k,e=>{if(gripPointers.delete(e.pointerId))gripUp();if(drag?.id===e.pointerId)drag=null;});
 for(const k of ['stiffness','damping','maxOffset'])$(k).oninput=e=>{sim.setElastic({[k]:Number(e.target.value)});$(k+'-value').textContent=e.target.value;};
 $('timeScale').oninput=e=>{state.timeScale=Number(e.target.value);$('timeScale-value').textContent=state.timeScale+'×';};
 $('locked').onchange=e=>{sim.setLocked(e.target.checked);sim.reset(sim.station);sync();};
 $('preset').onclick=()=>{sim.setElastic(window.GRAPPLE_DATA.elastic);for(const k of ['stiffness','damping','maxOffset']){$(k).value=sim.elastic[k];$(k+'-value').textContent=sim.elastic[k];}sim.setLocked(false);$('locked').checked=false;sim.reset(sim.station);sync();};
 for(const k of ['debug','follow','ambient','hints','labels','gameplay'])$(k).onchange=e=>{state[k]=e.target.checked;draw();};
 $('camera').oninput=e=>{state.follow=false;$('follow').checked=false;state.cameraX=Number(e.target.value);draw();sync();};
 $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch(e){$('notice').textContent='浏览器未允许全屏，页面内仍可操作。';}};
 document.addEventListener('fullscreenchange',()=>{setTimeout(resize,30);$('fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏';});
 function pauseForVisibility(){clearInput();sim.paused=true;sim.accumulator=0;last=0;visibilityPaused=true;sync();}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseForVisibility();else{last=0;sync();}});
 window.addEventListener('blur',()=>{clearInput();});
 function blobDownload(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
 function exportFrame(width=1672,height=941,opt={}){const cv=document.createElement('canvas');renderer.render(cv,opt.cameraX??state.cameraX,{width,height,time:state.ambientTime,people:state.ambient,boats:state.ambient,wind:state.ambient,water:state.ambient,gameplay:true,hints:true,labels:false,debug:state.debug,...opt});return cv;}
 $('export-frame').onclick=()=>exportFrame().toBlob(b=>b&&blobDownload(b,'night-market-grapple-v04.png'),'image/png');
 $('export-state').onclick=()=>blobDownload(new Blob([JSON.stringify({sceneVersion:scene.version,config:sim.config,liveElastic:sim.elastic,viewer:state,physics:sim.snapshot()},null,2)],{type:'application/json'}),'night-market-grapple-v04-state.json');
 window.demo={renderer,sim,state,scene,ambient,images,canvas,draw,resize,sync,
  setRunning(v){sim.paused=!v;last=0;sync();},
  setRAF(v){rafOn=!!v;last=0;if(v)requestAnimationFrame(loop);},
  stepFrames(n=1){const was=sim.paused;sim.paused=false;for(let i=0;i<n;i++){sim.step();if(state.ambient)state.ambientTime+=sim.cfg.fixedStep;}sim.paused=was;state.time=sim.time;draw();sync();return sim.snapshot();},
  trial(id='lantern'){sim.beginTrial(id);draw();sync();return sim.snapshot();},
  setCamera(x){state.follow=false;state.cameraX=clamp(x,0,maxCamera());draw();sync();},
  exportPNG(w=1672,h=941,opt={}){return exportFrame(w,h,opt).toDataURL('image/png');},
  getMetrics(){return{fps,renderMs,caches:renderer.caches.length+(renderer.platformCache?1:0),cacheRevision:renderer.cacheRevision,physics:sim.snapshot()};},
  selectStation,pauseForVisibility
 };
 $('loading').hidden=true;window.DEMO_READY=true;draw();sync();
}catch(e){$('loading').hidden=false;$('loading').textContent='样片未能载入：'+e.message;window.DEMO_ERROR=String(e);console.error(e);}
})();
