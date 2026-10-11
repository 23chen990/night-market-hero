import json,pathlib,subprocess,re,hashlib
from PIL import Image,ImageDraw
root=pathlib.Path(__file__).resolve().parent;ff='/Users/kker/Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac'
for label,device in [('attempt-2-observed','desktop'),('attempt-2-mobile','mobile-landscape')]:
 d=json.load(open(root/label/f'{device}-trace.json'));out=root/'ui-current'/device;out.mkdir(parents=True,exist_ok=True)
 info=subprocess.run([ff,'-hide_banner','-i',d['videoPath']],capture_output=True,text=True).stderr
 m=re.search(r'Duration: (\d+):(\d+):(\d+(?:\.\d+)?)',info);duration=int(m[1])*3600+int(m[2])*60+float(m[3]);step=max(1,int(duration/24));frames=[]
 for t in range(1,int(duration),step):
  p=out/f'{t:03d}s.png';subprocess.run([ff,'-hide_banner','-loglevel','error','-ss',str(t),'-i',d['videoPath'],'-frames:v','1','-update','1','-y',str(p)],check=True)
  frames.append({'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'videoPtsSeconds':t})
 cols=5;tw=338;im=Image.open(frames[0]['path']);th=round(im.height*tw/im.width);sheet=Image.new('RGB',(cols*tw,((len(frames)+cols-1)//cols)*(th+24)),'#222');draw=ImageDraw.Draw(sheet)
 for i,f in enumerate(frames):
  im=Image.open(f['path']);im.thumbnail((tw,th));x=i%cols*tw;y=i//cols*(th+24);sheet.paste(im,(x,y));draw.text((x+5,y+th+3),str(f['videoPtsSeconds'])+'s',fill='white')
 sheet.save(out/'contact.jpg');json.dump({'buildHash':d['buildHash'],'videoPath':d['videoPath'],'trace':str(root/label/f'{device}-trace.json'),'frames':frames},open(out/'manifest.json','w'),indent=2)
 print(device,duration,len(frames))
