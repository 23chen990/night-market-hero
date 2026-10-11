# -*- coding: utf-8 -*-
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,base64
p=Path(__file__).resolve().parent.parent
man=json.loads((p/'source-manifest.json').read_text());sources={a['id']:a for a in man['assets']}
workspace=Path(man['workspace']);refpath=workspace/'reference-evidence/verified/00_FINAL_STYLE_AUTHORITY_USER-3a97a6703f2c.png'
assert hashlib.sha256(refpath.read_bytes()).hexdigest()=='3a97a6703f2c54afb75d4ac05d8e0ab521fd97e035c05189359061cf6f5d7a11'
ref=Image.open(refpath).convert('RGB');screen=Image.open(p/'screen.png').convert('RGB')
rows=[('innerEave','屋檐：局部形状可用，大幅近景细节不足',(0,89,600,275),(0,0,603,235)),('beam','横梁：结构可用，不能代替完整门楼',(397,180,1035,351),(402,176,860,394)),('canopy','棚布：只有一种弧线与折叠，缺少形状变化',(676,474,1155,681),(652,504,1193,701)),('lantern','灯笼：本体可保留，灯光和明暗由摆放调整',(171,200,250,358),(177,226,248,374)),('scaffold','竹架：适合局部支撑，不能充当整栋建筑',(1090,424,1310,743),(1110,335,1353,598)),(None,'完整门面：现有素材缺失，是主要缺口',(0,206,340,537),(0,220,340,527))]
fontfile='/System/Library/Fonts/Hiragino Sans GB.ttc'
f=ImageFont.truetype(fontfile,23);small=ImageFont.truetype(fontfile,16);title=ImageFont.truetype(fontfile,30)
board=Image.new('RGB',(1440,158+len(rows)*276+64),'#0b1720');d=ImageDraw.Draw(board)
d.text((28,24),'夜市飞侠｜原图、素材本体与组景对照',font=title,fill='#ecdfc2')
d.text((28,77),'审查用对照：没有生成新素材。各列按比例适配；不是相似度评分。',font=small,fill='#9db2bb')
for col,text in enumerate(['定稿对应部位','已有素材原件（透明边裁切显示）','当前代码 + 素材组景']):d.text((28+col*474,118),text,font=small,fill='#cfb98e')
records=[]
def place(im,x,y,w,h):
 im=im.copy().convert('RGBA');im.thumbnail((w,h),Image.Resampling.LANCZOS);b=Image.new('RGBA',(w,h),'#19323e');b.alpha_composite(im,((w-im.width)//2,(h-im.height)//2));board.paste(b.convert('RGB'),(x,y))
for i,(key,label,rb,pb) in enumerate(rows):
 y=158+i*276;d.text((28,y),label,font=f,fill='#d3dfe1')
 place(ref.crop(rb),28,y+40,454,214);place(screen.crop(pb),976,y+40,436,214)
 entry={'id':key or 'facade-gap','referenceCrop':rb,'previewCrop':pb,'label':label}
 if key:
  source=Path(sources[key]['source']);im=Image.open(source).convert('RGBA');bbox=im.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox();place(im.crop(bbox),502,y+40,454,214)
  originalBox=im.getchannel('A').point(lambda a:255 if a>150 else 0).getbbox();width=originalBox[2]-originalBox[0]
  poses=[a for a in json.loads((p/'qa/placements.json').read_text())['placements'] if a['id']==key]
  entry.update({'originalSource':str(source),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'originalOpaqueWidth':width,'maxDisplayWidth':max(a['w'] for a in poses),'maxScale':round(max(a['w'] for a in poses)/width,2),'alphaMeaningful':im.getchannel('A').getextrema()[0]==0})
 else:
  d.rectangle((502,y+40,956,y+254),fill='#19323e');d.text((550,y+117),'没有对应的完整外立面素材',font=f,fill='#dfb68f')
 records.append(entry)
d.text((28,board.height-41),'90% 仍未达到。完整建筑缺口、源素材用途和组装方式必须分别解决。',font=small,fill='#c3ab86')
board.save(p/'material-audit.jpg',quality=94)
(p/'qa/material-audit-crops.json').write_text(json.dumps({'targetGame':'夜市飞侠：护印突围','workspace':str(workspace),'referenceSource':str(refpath),'referenceSha256':hashlib.sha256(refpath.read_bytes()).hexdigest(),'screenSha256':hashlib.sha256((p/'screen.png').read_bytes()).hexdigest(),'rows':records},ensure_ascii=False,indent=2))
print(json.dumps([{'id':r['id'],'maxScale':r.get('maxScale')} for r in records],ensure_ascii=False))
