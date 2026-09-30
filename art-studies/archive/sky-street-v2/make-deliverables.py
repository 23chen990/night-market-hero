from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import math
p=Path(__file__).resolve().parent
world=Image.open(p/'street-full-5016x941.png').convert('RGB')
world.resize((1920,360),Image.Resampling.LANCZOS).save(p/'street-overview.jpg',quality=94)
# This is a camera pan over the canvas export, not new generated visual material.
small=world.resize((1800,338),Image.Resampling.LANCZOS)
palette=small.quantize(colors=128,method=Image.Quantize.MEDIANCUT)
frames=[]
for i in range(49):
 t=i/48
 x=round((small.width-600)*(1-math.cos(math.pi*t))/2)
 f=small.crop((x,0,x+600,338)).quantize(palette=palette,dither=Image.Dither.NONE)
 frames.append(f)
frames[0].save(p/'street-pan.gif',save_all=True,append_images=frames[1:]+frames[-2:0:-1],duration=120,loop=0,optimize=True)
# Compact comparison material keeps explanatory labels outside the art itself.
font_path='/System/Library/Fonts/Hiragino Sans GB.ttc'
try: title=ImageFont.truetype(font_path,25); smallfont=ImageFont.truetype(font_path,16)
except OSError: title=ImageFont.load_default();smallfont=title
board=Image.new('RGB',(1536,416),'#0b1821');d=ImageDraw.Draw(board)
for i,(f,titletext,note) in enumerate([('sky-only.png','01  天空与雾','已有天空底图'),('code-only.png','02  建筑结构','代码画墙柱、栏杆与灯光'),('street-center.png','03  素材与细节','屋檐、摊棚与灯笼贴图')]):
 im=Image.open(p/f).convert('RGB').resize((492,277),Image.Resampling.LANCZOS)
 x=14+512*i;board.paste(im,(x,14));d.text((x,309),titletext,font=title,fill='#c8b486');d.text((x,352),note,font=smallfont,fill='#91a5b2')
board.save(p/'composition-breakdown.jpg',quality=94)
print('Created overview, pan GIF and layer breakdown')
