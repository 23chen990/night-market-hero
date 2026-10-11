from pathlib import Path
import base64
import hashlib
import json

root = Path(__file__).resolve().parent
# Only the two declared layouts are accepted: this factory run and this game's
# standalone GitHub repository. Exact identity and bytes are checked in both.
workspaces = [root.parents[2] / 'workspace/night-market-hero', root.parents[1]]
workspace = next((p for p in workspaces if (p / 'reference-evidence/manifest.json').is_file()), None)
if workspace is None:
    raise ValueError('target game reference manifest is unavailable')
manifest = json.loads((workspace / 'reference-evidence/manifest.json').read_text())
entry = next((e for e in manifest['entries'] if e['id'] == 'final-style-authority-20260920'), None)
expected_sha = '3a97a6703f2c54afb75d4ac05d8e0ab521fd97e035c05189359061cf6f5d7a11'
if (manifest['targetGame'] != '夜市飞侠：护印突围' or entry is None
        or entry.get('identityStatus') != 'VERIFIED_TARGET'
        or entry.get('reviewStatus') != 'VERIFIED' or not entry.get('usableAsEvidence')):
    raise ValueError('reference identity is not verified for the target game')
reference = workspace / entry['storedPath']
reference_bytes = reference.read_bytes()
if entry['sha256'] != expected_sha or hashlib.sha256(reference_bytes).hexdigest() != expected_sha:
    raise ValueError('reference hash mismatch')
data = 'data:image/png;base64,' + base64.b64encode(reference_bytes).decode()
page = (root / 'page.html').read_text().replace('__REFERENCE__', data)
page = page.replace('__ASSETS__', (root / 'assets-data.js').read_text())
page = page.replace('__SCENE__', '\n'.join((root / name).read_text() for name in ['facades.js', 'surfaces.js', 'scene.js']))
(root / 'preview.html').write_text(page)
print('Built isolated one-screen preview:', root / 'preview.html')
