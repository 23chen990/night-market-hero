import * as THREE from 'three';
import { createCleaveKnifeGeometry } from './watermelon-cleave';

function texture(paint: (u: number, v: number) => readonly [number, number, number], size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const rgb = paint(x / (size - 1), y / (size - 1));
    const offset = (y * size + x) * 4;
    for (let channel = 0; channel < 3; channel++) data[offset + channel] = rgb[channel];
    data[offset + 3] = 255;
  }
  const result = new THREE.DataTexture(data, size, size);
  result.colorSpace = THREE.SRGBColorSpace;
  result.magFilter = THREE.LinearFilter; result.minFilter = THREE.LinearFilter;
  result.needsUpdate = true;
  return result;
}

export function createWatermelonMaterials() {
const rindMap = texture((u, v) => {
  const wave = Math.sin(u * Math.PI * 22 + Math.sin(v * 13) * 0.28 + Math.sin(v * 29 + u * 8) * 0.12);
  const stripe = THREE.MathUtils.smoothstep(wave, -0.15, 0.25);
  const grain = Math.sin(u * 1451 + v * 1927) * 3;
  return [34 + stripe * 43 + grain, 97 + stripe * 57 + grain, 24 + stripe * 16 + grain];
});
const seeds = [0.29, 0.56, 0.76].flatMap((radius, ring) => Array.from({ length: 5 + ring * 3 }, (_, i) => {
  const angle = (i / (5 + ring * 3)) * Math.PI * 2 + ring * 0.6;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, angle };
}));
const fleshMap = texture((u, v) => {
  const x = (u - 0.5) * 2, y = (v - 0.5) * 2;
  const radius = Math.hypot(x, y);
  if (radius > 0.95) return [43, 125, 32];
  if (radius > 0.875) return [205, 238, 153];
  const grain = Math.sin(x * 377 + y * 719) * 2.5;
  for (const seed of seeds) {
    const dx = x - seed.x, dy = y - seed.y;
    const along = dx * Math.cos(seed.angle) + dy * Math.sin(seed.angle);
    const across = -dx * Math.sin(seed.angle) + dy * Math.cos(seed.angle);
    if ((along / 0.046) ** 2 + (across / 0.024) ** 2 < 1) return [37, 22, 19];
  }
  return [238 + grain, 63 + radius * 13 + grain, 77 + radius * 6 + grain];
});
const rindMaterial = new THREE.MeshStandardMaterial({ map: rindMap, roughness: 0.46, metalness: 0 });
const fleshMaterial = new THREE.MeshStandardMaterial({ map: fleshMap, roughness: 0.55, metalness: 0 });

return { rind: rindMaterial, flesh: fleshMaterial, dispose: () => { rindMaterial.dispose(); fleshMaterial.dispose(); rindMap.dispose(); fleshMap.dispose(); } };
}

export function createCleaveKnifeRig() {
const knife = new THREE.Group();
knife.name = 'center-plane-knife';
const steel = new THREE.MeshStandardMaterial({ color: 0xd7ebf0, metalness: 0.65, roughness: 0.23 });
const edgeSteel = new THREE.MeshStandardMaterial({ color: 0xf4ffff, metalness: 0.65, roughness: 0.12 });
const knifeGeometry = createCleaveKnifeGeometry();
const blade = new THREE.Mesh(knifeGeometry.blade, steel);
blade.castShadow = true; knife.add(blade);
const edge = new THREE.Mesh(knifeGeometry.edge, edgeSteel);
edge.name = 'actual-cutting-edge'; knife.add(edge);
const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.11, 0.72, 12), new THREE.MeshStandardMaterial({ color: 0xf17a61, roughness: 0.56 }));
handle.rotation.x = Math.PI / 2; handle.position.set(0, 0.08, -1.42);
handle.castShadow = true; knife.add(handle);
const guard = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.026, 8, 20), new THREE.MeshStandardMaterial({ color: 0x94614a, metalness: 0.35, roughness: 0.35 }));
guard.position.set(0, 0.08, -1.065); knife.add(guard);

return { root: knife, edge, dispose: () => { knife.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(material => material.dispose()); } }); knife.removeFromParent(); } };
}
