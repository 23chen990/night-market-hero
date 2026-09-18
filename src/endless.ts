export type SegmentType = 'swing'|'terrain'|'fork'|'obstacle'|'sky'|'gate';
export type Mutation = '起雾'|'下雨'|'封灯'|'宵禁加派';
export interface Segment { index:number; type:SegmentType; block:number; isGate:boolean; isSky:boolean; anchorSpacing:number; lengthPx:number; }
export interface Difficulty { speedMultiplier:number; anchorSpacing:number; assistAttachRadius:number; gateCloseTicks:number; pursuitSpeedBonus:number; }
export interface SpeedFeelProfile { trailAlpha:number; speedLineAlpha:number; parallaxFactor:number; }
export interface VehicleDefinition { id:string; startSegment:number; probability:number; skyProbability?:number; durationSeconds:number; hold:string; release:string; fallImmune:boolean; catchImmune:boolean; }
export type PickupKind = 'high-route'|'swing-apex'|'gate-brush'|'low-safety'|'backswing';
export interface PickupPlacement { kind:PickupKind; segment:number; value:number; }

export const BASE_SEGMENT_LENGTH_PX = 1600;
export const METERS_PER_PIXEL = 1 / 30;
export function speedMultiplierAtSegment(index:number):number { return 1 + 0.035 * Math.max(0,index); }
/** Continuous, presentation-only velocity mapping. Gameplay never reads these values. */
export function speedFeelProfile(speed:number, reducedMotion:boolean):SpeedFeelProfile {
  if (reducedMotion) return { trailAlpha:0, speedLineAlpha:0, parallaxFactor:0.18 };
  const normalized = Math.max(0, Math.min(1, (Math.abs(speed) - 245) / 275));
  return {
    trailAlpha: 0.08 + normalized * 0.24,
    speedLineAlpha: normalized * 0.2,
    parallaxFactor: 0.18 + normalized * 0.24,
  };
}
export function segmentLengthPx(index:number):number { return BASE_SEGMENT_LENGTH_PX * speedMultiplierAtSegment(index); }
export function segmentStartPx(index:number):number {
  const count = Math.max(0, Math.floor(index));
  return BASE_SEGMENT_LENGTH_PX * (count + 0.035 * count * (count - 1) / 2);
}
export function segmentIndexAtX(x:number):number {
  const target = Math.max(0, x);
  let index = 0;
  while (segmentStartPx(index + 1) <= target && index < 100000) index += 1;
  return index;
}
export function segmentProgressAtX(x:number):number {
  const index = segmentIndexAtX(x);
  const length = segmentLengthPx(index);
  return Math.max(0, Math.min(1, (Math.max(0, x) - segmentStartPx(index)) / length));
}
/**
 * The single market-gate landmark belongs to the middle of its gate segment.
 * Keeping this conversion here prevents the renderer and gameplay from
 * inventing separate 1600px buckets as the speed-scaled segments grow.
 */
export function gateCheckpointXForSegment(index:number):number {
  const segment = Math.max(0, Math.floor(index));
  return segmentStartPx(segment) + segmentLengthPx(segment) / 2;
}
export function retentionBoundsAtSegment(index:number):{behindStartPx:number;aheadEndPx:number} {
  const segment = Math.max(0, Math.floor(index));
  return { behindStartPx: segmentStartPx(Math.max(0, segment - 2)), aheadEndPx: segmentStartPx(segment + 3) };
}
export function metersAtSegment(index:number):number { const n=Math.max(0,Math.floor(index)); return BASE_SEGMENT_LENGTH_PX * (n + 0.035 * n*(n+1)/2) * METERS_PER_PIXEL; }
export function difficultyAtSegment(index:number):Difficulty { const i=Math.max(0,Math.floor(index)); const block=Math.floor(i/4); return { speedMultiplier:speedMultiplierAtSegment(i), anchorSpacing:Math.min(520,325+18*block), assistAttachRadius:Math.max(560,680-10*block), gateCloseTicks:Math.max(170,240-9*block), pursuitSpeedBonus:Math.min(40,-180+26*block) }; }
export function skySpacing(index:number):number { return difficultyAtSegment(index).anchorSpacing * 1.3; }
export function segmentForIndex(index:number):Segment { const i=Math.max(0,Math.floor(index)); const first=i<3; const local=first?i:i-3; const cycle=first&&i===2?3:local%4; const type:SegmentType=first ? (i===0?'swing':i===1?'terrain':'gate') : (cycle===3?'gate':(['terrain','fork','swing'] as SegmentType[])[cycle] ?? 'swing'); const isSky=!first && i>=7 && type!=='gate' && local%4===1; return {index:i,type:isSky?'sky':type,block:Math.floor(i/4),isGate:type==='gate',isSky,anchorSpacing:isSky?skySpacing(i):difficultyAtSegment(i).anchorSpacing,lengthPx:segmentLengthPx(i)}; }
export const MUTATION_POOL:Mutation[]=['起雾','下雨','封灯','宵禁加派'];
// 同一 run（同 seed）的确定性变异序列缓存：保证暂停恢复后同一段变异一致。
// 设计 noMutationRepeatWithinRun：最近 2 段内不重复同一种变异，超出后允许循环。
const mutationSequenceCache = new Map<number, Mutation[]>();
function mutationRoll(seed:number, segment:number):number {
  let v = (Math.imul(Math.trunc(seed) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(Math.trunc(segment) + 1, 0xc2b2ae35)) >>> 0;
  v = Math.imul(v ^ (v >>> 16), 0x85ebca6b) >>> 0;
  v = Math.imul(v ^ (v >>> 13), 0xc2b2ae35) >>> 0;
  return ((v ^ (v >>> 16)) >>> 0);
}
/**
 * 变异抽取：第 3 段起（mutationStartsBySegment=3）才可能出现变异。
 * 纯函数（seed, segment 决定），沿用 metaProgress 随里程放开池子的规则；
 * 逐段推导并在「最近 2 段」内避免重复，保证无限长局内不连续重复同种变异。
 */
export function chooseMutation(segmentIndex:number, _metaProgress:number, seed:number):Mutation|null {
  const idx = Math.max(0, Math.floor(segmentIndex));
  if (idx < 3) return null; // 变异起始段：第3段起
  let seq = mutationSequenceCache.get(seed) ?? [];
  if (seq.length <= idx) {
    for (let s = Math.max(3, seq.length); s <= idx; s++) {
      const pool = MUTATION_POOL.slice(0, Math.min(MUTATION_POOL.length, 1 + Math.floor(Math.max(0, metersAtSegment(s)) / 600)));
      const base = mutationRoll(seed, s) % pool.length;
      const prev1 = seq[s - 1] ?? null;
      const prev2 = seq[s - 2] ?? null;
      let chosen = pool[base]!;
      if (chosen === prev1 || chosen === prev2) {
        // 在池内找一个未被最近2段占用的候选；池<=2且全被占用则允许循环（保持原样）
        for (let k = 1; k < pool.length; k++) {
          const cand = pool[(base + k) % pool.length]!;
          if (cand !== prev1 && cand !== prev2) { chosen = cand; break; }
        }
      }
      seq[s] = chosen;
    }
    mutationSequenceCache.set(seed, seq);
  }
  return seq[idx] ?? null;
}
export const VEHICLES:readonly VehicleDefinition[]=[
 {id:'纸鸢',startSegment:2,probability:.18,durationSeconds:6,hold:'拉升',release:'滑翔',fallImmune:true,catchImmune:false},
 {id:'货运滑索',startSegment:2,probability:.18,durationSeconds:3,hold:'加速滑行',release:'脱轨弹射',fallImmune:false,catchImmune:false},
 {id:'灯笼群',startSegment:2,probability:.18,durationSeconds:5,hold:'凭空挂接',release:'结束挂接',fallImmune:false,catchImmune:false},
 {id:'青鸾',startSegment:6,probability:.06,skyProbability:.12,durationSeconds:12,hold:'振翅爬升',release:'俯冲加速',fallImmune:false,catchImmune:true},
];
export function vehicleForSegment(index:number,sky:boolean):VehicleDefinition|undefined { if(sky && index>=6) return VEHICLES.find(v=>v.id==='青鸾'); return VEHICLES.find(v=>index>=v.startSegment && v.id!=='青鸾'); }
export function vehicleProbabilityAtSegment(index:number, sky:boolean, id:string):number {
  const vehicle = VEHICLES.find((item) => item.id === id);
  if (!vehicle || index < vehicle.startSegment) return 0;
  return id === '青鸾' ? (sky ? (vehicle.skyProbability ?? vehicle.probability * 2) : 0) : vehicle.probability;
}
/**
 * Deterministic [0,1) roll derived from run seed + segment + salt. Mirrors the
 * integer-mix pattern in district-world.ts so replays of the same seed/segment
 * always grant the same vehicle (or none).
 */
export function vehicleRoll(seed:number, segment:number, salt:number):number {
  let value = (Math.imul(Math.trunc(seed) ^ 0x9e3779b9, 0x85ebca6b)
    ^ Math.imul(Math.trunc(segment) + 1, 0xc2b2ae35)
    ^ Math.imul(Math.trunc(salt), 0x27d4eb2f)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
}
/**
 * Resolve which vehicle (if any) appears for a segment. Ground segments draw
 * each eligible vehicle by its per-segment probability; sky segments only ever
 * yield 青鸾. Returns null for an ordinary segment. Pure function of
 * (seed, segment, sky) — identical replays stay identical.
 */
export function rollVehicleForSegment(seed:number, segment:number, sky:boolean):string|null {
  if (sky) {
    const bird = VEHICLES.find((item) => item.id === '青鸾');
    if (bird && segment >= bird.startSegment
      && vehicleRoll(seed, segment, 0x424242) < (bird.skyProbability ?? bird.probability * 2)) return bird.id;
    return null;
  }
  const ground = VEHICLES.filter((item) => item.id !== '青鸾' && segment >= item.startSegment);
  let roll = vehicleRoll(seed, segment, 0x515151);
  for (const vehicle of ground) {
    if (roll < vehicle.probability) return vehicle.id;
    roll -= vehicle.probability;
  }
  return null;
}
export function pickupPlacementForSegment(segment:number):PickupPlacement[] {
  const index = Math.max(0, Math.floor(segment));
  const result:PickupPlacement[] = [
    { kind: index % 3 === 0 ? 'high-route' : 'low-safety', segment: index, value: 4 },
    { kind: 'swing-apex', segment: index, value: 6 },
  ];
  if (segmentForIndex(index).isGate) result.push({ kind: 'gate-brush', segment: index, value: 8 });
  else if (index % 4 === 0) result.push({ kind: 'backswing', segment: index, value: 8 });
  return result;
}
export function pickupCollisionWindow(segment:number):number[] { const index=Math.max(0,Math.floor(segment)); return [Math.max(0,index-1), index, index+1]; }
export function comboMultiplier(combo:number,character?:string):number { return Math.min(character==='提灯童'?3:4,1+Math.floor(Math.max(0,combo)/2)); }
export function comboTier(combo:number):1|2|3|4 { return Math.min(4,Math.max(1,Math.floor(Math.max(0,combo)/2)+1)) as 1|2|3|4; }
export function depthCoefficient(segmentOrMeters:number):number { const segment=Math.max(0,segmentOrMeters); return 1+0.10*Math.floor(segment/4); }
// 金币结算：floor(里程米数*0.12) + 拾取金币*连击倍率*深度系数 + 坊门数*8
// 连击倍率用 comboMultiplier（含提灯童上限），深度系数由调用方按街区块传入。
export function settlementCoins(input:{distanceMeters?:number;gates:number;pickups?:number;pickupCoins?:number;combo?:number;depthMultiplier?:number;character?:string}):number {
  const distanceMeters = Math.max(0, input.distanceMeters ?? 0);
  const pickupCoins = Math.max(0, input.pickupCoins ?? input.pickups ?? 0);
  const combo = Math.max(0, input.combo ?? 0);
  const depthMultiplier = input.depthMultiplier ?? 1;
  const distanceTerm = Math.floor(distanceMeters * 0.12);
  const pickupTerm = pickupCoins * comboMultiplier(combo, input.character) * depthMultiplier;
  const gateTerm = Math.max(0, input.gates) * 8;
  return Math.max(0, Math.floor(distanceTerm + pickupTerm + gateTerm));
}
