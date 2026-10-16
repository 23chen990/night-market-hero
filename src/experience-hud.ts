import type { GrappleState } from './game-core.ts';
import { controlCue, OPENING_ENCOUNTERS } from './experience-director.ts';
import { segmentStartPx } from './endless.ts';

export class FlightAudio {
  private context: AudioContext | null = null;
  private lastAt = -1000;
  muted = false;
  constructor() { try { this.muted = localStorage.getItem('night-market.sound') === 'off'; } catch { /* Audio preferences are noncritical. */ } }
  unlock(): void {
    if (this.muted) return;
    try { this.context ??= new AudioContext(); void this.context.resume().catch(() => undefined); } catch { /* Audio is optional. */ }
  }
  toggle(): void {
    this.muted = !this.muted;
    try { localStorage.setItem('night-market.sound', this.muted ? 'off' : 'on'); } catch { /* Keep the current session usable. */ }
    if (this.muted) { if (this.context) void this.context.suspend().catch(() => undefined); } else this.unlock();
  }
  play(kind: 'coin' | 'combo' | 'ride' | 'finish'): void {
    const context = this.context;
    if (this.muted || !context || context.state !== 'running' || context.currentTime - this.lastAt < 0.09) return;
    this.lastAt = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    const pitch = kind === 'coin' ? 880 : kind === 'combo' ? 660 : kind === 'ride' ? 440 : 520;
    oscillator.frequency.setValueAtTime(pitch, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(pitch * 1.5, context.currentTime + 0.11);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.17);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.18);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
}

interface HudActions { start(): void; resume(): void; finish(): void; claimMissions(): void; }
export interface ExperienceMeta { claimableReward: number; bestDistance: number; }
function text(node: HTMLElement, value: string): void { if (node.textContent !== value) node.textContent = value; }

/** HUD-only priority from the visible guard phase and pressure.
 * Does not change chase physics, kill radius, or score calculation.
 */
export function chaseReadoutUrgency(phase: string, pressure: number): 'calm' | 'alert' | 'danger' {
  if (phase === 'danger' || phase === 'climax' || pressure >= 0.75) return 'danger';
  if (phase === 'alert' || pressure >= 0.35) return 'alert';
  return 'calm';
}

/** A small, legible play layer. It never advances or changes physics itself. */
export class ExperienceHud {
  readonly audio = new FlightAudio();
  readonly layer: HTMLElement;
  private readonly launch: HTMLElement;
  private readonly metric: HTMLElement;
  private readonly goal: HTMLElement;
  private readonly pursuit: HTMLElement;
  private readonly cue: HTMLElement;
  private readonly cueTitle: HTMLElement;
  private readonly cueDetail: HTMLElement;
  private readonly ride: HTMLElement;
  private readonly rideName: HTMLElement;
  private readonly rideTime: HTMLElement;
  private readonly toast: HTMLElement;
  private readonly claimButton: HTMLButtonElement;
  private readonly finishButton: HTMLButtonElement;
  private readonly soundButton: HTMLButtonElement;
  private previous: { offerTick: number; tick: number; level: string; vehicle: string | null; pickups: number; combo: number; gates: number; mutation: string | null; status: string } | null = null;
  private toastUntil = 0;
  private awaiting = false;

  constructor(root: HTMLElement, actions: HudActions) {
    this.layer = document.createElement('section');
    this.layer.className = 'experience-layer';
    this.layer.setAttribute('aria-label', '飞行状态与操作提示');
    this.layer.innerHTML = `
      <div class="flight-metrics" data-experience="metrics"></div>
      <div class="flight-goal" data-experience="goal"></div>
      <div class="pursuit-readout" data-experience="pursuit" role="status" aria-live="off">
        <strong>官兵正在追</strong><span>还有 0 步</span><i aria-hidden="true"></i>
      </div>
      <div class="ride-badge" data-experience="ride" hidden><strong></strong><span></span></div>
      <div class="flight-toast" data-experience="toast" role="status" hidden></div>
      <div class="control-coach" data-experience="cue"><strong></strong><span></span></div>
      <div class="launch-card" data-experience="launch" hidden>
        <small>一根手指，穿过整座夜市</small><h1>夜市飞侠</h1>
        <p>按住摆荡 → 向前时松手 → 再按住接下一个</p>
        <button type="button" data-action="start-run">开始护送</button>
        <span>也可直接按住画面或空格键起飞</span>
      </div>`;
    root.append(this.layer);
    const get = (name: string): HTMLElement => this.layer.querySelector(`[data-experience="${name}"]`)!;
    this.launch = get('launch'); this.metric = get('metrics'); this.goal = get('goal'); this.pursuit = get('pursuit'); this.cue = get('cue');
    this.cueTitle = this.cue.querySelector('strong')!; this.cueDetail = this.cue.querySelector('span')!;
    this.ride = get('ride'); this.rideName = this.ride.querySelector('strong')!; this.rideTime = this.ride.querySelector('span')!;
    this.toast = get('toast');
    this.launch.querySelector('button')!.addEventListener('click', () => { this.audio.unlock(); actions.start(); });
    const pause = root.querySelector<HTMLElement>('[data-ui="pause-overlay"]')!;
    const controls = document.createElement('div'); controls.className = 'pause-actions';
    controls.innerHTML = `<h2>暂停休息</h2><p>按住摆荡，看到“现在松手”就向前飞。</p>
      <button class="reward-button" data-action="resume-run">继续飞行</button>
      <button class="plain-button" data-action="finish-patrol">收工结算</button>
      <button class="plain-button" data-action="toggle-sound"></button>
      <small>浏览器试玩版未接入真实广告；不看广告也能完整游玩。</small>`;
    pause.prepend(controls);
    controls.querySelector('[data-action="resume-run"]')!.addEventListener('click', actions.resume);
    this.finishButton = controls.querySelector('[data-action="finish-patrol"]')!;
    this.finishButton.addEventListener('click', actions.finish);
    this.soundButton = controls.querySelector('[data-action="toggle-sound"]')!;
    this.soundButton.addEventListener('click', () => { this.audio.toggle(); this.renderSound(); });
    this.renderSound();
    this.claimButton = document.createElement('button');
    this.claimButton.type = 'button'; this.claimButton.className = 'reward-button mission-claim';
    this.claimButton.dataset.action = 'claim-ready-missions'; this.claimButton.hidden = true;
    this.claimButton.addEventListener('click', actions.claimMissions);
    root.querySelector('.result-actions')!.append(this.claimButton);
    document.addEventListener('pointerdown', () => this.audio.unlock(), { passive: true });
    document.addEventListener('keydown', () => this.audio.unlock());
  }
  private renderSound(): void { text(this.soundButton, this.audio.muted ? '音效：关闭' : '音效：开启'); this.soundButton.setAttribute('aria-pressed', String(!this.audio.muted)); }
  setAwaiting(awaiting: boolean, restored = false): void {
    this.awaiting = awaiting; this.launch.hidden = !awaiting;
    if (restored) text(this.launch.querySelector('button')!, '继续旅程');
  }
  reset(): void { this.previous = null; this.toastUntil = 0; this.toast.hidden = true; }
  announce(message: string): void { text(this.toast, message); this.toastUntil = performance.now() + 1600; this.toast.hidden = false; }
  update(state: GrappleState, meta: ExperienceMeta): void {
    const active = state.status === 'playing' && !state.paused && !this.awaiting;
    this.layer.dataset.active = String(active);
    this.metric.hidden = this.awaiting;
    text(this.metric, `${Math.floor(state.distanceMeters)} m  ·  拾取 ${state.coins}  ·  连飞 ${state.combo} ×${Math.min(state.characterId === '提灯童' ? 3 : 4, 1 + Math.floor(state.combo / 2))}`);
    this.goal.hidden = this.awaiting || state.status !== 'playing';
    this.pursuit.hidden = !active || state.levelId !== 'night-patrol';
    this.pursuit.dataset.phase = state.chase.phase;
    const closeness = Math.min(1, Math.max(0, state.chase.pressure));
    const urgency = chaseReadoutUrgency(state.chase.phase, closeness);
    this.pursuit.dataset.urgency = urgency;
    text(this.pursuit.querySelector('strong')!, urgency === 'danger'
      ? '危险！向高处接钩躲网' : urgency === 'alert'
        ? '官兵架网！加速或升高' : '官兵在后');
    text(this.pursuit.querySelector('span')!, `${Math.round(state.chase.distance / 30)}m`);
    (this.pursuit.querySelector('i')! as HTMLElement).style.setProperty('--chase-fill', `${Math.round(closeness * 100)}%`);
    if (state.levelId === 'lantern-entry') text(this.goal, `护送铜符 ${Math.round(state.progress * 100)}% · 前方是渡口`);
    else {
      const offer = state.vehicleOffers?.find(item => item.status === 'available' && item.x >= state.player.x - 140);
      const next = OPENING_ENCOUNTERS.find(beat => beat.segment > state.segmentIndex);
      const escapedOnce = state.gatesPassed > 0;
      text(this.goal, offer ? `前方 ${Math.max(0, Math.ceil((offer.x - state.player.x) / 30))}m：抢${offer.id}`
        : next ? (escapedOnce ? `已突破封锁 · 前方抢${next.vehicle}` :
          `前方 ${Math.max(1, Math.ceil((segmentStartPx(next.segment) - state.player.x) / 30))}m：争夺${next.vehicle}`)
          : escapedOnce ? `突围成功 · 暂停可收工领奖 / 继续挑战`
            : `挑战 ${Math.ceil((Math.max(meta.bestDistance, state.distanceMeters) + 1) / 100) * 100}m`);
    }
    const cue = controlCue(state);
    this.cue.hidden = !active; this.cue.dataset.tone = cue.tone;
    text(this.cueTitle, cue.title); text(this.cueDetail, cue.detail);
    this.ride.hidden = !active || !state.vehicleId;
    text(this.rideName, state.vehicleId ?? '');
    text(this.rideTime, `${Math.max(0, state.vehicleTicksRemaining / 120).toFixed(1)}s`);
    this.ride.dataset.vehicle = state.vehicleId ?? '';
    this.finishButton.hidden = state.levelId !== 'night-patrol';
    this.finishButton.disabled = state.distanceMeters < 1;
    this.claimButton.hidden = state.status === 'playing' || meta.claimableReward <= 0;
    text(this.claimButton, `领取任务奖励 +${meta.claimableReward}`);
    const p = this.previous;
    if (p && (state.tick < p.tick || state.levelId !== p.level)) this.previous = null;
    const previous = this.previous;
    if (previous && active) {
      if (state.vehicleId && state.vehicleId !== previous.vehicle) {
        const quality = state.lastVehicleOffer?.kind === 'claimed' && state.lastVehicleOffer.quality === 'stylish';
        this.announce(quality ? `漂亮抢到${state.vehicleId}！额外 +8 金币` : `抢到 ${state.vehicleId}！试试按住/松手`);
        this.audio.play('ride');
      }
      else if (state.lastVehicleOffer && state.lastVehicleOffer.tick > previous.offerTick && state.lastVehicleOffer.kind === 'missed') {
        this.announce(`错过${state.lastVehicleOffer.id}：${state.lastVehicleOffer.reason ?? '下一次提早调整路线'}`);
      }
      else if (state.gatesPassed > previous.gates) {
        this.announce(state.gatesPassed === 1
          ? '突围成功！可以收工领奖，或继续争夺载具'
          : `突破第 ${state.gatesPassed} 处封锁！继续挑战更高收益`);
        this.audio.play('combo');
      }
      else if (state.combo > previous.combo) { if (state.combo >= 2) this.announce(`漂亮！${state.combo} 连飞`); this.audio.play('combo'); }
      else if (state.pickups > previous.pickups) this.audio.play('coin');
      else if (state.mutation && state.mutation !== previous.mutation) {
        this.announce(state.mutation === '起雾' ? '起雾了：靠近一点再挂接' : state.mutation === '下雨' ? '雨天下坠略快，提前接索' : '官兵增援！保持向前的节奏');
      }
    }
    if (previous && state.status !== 'playing' && previous.status === 'playing') this.audio.play('finish');
    this.previous = { offerTick: state.lastVehicleOffer?.tick ?? 0, tick: state.tick, level: state.levelId, vehicle: state.vehicleId, pickups: state.pickups, combo: state.combo, gates: state.gatesPassed, mutation: state.mutation, status: state.status };
    this.toast.hidden = !active || performance.now() > this.toastUntil;
  }
}
