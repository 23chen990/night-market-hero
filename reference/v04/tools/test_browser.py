"""Chromium functional checks using the EXACT built offline HTML as document content.
file:// navigation is administratively blocked in this container; no file-scheme
compatibility conclusion is inferred. CSS viewport emulation is NOT a phone test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,base64,time
from PIL import Image
R=Path(__file__).resolve().parents[1]
report={'scope':'Built standalone HTML rendered in headless Chromium via set_content. Not target phone / Phaser / mini-game integration.','checks':[],'errors':[],'network_requests':[],'screens':[]}
def check(name,fn):
 try:
  v=fn();report['checks'].append({'name':name,'pass':True,'detail':v})
 except Exception as e:
  report['checks'].append({'name':name,'pass':False,'error':str(e)})
def assert_(b,msg):
 if not b: raise AssertionError(msg)
def png(page,name,opts=None):
 data=page.evaluate('opt=>demo.exportPNG(1672,941,{cameraX:0,...opt})',opts or {})
 path=R/'exports'/name;path.write_bytes(base64.b64decode(data.split(',')[1]));Image.open(path).convert('RGB').save(path)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 report['browser']=b.version
 ctx=b.new_context(viewport={'width':1440,'height':1040},accept_downloads=True)
 page=ctx.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.on('request',lambda req:report['network_requests'].append(req.url) if req.url.startswith(('http:','https:')) else None)
 page.route('**/*',lambda route:route.abort())
 page.set_content((R/'index.html').read_text(),wait_until='load');page.wait_for_function('window.DEMO_READY || window.DEMO_ERROR',timeout=20000)
 check('Standalone build loads without network',lambda:assert_(page.evaluate('window.DEMO_READY===true'),page.evaluate('window.DEMO_ERROR || "not ready"')))
 page.evaluate('demo.setRAF(false); demo.setRunning(false)')
 def animation():
  page.locator('#trial').click();page.evaluate('demo.stepFrames(120)');s=page.evaluate('demo.sim.snapshot()');assert_(s['player']['attached']=='lantern','trial did not attach');assert_(s['elastic']['offset']>20,'no elastic load');
  png(page,'market-v04-elastic.png',{'labels':False});png(page,'market-v04-elastic-debug.png',{'debug':True,'labels':True});page.screenshot(path=str(R/'qa/browser-desktop.png'),full_page=True)
  page.evaluate('demo.stepFrames(660)');s2=page.evaluate('demo.sim.snapshot()');assert_(s2['player']['attached'] is None,'trial did not release');assert_(s2['elastic']['offset']<.3,'rebound not returned');return{'peakFrameOffset':s['elastic']['offset'],'endOffset':s2['elastic']['offset'],'landed':s2['player']['ground']}
 check('Trial attaches, deforms, releases and settles',animation)
 def fixed():
  page.locator('[data-station=beam]').click();page.locator('#trial').click();page.evaluate('demo.stepFrames(100)');s=page.evaluate('demo.sim.snapshot()');assert_(s['player']['attached']=='beam','wrong anchor');assert_(s['anchors'][0]['x']==596 and s['anchors'][0]['y']==325,'fixed anchor moved');png(page,'market-v04-fixed.png');return s['player']['attached']
 check('Fixed architectural anchor trial',fixed)
 page.locator('#settings').evaluate('(e)=>e.open=true')
 def locked():
  page.locator('[data-station=lantern]').click();page.locator('#locked').check();page.locator('#trial').click();page.evaluate('demo.stepFrames(120)');s=page.evaluate('demo.sim.snapshot()');assert_(s['elastic']['offset']<1e-8,'locked pivot moved');page.locator('#locked').uncheck();return{'offset':s['elastic']['offset']}
 check('Locked-knot comparison checkbox',locked)
 def params():
  page.locator('#stiffness').fill('80');page.locator('#stiffness').dispatch_event('input');page.locator('#damping').fill('12');page.locator('#damping').dispatch_event('input');s=page.evaluate('demo.sim.elastic');assert_(s['stiffness']==80 and s['damping']==12,'parameters not applied');page.locator('#preset').click();return s
 check('Elastic sliders apply live coefficients',params)
 def pause():
  page.locator('#trial').click();page.evaluate('demo.stepFrames(60)');page.locator('#pause').click();before=page.evaluate('demo.sim.snapshot()');page.evaluate('demo.sim.advance(5)');after=page.evaluate('demo.sim.snapshot()');assert_(before['player']==after['player'] and before['time']==after['time'],'paused state moved');page.locator('#pause').click();return{'tick':before['tick']}
 check('Pause freezes physics',pause)
 def keys():
  page.locator('[data-station=lantern]').click();page.locator('#settings').evaluate('(e)=>e.open=false');page.evaluate('document.activeElement.blur(); demo.setRAF(true)');page.keyboard.down('Space');page.wait_for_timeout(500);s=page.evaluate('demo.sim.snapshot()');assert_(s['player']['attached']=='lantern','space hold failed');page.keyboard.up('Space');page.wait_for_timeout(80);s2=page.evaluate('demo.sim.snapshot()');assert_(s2['player']['attached'] is None,'key release did not detach');page.evaluate('demo.setRAF(false)');return{'heldAnchor':s['player']['attached'],'afterKeyUp':s2['player']['attached']}
 check('Real keyboard Space hold/release controls',keys)
 def touch_controls():
  page.locator('[data-station=lantern]').click();page.evaluate('demo.setRAF(true)');grip=page.locator('#grip');bb=grip.bounding_box();page.mouse.move(bb['x']+bb['width']/2,bb['y']+bb['height']/2);page.mouse.down();page.wait_for_timeout(470);s=page.evaluate('demo.sim.snapshot()');page.mouse.up();page.wait_for_timeout(50);s2=page.evaluate('demo.sim.snapshot()');page.evaluate('demo.setRAF(false)');assert_(s['player']['attached']=='lantern','pointer hold failed');assert_(s2['player']['attached'] is None,'pointerup did not detach');return{'attached':s['player']['attached'],'released':s2['player']['attached']}
 check('Pointer control hold / pointer capture release',touch_controls)
 def hit():
  page.locator('[data-station=beam]').click();page.evaluate('demo.setRAF(true)');bb=page.locator('#scene').bounding_box();st=page.evaluate('({width:demo.state.width,camera:demo.state.cameraX,a:demo.sim.anchor("beam")})');x=bb['x']+(st['a']['x']-st['camera'])*bb['width']/st['width'];y=bb['y']+st['a']['y']*bb['height']/941;page.mouse.move(x,y);page.mouse.down();page.wait_for_timeout(450);s=page.evaluate('demo.sim.snapshot()');page.mouse.up();page.evaluate('demo.setRAF(false)');assert_(s['player']['attached']=='beam','canvas anchor hit failed');return{'hitAnchor':s['player']['attached']}
 check('Canvas architectural ring hit testing',hit)
 def lifecycle():
  page.evaluate('demo.trial("lantern");demo.stepFrames(100);demo.pauseForVisibility()');s=page.evaluate('demo.sim.snapshot()');page.evaluate('demo.sim.advance(45)');t=page.evaluate('demo.sim.snapshot()');assert_(s['player']==t['player'] and s['time']==t['time'],'visibility pause lost state');assert_(t['player']['attached']=='lantern','anchor lost during pause');return{'preservedAttachedAnchor':t['player']['attached']}
 check('Visibility pause handler preserves attached anchor',lifecycle)
 def caches():
  page.evaluate('demo.setRunning(false)');rev=page.evaluate('demo.renderer.cacheRevision');page.evaluate('for(let i=0;i<120;i++){demo.sim.paused=false;demo.sim.step();demo.draw()}');rev2=page.evaluate('demo.renderer.cacheRevision');assert_(rev==rev2,'static caches rebuilt every frame');return{'before':rev,'after':rev2,'count':page.evaluate('demo.getMetrics().caches')}
 check('Physics updates reuse static architecture caches',caches)
 page.locator('#settings').evaluate('(e)=>e.open=true')
 def export():
  with page.expect_download() as dl:page.locator('#export-frame').click()
  file=dl.value;file.save_as(str(R/'qa/export-button-output.png'));im=Image.open(R/'qa/export-button-output.png');assert_(im.size==(1672,941),'export size wrong');
  with page.expect_download() as dl:page.locator('#export-state').click()
  dl.value.save_as(str(R/'qa/export-button-state.json'));return{'pngSize':im.size,'pngMode':im.mode}
 check('PNG and state JSON export buttons',export)
 # Viewports: layout + operation, NOT genuine touch hardware performance.
 for w,h in [(844,390),(1180,720),(390,844)]:
  def viewport(w=w,h=h):
   page.set_viewport_size({'width':w,'height':h});page.locator('#settings').evaluate('(e)=>e.open=false');page.evaluate('demo.selectStation("lantern"); demo.trial("lantern");demo.stepFrames(90);demo.sim.paused=true;demo.resize()');page.wait_for_timeout(120);page.evaluate('demo.setCamera(0);window.scrollTo(0,0)')
   overflow=page.evaluate('document.documentElement.scrollWidth>window.innerWidth+1');assert_(not overflow,'horizontal overflow');rect=page.locator('#stage').bounding_box();assert_(rect['width']>0 and rect['height']>200,'stage too small');page.screenshot(path=str(R/f'qa/browser-{w}x{h}.png'));return{'stage':rect,'designWidth':page.evaluate('demo.state.width')}
  check(f'Viewport {w}×{h} layout',viewport)
 check('No runtime JS errors or external requests',lambda:assert_(not report['errors'] and not report['network_requests'],str([report['errors'],report['network_requests']])))
 report['passed']=sum(c['pass'] for c in report['checks']);report['failed']=len(report['checks'])-report['passed'];b.close()
(R/'qa/browser-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
if report['failed']:raise SystemExit(1)
