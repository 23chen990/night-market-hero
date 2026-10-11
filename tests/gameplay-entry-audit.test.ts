import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  BackgroundLifecyclePolicy,
  PersistentRunIdentity,
  RuntimeSession,
} from '../src/runtime-session.ts';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  read(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  write(key: string, value: string): boolean {
    this.values.set(key, value);
    return true;
  }
}

test('new runs receive unique persistent ids while restore keeps its id', () => {
  const storage = new MemoryStorage();
  let random = 0;
  const identity = new PersistentRunIdentity(storage, {
    now: () => 1_700_000_000_000,
    entropy: () => `entropy-${++random}`,
  });
  const first = identity.issue(31);
  const second = identity.issue(31);
  assert.notEqual(first, second);
  assert.match(first, /^31:/);
  assert.match(second, /^31:/);
  assert.equal(JSON.parse(storage.read('night-market-hero.run-sequence.v1') ?? '{}').counter, 2);
  assert.equal(identity.restore(first), first);
});

test('runtime session invalidates stale async operations after a new run', () => {
  const storage = new MemoryStorage();
  const identity = new PersistentRunIdentity(storage, { now: () => 1, entropy: () => 'stable' });
  const session = new RuntimeSession(identity, 31);
  const operation = session.beginOperation('double-wishfire');
  assert.ok(operation);
  const nextRun = session.beginNewRun(32);
  assert.notEqual(nextRun, operation.runId);
  assert.equal(session.isCurrent(operation), false);
  assert.equal(session.isOperationActive('double-wishfire'), false);
  assert.equal(session.isCurrentRun(nextRun), true);
});

test('a completed async operation cannot impersonate its successor in the same run', () => {
  const session = new RuntimeSession(new PersistentRunIdentity(new MemoryStorage()), 31);
  const first = session.beginOperation('revive')!;
  session.endOperation(first);
  const next = session.beginOperation('revive')!;
  assert.equal(session.isCurrent(first), false);
  session.endOperation(first);
  assert.equal(session.isCurrent(next), true);
});

test('background policy suspends hidden time and never auto-resumes on visibility or focus', () => {
  const policy = new BackgroundLifecyclePolicy();
  assert.equal(policy.shouldAdvance, true);
  policy.hidden();
  assert.equal(policy.shouldAdvance, false);
  assert.equal(policy.inputHeld, false);
  policy.visible();
  assert.equal(policy.shouldAdvance, false);
  assert.equal(policy.resumeRequired, true);
  policy.explicitResume();
  assert.equal(policy.shouldAdvance, true);
  policy.focused();
  assert.equal(policy.shouldAdvance, true);
});

test('entry wiring uses the lifecycle/session contracts and does not advertise fixed rewards', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /PersistentRunIdentity/);
  assert.match(main, /visibilitychange/);
  assert.match(main, /pagehide/);
  assert.match(main, /isCurrent\(/);
  assert.match(main, /getPersistenceIssue/);
  assert.doesNotMatch(main, /再得 30 金币/);
});


test('run save failures have an actionable alert outside terminal-only UI', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const alert = html.match(/<aside[^>]*data-ui="persistence-notice"[\s\S]*?<\/aside>/)?.[0];
  assert.ok(alert, 'playing runs need a visible persistence alert');
  assert.match(alert, /role="alert"/);
  assert.match(alert, /data-action="retry-save"/);
  assert.ok(html.indexOf(alert) < html.indexOf('class="result-scrim"'), 'alert must survive a hidden terminal overlay');
  assert.match(main, /persistenceNotice\.hidden = !issue/);
  assert.match(main, /retrySaveButton\.addEventListener\('click',[\s\S]*?persistRun\(/);
});
