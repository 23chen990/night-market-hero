import { rollVehicleForSegment, segmentForIndex, segmentIndexAtX, segmentStartPx, segmentLengthPx, type VehicleId } from './endless.ts';
import type { GrappleState } from './game-core.ts';
import { encounterInstructions } from './vehicle-encounters.ts';

/** The first lap is authored, not a lottery. Later laps keep seeded variety. */
export const OPENING_ENCOUNTERS = Object.freeze([
  { segment: 2, vehicle: '货运滑索' },
  { segment: 4, vehicle: '纸鸢' },
  { segment: 6, vehicle: '灯笼群' },
  { segment: 8, vehicle: '青鸾' },
] as const);

export function directedVehicle(seed: number, segment: number): VehicleId | null {
  const opening = OPENING_ENCOUNTERS.find(beat => beat.segment === segment);
  if (opening) return opening.vehicle;
  if (segment <= 9 || segment % 3 !== 2) return null;
  return rollVehicleForSegment(seed, segment, segmentForIndex(segment).isSky);
}

export function directedMutation(seed: number, segment: number): string | null {
  // Closing-gate weather has no effect in open-street mode: never advertise it.
  if (segment < 3 || segment % 2 === 0) return null;
  const effects = ['起雾', '下雨', '宵禁加派'] as const;
  return effects[(Math.floor((segment - 3) / 2) + (segment < 9 ? 0 : Math.abs(Math.floor(seed)))) % effects.length]!;
}

export function guidedPickups(segment: number): GrappleState['activePickups'] {
  const start = segmentStartPx(segment);
  const span = segmentLengthPx(segment);
  const arc = [520, 460, 390, 370, 420, 500];
  const result: GrappleState['activePickups'] = arc.map((y, index) => ({
    kind: index === 2 || index === 3 ? 'high-route' : 'swing-apex', segment,
    value: index === 2 || index === 3 ? 3 : 2,
    x: start + span * (0.15 + index * 0.13), y, collected: false,
  }));
  for (let index = 0; index < 3; index++) result.push({
    kind: 'low-safety', segment, value: 2,
    x: start + span * (0.3 + index * 0.2), y: 655 - index * 20, collected: false,
  });
  return result;
}

/** Count actual checkpoint crossings, not entry into a checkpoint's segment. */
export function completedCheckpoints(x: number): number {
  const index = segmentIndexAtX(Math.max(0, x));
  if (index < 2) return 0;
  const prior = Math.floor((index - 2) / 4);
  const gate = 2 + prior * 4;
  return prior + (x >= segmentStartPx(gate) + segmentLengthPx(gate) * 0.5 ? 1 : 0);
}

export function nextCheckpointX(x: number): number {
  const next = 2 + completedCheckpoints(x) * 4;
  return segmentStartPx(next) + segmentLengthPx(next) * 0.5;
}

export function pointSegmentDistance(point: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length));
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
}

export function isStylishRelease(player: Pick<GrappleState['player'], 'vx' | 'vy'>): boolean {
  return Math.hypot(player.vx, player.vy) >= 360 && player.vx > 200 && player.vy < 120;
}

export interface ControlCue { title: string; detail: string; tone: 'neutral' | 'ready' | 'danger'; }
export function controlCue(state: GrappleState): ControlCue {
  // Recovery outranks an optional pickup. A distant bird or low lantern
  // previously kept advertising its approach while the unroped hero fell.
  // Do not override a mounted vehicle, an upward low pass, or a live rope.
  if (!state.vehicleId && !state.attachedAnchorId
    && state.player.y > 730 && state.player.vy > 80) return {
      title: state.inputHeld ? '保持按住 · 接前方飞索' : '快按住！接住前方挂点',
      detail: '先接住飞索，载具可以下次再抢', tone: 'danger',
    };
  const attachedAnchor = state.anchors.find(item => item.id === state.attachedAnchorId);
  if (!state.vehicleId && state.inputHeld && attachedAnchor
    && state.player.x >= attachedAnchor.x + 12
    && state.player.vx < 260 && state.player.vy < 120) return {
      title: state.player.vx < 0 ? '荡回来了！赶紧松手' : '要荡回去了！赶紧松手',
      detail: '飞出去再接下一根，别停在旧索上',
      tone: state.chase.distance < 340 ? 'danger' : 'ready',
    };
  // Qingluan needs TWO real stylish rope releases, so the warning must arrive
  // during the preceding street rather than just 920px (around 1–2s) away.
  // This changes only the visual cue, never the spawned encounter or reward.
  const nextOffer = state.vehicleOffers?.find(offer => offer.status === 'available'
    && offer.x >= state.player.x - 130
    && offer.x <= state.player.x + (offer.id === '青鸾' ? 2000 : 920));
  if (!state.vehicleId && nextOffer) {
    const birdTicks = (state.stylishReleaseTicks ?? []).filter(t => state.tick - t <= 1200).length;
    const distance = nextOffer.x - state.player.x;
    const margin = nextOffer.radiusY ?? 90;
    const tooLow = state.player.y > nextOffer.y + margin;
    const tooHigh = state.player.y < nextOffer.y - margin;
    const adjustHeight = tooLow ? '先接高处飞索，向上荡' : tooHigh ? '向下调整飞行高度' : '';
    // Physical position stays on an authored building support; this hint only
    // tells the player how to *reach* the real target, not its secret hitbox.
    if (nextOffer.id === '青鸾') {
      const earned = Math.min(2, birdTicks);
      const anchor = state.anchors.find(item => item.id === state.attachedAnchorId);
      if (birdTicks < 2 && state.inputHeld && anchor
        && state.player.x >= anchor.x && isStylishRelease(state.player)) return {
          title: `现在松手 · 青鸾准备 ${earned}/2`,
          detail: '这次向前上升的松手，可以积累资格', tone: 'ready',
        };
      if (distance > 950) return {
        title: `青鸾将至 · 漂亮松手 ${earned}/2`,
        detail: birdTicks < 2
          ? '先在高屋檐完成两次漂亮松手'
          : '保持高线，靠近翼环后松手',
        tone: 'ready',
      };
      if (birdTicks < 2) return {
        title: `青鸾考验 · 漂亮松手 ${earned}/2`,
        detail: '向前上升时松手；普通松手会断连',
        tone: 'ready',
      };
      if (distance > 350) return {
        title: '青鸾资格已备好 · 走高线',
        detail: '接高屋檐，荡到翼环前再松手', tone: 'ready',
      };
      if (tooLow) return {
        title: '青鸾在上方 · 先荡高',
        detail: '借当前屋檐荡高，再松手入圈', tone: 'ready',
      };
      if (distance > -65 && distance < 180 && state.attachedAnchorId) return {
        title: '现在松手 · 飞进青鸾翼环',
        detail: '两次准备已完成，离索后接青鸾', tone: 'ready',
      };
      if (distance > -65 && !state.inputHeld) return {
        title: '保持松手，穿过青鸾发光圈',
        detail: '先穿过翼环，接住后再按住振翅', tone: 'ready',
      };
    }
    if (nextOffer.id === '纸鸢' && distance > 320 && distance <= 920 && state.attachedAnchorId)
      return { title: '纸鸢高线：过挂点后多荡半拍',
        detail: '在屋檐飞索上升时松手，再飞进鸢绳柄', tone: 'ready' };
    // The lantern takes a RELEASE followed by a NEW PRESS. The generic
    // high-route hint used to override this and told an already-too-high
    // rider to swing higher, which is the opposite of reaching its low knot.
    if (nextOffer.id === '灯笼群' && distance > -80 && distance <= 350) {
      const inVisibleHeightBand = Math.abs(state.player.y - nextOffer.y) <= margin * 0.90;
      if (state.inputHeld) {
        // "Release now" at 350px previously pulled natural players UP onto
        // a prior roof rope until it stalled far above the lower lantern.
        // Give the player a real approach phase, followed by an actionable
        // near-knot release-then-FRESH-press rather than a magic catch.
        if (distance > 150 && state.player.y < nextOffer.y - margin - 30
          && !!state.attachedAnchorId && state.player.vx < 260)
          return { title: '要倒摆了！赶紧松手',
            detail: '下一根接低屋檐，靠近灯绳', tone: 'danger' };
        if (distance > 150) return {
          title: '灯绳在前 · 先沿低屋檐前进',
          detail: '靠近灯绳再松手，入圈时重新按住', tone: 'ready',
        };
        if (state.player.y >= nextOffer.y - margin - 30 && state.player.vx > 165)
          return { title: '现在松开旧索',
            detail: '飞进灯绳圈，再按住接绳', tone: 'ready' };
        return { title: '灯绳在下方，先调整到低路线',
          detail: '别挂到倒摆，错过也能继续', tone: 'ready' };
      }
      if (distance <= 180 && inVisibleHeightBand) return {
        title: '现在按住！接住灯绳结',
        detail: '入圈后新按一次，才能接住', tone: 'ready',
      };
      if (state.player.y < nextOffer.y - margin * 0.90) return {
        title: '灯绳在下方，保持松手下降',
        detail: '降到发光绳圈，再按住接索', tone: 'ready',
      };
      if (state.player.y > nextOffer.y + margin * 0.90) return {
        title: '灯绳在上方，这次可能赶不上',
        detail: '这次略过，下次提早调整高度', tone: 'neutral',
      };
    }
    // The first ride opportunity is the player's introduction to optional
    // world objects. Show the ACTION while there is still enough distance
    // to choose a roof line, not only once a difficult 170px window is gone.
    if (nextOffer.id === '货运滑索' && distance > 330 && distance < 850) {
      if (tooHigh && state.attachedAnchorId) return {
        title: '第一辆滑索在下方！先换低线',
        detail: '换低屋檐，靠近黄色挂环再松手',
        tone: 'ready',
      };
      if (!tooHigh && !tooLow) return {
        title: '第一辆滑索要来了！准备抢',
        detail: '先摆荡，靠近黄色挂环再松手',
        tone: 'ready',
      };
    }
    if (nextOffer.id === '货运滑索' && distance > -75 && distance < 200
      && !state.inputHeld && state.tick - state.lastGrappleReleaseTick >= 0
      && state.tick - state.lastGrappleReleaseTick <= 40
      && Math.abs(state.player.y - nextOffer.y) < margin + 60) return {
        title: '保持松手！滑过黄色挂环',
        detail: '先穿过挂环，别急着接普通飞索',
        tone: 'ready',
      };
    // A conservative rider can be high ABOVE the first pulley and lose
    // momentum on the OLD roof rope without ever reaching its low handle.
    // Warn while forward speed remains; skipping a pickup is preferable to
    // an unexplained backward swing and officer capture. Never auto-release.
    if (nextOffer.id === '货运滑索' && distance > -80 && distance < 330
      && tooHigh && !!state.attachedAnchorId
      && state.player.vx >= 0 && state.player.vx < 450) {
      return {
        title: '吊轮在下方 · 赶紧松手',
        detail: '别挂到倒退，错过也能继续',
        tone: state.chase.distance < 340 ? 'danger' : 'ready',
      };
    }
    if (distance <= 320 && adjustHeight) return {
      title: `前方 ${nextOffer.id} · ${adjustHeight}`,
      detail: encounterInstructions(nextOffer.id), tone: 'ready',
    };
    const imminent = distance < 170 && distance > -65;
    if (nextOffer.id === '货运滑索' && imminent && state.attachedAnchorId)
      return { title: '现在松手！飞向货运滑索', detail: '只有飞进挂环才算接住', tone: 'ready' };
    if (nextOffer.id === '纸鸢' && imminent)
      return state.attachedAnchorId || state.inputHeld
        ? { title: '松手飞进鸢绳圈！', detail: '借屋檐摆荡向上，离开飞索后穿过发光圈', tone: 'ready' }
        : { title: '保持松手！鸢绳就在前方', detail: '先接住纸鸢，再按住拉升；现在接钩会错过', tone: 'ready' };
    // Bird-specific preflight, qualifying streak and release timing are handled
    // above the generic height hint; do not overwrite them here.
    return { title: `前方 ${nextOffer.id} · ${Math.max(0, Math.round(distance / 30))}m`,
      detail: adjustHeight || encounterInstructions(nextOffer.id), tone: 'ready' };
  }
  if (state.vehicleId === '货运滑索') return { title: '按住加速 · 松手弹射', detail: '滑索带你穿街，松手后可继续接飞索', tone: 'ready' };
  if (state.vehicleId === '纸鸢') return { title: '按住拉升 · 松手滑翔', detail: '顺着金币调整高度', tone: 'neutral' };
  if (state.vehicleId === '青鸾') return { title: '按住振翅 · 松手俯冲', detail: '追兵暂退，不要俯冲太久', tone: state.player.y > 700 ? 'danger' : 'ready' };
  if (state.vehicleId === '灯笼群') return state.vehiclePhase === 'holding' && state.player.vx < 240
    ? { title: '马上松手！官兵要追上了', detail: '吊灯连接太久会减速；松手可向前冲', tone: 'danger' }
    : { title: '按住连接 · 松手前飞', detail: '慢下来了就松手，再按住可重新挂接', tone: 'ready' };
  if (state.attachedAnchorId) {
    const anchor = state.anchors.find(item => item.id === state.attachedAnchorId);
    const ready = isStylishRelease(state.player) && !!anchor && state.player.x >= anchor.x;
    if (ready) return { title: '现在松手！', detail: '向前飞出，再按住接下一个', tone: 'ready' };
    // Show a warning WHILE an actual release can still keep forward motion.
    // There is no hidden auto-release, teleport or guard mercy.
    if (anchor && state.player.x >= anchor.x + 12
      && state.player.vx >= 0 && state.player.vx < 260 && state.player.vy < 120)
      return { title: '要荡回去了！赶紧松手', detail: '飞出去后再按住下一根索，避免被追兵抓住',
        tone: state.chase.distance < 340 ? 'danger' : 'ready' };
    return { title: state.player.vx < 0 ? '荡回来了，松手换挂点' : '按住摆荡',
      detail: state.player.vx < 0 ? '立刻松手，向前飞时再接钩' : '身体越过挂点向前时松手', tone: 'neutral' };
  }
  return { title: '按住接飞索', detail: '金色高线多拿钱 · 青色低线缓解追兵', tone: 'neutral' };
}
