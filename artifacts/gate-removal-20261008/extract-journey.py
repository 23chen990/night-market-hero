import json, pathlib, subprocess,hashlib
root=pathlib.Path(__file__).resolve().parent;ff='/Users/kker/Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac'
manifest=[]
for label,device in [('attempt-1','mobile-landscape'),('attempt-1-retest-1','desktop')]:
 a=json.load(open(root/label/f'{device}-trace.json'));s=a['samples'];out=root/'frame-review'/device
 for branch,predicate in [('open-approach',lambda x:x['levelId']=='lantern-entry' and x['x']>=2520),('open-destination',lambda x:x['levelId']=='lantern-entry' and x['x']>=2750),('patrol-checkpoint',lambda x:x['levelId']=='night-patrol' and x['segmentIndex']>=2)]:
  sample=next(x for x in s if predicate(x));seconds=(sample['wallTimeMs']-a['recordingStartedAt'])/1000
  p=out/f'{branch}.png';subprocess.run([ff,'-hide_banner','-loglevel','error','-ss',str(max(0,seconds-0.12)),'-i',a['videoPath'],'-frames:v','1','-update','1','-y',str(p)],check=True)
  manifest.append({'device':device,'branch':branch,'sourceTrace':str(root/label/f'{device}-trace.json'),'sourceVideo':a['videoPath'],'traceSample':sample,'videoOffsetSeconds':seconds-0.12,'note':'Approximate timestamp alignment; reviewer must inspect pixels for the claimed branch.','path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
json.dump(manifest,open(root/'frame-review'/'journey-extraction.json','w'),indent=2)
print('6 journey frames extracted')
