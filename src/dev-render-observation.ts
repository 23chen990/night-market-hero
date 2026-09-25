export type ObservationStatus = 'MEASURED' | 'NOT_MEASURED' | 'FAILED';

export interface Measurement<T> {
  status: ObservationStatus;
  value?: T;
  scope?: string;
  observedCallCount?: number;
  reason?: string;
}

export interface RuntimeCollectionErrorCounts {
  loadFailures: number;
  consoleErrors: number;
  pageErrors: number;
}

export function collectionErrorsForRuntime(counts: RuntimeCollectionErrorCounts): string[] {
  const errors: string[] = [];
  if (counts.loadFailures > 0) errors.push(`Phaser load failures: ${counts.loadFailures}`);
  if (counts.consoleErrors > 0) errors.push(`console errors: ${counts.consoleErrors}`);
  if (counts.pageErrors > 0) errors.push(`page errors: ${counts.pageErrors}`);
  return errors;
}

const V36_KEY_MARKER = 'rooftops-transition-v36';
const V36_PATH_MARKER = 'rooftops-transition-v36-fullheight.png';

/** Matches the rejected v36 carrier by either its runtime key or its asset URL. */
export function isV36ResourceReference(key: string, url: string): boolean {
  const normalizedKey = key.trim().toLowerCase();
  const normalizedUrl = url.trim().toLowerCase();
  return normalizedKey.includes(V36_KEY_MARKER) || normalizedUrl.includes(V36_PATH_MARKER);
}

export class V36RequestObservation {
  private status: ObservationStatus = 'NOT_MEASURED';
  private scope: string | undefined;
  private reason: string | undefined;
  private calls: Array<{ key: string; url: string }> = [];

  begin(scope: string): void {
    this.status = 'NOT_MEASURED';
    this.scope = scope;
    this.reason = undefined;
    this.calls = [];
  }

  record(key: string, url: string): void {
    if (this.status !== 'NOT_MEASURED' || !this.scope) return;
    this.calls.push({ key, url });
  }

  complete(): void {
    if (!this.scope || this.status !== 'NOT_MEASURED') return;
    this.status = 'MEASURED';
  }

  fail(reason: string): void {
    this.status = 'FAILED';
    this.reason = reason;
  }

  read(): Measurement<boolean> {
    if (this.status !== 'MEASURED') {
      return {
        status: this.status,
        scope: this.scope,
        reason: this.reason,
      };
    }
    return {
      status: 'MEASURED',
      value: this.calls.some(({ key, url }) => isV36ResourceReference(key, url)),
      scope: this.scope,
      observedCallCount: this.calls.length,
    };
  }
}

export const NOT_MEASURED_V36_VISIBILITY: Measurement<boolean> = Object.freeze({
  status: 'NOT_MEASURED',
  scope: 'no Image lifecycle, camera-crop, occlusion, or GPU draw observation in R1.1',
});
