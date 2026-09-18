"""Build one offline HTML from independently authored component assets and code.
Python standard library only. Complete background/preview PNGs are never inputs.
Run: python build.py
"""
from pathlib import Path
import base64,json
R=Path(__file__).resolve().parent
html=(R/'template.html').read_text(encoding='utf8')
config={'SCENE_DATA':json.loads((R/'scene.json').read_text()),'AMBIENT_DATA':json.loads((R/'configs/ambient.json').read_text()),'GRAPPLE_DATA':json.loads((R/'configs/grapple.json').read_text())}
config['COMPONENT_DATA']={p.stem:'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode() for p in sorted((R/'assets').glob('*.png'))}
data='<script>\n'+'\n'.join('window.'+k+'='+json.dumps(v,ensure_ascii=False)+';' for k,v in config.items())+'\n</script>'
scripts=['base-renderer-v02.js','ambient.js','renderer-v03.js','grapple-physics.js','renderer-v04.js','ui-v04.js']
html=html.replace('<!--DATA-->',data).replace('<!--SCRIPTS-->','\n'.join('<script>\n'+(R/'src'/s).read_text(encoding='utf8')+'\n</script>' for s in scripts))
(R/'index.html').write_text(html,encoding='utf8')
print('Built',R/'index.html',len(html.encode()),'bytes,',len(config['COMPONENT_DATA']),'image components.')
