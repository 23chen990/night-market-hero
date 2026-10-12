"""Archive executed browser/static evidence bound to an explicitly reviewed PNG set.

This script does NOT approve visuals. Supply a review only after inspecting the
successful workflow outputs. Runtime changes invalidate the exact-build check.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil

parser = argparse.ArgumentParser()
parser.add_argument('--browser-dir', type=Path, required=True)
parser.add_argument('--static-dir', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
root = Path.cwd()
out = args.output.resolve()
browser = args.browser_dir / 'evidence/playable-audit'
checks = args.static_dir / 'delivery'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise SystemExit(message)


build_hash = digest(root / 'dist/index.html')
for directory in (args.browser_dir, args.static_dir):
    require(digest(directory / 'dist/index.html') == build_hash, 'artifact is not this exact build')
review = read(out / 'perceptual-qa-report.json')
require(review.get('passed') is True and review.get('buildHash') == build_hash, 'missing exact-build visual approval')
require(len(review.get('reviewedImages', {})) >= 8, 'insufficient explicitly reviewed screenshots')
for name, expected in review['reviewedImages'].items():
    require(Path(name).name == name and name.endswith('.png'), 'unsafe review image name')
    require(digest(browser / name) == expected, 'reviewed screenshot has changed: ' + name)
journeys = read(browser / 'journeys.json')
safety = read(browser / 'safety.json')
menus = read(browser / 'menus.json')
require(journeys.get('sha256') == build_hash and journeys.get('failures') == [], 'journey failed or stale')
for name, report in [('safety', safety), ('menus', menus)]:
    require(report.get('passed') is True and report.get('sha256') == build_hash, name + ' failed or stale')
require(len(journeys.get('reports', [])) == 2, 'both input journeys are required')
for journey in journeys['reports']:
    require(journey['tutorialCompleted'] and not journey['errors'], 'tutorial or browser errors')
    require(sorted(journey['seams']) == [8000, 9600, 11200, 12800], 'missing naturally observed joins')
    require(journey['lifecycle'].get('characterPersisted') is True, 'growth and replay loop not verified')
    require(len(journey['seen']) >= 4, 'missing ride observations')
    shot_names = {item['name'] for item in journey['screenshots']}
    require(all('ride-' + str(i) in shot_names for i in range(1, 5)), 'missing ride images')
    require(all('seam-' + str(i) in shot_names for i in [8000, 9600, 11200, 12800]), 'missing join images')
    require(all(item['lastTick'] - item['firstTick'] >= 120 for item in journey['seen'].values()), 'ride observation too short')
check_status = read(checks / 'checks.json')
require(check_status == {'lint': 0, 'typecheck': 0, 'tests': 0}, 'static checks did not pass')
text = (checks / 'tests.log').read_text(encoding='utf-8')
stats = {field: int(re.search(r'^# ' + field + r' (\d+)\s*$', text, re.M).group(1)) for field in ['tests', 'pass', 'fail', 'skipped']}
require(stats['fail'] == 0 and stats['pass'] >= 388 and stats['skipped'] == 10, 'regression coverage changed or failed')
require((browser / 'commit.txt').read_text().strip() == review['testedCommit'], 'browser source differs from reviewed source')
require((checks / 'commit.txt').read_text().strip() == review['testedCommit'], 'static source differs from reviewed source')
for run_file in ('browser-run.json', 'static-run.json'):
    run = read(root / 'delivery' / run_file)
    require(run['conclusion'] == 'success' and run['head_sha'] == review['testedCommit'], run_file + ' is not a successful reviewed run')

out.mkdir(parents=True, exist_ok=True)
for path in browser.iterdir():
    if path.is_file() and path.suffix in ('.png', '.json', '.txt', '.sha256'):
        shutil.copy2(path, out / path.name)
shutil.copytree(checks, out / 'checks', dirs_exist_ok=True)
for name in ('browser-run.json', 'static-run.json'):
    shutil.copy2(root / 'delivery' / name, out / 'checks' / name)
shared = {'schemaVersion': 1, 'passed': True, 'buildHash': build_hash, 'scope': 'web-lite-playable',
          'testedCommit': review['testedCommit'], 'commercialReleasePassed': False}
(out / 'runtime-product-gate.json').write_text(json.dumps({**shared, 'checks': check_status, 'tests': stats,
    'standaloneFileLaunch': 'successful WebKit job; original and isolated renamed file'}, indent=2) + '\n')
(out / 'qa-natural-journey-report.json').write_text(json.dumps({**shared,
    'naturalFlow': {'buildHash': build_hash, 'method': journeys['method'], 'journeys': len(journeys['reports'])},
    'safetyPassed': True, 'menuLayoutsPassed': len(menus['layouts']), 'blindHumanTest': False,
    'rawEvidence': ['journeys.json', 'safety.json', 'menus.json']}, indent=2) + '\n')
files = sorted(p for p in out.rglob('*') if p.is_file() and p.name != 'manifest.sha256')
(out / 'manifest.sha256').write_text(''.join(digest(p) + '  ' + p.relative_to(out).as_posix() + '\n' for p in files))
print(json.dumps({'archived': str(out), 'buildHash': build_hash, 'files': len(files), 'tests': stats}))
