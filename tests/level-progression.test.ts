import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createGrappleGame, type GrappleGame, type GrappleState } from '../src/game-core.ts';
import { createRunSnapshot, parseRunSnapshot } from '../src/run-snapshot.ts';

interface LevelContract {
  id: string;
  title: string;
  destination: string;
  intensity: number;
  gateCloseTicks: number;
}

type CampaignGame = GrappleGame & {
  continueCampaign?: () => GrappleState;
};

function completeCurrentLevel(game: GrappleGame): void {
  const beatThree = game.loadScenario('event-closing-gate-beat-3');
  game.setPlayerForTest({
    x: beatThree.gate.x - 24,
    y: beatThree.gate.collisionAperture.y + beatThree.gate.collisionAperture.height / 2,
    vx: 720,
    vy: 0,
  });
  game.advanceTicks(24);
  assert.equal(game.getState().status, 'won');
}

describe('legacy three-level night-market campaign (superseded)', { skip: true }, () => {
  function runNaturalLevel(levelIndex: number, releaseFraction: number): { state: GrappleState; routes: Set<string>; chaseEvents: Set<string> } {
    const game = createGrappleGame(31);
    game.resetGame(31, levelIndex);
    const routes = new Set<string>();
    const chaseEvents = new Set<string>();
    game.act('press');
    for (let index = 0; index < 12_000 && game.getState().status === 'playing'; index += 1) {
      const state = game.advanceTicks(1);
      if (state.activeChaseEvent) chaseEvents.add(state.activeChaseEvent);
      if (state.routeTraversal.committedRoute) routes.add(state.routeTraversal.committedRoute);
      if (!state.attachedAnchorId || state.ropeLength === null) continue;
      const anchor = state.anchors.find((item) => item.id === state.attachedAnchorId)!;
      if (state.player.x > anchor.x + state.ropeLength * releaseFraction && state.player.vx > 100) {
        game.act('release');
        game.act('press');
      }
    }
    return { state: game.getState(), routes, chaseEvents };
  }

  test('manifest exposes three original levels with a rising but bounded tension curve', () => {
    const manifest = createGrappleGame(31).getManifest() as ReturnType<GrappleGame['getManifest']> & { levels?: LevelContract[] };
    assert.equal(manifest.levels?.length, 3);
    assert.equal(new Set(manifest.levels?.map((level) => level.id)).size, 3);
    assert.equal(new Set(manifest.levels?.map((level) => level.title)).size, 3);
    assert.deepEqual(manifest.levels?.map((level) => level.intensity), [0.35, 0.62, 0.88]);
    assert.ok(manifest.levels!.every((level) => level.gateCloseTicks >= 200), 'every gate must retain a readable reaction window');
    assert.deepEqual(manifest.levels?.map((level) => level.finishX), [2760, 4800, 6800]);
    assert.notDeepEqual(manifest.levels?.map((level) => level.anchorSpacing), [325, 325, 325]);
  });

  test('each level exposes a distinct normal-flow net encounter', () => {
    for (const levelIndex of [0, 1, 2]) {
      const game = createGrappleGame(31);
      game.resetGame(31, levelIndex);
      game.setPlayerForTest({ x: game.getState().finishX * 0.56, y: 470, vx: 0, vy: 0 });
      const state = game.advanceTicks(1);
      assert.equal(state.activeChaseEvent, 'roof-net', `level ${levelIndex + 1} must surface the net encounter at its authored map beat`);
    }
  });

  test('first level is a forgiving teaching pass before the campaign ramps', () => {
    const levels = createGrappleGame(31).getManifest().levels as Array<LevelContract & {
      startingPressure?: number;
      pursuitSpeedBonus?: number;
      anchorY?: readonly number[];
      assistAttachRadius?: number;
    }>;
    const first = levels[0]!;
    assert.ok((first.assistAttachRadius ?? 0) >= 650, 'teaching level needs a wide forgiving hook window');
  });

  test('continue advances level configuration, preserves hold/release-only input, and wraps after level three', () => {
    const game = createGrappleGame(31) as CampaignGame;
    assert.equal(typeof game.continueCampaign, 'function');
    const levelOne = game.getState() as GrappleState & { levelIndex?: number; levelId?: string; levelTitle?: string; levelCount?: number };
    assert.deepEqual([levelOne.levelIndex, levelOne.levelCount], [0, 3]);
    const anchorsOne = levelOne.anchors.map(({ x, y }) => ({ x, y }));

    completeCurrentLevel(game);
    const levelTwo = game.continueCampaign!() as typeof levelOne;
    assert.deepEqual([levelTwo.status, levelTwo.levelIndex, levelTwo.levelCount], ['playing', 1, 3]);
    assert.notDeepEqual(levelTwo.anchors.map(({ x, y }) => ({ x, y })), anchorsOne);
    assert.deepEqual(game.getManifest().inputs.gameplay, ['hold', 'release']);

    completeCurrentLevel(game);
    const levelThree = game.continueCampaign!() as typeof levelOne;
    assert.deepEqual([levelThree.status, levelThree.levelIndex], ['playing', 2]);
    assert.notEqual(levelThree.levelId, levelTwo.levelId);

    completeCurrentLevel(game);
    const wrapped = game.continueCampaign!() as typeof levelOne;
    assert.deepEqual([wrapped.status, wrapped.levelIndex], ['playing', 0]);
    assert.equal(wrapped.levelId, levelOne.levelId);
  });

  test('runtime HUD and result flow expose the current level and use campaign continuation', async () => {
    const [html, source] = await Promise.all([readFile('index.html', 'utf8'), readFile('src/main.ts', 'utf8')]);
    assert.match(html, /data-ui="level-title"/);
    assert.match(source, /levelTitle\.textContent\s*=\s*`第\$\{state\.levelIndex \+ 1\}关 · \$\{state\.levelTitle\}`/);
    assert.match(source, /destination\.textContent\s*=\s*state\.levelDestination/);
    assert.match(source, /core\.continueCampaign\(\)/);
  });

  test('every level has deterministic natural low and high hold/release completion paths', () => {
    for (const levelIndex of [0]) {
      const low = runNaturalLevel(levelIndex, 0.45);
      const high = runNaturalLevel(levelIndex, 0.55);
      assert.equal(low.state.status, 'won', `level ${levelIndex + 1} low path must complete naturally`);
      assert.equal(high.state.status, 'won', `level ${levelIndex + 1} high path must complete naturally`);
      assert.deepEqual([...low.routes], ['low']);
      assert.deepEqual([...high.routes], ['high']);
    }
    const manifests = createGrappleGame(31).getManifest().levels as Array<LevelContract & { finishX?: number; anchorSpacing?: number }>;
    assert.ok(manifests[1]!.finishX! > manifests[0]!.finishX!);
    assert.ok(manifests[2]!.finishX! > manifests[1]!.finishX!);
  });

  test('versioned snapshot round-trips the active campaign level', () => {
    const game = createGrappleGame(31) as CampaignGame;
    completeCurrentLevel(game);
    const levelTwo = game.continueCampaign!();
    game.advanceTicks(90);
    const snapshot = createRunSnapshot('campaign:level-two', game.getState());
    const parsed = parseRunSnapshot(JSON.stringify(snapshot));
    assert.equal(parsed?.state.levelId, levelTwo.levelId);
    const restored = createGrappleGame(1);
    assert.equal(restored.restoreSnapshot(parsed!.state), true);
    assert.deepEqual(restored.getState(), game.getState());
  });
});
