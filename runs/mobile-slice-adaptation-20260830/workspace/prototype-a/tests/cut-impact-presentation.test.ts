import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { cutImpactProfile } from '../src/cut-impact';

const rendererSource = readFileSync(new URL('../src/three-world-renderer.ts', import.meta.url), 'utf8');

test('CUT-IMPACT-013 makes the blade crossing visible immediately and lets it fade without a pause', () => {
  const contact = cutImpactProfile(0);
  const readable = cutImpactProfile(0.1);
  const fading = cutImpactProfile(0.22);
  const finished = cutImpactProfile(0.34);

  assert.ok(contact.opacity >= 0.7, 'the blade crossing must be visible on contact');
  assert.ok(contact.length > 0, 'the impact line needs a visible starting length');
  assert.ok(readable.length > contact.length, 'the impact line should grow as the halves start moving');
  assert.ok(readingIsBounded(readable), 'the impact line must stay compact around the cut plane');
  assert.ok(fading.opacity < readable.opacity, 'the impact line must fade while the cut continues');
  assert.equal(finished.opacity, 0, 'the transient line must return to rest');
});

test('CUT-IMPACT-015 advances and renders the accent as a front-layer transient', () => {
  assert.match(rendererSource, /if \(Number\.isFinite\(this\.cutSlashAge\)\) this\.cutSlashAge \+= deltaSeconds/);
  assert.match(rendererSource, /cutSlashCore\.frustumCulled = false/);
  assert.match(rendererSource, /cutSlashCore\.position\.z = 0\.35/);
});

function readingIsBounded(profile: ReturnType<typeof cutImpactProfile>): boolean {
  return profile.length <= 1.35 && profile.thickness > 0 && profile.thickness <= 0.12;
}
