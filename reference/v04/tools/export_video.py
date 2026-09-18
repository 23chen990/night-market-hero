"""Render a 14s force comparison using the actual HTML renderer and physics ticks.
24 fps, 5 physics ticks per video frame (1/120s solver). Not real-time device footage.
Requires ffmpeg, Playwright, Chromium. No source full-scene image is loaded.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,base64,json,shutil,os
R=Path(__file__).resolve().parents[1];FPS=24;SECONDS=14;W,H=1280,720
out=R/'exports/market-v04-grapple-preview.mp4'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':1040});page.set_content((R/'index.html').read_text());page.wait_for_function('window.DEMO_READY');page.evaluate('demo.setRAF(false);demo.sim.time=0;demo.sim.tick=0;demo.state.ambientTime=0;demo.trial("lantern")')
 proc=subprocess.Popen(['ffmpeg','-y','-v','error','-f','image2pipe','-vcodec','png','-framerate',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(out)],stdin=subprocess.PIPE)
 samples=[]
 try:
  for i in range(FPS*SECONDS):
   if i==FPS*7:page.evaluate('demo.trial("beam")')
   elif i:page.evaluate('demo.stepFrames(5)')
   data=page.evaluate('()=>demo.exportPNG(1280,720,{cameraX:0,debug:false,labels:true})')
   proc.stdin.write(base64.b64decode(data.split(',')[1]))
   if i%48==0:
    samples.append(page.evaluate('demo.sim.snapshot()'));print('Rendered',i,'/',FPS*SECONDS,flush=True)
 finally:proc.stdin.close()
 code=proc.wait();b.close()
 if code:raise SystemExit(code)
(R/'exports/video-method.json').write_text(json.dumps({'file':out.name,'size':[W,H],'fps':FPS,'seconds':SECONDS,'physicsStep':1/120,'ticksPerVideoFrame':5,'chapters':[{'from':0,'to':7,'station':'elastic lantern cable'},{'from':7,'to':14,'station':'fixed beam'}],'releaseAtSecondsInEachTrial':1.25,'source':'actual v04 HTML + same physics solver; deterministic initial-state resets at chapter boundary, no trajectory keyframes','not':'real-time screen recording, infinite route demonstration, or phone performance evidence','samples':samples},ensure_ascii=False,indent=2))
print(out,out.stat().st_size)
