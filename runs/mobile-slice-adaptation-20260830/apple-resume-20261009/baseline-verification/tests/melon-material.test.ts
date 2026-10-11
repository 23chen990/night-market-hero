import assert from 'node:assert/strict';
import * as THREE from 'three';
import { test } from 'node:test';
import { MelonMaterialPipeline } from '../src/melon-material';

test('MELON-GLSL-PROJECTION fragment refraction receives the current camera projection explicitly', () => {
  const pipeline = new MelonMaterialPipeline(makeRenderer() as unknown as THREE.WebGLRenderer);
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 50);
  const scene = new THREE.Scene();
  const material = pipeline.createMaterial([0, 0]);
  const mesh = meshWithMaterial(material); scene.add(mesh);
  assert.ok(material.uniforms.uProjection, 'fragment projection uniform is missing');
  pipeline.prepare(scene, camera, [mesh]);
  assert.deepEqual(material.uniforms.uProjection.value.elements, camera.projectionMatrix.elements);
  camera.aspect = 0.45; camera.updateProjectionMatrix();
  pipeline.prepare(scene, camera, [mesh]);
  assert.deepEqual(material.uniforms.uProjection.value.elements, camera.projectionMatrix.elements);
  pipeline.dispose(); mesh.geometry.dispose();
});

interface RendererSpy {
  pixelRatio: number;
  physicalViewport: THREE.Vector4;
  currentTarget: THREE.WebGLRenderTarget | null;
  renders: Array<{ scene: THREE.Scene; camera: THREE.Camera; target: THREE.WebGLRenderTarget | null; viewport: THREE.Vector4 }>;
  clearCalls: number;
  failOnRender: number | null;
  clearColor: THREE.Color;
  clearAlpha: number;
  autoClear: boolean;
  autoClearColor: boolean;
  autoClearDepth: boolean;
  autoClearStencil: boolean;
  viewport: THREE.Vector4;
  scissor: THREE.Vector4;
  scissorTest: boolean;
  getDrawingBufferSize(target: THREE.Vector2): THREE.Vector2;
  getRenderTarget(): THREE.WebGLRenderTarget | null;
  setRenderTarget(target: THREE.WebGLRenderTarget | null): void;
  setClearColor(color: THREE.ColorRepresentation, alpha?: number): void;
  getClearColor(target: THREE.Color): THREE.Color;
  getClearAlpha(): number;
  clear(): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  getViewport(target: THREE.Vector4): THREE.Vector4;
  setViewport(viewport: THREE.Vector4): void;
  getScissor(target: THREE.Vector4): THREE.Vector4;
  setScissor(scissor: THREE.Vector4): void;
  getScissorTest(): boolean;
  setScissorTest(enabled: boolean): void;
}

function makeRenderer(): RendererSpy {
  const renderer: RendererSpy = {
    pixelRatio: 1,
    physicalViewport: new THREE.Vector4(2, 3, 640, 360),
    currentTarget: null,
    renders: [],
    clearCalls: 0,
    failOnRender: null,
    clearColor: new THREE.Color(0x233447),
    clearAlpha: 0.63,
    autoClear: false,
    autoClearColor: false,
    autoClearDepth: true,
    autoClearStencil: false,
    viewport: new THREE.Vector4(2, 3, 640, 360),
    scissor: new THREE.Vector4(4, 5, 320, 180),
    scissorTest: true,
    getDrawingBufferSize(target) {
      target.set(1280 * this.pixelRatio, 720 * this.pixelRatio);
      return target;
    },
    getRenderTarget() {
      return this.currentTarget;
    },
    setRenderTarget(target) {
      this.currentTarget = target;
      this.physicalViewport.copy(target ? target.viewport : this.viewport.clone().multiplyScalar(this.pixelRatio));
    },
    setClearColor(color, alpha) {
      this.clearColor.set(color);
      this.clearAlpha = alpha ?? this.clearAlpha;
    },
    getClearColor(target) {
      return target.copy(this.clearColor);
    },
    getClearAlpha() {
      return this.clearAlpha;
    },
    clear() {
      this.clearCalls += 1;
    },
    render(scene, camera) {
      if (this.failOnRender !== null && this.renders.length + 1 === this.failOnRender) {
        throw new Error('offscreen render failed');
      }
      this.renders.push({ scene, camera, target: this.currentTarget, viewport: this.physicalViewport.clone() });
    },
    getViewport(target) {
      return target.copy(this.viewport);
    },
    setViewport(viewport) {
      this.viewport.copy(viewport);
      // Match Three: setViewport uses canvas logical units even for a bound target.
      this.physicalViewport.copy(viewport).multiplyScalar(this.pixelRatio);
    },
    getScissor(target) {
      return target.copy(this.scissor);
    },
    setScissor(scissor) {
      this.scissor.copy(scissor);
    },
    getScissorTest() {
      return this.scissorTest;
    },
    setScissorTest(enabled) {
      this.scissorTest = enabled;
    },
  };
  return renderer;
}

function meshWithMaterial(material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  geometry.setAttribute('rest', new THREE.Float32BufferAttribute([
    -0.5, -0.5, -0.5,
    0.5, -0.5, -0.5,
    0.5, 0.5, -0.5,
    -0.5, 0.5, -0.5,
    -0.5, -0.5, 0.5,
    0.5, -0.5, 0.5,
    0.5, 0.5, 0.5,
    -0.5, 0.5, 0.5,
  ], 3));
  return new THREE.Mesh(geometry, material);
}

test('creates a configurable gummy material with the required red flesh and green rind shader paths', () => {
  const renderer = makeRenderer();
  const pipeline = new MelonMaterialPipeline(renderer as unknown as THREE.WebGLRenderer);
  const material = pipeline.createMaterial([1.25, -0.3]);

  assert.ok(material instanceof THREE.ShaderMaterial);
  assert.deepEqual(material.uniforms.uOrigin.value.toArray(), [1.25, -0.3]);
  assert.deepEqual(material.uniforms.uResolution.value.toArray(), [1, 1, 1, 1]);
  assert.ok(material.uniforms.uScene);
  assert.ok(material.uniforms.uBackDepth);
  assert.match(material.fragmentShader, /uFleshSigma/);
  assert.match(material.fragmentShader, /uSkinColor/);
  assert.match(material.fragmentShader, /uStripeColor/);
  assert.match(material.fragmentShader, /beer|exp\s*\(/i);
  assert.match(material.fragmentShader, /ggx/i);
  assert.match(material.fragmentShader, /fresnel|pow\s*\(\s*1\.0\s*-\s*nv/i);
  assert.match(material.fragmentShader, /uBackDepth/);
  assert.notDeepEqual(
    material.uniforms.uSkinColor.value.toArray(),
    material.uniforms.uFleshScatter.value.toArray(),
  );
  material.uniforms.uFleshScatter.value.set(0.2, 0.04, 0.06);
  assert.deepEqual(material.uniforms.uFleshScatter.value.toArray(), [0.2, 0.04, 0.06]);
  assert.equal(material.userData.thicknessUnits, 'world-units-per-specimen-unit');
  pipeline.dispose();
});

test('MELON-HIDPI-COLOR offscreen viewports use physical target pixels once, including capped Retina targets', () => {
  for (const pixelRatio of [1, 1.5, 2]) {
    const renderer = makeRenderer();
    renderer.pixelRatio = pixelRatio;
    renderer.setViewport(renderer.viewport);
    const originalViewport = renderer.physicalViewport.clone();
    const pipeline = new MelonMaterialPipeline(renderer as unknown as THREE.WebGLRenderer);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 50);
    const mesh = meshWithMaterial(pipeline.createMaterial([0, 0]));
    scene.add(mesh);
    pipeline.prepare(scene, camera, [mesh]);
    for (const pass of renderer.renders) {
      assert.ok(pass.target);
      assert.deepEqual(pass.viewport.toArray(), [0, 0, pass.target.width, pass.target.height],
        `DPR ${pixelRatio}: scene/back-depth viewport must match the texture without a second DPR scale`);
    }
    assert.deepEqual(renderer.physicalViewport.toArray(), originalViewport.toArray(), 'canvas viewport is restored');
    assert.deepEqual(renderer.viewport.toArray(), [2, 3, 640, 360], 'logical canvas viewport remains unchanged');
    pipeline.dispose(); mesh.geometry.dispose();
  }
});

test('prepare reuses the scene and per-object back-depth targets without aliasing thickness buffers', () => {
  const renderer = makeRenderer();
  const pipeline = new MelonMaterialPipeline(renderer as unknown as THREE.WebGLRenderer);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 50);
  const firstMaterial = pipeline.createMaterial([0, 0]);
  const secondMaterial = pipeline.createMaterial([0.5, 0]);
  const first = meshWithMaterial(firstMaterial);
  const second = meshWithMaterial(secondMaterial);
  second.position.x = 2;
  scene.add(first, second);

  pipeline.prepare(scene, camera, [first, second]);
  const firstScene = firstMaterial.uniforms.uScene.value;
  const firstBack = firstMaterial.uniforms.uBackDepth.value;
  const secondBack = secondMaterial.uniforms.uBackDepth.value;
  assert.ok(firstScene);
  assert.ok(firstBack);
  assert.ok(secondBack);
  assert.notStrictEqual(firstBack, secondBack);
  assert.equal(renderer.renders.length, 3, 'one studio render plus one isolated depth render per jelly');
  assert.deepEqual(firstMaterial.uniforms.uResolution.value.toArray(), [1280, 720, 1 / 1280, 1 / 720]);
  assert.equal(firstMaterial.uniforms.uScene.value, secondMaterial.uniforms.uScene.value);

  pipeline.prepare(scene, camera, [first, second]);
  assert.strictEqual(firstMaterial.uniforms.uScene.value, firstScene);
  assert.strictEqual(firstMaterial.uniforms.uBackDepth.value, firstBack);
  assert.strictEqual(secondMaterial.uniforms.uBackDepth.value, secondBack);
  assert.equal(renderer.renders.length, 4, 'unchanged camera and geometry reuse their exact back-depth textures');
  pipeline.dispose();
});

test('MELON-DEPTH-CACHE refreshes for camera, transform, deformation, topology and target changes', () => {
  const renderer = makeRenderer();
  const pipeline = new MelonMaterialPipeline(renderer as unknown as THREE.WebGLRenderer);
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 50);
  const mesh = meshWithMaterial(pipeline.createMaterial()); scene.add(mesh);
  pipeline.prepare(scene, camera, [mesh]);
  const refresh = (change: () => void) => {
    const previous = renderer.renders.length; change(); pipeline.prepare(scene, camera, [mesh]);
    assert.equal(renderer.renders.length - previous, 2, 'a changed physical exit surface requires a fresh depth render');
    pipeline.prepare(scene, camera, [mesh]);
    assert.equal(renderer.renders.length - previous, 3, 'the next unchanged frame keeps that exact depth buffer');
  };
  refresh(() => { camera.position.z = 2; });
  refresh(() => { camera.aspect = 0.5; camera.updateProjectionMatrix(); });
  refresh(() => { mesh.position.x = 0.25; });
  refresh(() => { (mesh.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true; });
  refresh(() => { mesh.geometry.index!.needsUpdate = true; });
  refresh(() => { renderer.getDrawingBufferSize = (target) => target.set(640, 480); });
  pipeline.dispose(); mesh.geometry.dispose();
});

test('MELON-MATERIAL gameplay microdetail follows projected size while the study remains full detail', () => {
  const renderer = makeRenderer(); const pipeline = new MelonMaterialPipeline(renderer as unknown as THREE.WebGLRenderer);
  const study = pipeline.createMaterial(); const gameplay = pipeline.createMaterial([0, 0], { gameplayLOD: true });
  const scene = new THREE.Scene(); const mesh = meshWithMaterial(gameplay); scene.add(mesh);
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100); camera.position.z = 30;
  pipeline.prepare(scene, camera, [mesh]);
  assert.equal(gameplay.uniforms.uFineDetail.value, 0, 'microscopic detail should be omitted when the entire fruit spans fewer than 90 pixels');
  assert.equal(study.uniforms.uFineDetail.value, 1, 'the original close-up study keeps its complete material');
  camera.position.z = 12; pipeline.prepare(scene, camera, [mesh]);
  assert.equal(gameplay.uniforms.uFineDetail.value, 0, 'the measured 135-pixel gameplay bound must skip the expensive microscopic loops completely');
  camera.position.z = 2; pipeline.prepare(scene, camera, [mesh]);
  assert.equal(gameplay.uniforms.uFineDetail.value, 1, 'a large onscreen specimen restores the original fine detail');
  for (const name of ['uFleshSigma', 'uBands', 'uSkinColor', 'uStripeColor']) assert.deepEqual(gameplay.uniforms[name]!.value.toArray(), study.uniforms[name]!.value.toArray());
  pipeline.dispose(); mesh.geometry.dispose();
});

test('prepare restores renderer, scene visibility, and mesh materials when an offscreen render throws', () => {
  const renderer = makeRenderer();
  const previousTarget = new THREE.WebGLRenderTarget(32, 32);
  renderer.currentTarget = previousTarget;
  renderer.failOnRender = 2;
  const pipeline = new MelonMaterialPipeline(renderer as unknown as THREE.WebGLRenderer);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const material = pipeline.createMaterial([0, 0]);
  const mesh = meshWithMaterial(material);
  const originalVisibility = mesh.visible;
  const originalMaterial = mesh.material;
  scene.add(mesh);

  assert.throws(() => pipeline.prepare(scene, camera, [mesh]), /offscreen render failed/);
  assert.strictEqual(renderer.currentTarget, previousTarget);
  assert.equal(renderer.autoClear, false);
  assert.equal(renderer.autoClearColor, false);
  assert.equal(renderer.autoClearDepth, true);
  assert.equal(renderer.autoClearStencil, false);
  assert.equal(renderer.scissorTest, true);
  assert.deepEqual(renderer.viewport.toArray(), [2, 3, 640, 360]);
  assert.deepEqual(renderer.scissor.toArray(), [4, 5, 320, 180]);
  assert.equal(mesh.visible, originalVisibility);
  assert.strictEqual(mesh.material, originalMaterial);
  previousTarget.dispose();
  pipeline.dispose();
});

test('empty prepare is side-effect free and dispose releases the bounded target pool', () => {
  const renderer = makeRenderer();
  const pipeline = new MelonMaterialPipeline(renderer as unknown as THREE.WebGLRenderer);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  pipeline.prepare(scene, camera, []);
  assert.equal(renderer.renders.length, 0);
  assert.equal(renderer.clearCalls, 0);

  const material = pipeline.createMaterial([0, 0]);
  const mesh = meshWithMaterial(material);
  scene.add(mesh);
  pipeline.prepare(scene, camera, [mesh]);
  const targets = (pipeline as unknown as { backTargets: Map<THREE.Mesh, THREE.WebGLRenderTarget> }).backTargets;
  const backTarget = targets.get(mesh);
  assert.ok(backTarget);
  let disposed = false;
  const originalDispose = backTarget.dispose.bind(backTarget);
  backTarget.dispose = () => {
    disposed = true;
    originalDispose();
  };
  pipeline.dispose();
  assert.equal(disposed, true);
  assert.equal(targets.size, 0);
});
