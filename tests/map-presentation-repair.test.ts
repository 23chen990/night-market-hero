import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('default browser opts into the panorama terrain contract before restoring saves', () => {
  const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  assert.match(main,/createGrappleGame\([^\n]+terrainMode: 'panorama'/);
  assert.ok(main.indexOf("terrainMode: 'panorama'")<main.indexOf('core.restoreSnapshot'));
});

test('mobile identity has a bounded, screen-pixel cyan rim without hiding the physical hero', async () => {
  const moduleUrl=new URL('../src/flight-presentation.ts',import.meta.url);
  assert.ok(existsSync(moduleUrl),'runtime presentation policy must be shared with the renderer');
  const {flightPresentation}=await import(moduleUrl.href);
  for(const height of [390,720,941]) {
    const style=flightPresentation(height/941);
    const rimPixels=(style.heroRimSize-style.heroSize)*height/941/2;
    assert.ok(rimPixels>=3.3&&rimPixels<=3.9,'rim needs a consistent 3.6-screen-pixel silhouette edge on each display');
    assert.equal(style.heroSize,150,'hero hitbox-aligned image size must not be inflated');
    assert.ok(style.heroRimAlpha>=0.82&&style.heroRimAlpha<=0.90,'rim must be visible but may not obscure the real hero');
    assert.ok(style.idleAnchorSize<style.eligibleAnchorSize*0.7,'unselected hooks must remain secondary');
    assert.ok(style.idleAnchorAlpha<style.eligibleAnchorAlpha*0.65);
    assert.ok(style.eligibleAnchorSize*height/941>=19,'selected hook remains visible on mobile');
  }
});

test('rim and hero follow exactly the same pose through flying, back-swing and replay', async () => {
  const moduleUrl=new URL('../src/flight-presentation.ts',import.meta.url);
  assert.ok(existsSync(moduleUrl),'pose application must be part of runtime presentation');
  const {applyFlightIdentity}=await import(moduleUrl.href);
  const image=()=>({x:0,y:0,angle:0,size:0,alpha:0,setPosition(x:number,y:number){this.x=x;this.y=y;return this;},setRotation(angle:number){this.angle=angle;return this;},setDisplaySize(size:number){this.size=size;return this;},setAlpha(alpha:number){this.alpha=alpha;return this;}});
  const hero=image(),rim=image();
  for(const player of [{x:350,y:320,vx:430,vy:-80},{x:290,y:470,vx:-120,vy:240},{x:72,y:470,vx:245,vy:0}]){
    applyFlightIdentity(hero,rim,player,390/941);
    assert.equal(hero.x,player.x);assert.equal(hero.y,player.y);
    assert.equal(rim.x,hero.x);assert.equal(rim.y,hero.y);assert.equal(rim.angle,hero.angle);
    assert.ok(rim.size>hero.size);assert.equal(hero.alpha,1);
  }
});

// Protect the normal scene from leaving the tested socket mapper disconnected.
test('normal scene draws anchor mounts from the selected panorama transform', () => {
  const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  assert.match(main,/const anchorMapPlan = createNightCityRenderPlan\(state.seed,/);
  assert.match(main,/mapWorldAnchorToArchitecturalSocket\(anchorMapPlan, anchor\)/);
  assert.match(main,/lineBetween\(socket.x, socket.y, anchor.x, anchor.y\)/);
});
