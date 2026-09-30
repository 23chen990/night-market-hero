from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw
import numpy as np
import base64, hashlib, json
O=Path(__file__).resolve().parent
R=O.parents[2]
W=R/'workspace/night-market-hero'
A=W/'src/assets/approved-runtime/environment'
assets={'sky':R/'artifacts/longmap-batch-b/rooftops.hybrid-candidate-v33-fog-minimal/generated-atmosphere-plate-v33.png','eave':A/'rooftops-curved-eave-v1.png','support':A/'rooftops-roof-support-block-v1.png','canopy':A/'stall-canopy-v1.png','lantern':A/'market-lantern-sprite-v1.png','cart':A/'pushcart-v1.png','banner':A/'blank-banner-v1.png','stall':A/'covered-alley-frame-v1.png'}
(O/'assets').mkdir(exist_ok=True)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
# Snapshot the actual game's source/config/build: preview work must leave them intact.
before=O/'qa/workspace-before.json'
if not before.exists():
 tracked={str(p.relative_to(W)):digest(p) for p in W.rglob('*') if p.is_file() and not any(q in p.parts for q in ['node_modules','.git','qa-evidence','reference-evidence','artifacts'])}
 before.write_text(json.dumps(tracked,indent=2))
manifest=[]; data={}; alpha=[]
for key,p in assets.items():
 im=Image.open(p)
 if key=='sky':
  assert digest(p)=='019f554a800caec4270161e97c188849167538f2293b4fc55f9519ca45040664'
  out=im.convert('RGB'); box=[0,0,*im.size]
 else:
  im=im.convert('RGBA'); a=im.getchannel('A')
  assert a.getextrema()[0]==0 and a.getextrema()[1]>180
  box=a.point(lambda v:255 if v>110 else 0).getbbox()
  pad=3 if key!='lantern' else 36
  box=(max(0,box[0]-pad),max(0,box[1]-pad),min(im.width,box[2]+pad),min(im.height,box[3]+pad))
  out=im.crop(box)
  if key=='canopy':
   # Keep cloth and tie points only. Street code owns the long support posts.
   out=out.crop((0,0,out.width,round(out.height*.34)))
   box=(box[0],box[1],box[2],box[1]+out.height)
  arr=np.asarray(out).copy(); arr[arr[:,:,3]<18]=0
  if key!='lantern':
   mask=Image.fromarray(arr[:,:,3]).filter(ImageFilter.MinFilter(3))
   arr[:,:,3]=np.asarray(mask)
   edge=(arr[:,:,3]>0)&(np.asarray(mask.filter(ImageFilter.MinFilter(3)))<170)
   arr[edge,:3]=np.minimum(arr[edge,:3],np.array([17,32,42]))
   arr[arr[:,:,3]==0,:3]=0
  out=Image.fromarray(arr)
  alpha.append(dict(id=key,alphaMinMax=out.getchannel('A').getextrema(),transparentPixels=int((arr[:,:,3]==0).sum()),nonzeroPixels=int((arr[:,:,3]>0).sum()),sourceMask='existing verified alpha; edge erosion on architecture copies only'))
 target=O/'assets'/f'{key}.png';out.save(target)
 data[key]='data:image/png;base64,'+base64.b64encode(target.read_bytes()).decode()
 manifest.append(dict(id=key,source=str(p),sourceSha256=digest(p),previewCopy=str(target),previewSha256=digest(target),crop=box,size=out.size))
(O/'assets-data.js').write_text('const MATERIAL_DATA = '+json.dumps(data)+';\n')
(O/'source-manifest.json').write_text(json.dumps(dict(targetGame='夜市飞侠：护印突围',workspace=str(W),completePanoramaInputs=0,assets=manifest),ensure_ascii=False,indent=2))
(O/'qa/alpha-check.json').write_text(json.dumps(alpha,indent=2))
board=Image.new('RGB',(960,220*len(alpha)),(13,22,27));d=ImageDraw.Draw(board)
for row,entry in enumerate(alpha):
 im=Image.open(O/'assets'/f"{entry['id']}.png").convert('RGBA'); im.thumbnail((300,180))
 for col,color in enumerate([(235,239,241),(6,15,25),(181,37,134)]):
  cell=Image.new('RGBA',(320,220),color+(255,));cell.alpha_composite(im,((320-im.width)//2,20));board.paste(cell.convert('RGB'),(col*320,row*220))
 d.text((8,row*220+200),entry['id'],fill='white',stroke_width=1,stroke_fill='black')
board.save(O/'qa/alpha-backgrounds.jpg',quality=92)
print(json.dumps({'assets':len(assets),'copiesOnly':True,'sourceWorkspace':str(W)},ensure_ascii=False))
