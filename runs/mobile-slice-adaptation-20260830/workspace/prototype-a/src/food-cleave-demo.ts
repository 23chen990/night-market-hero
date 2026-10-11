import * as THREE from 'three';
import { WATERMELON, type CleaveState } from './watermelon-cleave';

import { createCleaveKnifeRig } from './cleave-visuals';

import { createFoodCleaveController, FoodCleavePreview, FOOD_CLEAVE_SAMPLES, type FoodCleaveSample } from './food-cleave';

const host = document.querySelector<HTMLElement>('#stage')!;
const cut = document.querySelector<HTMLButtonElement>('#cut')!;
const reset = document.querySelector<HTMLButtonElement>('#reset')!;
const slow = document.querySelector<HTMLInputElement>('#slow')!;
const phase = document.querySelector<HTMLElement>('#phase')!;
let controller = createFoodCleaveController(FOOD_CLEAVE_SAMPLES[0]!.id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x92dca5);
const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 70);
camera.position.set(2.8, 5.4, 7.0);
camera.lookAt(0, 1.45, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
host.append(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xf5fff6, 0x5e9870, 2.7));
const sunlight = new THREE.DirectionalLight(0xfff9ec, 3.1);
sunlight.position.set(-3.5, 8, 5);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.left = -6; sunlight.shadow.camera.right = 6;
sunlight.shadow.camera.top = 7; sunlight.shadow.camera.bottom = -5;
sunlight.shadow.normalBias = 0.025;
sunlight.shadow.bias = -0.0002;
scene.add(sunlight);
const fill = new THREE.DirectionalLight(0xe0f3ff, 1.1);
fill.position.set(4, 2, -4); scene.add(fill);

let preview = new FoodCleavePreview(FOOD_CLEAVE_SAMPLES[0]!);
scene.add(preview.root);
const table = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 4.2), new THREE.MeshStandardMaterial({ color: 0xf7fbf9, roughness: 0.73 }));
table.position.set(0, 0.1, 0); table.receiveShadow = true; scene.add(table);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x92dca5, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.09; ground.receiveShadow = true; scene.add(ground);

const {root:knife,edge}=createCleaveKnifeRig();
scene.add(knife);

function resize(): void {
  const width = host.clientWidth, height = host.clientHeight;
  renderer.setSize(width, height);
  const aspect = width / height;
  const viewWidth = Math.max(5.5, 5.4 * aspect);
  camera.left = -viewWidth / 2; camera.right = viewWidth / 2;
  camera.top = viewWidth / aspect / 2; camera.bottom = -camera.top;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const labels = { entering: '切入', opening: '劈开', landing: '落地', settled: '完成' };
let previous = performance.now();
function apply(state: CleaveState): void {
  knife.position.set(...state.frame.knife.position);
  knife.position.y += preview.centreY - WATERMELON.centerY;
  preview.apply(state.elapsed);
  phase.textContent = state.status === 'ready' ? '准备好' : labels[state.frame.stage];
  cut.disabled = state.status === 'cutting';
  cut.querySelector('span')!.textContent = state.status === 'ready' ? '切一刀' : state.status === 'cutting' ? '切割中' : '再切一次';
  renderer.render(scene, camera);
}
function start(): void {
  if (controller.start()) { previous = performance.now(); apply(controller.getState()); }
}
cut.addEventListener('click', start);
renderer.domElement.addEventListener('pointerdown', start);
reset.addEventListener('click', () => { controller.reset(); previous = performance.now(); apply(controller.getState()); });
window.addEventListener('keydown', event => {
  if (event.code === 'Space' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); start(); }
});
document.addEventListener('visibilitychange', () => { previous = performance.now(); });
function tick(now: number): void {
  const delta = Math.max(0, (now - previous) / 1000);
  previous = now;
  if (!document.hidden) controller.advanceVisible(delta, slow.checked ? 0.4 : 1);
  apply(controller.getState());
  requestAnimationFrame(tick);
}
apply(controller.getState());
requestAnimationFrame(tick);

function select(sample: FoodCleaveSample): void {
  preview.dispose(); preview = new FoodCleavePreview(sample); scene.add(preview.root);
  controller = createFoodCleaveController(sample.id);
  controller.reset(); previous = performance.now();
  document.querySelector<HTMLElement>('#object-name')!.textContent = sample.label;
  document.querySelectorAll<HTMLButtonElement>('#samples button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.food === sample.id)));
  apply(controller.getState());
}
for (const sample of FOOD_CLEAVE_SAMPLES) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = sample.label;
  button.dataset.food = sample.id; button.setAttribute('aria-pressed',String(sample.id === preview.sample.id));
  button.addEventListener('click',()=>select(sample)); document.querySelector('#samples')!.append(button);
}
declare global {
  interface Window { __FOOD_CLEAVE_DEMO__: { getState(): CleaveState & ReturnType<FoodCleavePreview['facts']> & { speed: number; bladeEdgeWorld: number[] } } }
}
window.__FOOD_CLEAVE_DEMO__ = { getState: () => ({ ...controller.getState(), ...preview.facts(), speed: slow.checked ? 0.4 : 1,
  bladeEdgeWorld: new THREE.Vector3(0, edge.geometry.boundingBox!.min.y, 0).applyMatrix4(edge.matrixWorld).toArray() }) };
