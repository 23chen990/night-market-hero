import Phaser from 'phaser';
import {
  createComponentRenderer,
  type ComponentRendererStats,
  type ComponentSceneLike,
} from './component-renderer.ts';
import {
  createNightCityRenderer,
  type NightCityRendererStats,
  type NightCitySceneLike,
  type RenderImage,
} from './night-city-renderer.ts';
import {
  cameraLeftForCheckpoint,
  clampInspectionPan,
  createRenderInspectionCheckpoints,
  INSPECTION_VIEWPORT,
  parseInspectionMode,
  RENDER_INSPECTION_SEED,
  type InspectionMode,
  type RenderInspectionCheckpoint,
} from './dev-render-inspection.ts';
import type { RunPlanChunkDescriptor } from './run-plan.ts';
import {
  NOT_MEASURED_V36_VISIBILITY,
  V36RequestObservation,
  type Measurement,
} from './dev-render-observation.ts';

interface InspectionTelemetry {
  artifactType: 'render-inspection-snapshot';
  seed: number;
  mode: InspectionMode;
  checkpoint: RenderInspectionCheckpoint['id'];
  checkpointLabel: string;
  boundaryX: number;
  camera: { left: number; right: number; panOffset: number };
  chunks: {
    left: Pick<RunPlanChunkDescriptor, 'chunkId' | 'sceneFamily' | 'kind' | 'startX' | 'endX'>;
    right: Pick<RunPlanChunkDescriptor, 'chunkId' | 'sceneFamily' | 'kind' | 'startX' | 'endX'>;
  };
  nightCity: NightCityRendererStats;
  components: ComponentRendererStats;
  requestedTextureKeys: string[];
  loadedTextureKeys: string[];
  loadFailures: Array<{ key: string; url: string; message?: string }>;
  v36Requested: Measurement<boolean>;
  v36Visible: Measurement<boolean>;
  v36Drawn: Measurement<boolean>;
}

interface InspectionSettings {
  mode: InspectionMode;
  checkpoint: RenderInspectionCheckpoint;
}

function readInspectionSettings(): InspectionSettings {
  const params = new URLSearchParams(window.location.search);
  const checkpoints = createRenderInspectionCheckpoints();
  const requested = params.get('checkpoint');
  const checkpoint = checkpoints.find((item) => item.id === requested) ?? checkpoints[0]!;
  return { mode: parseInspectionMode(params.get('mode')), checkpoint };
}

function shortChunk(chunk: RunPlanChunkDescriptor): Pick<RunPlanChunkDescriptor, 'chunkId' | 'sceneFamily' | 'kind' | 'startX' | 'endX'> {
  return {
    chunkId: chunk.chunkId,
    sceneFamily: chunk.sceneFamily,
    kind: chunk.kind,
    startX: chunk.startX,
    endX: chunk.endX,
  };
}

/** A dev-only Phaser scene adapter over the production image renderers. */
export class RenderInspectionScene extends Phaser.Scene {
  private readonly settings = readInspectionSettings();
  private readonly nightCityRenderer = createNightCityRenderer({ prefetchChunks: 1, maxRetainedChunks: 8 });
  private readonly componentRenderer = createComponentRenderer({
    enabled: this.settings.mode === 'longmap',
    prefetchChunks: 1,
    maxRetainedComponents: 64,
  });
  private readonly requestedTextureKeys = new Set<string>();
  private readonly loadedTextureKeys = new Set<string>();
  private readonly loadFailures: Array<{ key: string; url: string; message?: string }> = [];
  private readonly v36RequestObservation = new V36RequestObservation();
  private panOffset = 0;
  private ready = false;

  public constructor() {
    super({ key: 'render-inspection' });
  }

  public preload(): void {
    this.load.on('loaderror', (file: { key?: string; src?: string; url?: string; error?: Error }) => {
      this.loadFailures.push({
        key: file.key ?? 'unknown',
        url: file.src ?? file.url ?? 'unknown',
        message: file.error?.message,
      });
    });
    const adapter = this.createAdapter();
    this.v36RequestObservation.begin('Phaser load.image adapter calls during renderer preload');
    try {
      this.nightCityRenderer.preload(adapter);
      this.componentRenderer.preload(adapter);
      this.v36RequestObservation.complete();
    } catch (error) {
      this.v36RequestObservation.fail(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  public create(): void {
    this.cameras.main.setScroll(0, 0);
    for (const key of this.requestedTextureKeys) {
      if (this.textures.exists(key)) this.loadedTextureKeys.add(key);
    }
    this.renderAt(0);
    requestAnimationFrame(() => {
      this.ready = true;
      this.renderAt(this.panOffset);
      this.publishReadyState();
    });
  }

  public update(): void {
    if (this.ready) this.publishReadyState();
  }

  public panBy(delta: number): void {
    this.panOffset = clampInspectionPan(this.panOffset + delta);
    this.renderAt(this.panOffset);
  }

  public center(): void {
    this.panOffset = 0;
    this.renderAt(0);
  }

  private createAdapter(): NightCitySceneLike & ComponentSceneLike {
    return {
      load: {
        image: (key: string, url: string): void => {
          this.requestedTextureKeys.add(key);
          this.v36RequestObservation.record(key, url);
          this.load.image(key, url);
        },
      },
      add: {
        image: (x: number, y: number, key: string): RenderImage => {
          return this.add.image(x, y, key);
        },
      },
      textures: {
        exists: (key: string): boolean => this.textures.exists(key),
      },
    };
  }

  private renderAt(panOffset: number): void {
    const safePan = clampInspectionPan(panOffset);
    this.panOffset = safePan;
    const cameraLeft = cameraLeftForCheckpoint(this.settings.checkpoint) + safePan;
    const cameraRight = cameraLeft + INSPECTION_VIEWPORT.width;
    this.cameras.main.setScroll(cameraLeft, 0);
    const adapter = this.createAdapter();
    const nightCity = this.nightCityRenderer.render(adapter, RENDER_INSPECTION_SEED, cameraLeft, cameraRight);
    const components = this.componentRenderer.render(adapter, RENDER_INSPECTION_SEED, cameraLeft, cameraRight);
    this.publishTelemetry({
      artifactType: 'render-inspection-snapshot',
      seed: RENDER_INSPECTION_SEED,
      mode: this.settings.mode,
      checkpoint: this.settings.checkpoint.id,
      checkpointLabel: this.settings.checkpoint.label,
      boundaryX: this.settings.checkpoint.boundaryX,
      camera: { left: cameraLeft, right: cameraRight, panOffset: safePan },
      chunks: {
        left: shortChunk(this.settings.checkpoint.leftChunk),
        right: shortChunk(this.settings.checkpoint.rightChunk),
      },
      nightCity,
      components,
      requestedTextureKeys: [...this.requestedTextureKeys].sort(),
      loadedTextureKeys: [...this.loadedTextureKeys].sort(),
      loadFailures: [...this.loadFailures],
      v36Requested: this.v36RequestObservation.read(),
      v36Visible: NOT_MEASURED_V36_VISIBILITY,
      v36Drawn: {
        status: 'NOT_MEASURED',
        scope: 'no Image lifecycle, camera-crop, occlusion, or GPU draw observation in R1.1',
      },
    });
  }

  private publishReadyState(): void {
    document.documentElement.dataset.inspectionReady = String(this.ready);
    document.documentElement.dataset.inspectionMode = this.settings.mode;
    document.documentElement.dataset.inspectionCheckpoint = this.settings.checkpoint.id;
  }

  private publishTelemetry(telemetry: InspectionTelemetry): void {
    const element = document.querySelector<HTMLElement>('[data-inspection="telemetry"]');
    if (element) element.textContent = JSON.stringify(telemetry, null, 2);
    document.documentElement.dataset.inspectionPanOffset = String(telemetry.camera.panOffset);
  }
}

function updateQuery(updates: Record<string, string>): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) url.searchParams.set(key, value);
  window.location.assign(url.toString());
}

function boot(): void {
  const checkpoints = createRenderInspectionCheckpoints();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    transparent: true,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: INSPECTION_VIEWPORT.width,
      height: INSPECTION_VIEWPORT.height,
    },
    render: { antialias: true, roundPixels: false, transparent: true },
    scene: [RenderInspectionScene],
  });
  const select = document.querySelector<HTMLSelectElement>('[data-inspection="checkpoint"]');
  const current = new URLSearchParams(window.location.search).get('checkpoint');
  if (select) {
    for (const checkpoint of checkpoints) {
      const option = document.createElement('option');
      option.value = checkpoint.id;
      option.textContent = `${checkpoint.label} · x=${checkpoint.boundaryX}`;
      option.selected = checkpoint.id === current || (!current && checkpoint === checkpoints[0]);
      select.append(option);
    }
    select.addEventListener('change', () => updateQuery({ checkpoint: select.value }));
  }
  document.querySelector('[data-inspection="mode-default"]')?.addEventListener('click', () => updateQuery({ mode: 'default' }));
  document.querySelector('[data-inspection="mode-longmap"]')?.addEventListener('click', () => updateQuery({ mode: 'longmap' }));
  document.querySelector('[data-inspection="pan-left"]')?.addEventListener('click', () => {
    const scene = game.scene.getScene('render-inspection') as RenderInspectionScene | null;
    scene?.panBy(-120);
  });
  document.querySelector('[data-inspection="pan-right"]')?.addEventListener('click', () => {
    const scene = game.scene.getScene('render-inspection') as RenderInspectionScene | null;
    scene?.panBy(120);
  });
  document.querySelector('[data-inspection="pan-center"]')?.addEventListener('click', () => {
    const scene = game.scene.getScene('render-inspection') as RenderInspectionScene | null;
    scene?.center();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
