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
    assert.ok(rimPixels>=1.75&&rimPixels<=2.5,'subtle center rim must stay screen-pixel bounded');
    assert.equal(style.heroSize,150,'hero hitbox-aligned image size must not be inflated');
    assert.ok(style.heroRimAlpha>=0.5&&style.heroRimAlpha<=0.65,'rim must stay subtle behind the approved hero');
    assert.ok(style.heroOutlineOffsetPixels>=2.7&&style.heroOutlineOffsetPixels<=2.9);
    assert.ok(style.heroOutlineAlpha>=0.5&&style.heroOutlineAlpha<=0.65);
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

test('actual cyan silhouette edges are made from a Canvas-safe texture and respect every screen zoom', async () => {
  const { applyFlightSilhouetteOutlines } = await import(new URL('../src/flight-presentation.ts', import.meta.url).href);
  const image=()=>({x:0,y:0,angle:0,width:0,height:0,alpha:0,
    setPosition(x:number,y:number){this.x=x;this.y=y;return this;},
    setRotation(angle:number){this.angle=angle;return this;},
    setDisplaySize(width:number,height:number){this.width=width;this.height=height;return this;},
    setAlpha(alpha:number){this.alpha=alpha;return this;}});
  for(const viewportHeight of [320,390,720,941]) {
    const zoom=viewportHeight/941;
    const clones=[image(),image(),image(),image()];
    const player={x:850,y:560,vx:390,vy:-210};
    applyFlightSilhouetteOutlines(clones,player,zoom);
    const expected=[[-2.8,0],[2.8,0],[0,-2.8],[0,2.8]];
    for(let i=0;i<4;i++) {
      assert.ok(Math.abs((clones[i]!.x-player.x)*zoom-expected[i]![0])<0.0001);
      assert.ok(Math.abs((clones[i]!.y-player.y)*zoom-expected[i]![1])<0.0001);
      assert.equal(clones[i]!.angle,Math.atan2(player.vy,player.vx));
      assert.equal(clones[i]!.width,150);
      assert.equal(clones[i]!.height,150);
      assert.ok(clones[i]!.alpha>=0.5&&clones[i]!.alpha<=0.65);
    }
  }
  const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  assert.match(main,/createCanvas\(key, width, height\)/);
  assert.match(main,/globalCompositeOperation = 'source-in'/);
  assert.match(main,/applyFlightSilhouetteOutlines\(this\.protagonistOutlineSprites/);
  assert.match(main,/protagonist-contrast-mask/);
  assert.doesNotMatch(main,/protagonistRim = this\.add\.image\(0, 0, 'protagonist-swing'\)/,
    'Canvas fallback must not depend on ignored setTintFill on a copy of the original art');
});

// Protect the normal scene from leaving the tested socket mapper disconnected.
test('normal scene draws anchor mounts from the selected panorama transform', () => {
  const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  assert.match(main,/const anchorMapPlan = createNightCityRenderPlan\(state.seed,/);
  assert.match(main,/mapWorldAnchorToArchitecturalSocket\(anchorMapPlan, anchor\)/);
  assert.match(main,/lineBetween\(socket.x, socket.y, anchor.x, anchor.y\)/);
});
