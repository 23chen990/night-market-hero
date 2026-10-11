import json, pathlib, subprocess,hashlib,os
from PIL import Image,ImageDraw
root=pathlib.Path(__file__).resolve().parent; ff='/Users/kker/Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac'
for label,device in [('attempt-1','mobile-landscape'),('attempt-1','desktop')]:
 label=os.environ.get('QA_LABEL',label)
 a=json.load(open(root/label/f'{device}-trace.json'));s=a['samples']; first=next(x for x in s if x['phase']);t=(first['wallTimeMs']-a['recordingStartedAt'])/1000
 out=root/os.environ.get('FRAME_LABEL','frame-review')/device;out.mkdir(exist_ok=True,parents=True)
 start=max(0,t-0.65)
 subprocess.run([ff,'-hide_banner','-loglevel','error','-ss',str(start),'-i',a['videoPath'],'-t','1.8','-y',str(out/'%03d.png')],check=True)
 fs=sorted(out.glob('*.png'));cols=5;tw=338
 im=Image.open(fs[0]);th=round(im.height*tw/im.width)
 sheet=Image.new('RGB',(cols*tw,((len(fs)+cols-1)//cols)*(th+24)), '#222222');d=ImageDraw.Draw(sheet)
 for i,p in enumerate(fs):
  im=Image.open(p);im.thumbnail((tw,th));x=(i%cols)*tw;y=(i//cols)*(th+24);sheet.paste(im,(x,y));d.text((x+5,y+th+4),f'{device} {start+i/25:.3f}s #{i+1}',fill='white')
 sheet.save(out/'contact.jpg')
 json.dump({'video':a['videoPath'],'trace':str(root/label/f'{device}-trace.json'),'firstPhaseWallOffset':t,'extractionStartSeconds':start,'fps':25,'frames':[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in fs],'note':'Video PTS is independent of wallTime; phase identity requires pixel review.'},open(out/'extraction.json','w'),indent=2)
 print(device,t,len(fs))
