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
  const nextOffer = state.vehicleOffers?.find(offer => offer.status === 'available'
    && offer.x >= state.player.x - 130 && offer.x <= state.player.x + 920);
  if (!state.vehicleId && nextOffer) {
    const birdTicks = (state.stylishReleaseTicks ?? []).filter(t => state.tick - t <= 1200).length;
    const distance = nextOffer.x - state.player.x;
    const margin = nextOffer.radiusY ?? 90;
    const tooLow = state.player.y > nextOffer.y + margin;
    const tooHigh = state.player.y < nextOffer.y - margin;
    const adjustHeight = tooLow ? '先接高处飞索，向上荡' : tooHigh ? '向下调整飞行高度' : '';
    if (nextOffer.id === '青鸾' && birdTicks < 2)
      return { title: `青鸾机会 · 漂亮松手 ${birdTicks}/2`,
        detail: '连续两次成功接钩与松手，再飞向高空青鸾', tone: 'ready' };
    if (distance <= 320 && adjustHeight) return {
      title: `前方 ${nextOffer.id} · ${adjustHeight}`,
      detail: encounterInstructions(nextOffer.id), tone: 'ready',
    };
    const imminent = distance < 250 && distance > -65;
    if (nextOffer.id === '货运滑索' && imminent && state.attachedAnchorId)
      return { title: '现在松手！飞向货运滑索', detail: '只有飞进挂环才算接住', tone: 'ready' };
    if (nextOffer.id === '灯笼群' && imminent && !state.inputHeld)
      return { title: '灯绳在前！按住接索', detail: '经过实体绳结时按住，过早按住会错过', tone: 'ready' };
    if (nextOffer.id === '纸鸢' && imminent)
      return { title: '松手接鸢绳！', detail: '先荡到屋檐高度，再飞入纸鸢下方挂柄', tone: 'ready' };
    if (nextOffer.id === '青鸾' && imminent)
      return { title: '青鸾在前！把握松手时机', detail: '飞到高线并完成两次漂亮松手', tone: 'ready' };
    return { title: `前方 ${nextOffer.id} · ${Math.max(0, Math.round(distance / 30))}m`,
      detail: adjustHeight || encounterInstructions(nextOffer.id), tone: 'ready' };
  }
  if (state.vehicleId === '货运滑索') return { title: '按住加速 · 松手弹射', detail: '滑索带你穿街，松手后可继续接飞索', tone: 'ready' };
  if (state.vehicleId === '纸鸢') return { title: '按住拉升 · 松手滑翔', detail: '顺着金币调整高度', tone: 'neutral' };
  if (state.vehicleId === '青鸾') return { title: '按住振翅 · 松手俯冲', detail: '追兵暂退，不要俯冲太久', tone: state.player.y > 700 ? 'danger' : 'ready' };
  if (state.vehicleId === '灯笼群') return state.vehiclePhase === 'holding' && state.player.vx < 240
    ? { title: '马上松手！官兵要追上了', detail: '吊灯连接太久会减速；松手可向前冲', tone: 'danger' }
    : { title: '按住连接 · 松手前飞', detail: '慢下来了就松手，再按住可重新挂接', tone: 'ready' };
  if (state.player.y > 730 && !state.attachedAnchorId) return { title: '快按住！接住前方挂点', detail: '松手太久会坠落', tone: 'danger' };
  if (state.attachedAnchorId) {
    const anchor = state.anchors.find(item => item.id === state.attachedAnchorId);
    const ready = isStylishRelease(state.player) && !!anchor && state.player.x >= anchor.x;
    return ready ? { title: '现在松手！', detail: '向前飞出，再按住接下一个', tone: 'ready' }
      : { title: state.player.vx < 0 ? '荡回来了，松手换挂点' : '按住摆荡', detail: '身体越过挂点向前时松手', tone: 'neutral' };
  }
  return { title: '按住接飞索', detail: '金色高线多拿钱 · 青色低线缓解追兵', tone: 'neutral' };
}
