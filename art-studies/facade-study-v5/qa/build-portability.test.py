import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

STUDY = Path(__file__).resolve().parents[1]
WORKSPACE = next(p for p in [STUDY.parents[2] / 'workspace/night-market-hero', STUDY.parents[1]] if (p / 'reference-evidence/manifest.json').is_file())
REFERENCE = '00_FINAL_STYLE_AUTHORITY_USER-3a97a6703f2c.png'
SHA = '3a97a6703f2c54afb75d4ac05d8e0ab521fd97e035c05189359061cf6f5d7a11'


class PortableStudyBuild(unittest.TestCase):
    def fixture(self, directory):
        repo = Path(directory)
        study = repo / 'art-studies/facade-study-v5'
        study.mkdir(parents=True)
        shutil.copy2(STUDY / 'build.py', study / 'build.py')
        for name, content in {'page.html': '__REFERENCE__ __ASSETS__ __SCENE__', 'assets-data.js': 'const materials={};', 'facades.js': 'function facade(){}', 'surfaces.js': 'function surfaces(){}', 'scene.js': 'function scene(){}'}.items():
            (study / name).write_text(content)
        evidence = repo / 'reference-evidence/verified'
        evidence.mkdir(parents=True)
        shutil.copy2(WORKSPACE / 'reference-evidence/verified' / REFERENCE, evidence / REFERENCE)
        manifest = {'targetGame': '夜市飞侠：护印突围', 'entries': [{'id': 'final-style-authority-20260920', 'storedPath': 'reference-evidence/verified/' + REFERENCE, 'sha256': SHA, 'identityStatus': 'VERIFIED_TARGET', 'reviewStatus': 'VERIFIED', 'usableAsEvidence': True}]}
        (repo / 'reference-evidence/manifest.json').write_text(json.dumps(manifest))
        return study, repo, manifest

    def test_build_from_published_repository_layout(self):
        with tempfile.TemporaryDirectory() as directory:
            study, _, _ = self.fixture(directory)
            result = subprocess.run(['python3', str(study / 'build.py')], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            html = (study / 'preview.html').read_text()
            self.assertIn('function surfaces(){}', html)
            self.assertIn('data:image/png;base64,', html)

    def test_corrupted_reference_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            study, repo, _ = self.fixture(directory)
            (repo / 'reference-evidence/verified' / REFERENCE).write_bytes(b'wrong recording or image')
            result = subprocess.run(['python3', str(study / 'build.py')], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('reference hash mismatch', result.stderr)

    def test_pending_reference_cannot_be_embedded(self):
        with tempfile.TemporaryDirectory() as directory:
            study, repo, manifest = self.fixture(directory)
            manifest['entries'][0]['reviewStatus'] = 'PENDING'
            (repo / 'reference-evidence/manifest.json').write_text(json.dumps(manifest))
            result = subprocess.run(['python3', str(study / 'build.py')], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('reference identity is not verified', result.stderr)


if __name__ == '__main__':
    unittest.main()
