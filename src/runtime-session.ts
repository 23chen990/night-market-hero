export interface RunIdentityStorage {
  read(key: string): string | null;
  write(key: string, value: string): void | boolean;
}

export interface RunIdentityOptions {
  key?: string;
  now?: () => number;
  entropy?: () => string;
}

const RUN_SEQUENCE_KEY = 'night-market-hero.run-sequence.v1';

function defaultEntropy(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID().replaceAll('-', '');
  if (typeof cryptoApi?.getRandomValues === 'function') {
    const values = cryptoApi.getRandomValues(new Uint32Array(2));
    return `${values[0]!.toString(36)}${values[1]!.toString(36)}`;
  }
  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

function readCounter(storage: RunIdentityStorage, key: string): number {
  try {
    const raw = storage.read(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { counter?: unknown };
    return typeof parsed.counter === 'number' && Number.isSafeInteger(parsed.counter) && parsed.counter >= 0
      ? parsed.counter
      : 0;
  } catch {
    return 0;
  }
}

/** Issues an identity for genuinely new runs and leaves restored identities untouched. */
export class PersistentRunIdentity {
  private readonly key: string;
  private readonly now: () => number;
  private readonly entropy: () => string;
  private localCounter = 0;
  private readonly issued = new Set<string>();

  constructor(private readonly storage: RunIdentityStorage, options: RunIdentityOptions = {}) {
    this.key = options.key ?? RUN_SEQUENCE_KEY;
    this.now = options.now ?? (() => Date.now());
    this.entropy = options.entropy ?? defaultEntropy;
  }

  issue(seed: number): string {
    const persistedCounter = readCounter(this.storage, this.key);
    this.localCounter = Math.max(this.localCounter, persistedCounter) + 1;
    try {
      this.storage.write(this.key, JSON.stringify({ version: 1, counter: this.localCounter }));
    } catch {
      // The timestamp, entropy and in-memory counter still keep this page's ids unique.
    }
    const now = this.now();
    const timestamp = Number.isFinite(now) ? Math.max(0, Math.floor(now)) : 0;
    const entropy = this.entropy() || `fallback-${this.localCounter}`;
    let id = `${seed}:${timestamp.toString(36)}-${this.localCounter.toString(36)}-${entropy}`;
    while (this.issued.has(id)) id = `${id}-${this.localCounter.toString(36)}`;
    this.issued.add(id);
    return id;
  }

  restore(runId: string): string {
    if (typeof runId !== 'string' || runId.length === 0) throw new Error('Cannot restore an empty run identity');
    this.issued.add(runId);
    return runId;
  }
}

export interface RunOperation {
  readonly kind: string;
  readonly runId: string;
  readonly generation: number;
  readonly token: string;
}

/** Keeps async callbacks attached to the run that started them. */
export class RuntimeSession {
  private currentRunId: string;
  private generation = 0;
  private operationSequence = 0;
  private readonly operations = new Map<string, RunOperation>();

  constructor(private readonly identity: PersistentRunIdentity, initialSeed: number | string) {
    this.currentRunId = typeof initialSeed === 'string' ? identity.restore(initialSeed) : identity.issue(initialSeed);
  }

  get runId(): string {
    return this.currentRunId;
  }

  beginNewRun(seed: number): string {
    this.currentRunId = this.identity.issue(seed);
    this.generation += 1;
    this.operations.clear();
    return this.currentRunId;
  }

  restore(runId: string): string {
    this.currentRunId = this.identity.restore(runId);
    this.generation += 1;
    this.operations.clear();
    return this.currentRunId;
  }

  isCurrentRun(runId: string): boolean {
    return runId === this.currentRunId;
  }

  beginOperation(kind: string): RunOperation | null {
    if (this.operations.has(kind)) return null;
    const operation: RunOperation = {
      kind,
      runId: this.currentRunId,
      generation: this.generation,
      token: `${this.currentRunId}:${kind}:${this.generation}:${++this.operationSequence}`,
    };
    this.operations.set(kind, operation);
    return operation;
  }

  isCurrent(operation: RunOperation): boolean {
    return operation.runId === this.currentRunId
      && operation.generation === this.generation
      && this.operations.get(operation.kind)?.token === operation.token;
  }

  endOperation(operation: RunOperation): void {
    if (this.operations.get(operation.kind)?.token === operation.token) this.operations.delete(operation.kind);
  }

  isOperationActive(kind: string): boolean {
    return this.operations.has(kind);
  }
}

/** Hidden lifecycle pauses require an explicit resume and never catch up offline time. */
export class BackgroundLifecyclePolicy {
  private hiddenState = false;
  private resumeRequiredState = false;
  private inputHeldState = false;

  get isHidden(): boolean {
    return this.hiddenState;
  }

  get resumeRequired(): boolean {
    return this.resumeRequiredState;
  }

  get inputHeld(): boolean {
    return this.inputHeldState;
  }

  get shouldAdvance(): boolean {
    return !this.hiddenState && !this.resumeRequiredState;
  }

  setInputHeld(inputHeld: boolean): void {
    this.inputHeldState = inputHeld;
  }

  hidden(): void {
    this.hiddenState = true;
    this.resumeRequiredState = true;
    this.inputHeldState = false;
  }

  visible(): void {
    this.hiddenState = false;
  }

  focused(): void {
    this.hiddenState = false;
  }

  explicitResume(): void {
    if (!this.hiddenState) this.resumeRequiredState = false;
  }
}
