import * as THREE from 'three';

/** Keep skin at the actual sealed cap boundary, including elongated contours. */
export function mapFruitCap(geometry: THREE.BufferGeometry): void {
  const uv = geometry.getAttribute('uv');
  for (const group of geometry.groups.filter(group => group.materialIndex === 2)) {
    for (let i = group.start; i < group.start + group.count; i++) {
      const x = uv.getX(i) - .5, y = uv.getY(i) - .5, radius = Math.hypot(x, y);
      uv.setXY(i, radius < 1e-6 ? .5 : .5 + x / radius * .5, radius < 1e-6 ? .5 : .5 + y / radius * .5);
    }
  }
  uv.needsUpdate = true;
}

/** A recessed interior within the owning coconut half; the cap supplies the meat rim. */
export function makeCoconutCavity(shell: THREE.BufferGeometry): THREE.BufferGeometry {
  const cap = shell.groups.find(group => group.materialIndex === 2)!;
  const points = shell.getAttribute('position');
  const normal = new THREE.Vector3().fromBufferAttribute(shell.getAttribute('normal'), cap.start).normalize();
  const center = new THREE.Vector3().fromBufferAttribute(points, cap.start);
  let availableDepth = 0;
  for (let i = 0; i < points.count; i++) {
    availableDepth = Math.max(availableDepth, -new THREE.Vector3().fromBufferAttribute(points, i).sub(center).dot(normal));
  }
  const depth = availableDepth * .64;
  const positions: number[] = [], colours: number[] = [];
  const point = (edge: THREE.Vector3, radius: number, recession: number) =>
    center.clone().addScaledVector(edge.clone().sub(center), radius).addScaledVector(normal, -recession);
  const emit = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    for (const vertex of [a, b, c]) {
      positions.push(...vertex.toArray());
      const shade = Math.min(1, -vertex.clone().sub(center).dot(normal) / depth);
      const colour = new THREE.Color(0xeee4c6).lerp(new THREE.Color(0x8a7550), shade * .55);
      colours.push(colour.r, colour.g, colour.b);
    }
  };
  for (let i = cap.start; i < cap.start + cap.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(points, i + 1);
    const b = new THREE.Vector3().fromBufferAttribute(points, i + 2);
    const rings = [[.58, .001], [.45, depth * .5], [.22, depth * .9], [0, depth]];
    for (let ring = 0; ring < rings.length - 1; ring++) {
      const [r0, d0] = rings[ring]!, [r1, d1] = rings[ring + 1]!;
      const a0 = point(a, r0!, d0!), b0 = point(b, r0!, d0!), a1 = point(a, r1!, d1!), b1 = point(b, r1!, d1!);
      emit(a0, b0, a1);
      if (r1! > 0) emit(b0, b1, a1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export interface FruitGround { minX: number; maxX: number; minZ: number; maxZ: number; y: number }
export class FruitCleave {
  elapsed = 0;
  surfaces: FruitGround[] = [];
  private readonly pivots: THREE.Vector3[];
  private readonly rotations: THREE.Quaternion[];
  constructor(private readonly halves: readonly THREE.Group[], private readonly origin: THREE.Vector3,
    private readonly normal: THREE.Vector3, private readonly diameter: number) {
    this.pivots = halves.map(root => {
      const geometry = (root.children[0] as THREE.Mesh).geometry;
      geometry.computeBoundingBox(); return geometry.boundingBox!.getCenter(new THREE.Vector3());
    });
    this.rotations = halves.map(root => {
      const geometry = (root.children[0] as THREE.Mesh).geometry;
      const cap = geometry.groups.find(group => group.materialIndex === 2)!;
      const n = new THREE.Vector3().fromBufferAttribute(geometry.getAttribute('normal'), cap.start).normalize();
      const rotation = new THREE.Quaternion().setFromUnitVectors(n, new THREE.Vector3(0, 0, 1));
      // Leave shell thickness visible instead of flattening both faces into a front view.
      return new THREE.Quaternion().slerp(rotation, .72);
    });
    this.sample(0);
  }
  sample(seconds: number): void {
    this.elapsed = Math.min(.8, Math.max(0, seconds));
    const ease = (x: number) => { const t = THREE.MathUtils.clamp(x, 0, 1); return t * t * (3 - 2 * t); };
    const opening = ease((this.elapsed - .06) / .28), landing = ease((this.elapsed - .34) / .26);
    const rebound = this.elapsed <= .6 ? 0 : Math.sin(Math.PI * Math.min(1, (this.elapsed - .6) / .2)) * this.diameter * .04;
    this.halves.forEach((root, index) => {
      const pivot = this.pivots[index]!;
      root.visible = true; root.scale.setScalar(1);
      root.quaternion.identity().slerp(this.rotations[index]!, opening);
      root.position.copy(this.origin).add(pivot).sub(pivot.clone().applyQuaternion(root.quaternion))
        .addScaledVector(this.normal, (index === 0 ? -1 : 1) * this.diameter * .12 * opening);
      if (!this.surfaces.length) return;
      root.updateWorldMatrix(true, true);
      const bounds = new THREE.Box3().setFromObject(root.children[0]!, true);
      let floor = 0;
      for (const surface of this.surfaces) {
        if (bounds.max.x < surface.minX || bounds.min.x > surface.maxX || bounds.max.z < surface.minZ || bounds.min.z > surface.maxZ) continue;
        if (surface.y <= this.origin.y + 1e-5) floor = Math.max(floor, surface.y);
      }
      const drop = floor - bounds.min.y;
      root.position.y += (drop > 0 ? drop : drop * landing) + rebound;
    });
    this.halves.forEach(root => root.updateWorldMatrix(true, true));
  }
}
