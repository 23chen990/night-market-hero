import * as THREE from 'three';

interface Vertex { p: THREE.Vector3; n: THREE.Vector3; uv: THREE.Vector2 }
interface Output { positions: number[]; normals: number[]; uvs: number[]; groups: { start: number; count: number; materialIndex: number }[] }
const EPSILON = 1e-7;

/** Slice the original convex item mesh, including a sealed face on both pieces. */
export function splitClosedGeometry(source: THREE.BufferGeometry, plane: THREE.Plane): {
  halves: readonly [THREE.BufferGeometry, THREE.BufferGeometry];
  caps: readonly [THREE.BufferGeometry, THREE.BufferGeometry];
} {
  const position = source.getAttribute('position');
  const normal = source.getAttribute('normal');
  const uv = source.getAttribute('uv');
  const indices = source.index;
  const count = indices?.count ?? position.count;
  const boundary = new Map<string, THREE.Vector3>();
  const outputs: Output[] = [0, 1].map(() => ({positions: [], normals: [], uvs: [], groups: []}));
  const read = (index: number): Vertex => ({ p: new THREE.Vector3().fromBufferAttribute(position, index),
    n: normal ? new THREE.Vector3().fromBufferAttribute(normal, index) : new THREE.Vector3(),
    uv: uv ? new THREE.Vector2(uv.getX(index), uv.getY(index)) : new THREE.Vector2() });
  const append = (out: Output, vertices: Vertex[], materialIndex: number): void => {
    for (let i = 1; i < vertices.length - 1; i++) {
      const tri = [vertices[0]!, vertices[i]!, vertices[i + 1]!];
      if (tri[1]!.p.clone().sub(tri[0]!.p).cross(tri[2]!.p.clone().sub(tri[0]!.p)).lengthSq() < 1e-16) continue;
      const start = out.positions.length / 3;
      for (const vertex of tri) { out.positions.push(...vertex.p.toArray()); out.normals.push(...vertex.n.toArray()); out.uvs.push(...vertex.uv.toArray()); }
      const previous = out.groups.at(-1);
      if (previous?.materialIndex === materialIndex) previous.count += 3;
      else out.groups.push({start, count: 3, materialIndex});
    }
  };
  for (let i = 0; i < count; i += 3) {
    const triangle = [0, 1, 2].map(j => read(indices ? indices.getX(i + j) : i + j));
    const distances = triangle.map(v => plane.distanceToPoint(v.p));
    const materialIndex = (source.groups.find(g => i >= g.start && i < g.start + g.count)?.materialIndex ?? 0) === 0 ? 0 : 1;
    for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
      const sign = sideIndex === 0 ? -1 : 1;
      const polygon: Vertex[] = [];
      for (let j = 0; j < 3; j++) {
        const a = triangle[j]!, b = triangle[(j + 1) % 3]!;
        const da = distances[j]!, db = distances[(j + 1) % 3]!;
        if (da * sign >= -EPSILON) polygon.push(a);
        if (da * db < -EPSILON * EPSILON) {
          const ratio = da / (da - db);
          const vertex = {p: a.p.clone().lerp(b.p, ratio), n: a.n.clone().lerp(b.n, ratio).normalize(), uv: a.uv.clone().lerp(b.uv, ratio)};
          polygon.push(vertex);
          boundary.set(vertex.p.toArray().map(v => Math.round(v * 1e6)).join(','), vertex.p);
        }
        if (Math.abs(da) <= EPSILON) boundary.set(a.p.toArray().map(v => Math.round(v * 1e6)).join(','), a.p);
      }
      append(outputs[sideIndex]!, polygon, materialIndex);
    }
  }
  const points = [...boundary.values()];
  if (points.length < 3 || outputs.some(o => o.positions.length === 0)) throw new Error('Cut plane misses item interior');
  const centre = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / points.length);
  const u = new THREE.Vector3(0, 0, 1).cross(plane.normal).normalize();
  if (u.lengthSq() < 0.5) u.set(1, 0, 0).cross(plane.normal).normalize();
  const v = plane.normal.clone().cross(u).normalize();
  points.sort((a,b) => Math.atan2(a.clone().sub(centre).dot(v), a.clone().sub(centre).dot(u)) - Math.atan2(b.clone().sub(centre).dot(v), b.clone().sub(centre).dot(u)));
  const makeGeometry = (out: Output): THREE.BufferGeometry => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(out.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(out.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(out.uvs, 2));
    for (const group of out.groups) geometry.addGroup(group.start, group.count, group.materialIndex);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return geometry;
  };
  const capExtent = Math.max(
    1e-6,
    ...points.map((point) => Math.max(Math.abs(point.clone().sub(centre).dot(u)), Math.abs(point.clone().sub(centre).dot(v)))),
  );
  const caps = outputs.map((out, index) => {
    const cap: Output = {positions: [], normals: [], uvs: [], groups: []};
    const n = plane.normal.clone().multiplyScalar(index === 0 ? 1 : -1);
    const vertex = (p: THREE.Vector3): Vertex => {
      const local = p.clone().sub(centre);
      return { p, n, uv: new THREE.Vector2(0.5 + local.dot(u) / (2 * capExtent), 0.5 + local.dot(v) / (2 * capExtent)) };
    };
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!, b = points[(i + 1) % points.length]!;
      const triangle = index === 0 ? [vertex(centre), vertex(a), vertex(b)] : [vertex(centre), vertex(b), vertex(a)];
      append(cap, triangle, 2); append(out, triangle, 2);
    }
    return makeGeometry(cap);
  });
  return {halves: [makeGeometry(outputs[0]!), makeGeometry(outputs[1]!)], caps: [caps[0]!, caps[1]!]};
}
