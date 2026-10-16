import type { GrappleState } from './game-core.ts';

/** A truthful, short next-run objective derived ONLY from the run just played
 * and the record captured BEFORE committing that run's settlement.
 * No reward allocation, persisted challenge state or synthetic success.
 */
export interface RetryPlan {
  record: string;
  next: string;
  tone: 'new-best' | 'catch-up' | 'progress';
  targetMeters: number;
}

type DebriefState = Pick<GrappleState,
  'status' | 'levelId' | 'failureReason' | 'distanceMeters'
  | 'comboPeak' | 'encounterEvents'>;

function safeMeters(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

const missedRideTips: Record<string, string> = {
  '货运滑索': '黄色挂环要先松索，再真正飞进去。',
  '纸鸢': '借高屋檐荡起，再松手飞进鸢绳圈。',
  '灯笼群': '先松旧索，贴近灯结后再按一次。',
  '青鸾': '先连续完成两次漂亮松手，再进入青鸾翼环。',
};

export function buildRetryPlan(state: DebriefState, priorBestMeters: number): RetryPlan | null {
  if (state.status === 'playing') return null;

  const meters = safeMeters(state.distanceMeters);
  const prior = safeMeters(priorBestMeters);
  const targetMeters = (Math.floor(meters / 100) + 1) * 100;
  const record = prior === 0
    ? meters > 0 ? `第一条里程纪录：${meters}m` : '下一局可以建立首条里程纪录'
    : meters > prior
      ? `新里程纪录！比此前多 ${meters - prior}m`
      : meters < prior
        ? `距离此前最好成绩还差 ${prior - meters}m`
        : `追平此前的 ${meters}m 纪录`;

  const lastMissed = [...(state.encounterEvents ?? [])].reverse()
    .find(e => e.outcome === 'missed');
  let action: string;
  if (state.levelId !== 'night-patrol') {
    action = '按住接索、越过挂点再松手；下落前接住下一根。';
  } else if (state.failureReason === 'caught') {
    action = state.comboPeak < 2
      ? '试着连续完成两次漂亮松手，确实能甩开官兵。'
      : '已经会连飞了；下次趁官兵还远，早点选择低线拉开距离。';
  } else if (state.failureReason === 'fell') {
    action = '下落前重新按住接飞索，看到人物旁金色信号再松手。';
  } else if (lastMissed) {
    action = missedRideTips[lastMissed.id]
      ?? '下次试着主动争抢一件真实世界里的载具。';
  } else if (state.comboPeak < 2) {
    action = '试着连续完成两次漂亮松手，体验真正的连飞。';
  } else {
    action = '继续挑战新街区，也可以主动争夺下一件载具。';
  }
  const next = `下局挑战 ${targetMeters}m · ${action}`;

  return { record, next, targetMeters,
    tone: meters > prior ? 'new-best' : meters < prior ? 'catch-up' : 'progress' };
}
