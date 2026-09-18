/* v04 fixed-step, bounded two-body tether study. No background-pixel collision.
 * Player position is a chest/root mass; the visible hand lies `reach` units toward
 * the SAME anchor used by the unilateral distance constraint. Elastic anchor is a
 * mass on a damped return spring, NOT a pre-authored sine animation.
 * Pure JS: also runs in Node for repeatable numerical tests. Not a Phaser replacement.
 */
'use strict';
(function(root){
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
class GrappleSimulation{
 constructor(config,scene){
  this.config=JSON.parse(JSON.stringify(config));this.scene=scene;this.cfg=this.config.physics;
  this.elastic={...this.config.elastic};this.cable=scene.objects.find(o=>o.id===this.elastic.cableId);
  if(!this.cable)throw Error('Missing authored cable');
  this.anchors=this.config.anchors.map(a=>{const q=a.type==='elastic'?this.restCablePoint(a.t):a;return{...a,x:q.x,y:q.y,restX:q.x,restY:q.y,vx:0,vy:0,oldX:q.x,oldY:q.y};});
  this.time=0;this.tick=0;this.accumulator=0;this.paused=false;this.station='lantern';this.input={axis:0,reel:0};
  this.metrics={maxOffset:0,maxConstraintError:0,maxSpeed:0,rescues:0,attaches:0,releases:0,landings:0,droppedSeconds:0};
  this.events=[];this.trail=[];this.lampStates=(this.cable.lanterns||[]).map(l=>({t:l.t,angle:0,omega:0,lastX:this.restCablePoint(l.t).x,lastY:this.restCablePoint(l.t).y,lastVx:0,lastVy:0}));
  this.reset('lantern');
 }
 restCablePoint(t){const c=this.cable;return{x:lerp(c.x1,c.x2,t),y:lerp(c.y1,c.y2,t)+4*c.sag*t*(1-t)};}
 get elasticAnchor(){return this.anchors.find(a=>a.type==='elastic');}
 anchor(id){return this.anchors.find(a=>a.id===id);}
 get hand(){const p=this.player,a=p.attached?this.anchor(p.attached):null;if(a){const dx=a.x-p.x,dy=a.y-p.y,d=Math.hypot(dx,dy)||1;return{x:p.x+dx/d*this.cfg.reach,y:p.y+dy/d*this.cfg.reach};}return{x:p.x+12*p.facing,y:p.y-7};}
 emit(type,data={}){this.events.push({type,time:this.time,...data});if(this.events.length>100)this.events.shift();this.message={type,time:this.time,...data};}
 reset(id=this.station,trial=false){
  this.station=id;const s=this.config.stations[id];if(!s)throw Error('Unknown station');const plat=this.config.platforms.find(p=>p.id===s.platform);
  for(const a of this.anchors){a.x=a.restX;a.y=a.restY;a.oldX=a.x;a.oldY=a.y;a.vx=a.vy=0;}
  this.player={x:s.x,y:plat.y-this.cfg.footOffset,oldX:s.x,oldY:plat.y-this.cfg.footOffset,vx:0,vy:0,facing:1,ground:plat.id,attached:null,ropeLength:0,tension:0,walkDistance:0,releaseAge:9,landAge:9};
  this.pending=null;this.trail=[];this.input.axis=0;this.input.reel=0;this.autoTrial=null;this.accumulator=0;
  for(const l of this.lampStates){const q=this.restCablePoint(l.t);Object.assign(l,{angle:0,omega:0,lastX:q.x,lastY:q.y,lastVx:0,lastVy:0});}
  if(trial){const a=this.anchor(id),t=this.config.trial[id],r=t.radius;this.player.x=a.x+Math.sin(t.angle)*r;this.player.y=a.y+Math.cos(t.angle)*r;this.player.oldX=this.player.x;this.player.oldY=this.player.y;this.player.ground=null;this.attach(id,false);}
  this.emit(trial?'trial-ready':'reset',{id});
 }
 beginTrial(id=this.station){this.reset(id,true);this.paused=false;this.autoTrial={id,start:this.time,released:false,duration:6.5};this.emit('trial',{id});}
 jump(){const p=this.player;if(!p.ground)return false;p.ground=null;p.vy=-this.cfg.jumpSpeed;p.landAge=9;this.emit('jump');return true;}
 attach(id=this.station,launch=true){
  const p=this.player,a=this.anchor(id);if(!a)return false;const d=Math.hypot(p.x-a.x,p.y-a.y);
  if(d>this.cfg.maxGrapple||a.y>p.y-12){this.emit('out-of-range',{id});return false;}
  if(p.attached===id)return true;
  if(p.attached)this.release();
  if(launch&&p.ground){this.jump();p.vx+=p.facing*65;this.pending={id,remaining:.22};this.emit('launch',{id});return true;}
  p.attached=id;p.ropeLength=clamp(d-this.cfg.reach,this.cfg.minRope,this.cfg.maxGrapple-this.cfg.reach);p.tension=0;p.ground=null;p.releaseAge=9;this.pending=null;this.metrics.attaches++;this.emit('attach',{id});return true;
 }
 release(){this.pending=null;const p=this.player;if(!p.attached)return false;const id=p.attached;p.attached=null;p.tension=0;p.releaseAge=0;this.metrics.releases++;this.emit('release',{id});return true;}
 setElastic(values){for(const k of ['stiffness','damping','maxOffset'])if(Number.isFinite(values[k]))this.elastic[k]=values[k];this.elastic.stiffness=clamp(this.elastic.stiffness,28,160);this.elastic.damping=clamp(this.elastic.damping,2,28);this.elastic.maxOffset=clamp(this.elastic.maxOffset,18,70);}
 setLocked(v){this.locked=!!v;const a=this.elasticAnchor;a.x=a.restX;a.y=a.restY;a.vx=a.vy=0;}
 cablePoint(t){
  const q=this.restCablePoint(t),a=this.elasticAnchor,u=this.elastic.attachT;
  // Authored continuous sag + continuous influence function. Both supports remain
  // EXACTLY fixed and at t=u it reaches the physical moving knot exactly.
  const b=t<=u?t/u:(1-t)/(1-u);const f=Math.sin(clamp(b,0,1)*Math.PI/2);
  return{x:q.x+(a.x-a.restX)*f,y:q.y+(a.y-a.restY)*f};
 }
 advance(seconds){
  if(this.paused||!Number.isFinite(seconds)||seconds<=0)return;
  const accepted=Math.min(seconds,.1);this.metrics.droppedSeconds+=seconds-accepted;this.accumulator+=accepted;
  const dt=this.cfg.fixedStep;while(this.accumulator+1e-12>=dt){this.step(dt);this.accumulator-=dt;}
 }
 step(dt=this.cfg.fixedStep){
  if(this.paused)return;this.time+=dt;this.tick++;const p=this.player,g=this.cfg,a=this.elasticAnchor;
  const trial=this.autoTrial;
  if(trial){this.input.axis=0;this.input.reel=0;const t=this.time-trial.start;if(t>this.config.trialReleaseSeconds&&!trial.released){this.release();trial.released=true;}if(t>trial.duration){this.autoTrial=null;this.emit('trial-end');}}
  if(this.pending){this.pending.remaining-=dt;if(this.pending.remaining<=0){const id=this.pending.id;this.pending=null;this.attach(id,false);}}
  p.oldX=p.x;p.oldY=p.y;a.oldX=a.x;a.oldY=a.y;p.releaseAge+=dt;p.landAge+=dt;
  let axis=clamp(this.input.axis,-1,1);if(axis)p.facing=axis<0?-1:1;
  if(p.ground){p.vx+=axis*g.groundAcceleration*dt;p.vx*=Math.exp(-(axis?2.5:13)*dt);p.vx=clamp(p.vx,-g.maxRunSpeed,g.maxRunSpeed);}
  else{p.vx+=axis*g.airAcceleration*dt;p.vx*=Math.exp(-.12*dt);}
  p.vy+=g.gravity*dt;p.vx=clamp(p.vx,-g.maxAirSpeed,g.maxAirSpeed);p.vy=clamp(p.vy,-950,950);
  if(this.locked){a.x=a.restX;a.y=a.restY;a.vx=a.vy=0;}
  else{const e=this.elastic,dx=a.x-a.restX,dy=a.y-a.restY;
   a.vx+=(-e.stiffness*dx-e.damping*a.vx)/e.mass*dt;a.vy+=(-e.stiffness*dy-e.damping*a.vy)/e.mass*dt;
   a.x+=a.vx*dt;a.y+=a.vy*dt;
  }
  p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.attached&&this.input.reel)p.ropeLength=clamp(p.ropeLength-this.input.reel*g.reelSpeed*dt,g.minRope,g.maxGrapple-g.reach);
  let ropeCorrection=0,hit=null;
  // Project constraints together, so a platform contact doesn't stretch the tether.
  for(let iter=0;iter<g.iterations;iter++){
   if(p.attached){const q=this.anchor(p.attached),dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy)||1,C=d-(p.ropeLength+g.reach);
    if(C>0){const wa=q.type==='elastic'&&!this.locked?1/this.elastic.mass:0,wp=1/g.playerMass,s=wp+wa;
     p.x-=dx/d*C*wp/s;p.y-=dy/d*C*wp/s;q.x+=dx/d*C*wa/s;q.y+=dy/d*C*wa/s;ropeCorrection+=C/s;
    }
   }
   if(!this.locked){const e=this.elastic,dx=a.x-a.restX,dy=a.y-a.restY,rx=e.maxOffset*e.horizontalLimitRatio,ry=e.maxOffset,n=Math.hypot(dx/rx,dy/ry);if(n>1){a.x=a.restX+dx/n;a.y=a.restY+dy/n;}}
   for(const f of this.config.platforms){const crossed=p.oldY+g.footOffset<=f.y+1.5&&p.y+g.footOffset>=f.y&&p.x>=f.x-5&&p.x<=f.x+f.w+5;if(crossed){p.y=f.y-g.footOffset;hit=f;}}
  }
  p.vx=(p.x-p.oldX)/dt;p.vy=(p.y-p.oldY)/dt;
  if(!this.locked){a.vx=(a.x-a.oldX)/dt;a.vy=(a.y-a.oldY)/dt;}
  if(hit){if(!p.ground){this.metrics.landings++;p.landAge=0;this.emit(hit.id==='finish'?'finish':'land',{platform:hit.id});}p.ground=hit.id;p.vy=0;}else p.ground=null;
  if(p.attached){const q=this.anchor(p.attached),d=Math.hypot(p.x-q.x,p.y-q.y),err=Math.max(0,d-p.ropeLength-g.reach);this.metrics.maxConstraintError=Math.max(this.metrics.maxConstraintError,err);const f=ropeCorrection/(dt*dt);p.tension=lerp(p.tension,f,1-Math.exp(-22*dt));}else p.tension=0;
  p.walkDistance+=Math.abs(p.x-p.oldX);if(Math.abs(p.vx)>18)p.facing=p.vx<0?-1:1;
  // Small pendula driven by support acceleration. Their pivots are cablePoint(t).
  for(const l of this.lampStates){const q=this.cablePoint(l.t),vx=(q.x-l.lastX)/dt,vy=(q.y-l.lastY)/dt;
   const ax=clamp((vx-l.lastVx)/dt,-4200,4200),ay=clamp((vy-l.lastVy)/dt,-3000,3000),len=65;
   const acc=-(870+ay)/len*Math.sin(l.angle)-ax/len*Math.cos(l.angle)-1.6*l.omega;
   l.omega+=acc*dt;l.angle=clamp(l.angle+l.omega*dt,-.36,.36);
   Object.assign(l,{lastX:q.x,lastY:q.y,lastVx:vx,lastVy:vy});
  }
  const off=Math.hypot(a.x-a.restX,a.y-a.restY),speed=Math.hypot(p.vx,p.vy);this.metrics.maxOffset=Math.max(this.metrics.maxOffset,off);this.metrics.maxSpeed=Math.max(this.metrics.maxSpeed,speed);
  if(this.tick%4===0&&!p.ground){this.trail.push({x:p.x,y:p.y,t:this.time});}this.trail=this.trail.filter(v=>this.time-v.t<1.6).slice(-60);
  // Safe study, not a punitive game: a missed landing resets visibly. No lives/rewards.
  if(p.y>736||p.x<g.softWorldBounds[0]-65||p.x>g.softWorldBounds[1]+65){const trialState=this.autoTrial;this.metrics.rescues++;this.reset(this.station);this.emit('rescue');if(trialState&&this.time-trialState.start<6.5){trialState.released=true;this.autoTrial=trialState;}}
  if(![p.x,p.y,p.vx,p.vy,a.x,a.y,a.vx,a.vy].every(Number.isFinite))throw Error('Non-finite physics state');
 }
 snapshot(){const a=this.elasticAnchor,p=this.player;return{time:this.time,tick:this.tick,station:this.station,paused:this.paused,player:{...p},hand:this.hand,anchors:this.anchors.map(v=>({...v})),elastic:{...this.elastic,locked:!!this.locked,dx:a.x-a.restX,dy:a.y-a.restY,offset:Math.hypot(a.x-a.restX,a.y-a.restY)},metrics:{...this.metrics},trial:this.autoTrial?{...this.autoTrial}:null,message:this.message};}
}
root.NightGrapple={GrappleSimulation,clamp,lerp};if(typeof module!=='undefined'&&module.exports)module.exports=root.NightGrapple;
})(typeof window!=='undefined'?window:globalThis);
