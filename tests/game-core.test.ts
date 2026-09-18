import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

type CoreModule = typeof import('../src/game-core.ts');
const core = await import('../src/game-core.ts').catch(() => null) as CoreModule | null;

function requireCore(): CoreModule {
  assert.ok(core, 'expected the grapple physics core to exist');
  return core;
}

describe('夜市飞侠 deterministic grapple core', () => {
  test('every seed resets to the selected fixed action-treatment course', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(17);
    const first = game.getState();
    game.resetGame(17);
    assert.deepEqual(game.getState().anchors, first.anchors);
    game.resetGame(18);
    assert.deepEqual(game.getState().anchors, first.anchors);
    assert.equal(game.getState().finishX, 2760);
  });

  test('press attaches only to a nearby eligible forward anchor', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(3);
    assert.equal(game.act('press'), true);
    const state = game.getState();
    assert.equal(state.inputHeld, true);
    assert.ok(state.attachedAnchorId !== null);
    const anchor = state.anchors.find((item) => item.id === state.attachedAnchorId)!;
    assert.ok(anchor.x >= state.player.x - 36);
    assert.ok(Math.hypot(anchor.x - state.player.x, anchor.y - state.player.y) <= state.attachRadius);
  });

  test('falling through a lower anchor can rescue-grapple despite sideways momentum', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(3);
    game.setPlayerForTest({ x: 520, y: 300, vx: -500, vy: 200 });
    assert.equal(game.act('press'), true);
    assert.equal(game.getState().attachedAnchorId, 'node-2');
  });

  test('highlighted anchor id is the same candidate used by press', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(3);
    game.setPlayerForTest({ x: 520, y: 300, vx: -500, vy: 200 });
    assert.equal(game.getEligibleAnchorId(), 'node-2');
    game.act('press');
    assert.equal(game.getState().attachedAnchorId, game.getEligibleAnchorId());
  });

  test('falling rescue can switch to a visible lower branch anchor', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(3);
    game.loadScenario('route-high');
    game.setPlayerForTest({ x: 1_520, y: 450, vx: -300, vy: 300 });
    assert.equal(game.getEligibleAnchorId(), 'node-low');
    assert.equal(game.act('press'), true);
    assert.equal(game.getState().attachedAnchorId, 'node-low');
  });

  test('rightward transfer prefers the nearest aligned playable anchor', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(3);
    game.setPlayerForTest({ x: 1_400, y: 330, vx: 500, vy: 0 });
    game.act('press');
    game.act('release');
    game.setPlayerForTest({ x: 1_450, y: 330, vx: 500, vy: 0 });
    assert.equal(game.getEligibleAnchorId(), 'node-5');
  });

  test('long-distance captures are reeled to a playable rope length', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(3);
    game.setPlayerForTest({ x: 1_200, y: 330, vx: 500, vy: 0 });
    game.act('press');
    game.act('release');
    game.setPlayerForTest({ x: 1_020, y: 330, vx: 500, vy: 0 });
    assert.equal(game.act('press'), true);
    const state = game.getState();
    assert.ok(state.ropeLength !== null);
    assert.ok(state.ropeLength <= 540, 'a highlighted capture must not create an unplayably long rope');
  });

  test('authored anchor layouts keep adjacent transfers within a playable envelope', () => {
    const { createGrappleGame } = requireCore();
    for (const levelIndex of [0, 1, 2]) {
      const game = createGrappleGame(3);
      game.resetGame(3, levelIndex);
      const anchors = game.getState().anchors.filter((anchor) => anchor.id !== 'node-low');
      for (let index = 1; index < anchors.length; index += 1) {
        const previous = anchors[index - 1]!;
        const current = anchors[index]!;
        assert.ok(Math.hypot(current.x - previous.x, current.y - previous.y) <= 540,
          `level ${levelIndex + 1} has an overlong adjacent transfer`);
      }
    }
  });

  test('held swing constrains the body to its captured rope length without jitter', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(5);
    game.act('press');
    const attached = game.getState();
    assert.ok(attached.ropeLength !== null);
    for (let index = 0; index < 180; index += 1) game.step(1 / 120);
    const state = game.getState();
    const anchor = state.anchors.find((item) => item.id === state.attachedAnchorId)!;
    const distance = Math.hypot(anchor.x - state.player.x, anchor.y - state.player.y);
    assert.ok(Math.abs(distance - state.ropeLength!) < 0.02);
    assert.ok(state.player.x > attached.player.x, 'swing should advance the body');
  });

  test('release preserves the tangential launch velocity', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(7);
    game.act('press');
    for (let index = 0; index < 80; index += 1) game.step(1 / 120);
    const before = game.getState().player;
    assert.equal(game.act('release'), true);
    const after = game.getState();
    assert.equal(after.attachedAnchorId, null);
    assert.equal(after.player.vx, before.vx);
    assert.equal(after.player.vy, before.vy);
  });

  test('a release at the first launch window can immediately grapple a new ring', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(31);
    game.act('press');
    const firstAnchor = game.getState().attachedAnchorId;
    for (let index = 0; index < 116; index += 1) game.step(1 / 120);
    game.act('release');
    game.act('press');
    assert.ok(game.getState().attachedAnchorId);
    assert.notEqual(game.getState().attachedAnchorId, firstAnchor);
  });

  test('repeating the visible right-side release rhythm can complete the course', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(31);
    game.act('press');
    for (let index = 0; index < 3_600 && game.getState().status === 'playing'; index += 1) {
      game.step(1 / 120);
      const state = game.getState();
      if (state.attachedAnchorId === null) continue;
      const anchor = state.anchors.find((item) => item.id === state.attachedAnchorId)!;
      if (state.player.x > anchor.x + state.ropeLength! * 0.45 && state.player.vx > 100) {
        game.act('release');
        game.act('press');
      }
    }
    assert.equal(game.getState().status, 'won');
    assert.ok(game.getState().elapsed >= 5);
  });

  test('normal seed-31 hold/release rhythm visibly breaks bamboo during ordinary traversal', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(31);
    const bambooTransitions: string[] = [];
    let lastBambooState: string | null = null;

    game.act('press');
    for (let index = 0; index < 3_600 && game.getState().status === 'playing'; index += 1) {
      game.advanceTicks(1);
      const state = game.getState();
      if (state.activeTerrain?.kind === '竹架' && state.activeTerrain.behaviorState !== lastBambooState) {
        lastBambooState = state.activeTerrain.behaviorState;
        bambooTransitions.push(state.activeTerrain.behaviorState);
      } else if (state.activeTerrain?.kind !== '竹架') {
        lastBambooState = null;
      }
      if (state.attachedAnchorId === null) continue;
      const anchor = state.anchors.find((item) => item.id === state.attachedAnchorId)!;
      if (state.player.x > anchor.x + state.ropeLength! * 0.45 && state.player.vx > 100) {
        game.act('release');
        game.act('press');
      }
    }

    assert.equal(game.getState().status, 'won');
    assert.ok(bambooTransitions.includes('broken'), 'ordinary traversal must still leave visible bamboo wreckage');
  });

  test('velocity is capped', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(9);
    game.setPlayerForTest({ vx: 9000, vy: 9000 });
    game.step(1 / 60);
    const { vx, vy } = game.getState().player;
    assert.ok(Math.hypot(vx, vy) <= game.getState().maxSpeed + 0.001);
  });

  test('fixed-step result is materially stable at low and high render cadence', () => {
    const { createGrappleGame } = requireCore();
    const low = createGrappleGame(11);
    const high = createGrappleGame(11);
    low.act('press');
    high.act('press');
    for (let index = 0; index < 60; index += 1) low.step(1 / 30);
    for (let index = 0; index < 480; index += 1) high.step(1 / 240);
    const a = low.getState().player;
    const b = high.getState().player;
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.5);
    assert.ok(Math.hypot(a.vx - b.vx, a.vy - b.vy) < 0.5);
  });

  test('falling below the course produces a visible failure state', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(13);
    game.setPlayerForTest({ y: game.getState().failY + 2 });
    game.step(1 / 60);
    assert.equal(game.getState().status, 'failed');
    assert.match(game.getState().message, /坠落/);
    assert.equal(game.getState().failureReason, 'fell');
  });

  test('crossing the beacon resolves only after gate beat 3 has remained actionable for 24 ticks', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(15);
    const state = game.loadScenario('event-closing-gate-beat-3');
    game.setPlayerForTest({ x: state.gate.x - 42, y: state.gate.centerY, vx: 720, vy: 0 });
    game.advanceTicks(23);
    assert.equal(game.getState().status, 'playing');
    assert.ok(game.getState().player.x > state.gate.x);
    game.advanceTicks(1);
    assert.equal(game.getState().status, 'won');
    assert.match(game.getState().message, /抵达/);
  });

  test('one press after a terminal state restarts with a deterministic variation', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(21);
    game.setPlayerForTest({ y: game.getState().failY + 2 });
    game.step(1 / 60);
    assert.equal(game.getState().status, 'failed');
    assert.equal(game.act('press'), true);
    const state = game.getState();
    assert.equal(state.status, 'playing');
    assert.equal(state.seed, 22);
    assert.equal(state.inputHeld, true);
  });

  test('duplicate pointer edges are ignored and numeric zero toggles grapple', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(23);
    assert.equal(game.act('press'), true);
    assert.equal(game.act('press'), false);
    assert.equal(game.getState().inputTransitions, 1);
    assert.equal(game.act('release'), true);
    assert.equal(game.act('release'), false);
    assert.equal(game.getState().inputTransitions, 2);
    assert.equal(game.act(0), true);
    assert.equal(game.getState().inputHeld, true);
    assert.equal(game.act(0), true);
    assert.equal(game.getState().inputHeld, false);
  });

  test('rewarded revive unlocks at sixty percent and restores one safe flight per run', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(29) as ReturnType<CoreModule['createGrappleGame']> & {
      canRewardedRevive?: () => boolean;
      reviveFromSafeState?: () => boolean;
    };
    assert.equal(typeof game.canRewardedRevive, 'function', 'expected rewarded revive eligibility');
    assert.equal(typeof game.reviveFromSafeState, 'function', 'expected a safe revive operation');

    const course = game.getState();
    game.setPlayerForTest({ x: course.finishX * 0.59, y: course.failY + 2 });
    game.step(1 / 60);
    assert.equal(game.canRewardedRevive(), false, '59% progress must not unlock revive');
    game.act('press');
    game.act('release');

    const nextCourse = game.getState();
    game.setPlayerForTest({ x: nextCourse.finishX * 0.6, y: nextCourse.failY + 2 });
    game.step(1 / 60);
    assert.equal(game.canRewardedRevive(), true, '60% progress should unlock revive');
    assert.equal(game.reviveFromSafeState(), true);
    const revived = game.getState();
    assert.equal(revived.status, 'playing');
    assert.ok(revived.player.y < revived.failY - 100, 'revive should restore a safe height');

    game.setPlayerForTest({ y: revived.failY + 2 });
    game.step(1 / 60);
    assert.equal(game.canRewardedRevive(), false, 'revive is limited to once per run');
    assert.equal(game.reviveFromSafeState(), false);
  });

  test('chase begins safe, stalled flight draws patrol closer, and pressure is clamped', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(33);
    const initial = game.getState();
    assert.ok(initial.chase, 'expected chase state in the deterministic core');
    assert.equal(initial.chase.phase, 'safe');
    assert.ok(initial.chase.pressure > 0 && initial.chase.pressure < 0.3);
    assert.ok(initial.chase.distance > 300);

    for (let index = 0; index < 45; index += 1) {
      game.setPlayerForTest({ x: 520, y: 470, vx: 0, vy: 0 });
      game.step(0.1);
    }
    const pressured = game.getState();
    assert.ok(pressured.chase.pressure > initial.chase.pressure + 0.25);
    assert.ok(pressured.chase.distance < initial.chase.distance);

    for (let index = 0; index < 100 && game.getState().status === 'playing'; index += 1) {
      game.setPlayerForTest({ x: 520, y: 470, vx: 0, vy: 0 });
      game.step(0.1);
    }
    const caught = game.getState();
    assert.equal(caught.chase.pressure, 1);
    assert.equal(caught.status, 'failed');
    assert.equal(caught.failureReason, 'caught');
    assert.match(caught.message, /追上/);
  });

  test('a backward swing cannot drag guards backward and instead closes actual separation', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(34);
    const before = game.loadScenario('segment-first-pursuit');

    game.setPlayerForTest({ x: before.player.x - 90, y: 420, vx: -260, vy: 0 });
    game.step(1 / 120);
    const after = game.getState();

    assert.ok(after.pursuer.x >= before.pursuer.x, 'active guards must hold or advance in world space');
    assert.ok(after.pursuer.distance < before.pursuer.distance, 'back-swing must shrink actual separation');
    assert.equal(after.pursuer.distance, Math.max(0, after.player.x - after.pursuer.x));
    assert.ok(after.chase.pressure > before.chase.pressure, 'back-swing must raise catch pressure');
  });

  test('fast forward flight creates deterministic physical separation', () => {
    const { createGrappleGame } = requireCore();
    const first = createGrappleGame(35);
    const second = createGrappleGame(35);

    for (let index = 0; index < 38; index += 1) {
      for (const game of [first, second]) {
        game.setPlayerForTest({ x: 640, y: 470, vx: 0, vy: 0 });
        game.step(0.1);
      }
    }
    const before = first.getState().chase.pressure;
    const beforeDistance = first.getState().chase.distance;
    for (const game of [first, second]) game.setPlayerForTest({ vx: 620, vy: -80 });
    first.advanceTicks(60);
    second.advanceTicks(60);
    assert.deepEqual(first.getState().chase, second.getState().chase);
    assert.ok(first.getState().chase.distance > beforeDistance);
    assert.ok(first.getState().chase.pressure <= before);
  });

  test('catching a meaningfully forward interior-market anchor creates causal breathing room', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(36);
    assert.equal(game.act('press'), true);
    game.advanceTicks(116);
    game.act('release');
    const before = game.getState().chase.distance;
    assert.equal(game.act('press'), true);
    assert.ok(game.getState().attachedAnchorId);
    game.advanceTicks(48);
    assert.ok(game.getState().chase.distance > before);
  });

  test('the final twenty percent enters climax only when guards are physically threatening', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(37);
    const before = game.getState();
    game.setPlayerForTest({ x: before.finishX * 0.8, y: 470, vx: 0, vy: 0 });
    game.step(1 / 120);
    const climax = game.getState();
    assert.equal(climax.chase.phase, 'safe', 'progress alone cannot claim that guards accelerate');
    assert.ok(climax.progress >= 0.8);
    assert.equal(climax.attachRadius, before.attachRadius);
    assert.equal(climax.maxSpeed, before.maxSpeed);
    game.setPlayerForTest({ x: climax.pursuer.x + 250, y: 470, vx: 0, vy: 0 });
    assert.equal(game.advanceTicks(1).chase.phase, 'climax');
  });

  test('caught terminal state freezes chase and restart restores initial patrol distance', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(39);
    for (let index = 0; index < 140 && game.getState().status === 'playing'; index += 1) {
      game.setPlayerForTest({ x: 530, y: 470, vx: 0, vy: 0 });
      game.step(0.1);
    }
    const terminal = game.getState();
    assert.equal(terminal.failureReason, 'caught');
    game.step(5);
    assert.deepEqual(game.getState().chase, terminal.chase);
    assert.equal(game.getState().elapsed, terminal.elapsed);

    game.act('press');
    const restarted = game.getState();
    assert.equal(restarted.status, 'playing');
    assert.equal(restarted.failureReason, null);
    assert.equal(restarted.chase.pressure, 0.18);
    assert.equal(restarted.chase.phase, 'safe');
  });

  test('explicit pause freezes physics, elapsed time, and patrol pressure until resumed', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(41) as ReturnType<CoreModule['createGrappleGame']> & {
      setPaused?: (paused: boolean) => void;
    };
    assert.equal(typeof game.setPaused, 'function', 'expected an explicit deterministic pause hook');
    game.setPlayerForTest({ x: 520, y: 470, vx: 0, vy: 0 });
    game.setPaused(true);
    const paused = game.getState();
    game.step(5);
    assert.deepEqual(game.getState(), paused);
    game.setPaused(false);
    game.step(0.1);
    assert.ok(game.getState().elapsed > paused.elapsed);
    assert.ok(game.getState().pursuer.x > paused.pursuer.x);
  });

  test('rewarded revive after a chase catch restores safe but non-zero pressure', () => {
    const { createGrappleGame } = requireCore();
    const game = createGrappleGame(43);
    const finishX = game.getState().finishX;
    for (let index = 0; index < 140 && game.getState().status === 'playing'; index += 1) {
      game.setPlayerForTest({ x: finishX * 0.7, y: 470, vx: 0, vy: 0 });
      game.step(0.1);
    }
    assert.equal(game.getState().failureReason, 'caught');
    assert.equal(game.canRewardedRevive(), true);
    assert.equal(game.reviveFromSafeState(), true);
    const revived = game.getState();
    assert.equal(revived.status, 'playing');
    assert.equal(revived.failureReason, null);
    assert.ok(revived.chase.pressure >= 0.3 && revived.chase.pressure <= 0.5);
    assert.ok(revived.chase.distance > 250);
  });

  test('current-target pursuit trace proves lead, back-swing pressure, recovery, and contact catch', () => {
    const { createGrappleGame } = requireCore();
    type TraceRow = {
      tick: number;
      playerX: number;
      pursuerX: number;
      separation: number;
      playerVelocity: number;
      pursuerVelocity: number;
      pursuerAcceleration: number;
      pressure: number;
      catchState: string;
    };
    const trace = (game: ReturnType<CoreModule['createGrappleGame']>, ticks: number): TraceRow[] => {
      const rows: TraceRow[] = [];
      for (let tick = 0; tick < ticks && game.getState().status === 'playing'; tick += 1) {
        game.advanceTicks(1);
        const state = game.getState();
        rows.push({
          tick: state.tick,
          playerX: state.player.x,
          pursuerX: state.pursuer.x,
          separation: state.chase.distance,
          playerVelocity: state.player.vx,
          pursuerVelocity: state.pursuer.vx,
          pursuerAcceleration: state.pursuer.ax,
          pressure: state.chase.pressure,
          catchState: state.failureReason ?? state.status,
        });
      }
      return rows;
    };

    const forwardGame = createGrappleGame(101);
    assert.equal(forwardGame.act('press'), true);
    const forward = trace(forwardGame, 180);
    assert.ok(Math.max(...forward.slice(48, 150).map((row) => row.separation)) > forward[0]!.separation + 8,
      'forward flight must create measurable world separation');

    const swingGame = createGrappleGame(102);
    assert.equal(swingGame.act('press'), true);
    const swing = trace(swingGame, 380);
    const backwardStart = swing.findIndex((row, index) => index > 120 && row.playerVelocity < -5);
    assert.ok(backwardStart >= 0, 'normal hold must produce a backward swing');
    const backwardEnd = Math.min(swing.length - 1, backwardStart + 32);
    assert.ok(swing[backwardEnd]!.separation < swing[backwardStart]!.separation - 8,
      'backward swing must shrink actual separation');
    assert.ok(swing[backwardEnd]!.pursuerX >= swing[backwardStart]!.pursuerX,
      'pursuer must remain monotonic in world space');
    assert.ok(swing[backwardStart]!.pursuerAcceleration < -50,
      'pursuer must begin braking from the current player velocity');
    assert.ok(swing[backwardEnd]!.pursuerVelocity < swing[backwardStart]!.pursuerVelocity - 12,
      'pursuer must brake toward the current backward target instead of the old segment speed');

    const recoveryGame = createGrappleGame(103);
    assert.equal(recoveryGame.act('press'), true);
    recoveryGame.advanceTicks(170);
    assert.equal(recoveryGame.act('release'), true);
    recoveryGame.advanceTicks(50);
    assert.equal(recoveryGame.act('press'), true);
    const recoveryStart = recoveryGame.getState().chase.distance;
    const recovery = trace(recoveryGame, 72);
    assert.ok(recovery.length > 0 && recovery[recovery.length - 1]!.separation > recoveryStart + 24,
      'a clean forward recovery must reopen actual separation');

    const catchGame = createGrappleGame(104);
    assert.equal(catchGame.act('press'), true);
    const caught = trace(catchGame, 600);
    const terminal = catchGame.getState();
    assert.equal(terminal.failureReason, 'caught');
    assert.ok(caught.some((row) => row.separation <= 24.001),
      'caught must follow real contact, not a progress threshold');
  });
});
