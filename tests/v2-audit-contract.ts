/**
 * Public evidence thresholds for the default night patrol browser audit.
 * These rules are about observable player outcomes, not hidden fixture state.
 * They deliberately allow a skilled rider to avoid ever entering chase danger.
 */
export interface RideObservation { firstTick: number; lastTick: number; elapsed: number }

export interface ClaimedRideEvidence { instanceId: string; id: string; outcome: 'claimed' | 'missed' }

/** Every separate claimed world encounter needs its OWN sustained input window. */
export function everyClaimedInstanceIsPlayable(
  resolved: Iterable<ClaimedRideEvidence>,
  perInstance: ReadonlyMap<string, RideObservation>,
  screenshots: ReadonlySet<string>,
  minimumTicks = 120,
): boolean {
  for (const claim of resolved) {
    if (claim.outcome !== 'claimed') continue;
    const span = perInstance.get(claim.instanceId);
    if (!span || span.lastTick - span.firstTick < minimumTicks
      || !screenshots.has(claim.id)) return false;
  }
  return true;
}


export function everyEarnedRideIsPlayable(
  earnedTypes: ReadonlySet<string>,
  observations: ReadonlyMap<string, RideObservation>,
  screenshots: ReadonlySet<string>,
  minimumSimulatedTicks = 120,
): boolean {
  return [...earnedTypes].every(id => {
    const ride = observations.get(id);
    return !!ride && ride.lastTick - ride.firstTick >= minimumSimulatedTicks
      && screenshots.has(id);
  });
}

export interface ChaseEvidence {
  phases: readonly string[];
  /** Caught or other failures are only accepted when physically observed. */
  failures: readonly { reason?: string | null; screenshot?: string | null }[];
}

/**
 * A chase is proven across the matched input matrix, not by requiring each
 * competent playstyle to be caught. A caught journey needs its own screenshot.
 */
export function hasAttributablePursuit(samples: readonly ChaseEvidence[]): boolean {
  const escalation = samples.some(sample => sample.phases.some(phase =>
    phase === 'alert' || phase === 'danger' || phase === 'climax'));
  const contact = samples.some(sample => sample.failures.some(failure =>
    failure.reason === 'caught' && !!failure.screenshot));
  return escalation && contact;
}
