from pathlib import Path
import base64

root = Path(__file__).resolve().parent
reference = root.parents[2] / 'workspace/night-market-hero/reference-evidence/verified/00_FINAL_STYLE_AUTHORITY_USER-3a97a6703f2c.png'
data = 'data:image/png;base64,' + base64.b64encode(reference.read_bytes()).decode()
page = (root / 'page.html').read_text().replace('__REFERENCE__', data)
page = page.replace('__ASSETS__', (root / 'assets-data.js').read_text())
page = page.replace('__SCENE__', (root / 'scene.js').read_text())
(root / 'preview.html').write_text(page)
print('Built isolated one-screen preview:', root / 'preview.html')
