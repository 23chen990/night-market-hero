from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw
import numpy as np
import base64,hashlib,json
O=Path(__file__).resolve().parent; R=O.parents[2]; W=R/'workspace/night-market-hero'; A=W/'src/assets/approved-runtime/environment'
N={'innerEave':'inner-eave-v1','eave':'rooftops-curved-eave-v1','crown':'rooftops-roof-crown-v1','support':'rooftops-roof-support-block-v1','beam':'paifang-crossbeam-v1','scaffold':'bamboo-scaffold-v1','banner':'blank-banner-v1','canopy':'stall-canopy-v1','cart':'pushcart-v1','stall':'covered-alley-frame-v1','lanternCable':'lantern-cable-v1','lantern':'market-lantern-sprite-v1'}
assets={'sky':R/'artifacts/longmap-batch-b/rooftops.hybrid-candidate-v33-fog-minimal/generated-atmosphere-plate-v33.png',**{k:A/(v+'.png') for k,v in N.items()}}
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();data={};manifest=[];alpha=[]
(O/'assets').mkdir(exist_ok=True)
for key,p in assets.items():
 im=Image.open(p)
 if key=='sky':
  assert sha(p)=='019f554a800caec4270161e97c188849167538f2293b4fc55f9519ca45040664'
  out=im.convert('RGB');box=(0,0,*im.size)
 else:
  im=im.convert('RGBA'); a=im.getchannel('A'); assert a.getextrema()[0]==0 and a.getextrema()[1]>180
  b=a.point(lambda v:255 if v>150 else 0).getbbox();pad=2
  box=(max(0,b[0]-pad),max(0,b[1]-pad),min(im.width,b[2]+pad),min(im.height,b[3]+pad))
  out=im.crop(box);arr=np.array(out);arr[arr[:,:,3]<40]=0
  # Preserve the entire opaque object. Clean only matte residue at its existing edge.
  if key!='lantern':
   aa=Image.fromarray(arr[:,:,3]);eroded=np.array(aa.filter(ImageFilter.MinFilter(3)))
   rim=(arr[:,:,3]>0)&(eroded<180)
   arr[rim,:3]=np.minimum(arr[rim,:3],np.array([14,29,37]))
   arr[:,:,3]=eroded;arr[eroded==0,:3]=0
  out=Image.fromarray(arr)
  alpha.append({'id':key,'meaningful':int(arr[:,:,3].min())==0 and int(arr[:,:,3].max())>180,'objectPreserved':True,'alphaMinMax':out.getchannel('A').getextrema(),'cropRole':'transparent margins only; no structural cropping'})
 target=O/'assets'/f'{key}.png';out.save(target)
 data[key]='data:image/png;base64,'+base64.b64encode(target.read_bytes()).decode()
 manifest.append({'id':key,'source':str(p),'sourceSha256':sha(p),'previewCopy':str(target),'previewSha256':sha(target),'crop':box,'size':out.size})
(O/'assets-data.js').write_text('const MATERIAL_DATA = '+json.dumps(data)+';\n')
(O/'source-manifest.json').write_text(json.dumps({'targetGame':'夜市飞侠：护印突围','workspace':str(W),'completePanoramaInputs':0,'assets':manifest},ensure_ascii=False,indent=2))
(O/'qa/alpha-check.json').write_text(json.dumps(alpha,indent=2))
board=Image.new('RGB',(960,180*len(alpha)));d=ImageDraw.Draw(board)
for row,e in enumerate(alpha):
 im=Image.open(O/'assets'/f"{e['id']}.png").convert('RGBA');im.thumbnail((280,150))
 for col,color in enumerate([(245,246,247),(7,17,24),(170,40,145)]):
  cell=Image.new('RGBA',(320,180),color+(255,));cell.alpha_composite(im,((320-im.width)//2,5));board.paste(cell.convert('RGB'),(col*320,row*180))
 d.text((7,row*180+158),e['id'],fill='white',stroke_width=1,stroke_fill='black')
board.save(O/'qa/alpha-backgrounds.jpg',quality=95)
print('Prepared 12 full-shape environment materials + sky; original files unchanged.')
