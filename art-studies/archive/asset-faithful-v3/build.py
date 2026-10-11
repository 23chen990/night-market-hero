from pathlib import Path
p=Path(__file__).resolve().parent
page=(p/'page.html').read_text().replace('__ASSETS__',(p/'assets-data.js').read_text()).replace('__SCENE__',(p/'scene.js').read_text())
(p/'preview.html').write_text(page)
print(f'Self-contained offline preview: {p / "preview.html"} ({len(page.encode())} bytes)')
