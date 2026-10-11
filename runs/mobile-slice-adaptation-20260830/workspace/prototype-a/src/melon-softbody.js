/* Extracted DOM-free SIM-BEGIN/SIM-END kernel from melon-jelly.html. */
function makeKernel(specOverrides = {}) {
const SPEC = {
  R: 2.55,          // melon radius: tip → outer rind
  halfAngle: 0.5,   // half the wedge angle (rad)
  h: 0.74,          // thickness
  rc: 0.28,         // plan-view corner rounding
  bevel: 0.2,       // edge rounding of the slab
  dome: 0.05,       // soft pillow on the top face
  skinT: 0.075,     // green skin depth on the cut faces
  paleT: 0.36,      // depth of the pale rind band
  tetSpacing: 0.32,
  tetLayers: 2,
  substeps: 6,
  surfaceDetailScale: 1,
  ...specOverrides,
};

function smoothstep(a, b, x) { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); }
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Plan-view profile in the "melon frame": melon centre O at the origin, wedge opening along +x.
   Traversed counter-clockwise; at(s) returns [x, y, nx, ny] at arclength s. */
function makeProfile() {
  const { R, halfAngle: a, rc } = SPEC;
  const sa = Math.sin(a), ca = Math.cos(a);
  const nLow = [-sa, -ca], nUp = [-sa, ca];
  const tipC = [rc / sa, 0];
  const t = Math.sqrt((R - rc) ** 2 - rc * rc);
  const aLow = [t * ca + rc * sa, -t * sa + rc * ca];
  const aUp = [aLow[0], -aLow[1]];
  const thA = Math.atan2(aLow[1], aLow[0]);
  const angLow = Math.atan2(nLow[1], nLow[0]);
  const angUp = Math.atan2(nUp[1], nUp[0]);
  const pieces = [
    { k: 'arc', c: tipC, r: rc, a0: angUp, a1: angLow + 2 * Math.PI },
    { k: 'line', p0: [tipC[0] + rc * nLow[0], tipC[1] + rc * nLow[1]], p1: [aLow[0] + rc * nLow[0], aLow[1] + rc * nLow[1]], n: nLow },
    { k: 'arc', c: aLow, r: rc, a0: angLow, a1: thA },
    { k: 'arc', c: [0, 0], r: R, a0: thA, a1: -thA },
    { k: 'arc', c: aUp, r: rc, a0: -thA, a1: angUp },
    { k: 'line', p0: [aUp[0] + rc * nUp[0], aUp[1] + rc * nUp[1]], p1: [tipC[0] + rc * nUp[0], tipC[1] + rc * nUp[1]], n: nUp },
  ];
  for (const p of pieces) p.len = p.k === 'arc' ? p.r * (p.a1 - p.a0) : Math.hypot(p.p1[0] - p.p0[0], p.p1[1] - p.p0[1]);
  const total = pieces.reduce((s, p) => s + p.len, 0);
  function at(s) {
    s = ((s % total) + total) % total;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (s <= p.len || i === pieces.length - 1) {
        const u = Math.min(s / p.len, 1);
        if (p.k === 'arc') {
          const th = p.a0 + (p.a1 - p.a0) * u, c = Math.cos(th), sn = Math.sin(th);
          return [p.c[0] + p.r * c, p.c[1] + p.r * sn, c, sn];
        }
        return [p.p0[0] + (p.p1[0] - p.p0[0]) * u, p.p0[1] + (p.p1[1] - p.p0[1]) * u, p.n[0], p.n[1]];
      }
      s -= p.len;
    }
    return null;
  }
  const segDist = (x, y, p, q) => {
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const u = Math.min(Math.max(((x - p[0]) * dx + (y - p[1]) * dy) / (dx * dx + dy * dy), 0), 1);
    return Math.hypot(x - p[0] - dx * u, y - p[1] - dy * u);
  };
  // exact signed distance to the rounded wedge (negative inside)
  function sdf(x, y) {
    const r = Math.hypot(x, y), th = Math.atan2(y, x), Ri = R - rc;
    const dl = segDist(x, y, tipC, aLow), du = segDist(x, y, tipC, aUp);
    const da = Math.abs(th) <= -thA ? Math.abs(r - Ri) : Math.min(Math.hypot(x - aLow[0], y - aLow[1]), Math.hypot(x - aUp[0], y - aUp[1]));
    const d = Math.min(dl, du, da);
    const inside = (x - tipC[0]) * nLow[0] + (y - tipC[1]) * nLow[1] <= 0 &&
      (x - tipC[0]) * nUp[0] + (y - tipC[1]) * nUp[1] <= 0 && r <= Ri;
    return (inside ? -d : d) - rc;
  }
  return { at, total, sdf, tipC, aLow, aUp };
}

function profileCentroid(prof) {
  const n = 1024, pts = [];
  for (let i = 0; i < n; i++) pts.push(prof.at(i / n * prof.total));
  let A = 0, cx = 0, cy = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    const c = x0 * y1 - x1 * y0;
    A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
  }
  A *= 0.5;
  return [cx / (6 * A), cy / (6 * A)];
}

// height with the soft top pillow applied (x, z in the melon frame, y in [0, h])
function domed(prof, x, z, y) { return y + SPEC.dome * smoothstep(0, 0.9, -prof.sdf(x, z)) * (y / SPEC.h); }

function delaunay(pts) {
  const n = pts.length, P = pts.map(p => [p[0], p[1]]);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const d = Math.max(x1 - x0, y1 - y0) * 20, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  P.push([mx - d, my - d], [mx + d, my - d], [mx, my + d]);
  const circ = (a, b, c) => {
    const [ax, ay] = P[a], [bx, by] = P[b], [cx, cy] = P[c];
    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / D;
    const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / D;
    return { a, b, c, x: ux, y: uy, r2: (ax - ux) ** 2 + (ay - uy) ** 2 };
  };
  let tris = [circ(n, n + 1, n + 2)];
  for (let i = 0; i < n; i++) {
    const [px, py] = P[i];
    const keep = [], edges = new Map();
    for (const t of tris) {
      if ((px - t.x) ** 2 + (py - t.y) ** 2 < t.r2) {
        for (const [u, v] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
          const key = u < v ? u * 65536 + v : v * 65536 + u;
          if (edges.has(key)) edges.delete(key); else edges.set(key, [u, v]);
        }
      } else keep.push(t);
    }
    for (const [u, v] of edges.values()) keep.push(circ(u, v, i));
    tris = keep;
  }
  return tris.filter(t => t.a < n && t.b < n && t.c < n).map(t => [t.a, t.b, t.c]);
}

function tetVolume(P, a, b, c, d) {
  const ax = P[3 * a], ay = P[3 * a + 1], az = P[3 * a + 2];
  const e1x = P[3 * b] - ax, e1y = P[3 * b + 1] - ay, e1z = P[3 * b + 2] - az;
  const e2x = P[3 * c] - ax, e2y = P[3 * c + 1] - ay, e2z = P[3 * c + 2] - az;
  const e3x = P[3 * d] - ax, e3y = P[3 * d + 1] - ay, e3z = P[3 * d + 2] - az;
  return ((e1y * e2z - e1z * e2y) * e3x + (e1z * e2x - e1x * e2z) * e3y + (e1x * e2y - e1y * e2x) * e3z) / 6;
}

/* Volumetric mesh: Delaunay triangulation of the plan view, extruded into prisms, each split into
   three tets with a globally consistent diagonal rule so neighbouring prisms share faces. */
function buildTetMesh(prof, cen) {
  const { tetSpacing: sp, tetLayers: L, h } = SPEC;
  const rng = mulberry32(71);
  const p2 = [];
  const nb = Math.max(12, Math.round(prof.total / sp));
  for (let i = 0; i < nb; i++) {
    const q = prof.at((i + 0.5) / nb * prof.total);
    p2.push([q[0] + q[2] * 0.014, q[1] + q[3] * 0.014]);
  }
  const dy = sp * Math.sqrt(3) / 2;
  let row = 0;
  for (let y = -SPEC.R; y <= SPEC.R; y += dy, row++) {
    for (let x = (row & 1) ? sp / 2 : 0; x <= SPEC.R + sp; x += sp) {
      if (prof.sdf(x, y) < -0.6 * sp) p2.push([x + (rng() - 0.5) * 1e-4, y + (rng() - 0.5) * 1e-4]);
    }
  }
  let tris = delaunay(p2).filter(([a, b, c]) => {
    const [ax, ay] = p2[a], [bx, by] = p2[b], [cx, cy] = p2[c];
    const area = Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2;
    const l2 = (bx - ax) ** 2 + (by - ay) ** 2 + (cx - bx) ** 2 + (cy - by) ** 2 + (ax - cx) ** 2 + (ay - cy) ** 2;
    return 4 * Math.sqrt(3) * area / l2 > 0.22;
  });
  const remap = new Int32Array(p2.length).fill(-1), q2 = [];
  for (const t of tris) for (let k = 0; k < 3; k++) if (remap[t[k]] < 0) { remap[t[k]] = q2.length; q2.push(p2[t[k]]); }
  tris = tris.map(t => t.map(i => remap[i]));
  const n2 = q2.length, n = n2 * (L + 1);
  const pos = new Float64Array(n * 3);
  for (let k = 0; k <= L; k++) for (let i = 0; i < n2; i++) {
    const [x, z] = q2[i], id = k * n2 + i;
    pos[3 * id] = x - cen[0]; pos[3 * id + 1] = domed(prof, x, z, h * k / L); pos[3 * id + 2] = z - cen[1];
  }
  const tets = [];
  for (let k = 0; k < L; k++) for (const t of tris) {
    const [a, b, c] = t.slice().sort((u, v) => u - v);
    const A = k * n2 + a, B = k * n2 + b, C = k * n2 + c, A1 = A + n2, B1 = B + n2, C1 = C + n2;
    tets.push([A, B, C, C1], [A, B, C1, B1], [A, B1, C1, A1]);
  }
  for (const t of tets) if (tetVolume(pos, t[0], t[1], t[2], t[3]) < 0) { const s = t[2]; t[2] = t[3]; t[3] = s; }
  const edgeSet = new Map();
  for (const t of tets) for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a = Math.min(t[i], t[j]), b = Math.max(t[i], t[j]);
    edgeSet.set(a * 65536 + b, [a, b]);
  }
  return {
    n, n2, layers: L, pos,
    tets: Uint32Array.from(tets.flat()),
    edges: Uint32Array.from([...edgeSet.values()].flat()),
  };
}

/* ---------- surfaces (all in rest space, later embedded into the tets) ---------- */
function orientOutward(pos, idx, start, end, cx, cy, cz) {
  for (let t = start; t < end; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const ux = pos[3 * b] - pos[3 * a], uy = pos[3 * b + 1] - pos[3 * a + 1], uz = pos[3 * b + 2] - pos[3 * a + 2];
    const vx = pos[3 * c] - pos[3 * a], vy = pos[3 * c + 1] - pos[3 * a + 1], vz = pos[3 * c + 2] - pos[3 * a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (pos[3 * a] + pos[3 * b] + pos[3 * c]) / 3 - cx;
    const my = (pos[3 * a + 1] + pos[3 * b + 1] + pos[3 * c + 1]) / 3 - cy;
    const mz = (pos[3 * a + 2] + pos[3 * b + 2] + pos[3 * c + 2]) / 3 - cz;
    if (nx * mx + ny * my + nz * mz < 0) { idx[t + 1] = c; idx[t + 2] = b; }
  }
}

function buildJellySurface(prof, cen) {
  const { h, bevel: b } = SPEC;
  const detail = SPEC.surfaceDetailScale;
  const N = Math.max(32, Math.round(208 * detail)), Mc = Math.max(4, Math.round(22 * detail)), Mr = Math.max(4, Math.round(20 * detail));
  const P = [];
  for (let i = 0; i < N; i++) P.push(prof.at(i / N * prof.total));
  const qL = Math.PI * b / 2, wL = h - 2 * b, tot = 2 * qL + wL;
  const rim = [];
  for (let j = 1; j < Mr; j++) {
    const s = j / Mr * tot;
    if (s < qL) { const ps = -Math.PI / 2 + s / b; rim.push([b * Math.cos(ps), b + b * Math.sin(ps)]); }
    else if (s < qL + wL) rim.push([b, b + (s - qL)]);
    else { const ps = (s - qL - wL) / b; rim.push([b * Math.cos(ps), h - b + b * Math.sin(ps)]); }
  }
  const rows = [];
  const ring = k => 1 - Math.pow(1 - k / Mc, 1.25);
  for (let k = 0; k <= Mc; k++) rows.push({ cap: true, t: ring(k), y: 0 });
  for (const [o, y] of rim) rows.push({ cap: false, o, y });
  for (let k = Mc; k >= 0; k--) rows.push({ cap: true, t: ring(k), y: h });
  const nv = rows.length * N;
  const pos = new Float32Array(nv * 3);
  let v = 0;
  for (const r of rows) for (let i = 0; i < N; i++, v++) {
    const [px, py, nx, ny] = P[i];
    const ix = px - b * nx, iy = py - b * ny;
    let x, z;
    if (r.cap) { x = cen[0] + r.t * (ix - cen[0]); z = cen[1] + r.t * (iy - cen[1]); }
    else { x = ix + nx * r.o; z = iy + ny * r.o; }
    pos[3 * v] = x - cen[0]; pos[3 * v + 1] = domed(prof, x, z, r.y); pos[3 * v + 2] = z - cen[1];
  }
  const idx = [];
  const triArea2 = (a, b2, c) => {
    const ux = pos[3 * b2] - pos[3 * a], uy = pos[3 * b2 + 1] - pos[3 * a + 1], uz = pos[3 * b2 + 2] - pos[3 * a + 2];
    const vx = pos[3 * c] - pos[3 * a], vy = pos[3 * c + 1] - pos[3 * a + 1], vz = pos[3 * c + 2] - pos[3 * a + 2];
    return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
  };
  for (let r = 0; r < rows.length - 1; r++) for (let i = 0; i < N; i++) {
    const a = r * N + i, bb = r * N + (i + 1) % N, c = (r + 1) * N + i, d = (r + 1) * N + (i + 1) % N;
    if (triArea2(a, bb, d) > 1e-9) idx.push(a, bb, d);
    if (triArea2(a, d, c) > 1e-9) idx.push(a, d, c);
  }
  const I = Uint32Array.from(idx);
  orientOutward(pos, I, 0, I.length, 0, h / 2, 0);
  return { pos, idx: I, count: nv };
}

function buildSeeds(prof, cen, rng) {
  const { h, halfAngle } = SPEC;
  const list = [];
  for (const side of [1, -1]) {
    const want = side > 0 ? 14 : 11;
    let tries = 0, got = 0;
    while (got < want && tries++ < 6000) {
      const rr = 1.36 + (rng() + rng() - 1) * 0.5;
      const ang = (rng() * 2 - 1) * (halfAngle - 0.1);
      const x = rr * Math.cos(ang), z = rr * Math.sin(ang);
      if (prof.sdf(x, z) > -0.32) continue;
      if (list.some(s => s.side === side && Math.hypot(s.x - x, s.z - z) < 0.31)) continue;
      list.push({ x, z, side, rot: ang + (rng() - 0.5) * 0.55, scale: 0.82 + rng() * 0.34, tilt: (rng() - 0.5) * 0.3, tone: rng() });
      got++;
    }
  }
  const NT = Math.max(4, Math.round(10 * SPEC.surfaceDetailScale)), NR = Math.max(6, Math.round(12 * SPEC.surfaceDetailScale)), per = (NT + 1) * NR;
  const pos = new Float32Array(list.length * per * 3), aux = new Float32Array(list.length * per * 2);
  const idx = [], centers = new Float32Array(list.length * 3);
  const L0 = 0.22, W0 = 0.12, T0 = 0.06, norm = Math.pow(1.2, 0.75) * Math.pow(0.8, 0.5);
  list.forEach((s, si) => {
    const L = L0 * s.scale, W = W0 * s.scale, T = T0 * s.scale;
    const e1 = [Math.cos(s.rot), 0, Math.sin(s.rot)], e2 = [-Math.sin(s.rot), 0, Math.cos(s.rot)], e3 = [0, s.side, 0];
    const top = domed(prof, s.x, s.z, h);
    const cy = s.side > 0 ? top - T * 0.12 : T * 0.78;
    const C = [s.x - cen[0], cy, s.z - cen[1]];
    centers.set(C, si * 3);
    const base = si * per;
    for (let k = 0; k <= NT; k++) {
      const u = -Math.cos(k / NT * Math.PI);
      const w = Math.pow(Math.max(1 + u, 0), 0.75) * Math.pow(Math.max(1 - u, 0), 0.5) / norm;
      for (let j = 0; j < NR; j++) {
        const ph = j / NR * Math.PI * 2;
        const a = L / 2 * u, bw = W / 2 * w * Math.cos(ph), ct = T / 2 * w * Math.sin(ph) + s.tilt * u * T * 0.5;
        const vi = base + k * NR + j;
        for (let c = 0; c < 3; c++) pos[3 * vi + c] = C[c] + e1[c] * a + e2[c] * bw + e3[c] * ct;
        aux[2 * vi] = u; aux[2 * vi + 1] = s.tone;
      }
    }
    const t0 = idx.length;
    for (let k = 0; k < NT; k++) for (let j = 0; j < NR; j++) {
      const a = base + k * NR + j, b = base + k * NR + (j + 1) % NR, c = base + (k + 1) * NR + j, d = base + (k + 1) * NR + (j + 1) % NR;
      if (k > 0) idx.push(a, b, d);
      if (k < NT - 1) idx.push(a, d, c);
    }
    const I = idx; // orient this seed's triangles against its centre
    const tmp = Uint32Array.from(I.slice(t0));
    orientOutward(pos, tmp, 0, tmp.length, C[0], C[1], C[2]);
    for (let q = 0; q < tmp.length; q++) I[t0 + q] = tmp[q];
  });
  return { pos, aux, idx: Uint32Array.from(idx), count: list.length * per, seeds: list.length, centers };
}

function buildBubbles(prof, cen, rng) {
  const { h } = SPEC;
  const list = [];
  let tries = 0;
  while (list.length < 9 && tries++ < 4000) {
    const rr = 0.55 + rng() * 1.5, ang = (rng() * 2 - 1) * 0.4;
    const x = rr * Math.cos(ang), z = rr * Math.sin(ang);
    if (prof.sdf(x, z) > -0.28) continue;
    const r = 0.014 + rng() * rng() * 0.03;
    const y = list.length < 4 ? h - 0.07 - rng() * 0.1 : 0.14 + rng() * (h - 0.3);
    list.push({ x, y, z, r });
  }
  const NT = Math.max(3, Math.round(7 * SPEC.surfaceDetailScale)), NR = Math.max(6, Math.round(10 * SPEC.surfaceDetailScale)), per = (NT + 1) * NR;
  const pos = new Float32Array(list.length * per * 3), idx = [];
  list.forEach((b, bi) => {
    const base = bi * per, C = [b.x - cen[0], domed(prof, b.x, b.z, b.y), b.z - cen[1]];
    for (let k = 0; k <= NT; k++) {
      const th = k / NT * Math.PI, st = Math.sin(th), ct = Math.cos(th);
      for (let j = 0; j < NR; j++) {
        const ph = j / NR * Math.PI * 2, vi = base + k * NR + j;
        pos[3 * vi] = C[0] + b.r * st * Math.cos(ph); pos[3 * vi + 1] = C[1] + b.r * ct * 0.85; pos[3 * vi + 2] = C[2] + b.r * st * Math.sin(ph);
      }
    }
    const t0 = idx.length;
    for (let k = 0; k < NT; k++) for (let j = 0; j < NR; j++) {
      const a = base + k * NR + j, bb = base + k * NR + (j + 1) % NR, c = base + (k + 1) * NR + j, d = base + (k + 1) * NR + (j + 1) % NR;
      if (k > 0) idx.push(a, bb, d);
      if (k < NT - 1) idx.push(a, d, c);
    }
    const tmp = Uint32Array.from(idx.slice(t0));
    orientOutward(pos, tmp, 0, tmp.length, C[0], C[1], C[2]);
    for (let q = 0; q < tmp.length; q++) idx[t0 + q] = tmp[q];
  });
  return { pos, idx: Uint32Array.from(idx), count: list.length * per, bubbles: list.length };
}

/* ---------- barycentric embedding ---------- */
function makeEmbedder(tm) {
  const T = tm.tets.length / 4, P = tm.pos, tt = tm.tets;
  const inv = new Float64Array(T * 9), cen = new Float64Array(T * 3), rad = new Float64Array(T);
  for (let t = 0; t < T; t++) {
    const a = tt[4 * t], b = tt[4 * t + 1], c = tt[4 * t + 2], d = tt[4 * t + 3];
    const ax = P[3 * a], ay = P[3 * a + 1], az = P[3 * a + 2];
    const e1 = [P[3 * b] - ax, P[3 * b + 1] - ay, P[3 * b + 2] - az];
    const e2 = [P[3 * c] - ax, P[3 * c + 1] - ay, P[3 * c + 2] - az];
    const e3 = [P[3 * d] - ax, P[3 * d + 1] - ay, P[3 * d + 2] - az];
    const cr = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const r0 = cr(e2, e3), r1 = cr(e3, e1), r2 = cr(e1, e2);
    const det = e1[0] * r0[0] + e1[1] * r0[1] + e1[2] * r0[2];
    inv.set([r0[0] / det, r0[1] / det, r0[2] / det, r1[0] / det, r1[1] / det, r1[2] / det, r2[0] / det, r2[1] / det, r2[2] / det], 9 * t);
    const mx = (ax + P[3 * b] + P[3 * c] + P[3 * d]) / 4, my = (ay + P[3 * b + 1] + P[3 * c + 1] + P[3 * d + 1]) / 4, mz = (az + P[3 * b + 2] + P[3 * c + 2] + P[3 * d + 2]) / 4;
    cen[3 * t] = mx; cen[3 * t + 1] = my; cen[3 * t + 2] = mz;
    let r = 0;
    for (const q of [a, b, c, d]) r = Math.max(r, Math.hypot(P[3 * q] - mx, P[3 * q + 1] - my, P[3 * q + 2] - mz));
    rad[t] = r;
  }
  function bary(t, x, y, z, out) {
    const a = tt[4 * t], px = x - P[3 * a], py = y - P[3 * a + 1], pz = z - P[3 * a + 2], m = 9 * t;
    const b1 = inv[m] * px + inv[m + 1] * py + inv[m + 2] * pz;
    const b2 = inv[m + 3] * px + inv[m + 4] * py + inv[m + 5] * pz;
    const b3 = inv[m + 6] * px + inv[m + 7] * py + inv[m + 8] * pz;
    out[0] = 1 - b1 - b2 - b3; out[1] = b1; out[2] = b2; out[3] = b3;
    return Math.min(out[0], b1, b2, b3);
  }
  const tmp = [0, 0, 0, 0];
  return function embed(src, count) {
    const ids = new Uint32Array(count * 4), wts = new Float32Array(count * 4);
    let worst = Infinity;
    for (let v = 0; v < count; v++) {
      const x = src[3 * v], y = src[3 * v + 1], z = src[3 * v + 2];
      let best = -Infinity, bt = 0, bw = [0, 0, 0, 0];
      for (let pass = 0; pass < 2 && best < -1e-6; pass++) {
        for (let t = 0; t < T; t++) {
          if (pass === 0) {
            const dx = x - cen[3 * t], dy = y - cen[3 * t + 1], dz = z - cen[3 * t + 2], rr = rad[t] + 0.06;
            if (dx * dx + dy * dy + dz * dz > rr * rr) continue;
          }
          const m = bary(t, x, y, z, tmp);
          if (m > best) { best = m; bt = t; bw = tmp.slice(); if (m >= -1e-6) break; }
        }
      }
      worst = Math.min(worst, best);
      for (let k = 0; k < 4; k++) { ids[4 * v + k] = tt[4 * bt + k]; wts[4 * v + k] = bw[k]; }
    }
    return { ids, wts, worst };
  };
}

/* Skinned surface: positions from the embedding, smooth normals from the deformed triangles. */
class Skin {
  constructor(emb, idx, count) {
    this.ids = emb.ids; this.wts = emb.wts; this.idx = idx; this.count = count;
    this.out = new Float32Array(count * 6);
    this.nrm = new Float32Array(count * 3);
  }
  update(X) {
    const { ids, wts, idx, out, nrm, count } = this;
    for (let v = 0; v < count; v++) {
      const i0 = 3 * ids[4 * v], i1 = 3 * ids[4 * v + 1], i2 = 3 * ids[4 * v + 2], i3 = 3 * ids[4 * v + 3];
      const w0 = wts[4 * v], w1 = wts[4 * v + 1], w2 = wts[4 * v + 2], w3 = wts[4 * v + 3], o = 6 * v;
      out[o] = w0 * X[i0] + w1 * X[i1] + w2 * X[i2] + w3 * X[i3];
      out[o + 1] = w0 * X[i0 + 1] + w1 * X[i1 + 1] + w2 * X[i2 + 1] + w3 * X[i3 + 1];
      out[o + 2] = w0 * X[i0 + 2] + w1 * X[i1 + 2] + w2 * X[i2 + 2] + w3 * X[i3 + 2];
    }
    nrm.fill(0);
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      const ax = out[6 * a], ay = out[6 * a + 1], az = out[6 * a + 2];
      const ux = out[6 * b] - ax, uy = out[6 * b + 1] - ay, uz = out[6 * b + 2] - az;
      const vx = out[6 * c] - ax, vy = out[6 * c + 1] - ay, vz = out[6 * c + 2] - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      nrm[3 * a] += nx; nrm[3 * a + 1] += ny; nrm[3 * a + 2] += nz;
      nrm[3 * b] += nx; nrm[3 * b + 1] += ny; nrm[3 * b + 2] += nz;
      nrm[3 * c] += nx; nrm[3 * c + 1] += ny; nrm[3 * c + 2] += nz;
    }
    for (let v = 0; v < count; v++) {
      const x = nrm[3 * v], y = nrm[3 * v + 1], z = nrm[3 * v + 2];
      const l = Math.hypot(x, y, z) || 1;
      out[6 * v + 3] = x / l; out[6 * v + 4] = y / l; out[6 * v + 5] = z / l;
    }
  }
}

/* ---------- XPBD soft body ---------- */
class SoftBody {
  constructor(tm, stiffOf) {
    const n = tm.n, T = tm.tets.length / 4, E = tm.edges.length / 2;
    Object.assign(this, { n, T, E, tets: tm.tets, edges: tm.edges });
    this.rest = Float64Array.from(tm.pos);
    this.x = Float64Array.from(tm.positions || tm.pos);
    this.xp = Float64Array.from(this.x);
    this.v = tm.velocities ? Float64Array.from(tm.velocities) : new Float64Array(3 * n);
    this.prevStep = Float64Array.from(this.x);
    const connected = cutMeshComponents(n, tm.tets);
    this.components = connected.components; this.componentCount = connected.count;
    this.componentNodes = Array.from({ length: connected.count }, () => []);
    this.componentTets = Array.from({ length: connected.count }, () => []);
    for (let i = 0; i < n; i++) if (this.components[i] >= 0) this.componentNodes[this.components[i]].push(i);
    for (let t = 0; t < T; t++) this.componentTets[this.components[tm.tets[4 * t]]].push(t);
    this.activeNodes = this.componentNodes.flat();
    this.m = new Float64Array(n); this.w = new Float64Array(n);
    this.restVol = new Float64Array(T); this.Bm = new Float64Array(9 * T); this.muMul = new Float64Array(T);
    let vol = 0;
    const R0 = this.rest;
    for (let t = 0; t < T; t++) {
      const a = 3 * this.tets[4 * t], b = 3 * this.tets[4 * t + 1], c = 3 * this.tets[4 * t + 2], d = 3 * this.tets[4 * t + 3];
      const e1 = [R0[b] - R0[a], R0[b + 1] - R0[a + 1], R0[b + 2] - R0[a + 2]];
      const e2 = [R0[c] - R0[a], R0[c + 1] - R0[a + 1], R0[c + 2] - R0[a + 2]];
      const e3 = [R0[d] - R0[a], R0[d + 1] - R0[a + 1], R0[d + 2] - R0[a + 2]];
      const cr = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const r0 = cr(e2, e3), r1 = cr(e3, e1), r2 = cr(e1, e2);
      const det = e1[0] * r0[0] + e1[1] * r0[1] + e1[2] * r0[2];
      if (!(det > 0) || !Number.isFinite(det)) throw new Error('SoftBody requires finite, positively oriented rest tetrahedra');
      // inverse of the rest edge matrix Dm (rows), so F = Ds · Dm⁻¹
      this.Bm.set([...r0, ...r1, ...r2].map(v => v / det), 9 * t);
      const V = det / 6;
      this.restVol[t] = V; vol += V;
      for (let k = 0; k < 4; k++) this.m[this.tets[4 * t + k]] += V / 4;
      this.muMul[t] = stiffOf((R0[a] + R0[b] + R0[c] + R0[d]) / 4, (R0[a + 1] + R0[b + 1] + R0[c + 1] + R0[d + 1]) / 4, (R0[a + 2] + R0[b + 2] + R0[c + 2] + R0[d + 2]) / 4);
    }
    this.restVolume = vol;
    this.mass = 0;
    for (let i = 0; i < n; i++) { this.w[i] = this.m[i] > 0 ? 1 / this.m[i] : 0; this.mass += this.m[i]; }
    this.componentMass = this.componentNodes.map(ids => ids.reduce((s, i) => s + this.m[i], 0));
    this.buildContactTopology();
    this.contactIterations = 2; this.contactBudget = 180000; this.contactCursor = 0;
    this.contactStats = { contacts: 0, maxDepth: 0, tests: 0, budgetHits: 0 };
    this.minVolumeRatio = 1e-4; this.safetyRejects = 0; this.safetyRollbacks = 0;
    this.elasticScratch = { ids: new Uint32Array(4), F: new Float64Array(9), co: new Float64Array(9), g: new Float64Array(12) };
    this.safetyFailed = false;
    this.restCom = this.com(this.rest);
    this.firmness = 0.35; this.damping = 0.35;
    this.substeps = SPEC.substeps; this.gravity = 16; this.maxSpeed = 32;
    this.lambdaRatio = 24; this.grabCompliance = 2e-4; this.muSoft = 22; this.muFirm = 300; this.internalFriction = 0.3; this.releaseSpeed = 5;
    this.muS = 0.5; this.muK = 0.36;
    this.grab = { active: false, count: 0, ids: new Int32Array(n), wts: new Float64Array(n), off: new Float64Array(3 * n),
      target: [0, 0, 0], axis: [0, 0, 1], twist: 0, rot: new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]) };
    this.q = [0, 0, 0, 1];
    this.R = new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    this.time = 0;
  }
  shearModulus() { return Math.exp(Math.log(this.muSoft) + this.firmness * (Math.log(this.muFirm) - Math.log(this.muSoft))); }
  dampingRate() { return 0.5 + 8 * Math.pow(this.damping, 1.5); }
  com(X) {
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < this.n; i++) { const m = this.m[i]; cx += m * X[3 * i]; cy += m * X[3 * i + 1]; cz += m * X[3 * i + 2]; }
    return [cx / this.mass, cy / this.mass, cz / this.mass];
  }
  reset(lift) {
    for (let i = 0; i < this.n; i++) {
      this.x[3 * i] = this.rest[3 * i]; this.x[3 * i + 1] = this.rest[3 * i + 1] + lift; this.x[3 * i + 2] = this.rest[3 * i + 2];
    }
    this.v.fill(0); this.prevStep.set(this.x); this.grab.active = false; this.q = [0, 0, 0, 1];
  }
  step(dt) {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    const n = this.n, x = this.x, xp = this.xp, v = this.v, w = this.w;
    this.prevStep.set(x);
    this.contactStats = { contacts: 0, maxDepth: 0, tests: 0, budgetHits: 0 };
    const ns = this.substeps, h = dt / ns, h2 = h * h, g = this.gravity;
    this.substepDt = h;
    if (this.grab.active) this.updateGrabRotation();
    const inv = 1 / h, vmax2 = this.maxSpeed * this.maxSpeed;
    for (let s = 0; s < ns; s++) {
      for (let i = 0; i < n; i++) {
        const j = 3 * i;
        xp[j] = x[j]; xp[j + 1] = x[j + 1]; xp[j + 2] = x[j + 2];
        if (w[i] === 0) { v[j] = v[j + 1] = v[j + 2] = 0; continue; }
        v[j + 1] -= g * h;
        x[j] += v[j] * h; x[j + 1] += v[j + 1] * h; x[j + 2] += v[j + 2] * h;
      }
      this.solveTets(h2);
      if (this.grab.active) this.solveGrab(h2);
      this.solveContacts();
      this.solveGround();
      if (this.componentCount > 1) this.stabilizeCutVolumes();
      if (this.preserveComponentVolume) this.restoreComponentVolumes();
      this.safeguardVolumes();
      for (let i = 0; i < n; i++) {
        const j = 3 * i;
        if (w[i] === 0) continue;
        let vx = (x[j] - xp[j]) * inv, vy = (x[j + 1] - xp[j + 1]) * inv, vz = (x[j + 2] - xp[j + 2]) * inv;
        const s2 = vx * vx + vy * vy + vz * vz;
        if (s2 > vmax2) { const k = Math.sqrt(vmax2 / s2); vx *= k; vy *= k; vz *= k; }
        v[j] = vx; v[j + 1] = vy; v[j + 2] = vz;
      }
    }
    this.applyDamping(dt);
    this.time += dt;
  }
  // Reject an unsafe proposal, never reset the specimen. Each independent piece gets its
  // own line search so a thin cut tet cannot stop an unrelated piece in mid-air.
  safeguardVolumes() {
    const { x, xp, tets: tt } = this;
    for (let c = 0; c < this.componentCount; c++) {
      const ids = this.componentNodes[c], ts = this.componentTets[c];
      const valid = X => {
        for (const i of ids) for (let k = 0; k < 3; k++) if (!Number.isFinite(X[3 * i + k])) return false;
        for (const t of ts) {
          const V = tetVolume(X, tt[4 * t], tt[4 * t + 1], tt[4 * t + 2], tt[4 * t + 3]);
          if (!Number.isFinite(V) || V < this.restVol[t] * this.minVolumeRatio) return false;
        }
        return true;
      };
      if (valid(x)) continue;
      this.safetyRejects++;
      if (!valid(xp)) {
        this.safetyFailed = true;
        throw new Error('SoftBody inversion safeguard: previous state is invalid; cannot safely roll back');
      }
      let accepted = false;
      for (let it = 0; it < 12; it++) {
        for (const i of ids) for (let k = 0; k < 3; k++) {
          const j = 3 * i + k; x[j] = xp[j] + (x[j] - xp[j]) * 0.5;
        }
        if (valid(x)) { accepted = true; break; }
      }
      if (!accepted) {
        for (const i of ids) for (let k = 0; k < 3; k++) x[3 * i + k] = xp[3 * i + k];
        this.safetyRollbacks++;
      }
    }
  }
  /* Stable Neo-Hookean as two XPBD constraints per tet (Macklin & Müller 2021):
     deviatoric C_D = |F|_F with α = 1/(μV), hydrostatic C_H = det F − γ with α = 1/(λV). */
  solveTets(h2) {
    if (this.componentCount > 1) return this.solveCutTets(h2);
    const T = this.T, tt = this.tets, x = this.x, w = this.w, V0 = this.restVol, Bm = this.Bm, mm = this.muMul;
    const mu0 = this.shearModulus(), lr = this.lambdaRatio;
    for (let t = 0; t < T; t++) {
      const q0 = tt[4 * t], q1 = tt[4 * t + 1], q2 = tt[4 * t + 2], q3 = tt[4 * t + 3];
      const i0 = 3 * q0, i1 = 3 * q1, i2 = 3 * q2, i3 = 3 * q3, m = 9 * t;
      const B00 = Bm[m], B01 = Bm[m + 1], B02 = Bm[m + 2], B10 = Bm[m + 3], B11 = Bm[m + 4], B12 = Bm[m + 5], B20 = Bm[m + 6], B21 = Bm[m + 7], B22 = Bm[m + 8];
      const w0 = w[q0], w1 = w[q1], w2 = w[q2], w3 = w[q3];
      const mu = mu0 * mm[t], lam = mu * lr, V = V0[t];
      for (let pass = 0; pass < 2; pass++) {
        const d1x = x[i1] - x[i0], d1y = x[i1 + 1] - x[i0 + 1], d1z = x[i1 + 2] - x[i0 + 2];
        const d2x = x[i2] - x[i0], d2y = x[i2 + 1] - x[i0 + 1], d2z = x[i2 + 2] - x[i0 + 2];
        const d3x = x[i3] - x[i0], d3y = x[i3 + 1] - x[i0 + 1], d3z = x[i3 + 2] - x[i0 + 2];
        // F columns f_j = Σ_k d_k B[k][j]
        const f1x = d1x * B00 + d2x * B10 + d3x * B20, f1y = d1y * B00 + d2y * B10 + d3y * B20, f1z = d1z * B00 + d2z * B10 + d3z * B20;
        const f2x = d1x * B01 + d2x * B11 + d3x * B21, f2y = d1y * B01 + d2y * B11 + d3y * B21, f2z = d1z * B01 + d2z * B11 + d3z * B21;
        const f3x = d1x * B02 + d2x * B12 + d3x * B22, f3y = d1y * B02 + d2y * B12 + d3y * B22, f3z = d1z * B02 + d2z * B12 + d3z * B22;
        let C, alpha, p1x, p1y, p1z, p2x, p2y, p2z, p3x, p3y, p3z;
        if (pass === 0) {
          C = Math.sqrt(f1x * f1x + f1y * f1y + f1z * f1z + f2x * f2x + f2y * f2y + f2z * f2z + f3x * f3x + f3y * f3y + f3z * f3z);
          if (C < 1e-9) continue;
          const ic = 1 / C;
          p1x = f1x * ic; p1y = f1y * ic; p1z = f1z * ic; p2x = f2x * ic; p2y = f2y * ic; p2z = f2z * ic; p3x = f3x * ic; p3y = f3y * ic; p3z = f3z * ic;
          alpha = 1 / (mu * V * h2);
        } else {
          p1x = f2y * f3z - f2z * f3y; p1y = f2z * f3x - f2x * f3z; p1z = f2x * f3y - f2y * f3x;
          p2x = f3y * f1z - f3z * f1y; p2y = f3z * f1x - f3x * f1z; p2z = f3x * f1y - f3y * f1x;
          p3x = f1y * f2z - f1z * f2y; p3y = f1z * f2x - f1x * f2z; p3z = f1x * f2y - f1y * f2x;
          C = f1x * p1x + f1y * p1y + f1z * p1z - (1 + mu / lam);
          alpha = 1 / (lam * V * h2);
        }
        // ∂C/∂x_k = P · B[k]ᵀ
        const g1x = p1x * B00 + p2x * B01 + p3x * B02, g1y = p1y * B00 + p2y * B01 + p3y * B02, g1z = p1z * B00 + p2z * B01 + p3z * B02;
        const g2x = p1x * B10 + p2x * B11 + p3x * B12, g2y = p1y * B10 + p2y * B11 + p3y * B12, g2z = p1z * B10 + p2z * B11 + p3z * B12;
        const g3x = p1x * B20 + p2x * B21 + p3x * B22, g3y = p1y * B20 + p2y * B21 + p3y * B22, g3z = p1z * B20 + p2z * B21 + p3z * B22;
        const g0x = -g1x - g2x - g3x, g0y = -g1y - g2y - g3y, g0z = -g1z - g2z - g3z;
        const ws = w0 * (g0x * g0x + g0y * g0y + g0z * g0z) + w1 * (g1x * g1x + g1y * g1y + g1z * g1z) +
          w2 * (g2x * g2x + g2y * g2y + g2z * g2z) + w3 * (g3x * g3x + g3y * g3y + g3z * g3z);
        const l = -C / (ws + alpha);
        x[i0] += l * w0 * g0x; x[i0 + 1] += l * w0 * g0y; x[i0 + 2] += l * w0 * g0z;
        x[i1] += l * w1 * g1x; x[i1 + 1] += l * w1 * g1y; x[i1 + 2] += l * w1 * g1z;
        x[i2] += l * w2 * g2x; x[i2 + 1] += l * w2 * g2y; x[i2 + 2] += l * w2 * g2z;
        x[i3] += l * w3 * g3x; x[i3 + 1] += l * w3 * g3y; x[i3 + 2] += l * w3 * g3z;
      }
    }
  }
  // A cut produces thin tetrahedra. Project the complete elastic energy so its
  // shear and pressure terms cancel at rest, instead of collapsing a thin tet
  // in a shear pass before the separate pressure pass can restore its volume.
  solveCutTets(h2) {
    const { x, w, tets: tt, Bm, restVol, muMul } = this;
    const { ids, F, co, g } = this.elasticScratch;
    const mu0 = this.shearModulus(), bulk = this.lambdaRatio;
    for (let t = 0; t < this.T; t++) {
      const b = 9*t;
      for (let k = 0; k < 4; k++) ids[k] = tt[4*t+k];
      F.fill(0); g.fill(0);
      for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++)
        for (let k = 0; k < 3; k++) F[3*a+c] += (x[3*ids[k+1]+a]-x[3*ids[0]+a])*Bm[b+3*k+c];
      co[0] = F[4]*F[8]-F[5]*F[7]; co[1] = F[5]*F[6]-F[3]*F[8]; co[2] = F[3]*F[7]-F[4]*F[6];
      co[3] = F[2]*F[7]-F[1]*F[8]; co[4] = F[0]*F[8]-F[2]*F[6]; co[5] = F[1]*F[6]-F[0]*F[7];
      co[6] = F[1]*F[5]-F[2]*F[4]; co[7] = F[2]*F[3]-F[0]*F[5]; co[8] = F[0]*F[4]-F[1]*F[3];
      const J = F[0]*co[0]+F[1]*co[1]+F[2]*co[2], d = J-1;
      let norm = 0; for (const f of F) norm += f*f;
      const energy = norm-3-2*d+bulk*d*d;
      if (energy <= 1e-12) continue;
      const C = Math.sqrt(energy), factor = bulk*d-1;
      for (let k = 0; k < 3; k++) for (let a = 0; a < 3; a++) {
        let q = 0; for (let c = 0; c < 3; c++) q += (F[3*a+c]+factor*co[3*a+c])*Bm[b+3*k+c]/C;
        g[3*(k+1)+a] = q; g[a] -= q;
      }
      let denom = 1/(mu0*muMul[t]*restVol[t]*h2);
      for (let k = 0; k < 4; k++) for (let a = 0; a < 3; a++) denom += w[ids[k]]*g[3*k+a]**2;
      const lambda = -C/denom;
      for (let k = 0; k < 4; k++) for (let a = 0; a < 3; a++) x[3*ids[k]+a] += lambda*w[ids[k]]*g[3*k+a];
    }
  }
  // Unilateral local volume constraints resolve contact-induced compression
  // before the final inversion safeguard. Floor-pinned gradient directions are
  // excluded so the repair opens a compressed tet instead of pushing it below
  // the table. The original whole-component safety check remains the last guard.
  stabilizeCutVolumes() {
    const { x, w, tets: tt, restVol } = this, { ids, g } = this.elasticScratch;
    for (let pass = 0; pass < 48; pass++) {
      let compressed = 0;
      for (let t = 0; t < this.T; t++) {
        const a = tt[4*t], b = tt[4*t+1], c = tt[4*t+2], d = tt[4*t+3];
        const volume = tetVolume(x, a, b, c, d), target = restVol[t]*0.2;
        if (volume >= target*0.99) continue;
        compressed++;
        ids[0] = a; ids[1] = b; ids[2] = c; ids[3] = d;
        const ux = x[3*b]-x[3*a], uy = x[3*b+1]-x[3*a+1], uz = x[3*b+2]-x[3*a+2];
        const vx = x[3*c]-x[3*a], vy = x[3*c+1]-x[3*a+1], vz = x[3*c+2]-x[3*a+2];
        const zx = x[3*d]-x[3*a], zy = x[3*d+1]-x[3*a+1], zz = x[3*d+2]-x[3*a+2];
        g[3] = (vy*zz-vz*zy)/6; g[4] = (vz*zx-vx*zz)/6; g[5] = (vx*zy-vy*zx)/6;
        g[6] = (zy*uz-zz*uy)/6; g[7] = (zz*ux-zx*uz)/6; g[8] = (zx*uy-zy*ux)/6;
        g[9] = (uy*vz-uz*vy)/6; g[10] = (uz*vx-ux*vz)/6; g[11] = (ux*vy-uy*vx)/6;
        for (let k = 0; k < 3; k++) g[k] = -g[3+k]-g[6+k]-g[9+k];
        let denominator = 0;
        for (let j = 0; j < 4; j++) {
          if (x[3*ids[j]+1] <= 1e-8 && g[3*j+1] < 0) g[3*j+1] = 0;
          for (let k = 0; k < 3; k++) denominator += w[ids[j]]*g[3*j+k]**2;
        }
        if (denominator < 1e-28) continue;
        let lambda = (target-volume)/denominator, largest = 0;
        for (let j = 0; j < 4; j++) largest = Math.max(largest, lambda*w[ids[j]]*Math.hypot(g[3*j],g[3*j+1],g[3*j+2]));
        if (largest > 0.015) lambda *= 0.015/largest;
        for (let j = 0; j < 4; j++) {
          for (let k = 0; k < 3; k++) x[3*ids[j]+k] += lambda*w[ids[j]]*g[3*j+k];
          x[3*ids[j]+1] = Math.max(0, x[3*ids[j]+1]);
        }
      }
      if (!compressed) break;
    }
  }
  // Authored surface fans have a different mass distribution from the study's
  // extruded lattice. Keep each closed piece nearly incompressible without
  // constraining its translation, rotation, or local elastic bending.
  restoreComponentVolumes() {
    const { x, w, tets: tt, restVol } = this;
    const gradients = this.volumePressureScratch ||= new Float64Array(this.n * 3);
    for (let pass = 0; pass < 6; pass++) {
      let corrected = false;
      for (let component = 0; component < this.componentCount; component++) {
        const nodes = this.componentNodes[component], cells = this.componentTets[component];
        gradients.fill(0); let volume = 0, rest = 0;
        for (const t of cells) {
          const a = tt[4*t], b = tt[4*t+1], c = tt[4*t+2], d = tt[4*t+3];
          volume += tetVolume(x, a, b, c, d); rest += restVol[t];
          const u = [x[3*b]-x[3*a], x[3*b+1]-x[3*a+1], x[3*b+2]-x[3*a+2]];
          const v = [x[3*c]-x[3*a], x[3*c+1]-x[3*a+1], x[3*c+2]-x[3*a+2]];
          const z = [x[3*d]-x[3*a], x[3*d+1]-x[3*a+1], x[3*d+2]-x[3*a+2]];
          for (let k = 0; k < 3; k++) {
            const p = (k+1)%3, q = (k+2)%3;
            const gb = (v[p]*z[q]-v[q]*z[p])/6;
            const gc = (z[p]*u[q]-z[q]*u[p])/6;
            const gd = (u[p]*v[q]-u[q]*v[p])/6;
            gradients[3*b+k] += gb; gradients[3*c+k] += gc; gradients[3*d+k] += gd;
            gradients[3*a+k] -= gb+gc+gd;
          }
        }
        if (!(rest > 0) || Math.abs(volume/rest-1) < 0.02) continue;
        const change = rest-volume; let denominator = 0;
        for (const i of nodes) {
          if (x[3*i+1] <= 1e-8 && gradients[3*i+1]*change < 0) gradients[3*i+1] = 0;
          for (let k = 0; k < 3; k++) denominator += w[i]*gradients[3*i+k]**2;
        }
        if (denominator < 1e-28) continue;
        let lambda = change/denominator, largest = 0;
        for (const i of nodes) largest = Math.max(largest, Math.abs(lambda)*w[i]*Math.hypot(gradients[3*i],gradients[3*i+1],gradients[3*i+2]));
        if (largest > 0.015) lambda *= 0.015/largest;
        for (const i of nodes) {
          for (let k = 0; k < 3; k++) x[3*i+k] += lambda*w[i]*gradients[3*i+k];
          x[3*i+1] = Math.max(0, x[3*i+1]);
        }
        corrected = true;
      }
      if (!corrected) break;
    }
  }
  buildContactTopology() {
    const faces = new Map(), tt = this.tets;
    // Outward winding for positive tets; only faces incident to one tet are exposed.
    for (let t = 0; t < tt.length; t += 4) for (const f of [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]]) {
      const tri = f.map(k => tt[t + k]), key = tri.slice().sort((a, b) => a - b).join(',');
      if (faces.has(key)) faces.get(key).count++;
      else faces.set(key, { tri, count: 1 });
    }
    this.boundaryFaces = Array.from({ length: this.componentCount }, () => []);
    for (const f of faces.values()) if (f.count === 1) this.boundaryFaces[this.components[f.tri[0]]].push(f.tri);
    this.boundaryNodes = this.boundaryFaces.map(fs => [...new Set(fs.flat())]);
    const build = primitives => {
      if (!primitives.length) return null;
      const box = new Float64Array(6);
      if (primitives.length <= 6) return { box, primitives };
      const centers = primitives.map(p => p.reduce((s, i) => {
        for (let k = 0; k < 3; k++) s[k] += this.rest[3 * i + k] / p.length;
        return s;
      }, [0, 0, 0]));
      const span = [0, 1, 2].map(k => {
        let lo = Infinity, hi = -Infinity;
        for (const p of centers) { lo = Math.min(lo, p[k]); hi = Math.max(hi, p[k]); }
        return hi - lo;
      });
      const axis = span.indexOf(Math.max(...span));
      const order = primitives.map((p, i) => ({ p, v: centers[i][axis] })).sort((a, b) => a.v - b.v);
      const mid = order.length >> 1;
      return { box, left: build(order.slice(0, mid).map(o => o.p)), right: build(order.slice(mid).map(o => o.p)) };
    };
    this.contactTrees = this.componentTets.map((ts, c) => ({
      volume: build(ts.map(t => Array.from(tt.subarray(4 * t, 4 * t + 4)))),
      surface: build(this.boundaryFaces[c]),
    }));
  }
  refitContactTree(node) {
    if (!node) return;
    const b = node.box, x = this.x;
    b[0] = b[1] = b[2] = Infinity; b[3] = b[4] = b[5] = -Infinity;
    if (node.primitives) {
      for (const p of node.primitives) for (const i of p) for (let k = 0; k < 3; k++) {
        b[k] = Math.min(b[k], x[3 * i + k]); b[k + 3] = Math.max(b[k + 3], x[3 * i + k]);
      }
    } else {
      this.refitContactTree(node.left); this.refitContactTree(node.right);
      for (let k = 0; k < 3; k++) {
        b[k] = Math.min(node.left.box[k], node.right.box[k]);
        b[k + 3] = Math.max(node.left.box[k + 3], node.right.box[k + 3]);
      }
    }
  }
  closestContactTriangle(i, tri) {
    const x = this.x, a = 3 * tri[0], b = 3 * tri[1], c = 3 * tri[2], j = 3 * i;
    const ux = x[b] - x[a], uy = x[b + 1] - x[a + 1], uz = x[b + 2] - x[a + 2];
    const vx = x[c] - x[a], vy = x[c + 1] - x[a + 1], vz = x[c + 2] - x[a + 2];
    const px = x[j] - x[a], py = x[j + 1] - x[a + 1], pz = x[j + 2] - x[a + 2];
    const uu = ux * ux + uy * uy + uz * uz, uv = ux * vx + uy * vy + uz * vz, vv = vx * vx + vy * vy + vz * vz;
    const pu = px * ux + py * uy + pz * uz, pv = px * vx + py * vy + pz * vz, det = uu * vv - uv * uv;
    if (!(det > 1e-24)) return null;
    const s = (pu * vv - pv * uv) / det, t = (pv * uu - pu * uv) / det;
    let bary = null, best = Infinity;
    if (s >= 0 && t >= 0 && s + t <= 1) bary = [1 - s - t, s, t];
    else for (let e = 0; e < 3; e++) {
      const f = (e + 1) % 3, ia = 3 * tri[e], ib = 3 * tri[f];
      const dx = x[ib] - x[ia], dy = x[ib + 1] - x[ia + 1], dz = x[ib + 2] - x[ia + 2];
      const l2 = dx * dx + dy * dy + dz * dz;
      const u = l2 > 0 ? Math.max(0, Math.min(1, ((x[j] - x[ia]) * dx + (x[j + 1] - x[ia + 1]) * dy + (x[j + 2] - x[ia + 2]) * dz) / l2)) : 0;
      const d2 = (x[j] - x[ia] - u * dx) ** 2 + (x[j + 1] - x[ia + 1] - u * dy) ** 2 + (x[j + 2] - x[ia + 2] - u * dz) ** 2;
      if (d2 < best) { best = d2; bary = [0, 0, 0]; bary[e] = 1 - u; bary[f] = u; }
    }
    const delta = [0, 0, 0];
    for (let k = 0; k < 3; k++) delta[k] = bary[0] * x[a + k] + bary[1] * x[b + k] + bary[2] * x[c + k] - x[j + k];
    return { tri, bary, delta, d2: delta[0] ** 2 + delta[1] ** 2 + delta[2] ** 2 };
  }
  solveContacts() {
    if (this.componentCount < 2) return;
    const x = this.x, xp = this.xp, w = this.w, stats = this.contactStats;
    const slop = 1e-7; // zero-thickness seam: coincident freshly cut faces exert no impulse
    let budget = this.contactBudget;
    const spend = () => { stats.tests++; return --budget >= 0; };
    const containsBox = (b, i) => {
      const j = 3 * i;
      return x[j] >= b[0] - slop && x[j] <= b[3] + slop && x[j + 1] >= b[1] - slop && x[j + 1] <= b[4] + slop && x[j + 2] >= b[2] - slop && x[j + 2] <= b[5] + slop;
    };
    const inside = (node, i) => {
      if (!spend() || !containsBox(node.box, i)) return false;
      if (!node.primitives) return inside(node.left, i) || inside(node.right, i);
      for (const p of node.primitives) {
        if (!spend()) return false;
        const [a, b, c, d] = p, V = tetVolume(x, a, b, c, d);
        if (!(V > 0)) continue;
        const tol = -V * 1e-8;
        if (tetVolume(x, i, b, c, d) >= tol && tetVolume(x, a, i, c, d) >= tol &&
            tetVolume(x, a, b, i, d) >= tol && tetVolume(x, a, b, c, i) >= tol) return true;
      }
      return false;
    };
    const boxDistance = (b, i) => {
      let d = 0;
      for (let k = 0; k < 3; k++) { const p = x[3 * i + k], v = Math.max(b[k] - p, 0, p - b[k + 3]); d += v * v; }
      return d;
    };
    const nearest = (node, i, best) => {
      if (!spend() || (best && boxDistance(node.box, i) > best.d2)) return best;
      if (node.primitives) {
        for (const tri of node.primitives) {
          if (!spend()) break;
          const hit = this.closestContactTriangle(i, tri);
          if (hit && (!best || hit.d2 < best.d2)) best = hit;
        }
        return best;
      }
      const dl = boxDistance(node.left.box, i), dr = boxDistance(node.right.box, i);
      best = nearest(dl < dr ? node.left : node.right, i, best);
      return nearest(dl < dr ? node.right : node.left, i, best);
    };
    for (let it = 0; it < Math.min(this.contactIterations, 3) && budget > 0; it++) {
      for (const tree of this.contactTrees) { this.refitContactTree(tree.volume); this.refitContactTree(tree.surface); }
      // Detect against an unmodified snapshot of the refitted bounds, then project the
      // collected contacts. Refit on the next pass; never query stale bounds mid-sweep.
      const contacts = [], count = this.componentCount, start = this.contactCursor++ % count;
      for (let ac = 0; ac < count && budget > 0; ac++) {
        const a = (ac + start) % count, A = this.contactTrees[a].volume.box;
        for (let bc = 0; bc < count && budget > 0; bc++) {
          const b = (bc + start) % count;
          if (a === b) continue;
          if (!spend()) break;
          const tree = this.contactTrees[b], B = tree.volume.box;
          if (A[0] > B[3] || B[0] > A[3] || A[1] > B[4] || B[1] > A[4] || A[2] > B[5] || B[2] > A[5]) continue;
          const nodes = this.boundaryNodes[a], first = (this.contactCursor * 97) % nodes.length;
          for (let q = 0; q < nodes.length && budget > 0; q++) {
            const i = nodes[(q + first) % nodes.length];
            if (!spend()) break;
            if (!containsBox(B, i) || !inside(tree.volume, i)) continue;
            const hit = nearest(tree.surface, i, null);
            // An interrupted nearest query may point to the far side of a piece.
            if (budget <= 0) break;
            if (hit && hit.d2 > slop * slop) contacts.push({ i, ...hit });
          }
        }
      }
      for (const hit of contacts) {
        const { i, tri, bary, delta } = hit, d = Math.sqrt(hit.d2), normal = delta.map(v => v / d);
        // Recompute separation along the detected normal after earlier projections.
        let depth = 0, denom = w[i];
        const relative = [0, 0, 0];
        for (let k = 0; k < 3; k++) {
          let sep = -x[3 * i + k]; relative[k] = x[3 * i + k] - xp[3 * i + k];
          for (let f = 0; f < 3; f++) {
            sep += bary[f] * x[3 * tri[f] + k];
            relative[k] -= bary[f] * (x[3 * tri[f] + k] - xp[3 * tri[f] + k]);
          }
          depth += sep * normal[k];
        }
        for (let f = 0; f < 3; f++) denom += w[tri[f]] * bary[f] * bary[f];
        if (!(depth > slop) || !(denom > 0) || !Number.isFinite(depth + denom)) continue;
        const correction = Math.min(depth - slop, 0.025), rn = relative.reduce((s, v, k) => s + v * normal[k], 0);
        const tangent = relative.map((v, k) => v - rn * normal[k]), tl = Math.hypot(...tangent);
        const friction = tl < this.muS * correction ? 1 : Math.min(1, this.muK * correction / (tl || 1));
        for (let k = 0; k < 3; k++) {
          const impulse = (normal[k] * correction - tangent[k] * friction) / denom;
          x[3 * i + k] += w[i] * impulse;
          for (let f = 0; f < 3; f++) x[3 * tri[f] + k] -= w[tri[f]] * bary[f] * impulse;
        }
        stats.contacts++; stats.maxDepth = Math.max(stats.maxDepth, depth);
      }
      if (!contacts.length) break;
    }
    if (budget <= 0) stats.budgetHits++;
  }
  collisionDiagnostics() {
    return { ...this.contactStats, componentCount: this.componentCount, safetyRejects: this.safetyRejects,
      safetyRollbacks: this.safetyRollbacks, safetyFailed: this.safetyFailed };
  }
  solveGround() {
    const x = this.x, xp = this.xp, n = this.n, muS = this.muS, muK = this.muK;
    for (let i = 0; i < n; i++) {
      if (this.w[i] === 0) continue;
      const j = 3 * i, y = x[j + 1];
      if (y >= 0) continue;
      const depth = -y;
      x[j + 1] = 0;
      const dx = x[j] - xp[j], dz = x[j + 2] - xp[j + 2], d = Math.hypot(dx, dz);
      if (d < muS * depth) { x[j] = xp[j]; x[j + 2] = xp[j + 2]; }
      else if (d > 0) { const k = Math.min(muK * depth / d, 1); x[j] -= dx * k; x[j + 2] -= dz * k; }
    }
  }
  applyDamping(dt) {
    for (const ids of this.componentNodes) this.dampComponent(ids, dt);
  }
  dampComponent(ids, dt) {
    const x = this.x, v = this.v, m = this.m;
    const k = 1 - Math.exp(-this.dampingRate() * dt), air = Math.exp(-0.06 * dt);
    let M = 0, cx = 0, cy = 0, cz = 0, vx = 0, vy = 0, vz = 0;
    for (const i of ids) {
      const mi = m[i], j = 3 * i;
      M += mi; cx += mi * x[j]; cy += mi * x[j + 1]; cz += mi * x[j + 2];
      vx += mi * v[j]; vy += mi * v[j + 1]; vz += mi * v[j + 2];
    }
    if (!(M > 0)) return;
    cx /= M; cy /= M; cz /= M; vx /= M; vy /= M; vz /= M;
    let Lx = 0, Ly = 0, Lz = 0, Ixx = 0, Iyy = 0, Izz = 0, Ixy = 0, Ixz = 0, Iyz = 0;
    for (const i of ids) {
      const mi = m[i], j = 3 * i;
      const rx = x[j] - cx, ry = x[j + 1] - cy, rz = x[j + 2] - cz;
      const ux = v[j] - vx, uy = v[j + 1] - vy, uz = v[j + 2] - vz;
      Lx += mi * (ry * uz - rz * uy); Ly += mi * (rz * ux - rx * uz); Lz += mi * (rx * uy - ry * ux);
      Ixx += mi * (ry * ry + rz * rz); Iyy += mi * (rx * rx + rz * rz); Izz += mi * (rx * rx + ry * ry);
      Ixy -= mi * rx * ry; Ixz -= mi * rx * rz; Iyz -= mi * ry * rz;
    }
    const a = Ixx, b = Ixy, c = Ixz, d = Iyy, e = Iyz, f = Izz;
    const A = d * f - e * e, B = c * e - b * f, C = b * e - c * d;
    const det = a * A + b * B + c * C;
    let wx = 0, wy = 0, wz = 0;
    // Relative threshold also resolves rigid angular motion of very small cut pieces.
    if (Number.isFinite(det) && det > 1e-12 * (a + d + f) ** 3) {
      const D = a * f - c * c, Ee = b * c - a * e, Fm = a * d - b * b;
      wx = (A * Lx + B * Ly + C * Lz) / det;
      wy = (B * Lx + D * Ly + Ee * Lz) / det;
      wz = (C * Lx + Ee * Ly + Fm * Lz) / det;
    }
    // Remove deformation velocity only, relative to this piece's own rigid motion.
    const coul = this.internalFriction * dt;
    for (const i of ids) {
      const j = 3 * i;
      const rx = x[j] - cx, ry = x[j + 1] - cy, rz = x[j + 2] - cz;
      const tx = vx + wy * rz - wz * ry, ty = vy + wz * rx - wx * rz, tz = vz + wx * ry - wy * rx;
      let dx = (v[j] - tx) * (1 - k), dy = (v[j + 1] - ty) * (1 - k), dz = (v[j + 2] - tz) * (1 - k);
      const dm = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const s = dm > coul ? (dm - coul) / dm : 0;
      dx *= s; dy *= s; dz *= s;
      v[j] = (tx + dx) * air; v[j + 1] = (ty + dy) * air; v[j + 2] = (tz + dz) * air;
    }
  }
  applyCutImpulse(normal, offset, splitComponents, reduced = false) {
    const length = Math.hypot(...normal), unit = normal.map(x => x / length);
    // The blade gives separated pieces a bounded outward velocity. Gravity,
    // friction and the elastic solver determine all subsequent movement.
    for (const nodes of this.componentNodes) {
      if (!splitComponents.has(this.components[nodes[0]])) continue;
      let signed = 0;
      for (const i of nodes) signed += this.m[i] * (normal[0] * this.x[3*i] + normal[1] * this.x[3*i+1] + normal[2] * this.x[3*i+2] + offset);
      const strength = Math.sign(signed) * (reduced ? 0.25 : 1.25);
      for (const i of nodes) for (let k = 0; k < 3; k++) this.v[3*i+k] += unit[k] * strength;
    }
  }
  startGrab(p, radius, axis) {
    const G = this.grab, x = this.x;
    G.count = 0;
    let best = -1, bd = Infinity;
    for (const i of this.activeNodes) {
      const d = Math.hypot(x[3 * i] - p[0], x[3 * i + 1] - p[1], x[3 * i + 2] - p[2]);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) { G.active = false; G.component = -1; return; }
    G.component = this.components[best];
    for (const i of this.componentNodes[G.component]) {
      const dx = x[3 * i] - p[0], dy = x[3 * i + 1] - p[1], dz = x[3 * i + 2] - p[2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < radius) {
        const u = 1 - (d / radius) ** 2;
        G.ids[G.count] = i; G.wts[G.count] = Math.max(u * u, 0.03);
        G.off[3 * G.count] = dx; G.off[3 * G.count + 1] = dy; G.off[3 * G.count + 2] = dz;
        G.count++;
      }
    }
    if (G.count === 0 && best >= 0) {
      G.ids[0] = best; G.wts[0] = 1; G.off[0] = x[3 * best] - p[0]; G.off[1] = x[3 * best + 1] - p[1]; G.off[2] = x[3 * best + 2] - p[2];
      G.count = 1;
    }
    G.target = [p[0], p[1], p[2]]; G.axis = axis.slice(); G.twist = 0; G.active = true;
    this.updateGrabRotation();
  }
  moveGrab(p) { const t = this.grab.target; t[0] = p[0]; t[1] = p[1]; t[2] = p[2]; }
  endGrab() {
    if (this.grab.active) {
      // a release is a gentle toss at most: cap the centre-of-mass speed, keep the internal wobble
      const ids = this.componentNodes[this.grab.component], v = this.v, m = this.m;
      const mass = this.componentMass[this.grab.component];
      let vx = 0, vy = 0, vz = 0;
      for (const i of ids) { vx += m[i] * v[3 * i]; vy += m[i] * v[3 * i + 1]; vz += m[i] * v[3 * i + 2]; }
      vx /= mass; vy /= mass; vz /= mass;
      const s = Math.hypot(vx, vy, vz), cap = this.releaseSpeed;
      if (s > cap) {
        const k = 1 - cap / s;
        for (const i of ids) { v[3 * i] -= vx * k; v[3 * i + 1] -= vy * k; v[3 * i + 2] -= vz * k; }
      }
    }
    this.grab.active = false; this.grab.count = 0;
  }
  updateGrabRotation() {
    const G = this.grab, [ax, ay, az] = G.axis, th = G.twist, c = Math.cos(th), s = Math.sin(th), t = 1 - c, R = G.rot;
    R[0] = c + ax * ax * t; R[1] = ax * ay * t - az * s; R[2] = ax * az * t + ay * s;
    R[3] = ay * ax * t + az * s; R[4] = c + ay * ay * t; R[5] = ay * az * t - ax * s;
    R[6] = az * ax * t - ay * s; R[7] = az * ay * t + ax * s; R[8] = c + az * az * t;
  }
  solveGrab(h2) {
    const G = this.grab, R = G.rot, T = G.target, x = this.x, w = this.w;
    for (let k = 0; k < G.count; k++) {
      const i = G.ids[k], j = 3 * i;
      const ox = G.off[3 * k], oy = G.off[3 * k + 1], oz = G.off[3 * k + 2];
      const tx = T[0] + R[0] * ox + R[1] * oy + R[2] * oz;
      const ty = Math.max(T[1] + R[3] * ox + R[4] * oy + R[5] * oz, 0);
      const tz = T[2] + R[6] * ox + R[7] * oy + R[8] * oz;
      const alpha = this.grabCompliance / (G.wts[k] * h2), f = w[i] / (w[i] + alpha);
      x[j] += (tx - x[j]) * f; x[j + 1] += (ty - x[j + 1]) * f; x[j + 2] += (tz - x[j + 2]) * f;
    }
  }
  nudge(rng, strength) {
    const x = this.x, v = this.v;
    if (!this.activeNodes.length) return;
    const pick = this.activeNodes[Math.min(this.activeNodes.length - 1, Math.floor(rng() * this.activeNodes.length))];
    const px = x[3 * pick], pz = x[3 * pick + 2], component = this.components[pick], ids = this.componentNodes[component];
    const dx = (rng() - 0.5) * 0.7, dz = (rng() - 0.5) * 0.7, l = Math.hypot(dx, 1, dz);
    const spin = (rng() - 0.5) * 2.2;
    const c = [0, 0, 0];
    for (const i of ids) for (let k = 0; k < 3; k++) c[k] += this.m[i] * x[3 * i + k] / this.componentMass[component];
    for (const i of ids) {
      const j = 3 * i, ex = x[j] - px, ez = x[j + 2] - pz;
      const f = Math.exp(-(ex * ex + ez * ez) / (2 * 0.6 * 0.6));
      v[j] += strength * (dx / l) * f - spin * (x[j + 2] - c[2]) * 0.4;
      v[j + 1] += strength * (1 / l) * f;
      v[j + 2] += strength * (dz / l) * f + spin * (x[j] - c[0]) * 0.4;
    }
  }
  /* rigid rotation that best maps the rest shape onto X (shape matching, Müller et al. 2016) */
  extractRotation(X) {
    const c = this.com(X), c0 = this.restCom, R0 = this.rest, m = this.m;
    const A = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < this.n; i++) {
      const px = X[3 * i] - c[0], py = X[3 * i + 1] - c[1], pz = X[3 * i + 2] - c[2];
      const qx = R0[3 * i] - c0[0], qy = R0[3 * i + 1] - c0[1], qz = R0[3 * i + 2] - c0[2], mi = m[i];
      A[0] += mi * px * qx; A[1] += mi * px * qy; A[2] += mi * px * qz;
      A[3] += mi * py * qx; A[4] += mi * py * qy; A[5] += mi * py * qz;
      A[6] += mi * pz * qx; A[7] += mi * pz * qy; A[8] += mi * pz * qz;
    }
    let [qx, qy, qz, qw] = this.q;
    const R = this.R;
    for (let it = 0; it < 12; it++) {
      R[0] = 1 - 2 * (qy * qy + qz * qz); R[1] = 2 * (qx * qy - qz * qw); R[2] = 2 * (qx * qz + qy * qw);
      R[3] = 2 * (qx * qy + qz * qw); R[4] = 1 - 2 * (qx * qx + qz * qz); R[5] = 2 * (qy * qz - qx * qw);
      R[6] = 2 * (qx * qz - qy * qw); R[7] = 2 * (qy * qz + qx * qw); R[8] = 1 - 2 * (qx * qx + qy * qy);
      let ox = 0, oy = 0, oz = 0, dsum = 0;
      for (let col = 0; col < 3; col++) {
        const rx = R[col], ry = R[3 + col], rz = R[6 + col], ax = A[col], ay = A[3 + col], az = A[6 + col];
        ox += ry * az - rz * ay; oy += rz * ax - rx * az; oz += rx * ay - ry * ax;
        dsum += rx * ax + ry * ay + rz * az;
      }
      const inv = 1 / (Math.abs(dsum) + 1e-9);
      ox *= inv; oy *= inv; oz *= inv;
      const wl = Math.hypot(ox, oy, oz);
      if (wl < 1e-9) break;
      const hs = Math.sin(wl / 2) / wl, hc = Math.cos(wl / 2);
      const bx = ox * hs, by = oy * hs, bz = oz * hs, bw = hc;
      const nx = bw * qx + bx * qw + by * qz - bz * qy;
      const ny = bw * qy - bx * qz + by * qw + bz * qx;
      const nz = bw * qz + bx * qy - by * qx + bz * qw;
      const nw = bw * qw - bx * qx - by * qy - bz * qz;
      const ql = Math.hypot(nx, ny, nz, nw);
      qx = nx / ql; qy = ny / ql; qz = nz / ql; qw = nw / ql;
    }
    this.q = [qx, qy, qz, qw];
    R[0] = 1 - 2 * (qy * qy + qz * qz); R[1] = 2 * (qx * qy - qz * qw); R[2] = 2 * (qx * qz + qy * qw);
    R[3] = 2 * (qx * qy + qz * qw); R[4] = 1 - 2 * (qx * qx + qz * qz); R[5] = 2 * (qy * qz - qx * qw);
    R[6] = 2 * (qx * qz - qy * qw); R[7] = 2 * (qy * qz + qx * qw); R[8] = 1 - 2 * (qx * qx + qy * qy);
    return { R, c };
  }
  stats(X = this.x) {
    let vol = 0, inverted = 0, minRatio = Infinity;
    for (let t = 0; t < this.T; t++) {
      const V = tetVolume(X, this.tets[4 * t], this.tets[4 * t + 1], this.tets[4 * t + 2], this.tets[4 * t + 3]);
      vol += V; if (V <= 0) inverted++;
      minRatio = Math.min(minRatio, V / this.restVol[t]);
    }
    let ke = 0, minY = Infinity, maxV = 0;
    for (let i = 0; i < this.n; i++) {
      const vx = this.v[3 * i], vy = this.v[3 * i + 1], vz = this.v[3 * i + 2], s2 = vx * vx + vy * vy + vz * vz;
      ke += 0.5 * this.m[i] * s2; maxV = Math.max(maxV, Math.sqrt(s2)); minY = Math.min(minY, X[3 * i + 1]);
    }
    const { R, c } = this.extractRotation(X), c0 = this.restCom;
    let err = 0;
    for (let i = 0; i < this.n; i++) {
      const qx = this.rest[3 * i] - c0[0], qy = this.rest[3 * i + 1] - c0[1], qz = this.rest[3 * i + 2] - c0[2];
      const ex = X[3 * i] - c[0] - (R[0] * qx + R[1] * qy + R[2] * qz);
      const ey = X[3 * i + 1] - c[1] - (R[3] * qx + R[4] * qy + R[5] * qz);
      const ez = X[3 * i + 2] - c[2] - (R[6] * qx + R[7] * qy + R[8] * qz);
      err += ex * ex + ey * ey + ez * ez;
    }
    return { volRatio: vol / this.restVolume, inverted, minTetRatio: minRatio, ke, minY, maxV, shapeError: Math.sqrt(err / this.n),
      componentCount: this.componentCount, safetyRejects: this.safetyRejects, safetyRollbacks: this.safetyRollbacks,
      contacts: this.contactStats.contacts, contactBudgetHits: this.contactStats.budgetHits };
  }
}

function createSpecimen() {
  const prof = makeProfile();
  const cen = profileCentroid(prof);
  const tm = buildTetMesh(prof, cen);
  const O = [-cen[0], -cen[1]];
  const stiffOf = (x, y, z) => {
    const dIn = SPEC.R - Math.hypot(x - O[0], z - O[1]);
    return 1 + 2 * smoothstep(SPEC.paleT + 0.18, SPEC.paleT - 0.04, dIn);
  };
  const body = new SoftBody(tm, stiffOf);
  const embed = makeEmbedder(tm);
  const rng = mulberry32(20260930);
  const jelly = buildJellySurface(prof, cen);
  const seeds = buildSeeds(prof, cen, rng);
  const bubbles = buildBubbles(prof, cen, rng);
  const jE = embed(jelly.pos, jelly.count), sE = embed(seeds.pos, seeds.count), bE = embed(bubbles.pos, bubbles.count);
  const seedCenters = embed(seeds.centers, seeds.seeds);
  const top = tm.layers * tm.n2;
  const nearestTop = (mx, mz) => {
    let best = top, bd = Infinity;
    for (let i = top; i < tm.n; i++) {
      const d = Math.hypot(tm.pos[3 * i] - (mx - cen[0]), tm.pos[3 * i + 2] - (mz - cen[1]));
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  const midArc = SPEC.R - 0.06;
  const landmarks = {
    tip: nearestTop(prof.tipC[0] - SPEC.rc * 0.7, 0),
    cornerUp: nearestTop(prof.aUp[0] + 0.12, prof.aUp[1] + 0.12),
    cornerLow: nearestTop(prof.aLow[0] + 0.12, prof.aLow[1] - 0.12),
    flesh: nearestTop(cen[0], cen[1]),
    rind: nearestTop(midArc, 0),
  };
  return {
    prof, cen, O, tm, body, jelly, seeds, bubbles, landmarks,
    skins: {
      jelly: new Skin(jE, jelly.idx, jelly.count),
      seeds: new Skin(sE, seeds.idx, seeds.count),
      bubbles: new Skin(bE, bubbles.idx, bubbles.count),
    },
    embedQuality: { jelly: jE.worst, seeds: sE.worst, bubbles: bE.worst, seedCenters: seedCenters.worst },
    stiffOf,
  };
}
/* Actual plane surgery. All work is transactional: unsafe/ambiguous cuts return null. */
function cutMeshComponents(n, tets) {
  const parent = Int32Array.from({ length: n }, (_, i) => i), used = new Uint8Array(n);
  const root = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let t = 0; t < tets.length; t += 4) for (let k = 0; k < 4; k++) {
    const a = tets[t], b = tets[t + k]; used[b] = 1; parent[root(b)] = root(a);
  }
  const labels = new Map(), components = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) if (used[i]) {
    const r = root(i); if (!labels.has(r)) labels.set(r, labels.size); components[i] = labels.get(r);
  }
  return { components, count: labels.size };
}

// Dense caps can contain micron-scale backtracks after deformation and Float32
// skin embedding. Weld coincident plane intersections before assembling loops.
// The same record is reused by the outer skin and cap, keeping the seam closed.
function cutMergeSeamPoint(point, buckets, project, epsilon) {
  const uv = project(point.x), gx = Math.floor(uv[0] / epsilon), gy = Math.floor(uv[1] / epsilon);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const bucket = buckets.get(point.c + ':' + (gx + dx) + ':' + (gy + dy));
    if (!bucket) continue;
    for (const other of bucket) {
      const d2 = point.x.reduce((s, v, k) => s + (v - other.x[k]) ** 2, 0);
      if (d2 <= epsilon * epsilon) { other.coalesced = true; return other; }
    }
  }
  const key = point.c + ':' + gx + ':' + gy;
  if (!buckets.has(key)) buckets.set(key, []);
  buckets.get(key).push(point);
  return point;
}

// Ear clipping keeps every boundary edge, including collinear boundary vertices.
// Reject holes, self-intersections and excessive work rather than inventing a cap.
function cutCapTriangles(loops, xy) {
  const cross = (a, b, c) => (xy[b][0] - xy[a][0]) * (xy[c][1] - xy[a][1]) - (xy[b][1] - xy[a][1]) * (xy[c][0] - xy[a][0]);
  const inside = (p, loop) => {
    let hit = false;
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const a = xy[loop[i]], b = xy[loop[j]];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
    return hit;
  };
  let work = 0;
  const out = [];
  for (let li = 0; li < loops.length; li++) {
    const loop = loops[li];
    if (loop.length < 3 || loop.length > 4096) return null;
    for (let lj = 0; lj < loops.length; lj++) if (lj !== li && inside(xy[loop[0]], loops[lj])) return null;
    let area = 0, span = 0;
    for (let i = 0; i < loop.length; i++) {
      const a = xy[loop[i]], b = xy[loop[(i + 1) % loop.length]];
      area += a[0] * b[1] - a[1] * b[0]; span = Math.max(span, Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
    }
    const tol = Math.max(1e-18, span * span * 1e-11);
    if (Math.abs(area) < tol) return null;
    for (let i = 0; i < loop.length; i++) for (let j = i + 2; j < loop.length; j++) {
      if (++work > 8000000) return null;
      if (i === 0 && j === loop.length - 1) continue;
      const a = loop[i], b = loop[(i + 1) % loop.length], c = loop[j], d = loop[(j + 1) % loop.length];
      if (cross(a, b, c) * cross(a, b, d) < -tol * tol && cross(c, d, a) * cross(c, d, b) < -tol * tol) return null;
    }
    const p = area > 0 ? loop.slice() : loop.slice().reverse();
    while (p.length > 3) {
      let ear = -1;
      for (let i = 0; i < p.length; i++) {
        const a = p[(i + p.length - 1) % p.length], b = p[i], c = p[(i + 1) % p.length];
        if (cross(a, b, c) <= tol) continue;
        let clear = true;
        for (const q of p) {
          if (++work > 8000000) return null;
          if (q !== a && q !== b && q !== c && cross(a, b, q) >= -tol && cross(b, c, q) >= -tol && cross(c, a, q) >= -tol) { clear = false; break; }
        }
        if (clear) { ear = i; out.push(a, b, c); break; }
      }
      if (ear < 0) return null;
      p.splice(ear, 1);
    }
    if (cross(p[0], p[1], p[2]) <= tol) return null;
    out.push(...p);
  }
  return out;
}

function cutSpecimenMesh(specimen, planeNormal, planeOffset) {
  const { tm: old, body } = specimen, N = Math.hypot(...planeNormal);
  if (!(N > 1e-12) || !Number.isFinite(N + planeOffset) || old.tets.length / 4 > 14000) return null;
  const normal = Array.from(planeNormal, v => v / N), offset = planeOffset / N;
  const dot = p => p[0] * normal[0] + p[1] * normal[1] + p[2] * normal[2];
  const vec = (p, i) => [p[3 * i], p[3 * i + 1], p[3 * i + 2]];
  const mix = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
  const basis = Math.abs(normal[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u0 = [normal[1] * basis[2] - normal[2] * basis[1], normal[2] * basis[0] - normal[0] * basis[2], normal[0] * basis[1] - normal[1] * basis[0]];
  const ul = Math.hypot(...u0), u = u0.map(v => v / ul);
  const v = [normal[1] * u[2] - normal[2] * u[1], normal[2] * u[0] - normal[0] * u[2], normal[0] * u[1] - normal[1] * u[0]];
  const project = p => [p.reduce((s, x, k) => s + x * u[k], 0), p.reduce((s, x, k) => s + x * v[k], 0)];
  const oldC = cutMeshComponents(old.n, old.tets), R = Array.from(body.rest), X = Array.from(body.x), V = Array.from(body.v);
  const scale = Math.max(1, ...normal.map((_, k) => {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < old.n; i++) { lo = Math.min(lo, X[3 * i + k]); hi = Math.max(hi, X[3 * i + k]); }
    return hi - lo;
  }));
  const eps = scale * 1e-10, d = new Float64Array(old.n), nodeSide = [], source = Array.from(oldC.components);
  for (let i = 0; i < old.n; i++) {
    const q = dot(vec(X, i)) + offset;
    if (!Number.isFinite(q)) return null;
    d[i] = Math.abs(q) <= SPEC.tetSpacing * 0.04 ? 0 : q; nodeSide[i] = Math.sign(d[i]);
  }
  // Snap near-vertex cuts to existing nodes to avoid unstable slivers. A small
  // tetrahedron from an earlier cut can lie wholly inside that tolerance band:
  // retain its farthest vertex's true side so it still has finite ownership.
  // Shared nodes are classified once, before clipping any neighboring tetrahedra.
  for (let t = 0; t < old.tets.length; t += 4) {
    const ids = old.tets.subarray(t, t + 4);
    if (ids.some(i => d[i] !== 0)) continue;
    let best = ids[0], distance = dot(vec(X, best)) + offset;
    for (const i of ids) {
      const q = dot(vec(X, i)) + offset;
      if (Math.abs(q) > Math.abs(distance)) { best = i; distance = q; }
    }
    d[best] = distance; nodeSide[best] = Math.sign(distance);
  }
  const zeros = new Map(), intersections = new Map(), T = [], owners = [], childSides = [], oldTetLookup = new Map();
  const volumes = Array.from({ length: oldC.count }, () => [0, 0]), originals = new Float64Array(oldC.count);
  const addNode = (r, x, velocity, side, component) => {
    const id = R.length / 3; R.push(...r); X.push(...x); V.push(...velocity); nodeSide.push(side); source.push(component); return id;
  };
  const original = (i, side) => {
    if (d[i] !== 0) return i;
    const key = i + ':' + side;
    if (!zeros.has(key)) {
      if (nodeSide[i] === 0) { nodeSide[i] = side; zeros.set(key, i); }
      else zeros.set(key, addNode(vec(R, i), vec(X, i), vec(V, i), side, source[i]));
    }
    return zeros.get(key);
  };
  const intersection = (a, b, side) => {
    if (d[a] === 0) return original(a, side);
    if (d[b] === 0) return original(b, side);
    if (a > b) [a, b] = [b, a];
    const key = a + ':' + b + ':' + side;
    if (!intersections.has(key)) {
      const t = d[a] / (d[a] - d[b]);
      intersections.set(key, addNode(mix(vec(R, a), vec(R, b), t), mix(vec(X, a), vec(X, b), t), mix(vec(V, a), vec(V, b), t), side, source[a]));
    }
    return intersections.get(key);
  };
  const faces = [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]];
  const clean = p => p.filter((id, i) => id !== p[(i + p.length - 1) % p.length]);
  const pushTet = (tet, owner, side, minVol) => {
    let vol = tetVolume(R, ...tet);
    if (vol < 0) { [tet[2], tet[3]] = [tet[3], tet[2]]; vol = -vol; }
    if (!(vol > minVol) || !(tetVolume(X, ...tet) > vol * 1e-5) || T.length >= 56000) return false;
    T.push(...tet); owners.push(owner); childSides.push(side); volumes[source[tet[0]]][side > 0 ? 1 : 0] += vol; return true;
  };
  for (let ti = 0; ti < old.tets.length / 4; ti++) {
    const tet = Array.from(old.tets.subarray(ti * 4, ti * 4 + 4)), comp = source[tet[0]];
    oldTetLookup.set(tet.slice().sort((a, b) => a - b).join(','), ti);
    const ov = Math.abs(tetVolume(R, ...tet)); originals[comp] += ov;
    if (!(ov > 0)) return null;
    const start = T.length, hasPos = tet.some(i => d[i] > 0), hasNeg = tet.some(i => d[i] < 0);
    if (!hasPos && !hasNeg) return null;
    if (!hasPos || !hasNeg) {
      const side = hasPos ? 1 : -1;
      if (!pushTet(tet.map(i => original(i, side)), ti, side, 0)) return null;
    } else for (const side of [-1, 1]) {
      const polygons = [], boundary = new Set();
      for (const f of faces) {
        const poly = [];
        for (let j = 0; j < 3; j++) {
          const a = tet[f[j]], b = tet[f[(j + 1) % 3]];
          if (d[a] * side >= 0) { const id = original(a, side); poly.push(id); if (d[a] === 0) boundary.add(id); }
          if (d[a] * d[b] < 0) { const id = intersection(a, b, side); poly.push(id); boundary.add(id); }
        }
        const p = clean(poly); if (p.length >= 3) polygons.push(p);
      }
      const ring = [...boundary], center = [0, 0];
      for (const id of ring) { const p = project(vec(X, id)); center[0] += p[0] / ring.length; center[1] += p[1] / ring.length; }
      ring.sort((a, b) => {
        const p = project(vec(X, a)), q = project(vec(X, b));
        return Math.atan2(p[1] - center[1], p[0] - center[0]) - Math.atan2(q[1] - center[1], q[0] - center[0]);
      });
      if (ring.length < 3) return null;
      polygons.push(ring);
      // Tetrahedralize the clipped convex cell from its farthest retained
      // original vertex. This avoids the thin centroid-fan cells that become
      // ill-conditioned after repeated cuts and preserves the full cell volume.
      const anchor = tet.filter(i => d[i] * side > 0).sort((a, b) => Math.abs(d[b]) - Math.abs(d[a]))[0];
      const mid = original(anchor, side);
      for (const poly of polygons) {
        if (poly.includes(mid)) continue;
        // The same minimum global ID fixes the diagonal on both copies of a shared face.
        const canonical = poly.slice().sort((a, b) => R[3 * a] - R[3 * b] || R[3 * a + 1] - R[3 * b + 1] || R[3 * a + 2] - R[3 * b + 2])[0]; const first = poly.indexOf(canonical), p = poly.slice(first).concat(poly.slice(0, first));
        for (let j = 1; j < p.length - 1; j++) if (!pushTet([mid, p[0], p[j], p[j + 1]], ti, side, Math.max(1e-14, ov * 1e-9))) return null;
      }
    }
    let kept = 0;
    for (let i = start; i < T.length; i += 4) kept += tetVolume(R, T[i], T[i + 1], T[i + 2], T[i + 3]);
    if (Math.abs(kept - ov) > ov * 1e-7) return null;
  }
  const split = new Set();
  for (let c = 0; c < oldC.count; c++) if (volumes[c][0] > 0 && volumes[c][1] > 0) {
    if (Math.min(...volumes[c]) < originals[c] * 0.002) return null;
    split.add(c);
  }
  if (!split.size) return null;
  const connected = cutMeshComponents(R.length / 3, T), components = connected.components;
  if (connected.count <= oldC.count) return null;
  const edges = new Map(), groups = new Map(), hints = new Map(), compTets = new Map();
  for (let i = 0; i < T.length; i += 4) {
    const tet = T.slice(i, i + 4), c = components[tet[0]], side = childSides[i / 4], group = source[tet[0]] + ':' + side;
    if (!groups.has(group)) groups.set(group, new Set()); groups.get(group).add(c);
    if (!compTets.has(c)) compTets.set(c, []); compTets.get(c).push(...tet);
    hints.set(owners[i / 4] + ':' + side, c);
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
      const lo = Math.min(tet[a], tet[b]), hi = Math.max(tet[a], tet[b]); edges.set(lo + ':' + hi, [lo, hi]);
    }
  }
  const positions = Float64Array.from(X), velocities = Float64Array.from(V);
  const tm = { ...old, n: R.length / 3, n2: 0, layers: 0, pos: Float64Array.from(R), tets: Uint32Array.from(T), edges: Uint32Array.from([...edges.values()].flat()), components };
  const embedders = new Map();
  const embedComponent = c => {
    if (!embedders.has(c)) embedders.set(c, makeEmbedder({ ...tm, pos: positions, tets: Uint32Array.from(compTets.get(c)) }));
    return embedders.get(c);
  };
  const clipSurface = name => {
    const mesh = specimen[name], skin = specimen.skins[name], points = [], welds = new Map(), crossing = new Map(), seamBuckets = new Map();
    const output = [], indices = [], vertexMap = new Map(), segments = new Map();
    // Weld topology only; the separate render indices retain old creases and the new sharp cap.
    for (let i = 0; i < mesh.count; i++) {
      const ids = Array.from(skin.ids.subarray(i * 4, i * 4 + 4)), c = oldC.components[ids[0]], x = [0, 0, 0];
      if (ids.some(id => oldC.components[id] !== c)) return null;
      for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) x[j] += skin.wts[4 * i + k] * body.x[3 * ids[k] + j];
      const r = vec(mesh.pos, i), key = c + ':' + r.map(q => Math.round(q / (scale * 1e-8))).join(',');
      if (!welds.has(key)) welds.set(key, { id: welds.size, x, r });
      const w = welds.get(key), distance = dot(w.x) + offset;
      points.push({ x: w.x, r: w.r, d: Math.abs(distance) <= eps ? 0 : distance, c, weld: w.id,
        hint: oldTetLookup.get(ids.slice().sort((a, b) => a - b).join(',')), aux: mesh.aux ? Array.from(mesh.aux.subarray(i * 2, i * 2 + 2)) : null });
    }
    const crossPoint = (a, b) => {
      if (a.d === 0) return a; if (b.d === 0) return b;
      if (a.weld > b.weld) [a, b] = [b, a];
      const key = a.weld + ':' + b.weld;
      if (!crossing.has(key)) {
        const t = a.d / (a.d - b.d);
        const point = { x: mix(a.x, b.x, t), r: mix(a.r, b.r, t), d: 0, c: a.c, weld: welds.size + crossing.size,
          hint: null, hints: [a.hint, b.hint], aux: a.aux ? mix(a.aux, b.aux, t) : null };
        crossing.set(key, cutMergeSeamPoint(point, seamBuckets, project, scale * 4e-6));
      }
      return crossing.get(key);
    };
    const chooseComponent = (p, side) => {
      const choices = groups.get(p.c + ':' + side);
      if (!choices || !choices.size) return -1;
      if (choices.size === 1) return choices.values().next().value;
      const candidates = new Set((p.hints || [p.hint]).map(h => hints.get(h + ':' + side)).filter(c => c !== undefined));
      // Ambiguous disconnected fragments must never be joined by a visual triangle.
      if (candidates.size !== 1) return -1;
      return candidates.values().next().value;
    };
    const vertex = (p, side, key) => {
      const k = side + ':' + key;
      if (!vertexMap.has(k)) {
        const component = chooseComponent(p, side); if (component < 0) return -1;
        vertexMap.set(k, output.length); output.push({ ...p, side, component });
      }
      return vertexMap.get(k);
    };
    const addFace = poly => {
      if (poly.some(i => i < 0) || poly.some(i => output[i].component !== output[poly[0]].component)) return false;
      for (let i = 1; i < poly.length - 1; i++) {
        if (poly[0] === poly[i] || poly[i] === poly[i + 1] || poly[i + 1] === poly[0]) continue;
        indices.push(poly[0], poly[i], poly[i + 1]);
      }
      return true;
    };
    for (let ti = 0; ti < mesh.idx.length; ti += 3) {
      const ids = Array.from(mesh.idx.subarray(ti, ti + 3)), tri = ids.map(i => points[i]), c = tri[0].c;
      if (tri.some(p => p.c !== c)) return null;
      if (!split.has(c)) {
        const side = volumes[c][1] > 0 ? 1 : -1;
        if (!addFace(ids.map(i => vertex(points[i], side, 'v' + i)))) return null;
        continue;
      }
      if (tri.every(p => p.d === 0)) return null;
      for (const side of [-1, 1]) {
        if (!tri.some(p => p.d * side > 0)) continue;
        const poly = [], seam = [];
        for (let j = 0; j < 3; j++) {
          const a = tri[j], b = tri[(j + 1) % 3];
          if (a.d * side >= 0) { const id = vertex(a, side, 'v' + ids[j]); poly.push(id); if (a.d === 0) seam.push(a); }
          if (a.d * b.d < 0) { const p = crossPoint(a, b); poly.push(vertex(p, side, 'e' + p.weld)); seam.push(p); }
        }
        const p = clean(poly); if (p.length >= 3 && !addFace(p)) return null;
        if (seam.length === 2 && seam[0].weld !== seam[1].weld) {
          const component = chooseComponent(seam[0], side);
          if (component < 0 || chooseComponent(seam[1], side) !== component) return null;
          const key = component + ':' + side;
          if (!segments.has(key)) segments.set(key, { side, pairs: new Map() });
          const [a, b] = seam, edge = Math.min(a.weld, b.weld) + ':' + Math.max(a.weld, b.weld);
          if (segments.get(key).pairs.has(edge)) {
            // A collapsed microscopic hairpin contributes two opposite copies
            // of the same boundary edge. Cancel that pair, not the whole cut.
            if (!a.coalesced && !b.coalesced) return null;
            segments.get(key).pairs.delete(edge);
            continue;
          }
          segments.get(key).pairs.set(edge, [a, b]);
        }
      }
    }
    for (const { side, pairs } of segments.values()) {
      const adjacency = new Map(), records = new Map();
      for (const [a, b] of pairs.values()) for (const [p, q] of [[a, b], [b, a]]) {
        if (!adjacency.has(p.weld)) adjacency.set(p.weld, []);
        adjacency.get(p.weld).push(q.weld); records.set(p.weld, p);
      }
      if ([...adjacency.values()].some(a => a.length !== 2)) return null;
      const visited = new Set(), loops = [], xy = [];
      for (const [id, p] of records) xy[id] = project(p.x);
      for (const start of adjacency.keys()) if (!visited.has(start)) {
        const loop = []; let prev = -1, curr = start;
        do {
          if (visited.has(curr)) return null;
          visited.add(curr); loop.push(curr);
          const next = adjacency.get(curr).find(id => id !== prev); prev = curr; curr = next;
        } while (curr !== start && loop.length <= adjacency.size);
        if (curr !== start) return null;
        loops.push(loop);
      }
      const cap = cutCapTriangles(loops, xy); if (!cap) return null;
      const capVertices = new Map();
      for (const id of new Set(cap)) {
        const index = vertex(records.get(id), side, 'cap' + id);
        if (index < 0 || output.length > 120000) return null;
        capVertices.set(id, index);
      }
      let capFaces = [];
      for (let i = 0; i < cap.length; i += 3) {
        const p = cap.slice(i, i + 3).map(id => capVertices.get(id));
        if (p.some(id => output[id].component !== output[p[0]].component)) return null;
        if (side > 0) [p[1], p[2]] = [p[2], p[1]];
        capFaces.push(p);
      }
      const capEdgeKey = (a, b) => Math.min(a, b) + ':' + Math.max(a, b);
      // Mark the entire cap before splitting: neighboring faces share every midpoint.
      for (let pass = 0; pass < 6; pass++) {
        const midpoints = new Map(), edgeUse = new Map();
        for (const face of capFaces) for (let j = 0; j < 3; j++) {
          const key = capEdgeKey(face[j], face[(j + 1) % 3]); edgeUse.set(key, (edgeUse.get(key) || 0) + 1);
        }
        for (const face of capFaces) for (let j = 0; j < 3; j++) {
          const a = face[j], b = face[(j + 1) % 3], key = capEdgeKey(a, b);
          // Preserve the unsplit seam shared with the outer skin.
          if (edgeUse.get(key) === 1 || midpoints.has(key)) continue;
          const p = output[a], q = output[b];
          const length2 = p.x.reduce((sum, x, k) => sum + (x - q.x[k]) ** 2, 0);
          // Existing cap edges already carry fine detail after a cut. Reduce
          // further subdivision as topology grows; keep the same hard budget.
          if (length2 <= (oldC.count > 1 ? 0.22 : 0.14) ** 2) continue;
          if (output.length >= 120000) return null;
          midpoints.set(key, output.length);
          output.push({ x: mix(p.x, q.x, 0.5), r: mix(p.r, q.r, 0.5),
            aux: p.aux ? mix(p.aux, q.aux, 0.5) : null, side, component: p.component });
        }
        if (!midpoints.size) break;
        const refined = [];
        for (const face of capFaces) {
          const [a, b, c] = face;
          const ab = midpoints.get(capEdgeKey(a, b)), bc = midpoints.get(capEdgeKey(b, c)), ca = midpoints.get(capEdgeKey(c, a));
          const mask = (ab !== undefined ? 1 : 0) | (bc !== undefined ? 2 : 0) | (ca !== undefined ? 4 : 0);
          // Each split case preserves the original face's oriented boundary.
          switch (mask) {
            case 0: refined.push(face); break;
            case 1: refined.push([a, ab, c], [ab, b, c]); break;
            case 2: refined.push([b, bc, a], [bc, c, a]); break;
            case 4: refined.push([c, ca, b], [ca, a, b]); break;
            case 3: refined.push([b, bc, ab], [a, ab, c], [ab, bc, c]); break;
            case 6: refined.push([c, ca, bc], [b, bc, a], [bc, ca, a]); break;
            case 5: refined.push([a, ab, ca], [c, ca, b], [ca, ab, b]); break;
            case 7: refined.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]); break;
          }
        }
        capFaces = refined;
      }
      for (const face of capFaces) if (!addFace(face)) return null;
    }
    if (output.length > 120000 || indices.length > 720000) return null;
    const count = output.length, material = new Float32Array(count * 3), current = new Float64Array(count * 3), aux = mesh.aux ? new Float32Array(count * 2) : null;
    const ids = new Uint32Array(count * 4), wts = new Float32Array(count * 4), labels = new Int32Array(count), batches = new Map();
    for (let i = 0; i < count; i++) {
      const p = output[i]; material.set(p.r, i * 3); current.set(p.x, i * 3); labels[i] = p.component;
      if (aux) aux.set(p.aux, i * 2);
      if (!batches.has(p.component)) batches.set(p.component, []); batches.get(p.component).push(i);
    }
    let worst = Infinity;
    for (const [c, batch] of batches) {
      const coords = Float64Array.from(batch.flatMap(i => output[i].x)), emb = embedComponent(c)(coords, batch.length);
      if (!Number.isFinite(emb.worst) || emb.worst < -4) return null;
      worst = Math.min(worst, emb.worst);
      for (let j = 0; j < batch.length; j++) {
        ids.set(emb.ids.subarray(j * 4, j * 4 + 4), batch[j] * 4); wts.set(emb.wts.subarray(j * 4, j * 4 + 4), batch[j] * 4);
      }
    }
    return { mesh: { ...mesh, pos: material, current, idx: Uint32Array.from(indices), count, ...(aux ? { aux } : {}), components: labels }, emb: { ids, wts, worst } };
  };
  const jelly = clipSurface('jelly'); if (!jelly) return null;
  const seeds = clipSurface('seeds'); if (!seeds) return null;
  const bubbles = clipSurface('bubbles'); if (!bubbles) return null;
  return { tm, positions, velocities, jelly: jelly.mesh, seeds: seeds.mesh, bubbles: bubbles.mesh,
    embeddings: { jelly: jelly.emb, seeds: seeds.emb, bubbles: bubbles.emb }, components, componentCount: connected.count,
    splitComponents: new Set(Array.from(components).filter((c, i) => c >= 0 && split.has(source[i]))) };
}

  return { createSpecimen, cutSpecimenMesh, SoftBody, Skin, makeEmbedder, tetVolume, spec: SPEC };
}



const STEP = 1 / 60;
const MAX_TICKS = 4;

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function rotationMatrix(rotation) {
  const [rx, ry, rz] = rotation;
  const sx = Math.sin(rx), cx = Math.cos(rx);
  const sy = Math.sin(ry), cy = Math.cos(ry);
  const sz = Math.sin(rz), cz = Math.cos(rz);
  return [
    cy * cz, -cy * sz, sy,
    sx * sy * cz + cx * sz, -sx * sy * sz + cx * cz, -sx * cy,
    -cx * sy * cz + sx * sz, cx * sy * sz + sx * cz, cx * cy,
  ];
}

function finiteVec3(vector) {
  return Array.isArray(vector) && vector.length === 3 && vector.every(value => Number.isFinite(value));
}

function applyPose(body, lift, rotation) {
  const R = rotationMatrix(rotation);
  const rest = body.rest, center = body.restCom, x = body.x;
  const tx = 0, ty = lift - center[1], tz = 0;
  for (let i = 0; i < body.n; i++) {
    const j = 3 * i;
    const qx = rest[j] - center[0], qy = rest[j + 1] - center[1], qz = rest[j + 2] - center[2];
    x[j] = center[0] + tx + R[0] * qx + R[1] * qy + R[2] * qz;
    x[j + 1] = center[1] + ty + R[3] * qx + R[4] * qy + R[5] * qz;
    x[j + 2] = center[2] + tz + R[6] * qx + R[7] * qy + R[8] * qz;
  }
  body.xp.set(x);
  body.prevStep.set(x);
  body.v.fill(0);
  body.q = [0, 0, 0, 1];
  body.time = 0;
}

function surfaceRecord(mesh, skin) {
  const record = {
    interleaved: skin.out,
    rest: mesh.pos,
    aux: mesh.aux || new Float32Array(0),
    indices: mesh.idx,
    count: mesh.count,
  };
  if (mesh.components) Object.defineProperty(record, 'components', { value: mesh.components });
  return record;
}

/* The extracted kernel remains DOM-free. These hooks adapt it to the public facade. */
function installRuntimeHooks(kernel) {
  const { SoftBody } = kernel;
  const originalApplyCutImpulse = SoftBody.prototype.applyCutImpulse;
  SoftBody.prototype.applyCutImpulse = function applyCutImpulseWithScale(normal, offset, splitComponents, reduced = false) {
    const prior = this.v.slice();
    originalApplyCutImpulse.call(this, normal, offset, splitComponents, reduced);
    const scale = Number.isFinite(this.cutImpulseScale) ? this.cutImpulseScale : 1;
    if (scale === 1) return;
    for (const nodes of this.componentNodes) {
      if (!splitComponents.has(this.components[nodes[0]])) continue;
      for (const i of nodes) for (let k = 0; k < 3; k++) {
        const j = 3 * i + k;
        this.v[j] = prior[j] + (this.v[j] - prior[j]) * scale;
      }
    }
  };
  SoftBody.prototype.setGroundSurfaces = function setGroundSurfaces(surfaces) {
    this.groundSurfaces = surfaces.map(surface => ({ ...surface }));
  };
  SoftBody.prototype.setPose = function setPose(lift, rotation) {
    applyPose(this, lift, rotation);
  };
  SoftBody.prototype.setVelocity = function setVelocity(linear, angular = [0, 0, 0]) {
    const c = this.com(this.x), [ax, ay, az] = angular;
    for (let i = 0; i < this.n; i++) {
      const j = 3 * i, rx = this.x[j] - c[0], ry = this.x[j + 1] - c[1], rz = this.x[j + 2] - c[2];
      this.v[j] = linear[0] + ay * rz - az * ry;
      this.v[j + 1] = linear[1] + az * rx - ax * rz;
      this.v[j + 2] = linear[2] + ax * ry - ay * rx;
    }
  };
  SoftBody.prototype.impulse = function impulse(vector) {
    const delta = vector.map(value => value / this.mass);
    for (let i = 0; i < this.n; i++) {
      this.v[3 * i] += delta[0];
      this.v[3 * i + 1] += delta[1];
      this.v[3 * i + 2] += delta[2];
    }
  };
  SoftBody.prototype.solveGround = function solveGroundWithSupports() {
    const x = this.x, xp = this.xp, n = this.n, muS = this.muS, muK = this.muK;
    const supports = this.groundSurfaces || [];
    const contactEps = 1e-6;
    for (let i = 0; i < n; i++) {
      if (this.w[i] === 0) continue;
      const j = 3 * i, y = x[j + 1], px = x[j], pz = x[j + 2], previousY = xp[j + 1];
      let floor = 0;
      let support = null;
      for (const candidate of supports) {
        const inside = px >= candidate.minX && px <= candidate.maxX && pz >= candidate.minZ && pz <= candidate.maxZ;
        const crossedTop = candidate.y > contactEps && previousY >= candidate.y - contactEps && y < candidate.y;
        if (inside && crossedTop && candidate.y > floor) {
          floor = candidate.y;
          support = candidate;
        }
      }
      // The flat floor is the always-available fallback. It also repairs an
      // already-negative node after an elastic projection; elevated supports
      // are only eligible when the node arrived from above their top.
      if (!(y < floor) && !(y < -contactEps)) continue;
      const depth = floor - y;
      x[j + 1] = floor;
      const supportDx = support && Number.isFinite(support.velocityX) ? support.velocityX * (this.substepDt || 0) : 0;
      const dx = x[j] - xp[j] - supportDx, dz = x[j + 2] - xp[j + 2], d = Math.hypot(dx, dz);
      if (d < muS * depth) {
        x[j] = xp[j] + supportDx; x[j + 2] = xp[j + 2];
      } else if (d > 0) {
        const k = Math.min(muK * depth / d, 1);
        x[j] -= dx * k; x[j + 2] -= dz * k;
      }
      this.contactStats.contacts++;
      this.contactStats.maxDepth = Math.max(this.contactStats.maxDepth, depth);
    }
  };
  return kernel;
}

export class MelonBody {
  #kernel;
  #specimen;
  #surfaceMap;
  #origin;
  #accumulator = 0;
  #topologyVersion = 0;

  constructor(options = {}) {
    const settings = {
      tetSpacing: Number.isFinite(options.tetSpacing) ? options.tetSpacing : 0.32,
      tetLayers: Number.isFinite(options.tetLayers) ? options.tetLayers : 2,
      substeps: Number.isFinite(options.substeps) ? options.substeps : 6,
      surfaceDetailScale: Number.isFinite(options.surfaceDetailScale) ? Math.max(0.15, Math.min(1, options.surfaceDetailScale)) : 1,
    };
    this.#kernel = installRuntimeHooks(makeKernel(settings));
    this.#specimen = this.#kernel.createSpecimen();
    if (Number.isFinite(options.firmness)) this.#specimen.body.firmness = clamp01(options.firmness);
    if (Number.isFinite(options.damping)) this.#specimen.body.damping = clamp01(options.damping);
    this.#origin = Object.freeze([...this.#specimen.O]);
    this.#surfaceMap = {};
    this.#rebuildSurfaceMap();
    this.setPose(1.15, [0, 0, 0]);
  }

  get origin() {
    return this.#origin;
  }

  get surfaces() {
    return this.#surfaceMap;
  }

  get componentCount() {
    return this.#specimen.body.componentCount;
  }

  get topologyVersion() {
    return this.#topologyVersion;
  }

  #rebuildSurfaceMap() {
    const { body } = this.#specimen;
    for (const name of ['jelly', 'seeds', 'bubbles']) {
      const mesh = this.#specimen[name], skin = this.#specimen.skins[name];
      skin.update(body.x);
      this.#surfaceMap[name] = surfaceRecord(mesh, skin);
    }
  }

  #refreshSurfaceMap() {
    const { body } = this.#specimen;
    for (const name of ['jelly', 'seeds', 'bubbles']) this.#specimen.skins[name].update(body.x);
  }

  setPose(lift, rotation) {
    if (!Number.isFinite(lift) || !finiteVec3(rotation)) return;
    this.#specimen.body.setPose(lift, rotation);
    this.#accumulator = 0;
    this.#refreshSurfaceMap();
  }

  step(dt) {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    this.#accumulator = Math.min(this.#accumulator + Math.min(dt, STEP * MAX_TICKS), STEP * MAX_TICKS);
    const ticks = Math.min(MAX_TICKS, Math.floor((this.#accumulator + 1e-10) / STEP));
    this.#accumulator -= ticks * STEP;
    for (let i = 0; i < ticks; i++) this.#specimen.body.step(STEP);
    if (ticks > 0) this.#refreshSurfaceMap();
  }

  setMaterial(options = {}) {
    if (options.firmness !== undefined && Number.isFinite(options.firmness)) this.#specimen.body.firmness = clamp01(options.firmness);
    if (options.damping !== undefined && Number.isFinite(options.damping)) this.#specimen.body.damping = clamp01(options.damping);
  }

  setVelocity(linear, angular = [0, 0, 0]) {
    if (finiteVec3(linear) && finiteVec3(angular)) this.#specimen.body.setVelocity(linear, angular);
  }

  impulse(vector) {
    if (finiteVec3(vector)) this.#specimen.body.impulse(vector);
  }

  // Release each freshly cut component on its own side of the cut plane.
  // A shared impulse would move both halves together and make the split read
  // like a bounce instead of the blade opening the specimen.
  releaseCut(normal, speed = 0.22) {
    if (!finiteVec3(normal) || !Number.isFinite(speed) || speed <= 0) return;
    const body = this.#specimen.body;
    if (body.componentCount < 2) return;
    const length = Math.hypot(...normal);
    if (!(length > 1e-9)) return;
    const unit = normal.map(value => value / length);
    const centers = Array.from({ length: body.componentCount }, () => [0, 0, 0, 0]);
    for (const i of body.activeNodes) {
      const component = body.components[i];
      const mass = body.m[i];
      const center = centers[component];
      const j = 3 * i;
      center[0] += body.x[j] * mass;
      center[1] += body.x[j + 1] * mass;
      center[2] += body.x[j + 2] * mass;
      center[3] += mass;
    }
    const origin = body.com(body.x);
    const cappedSpeed = Math.min(0.32, speed);
    for (let component = 0; component < centers.length; component++) {
      const center = centers[component];
      if (!(center[3] > 0)) continue;
      const cx = center[0] / center[3] - origin[0];
      const cy = center[1] / center[3] - origin[1];
      const cz = center[2] / center[3] - origin[2];
      const signed = cx * unit[0] + cy * unit[1] + cz * unit[2];
      const side = signed >= 0 ? 1 : -1;
      for (const i of body.componentNodes[component]) {
        const j = 3 * i;
        body.v[j] += unit[0] * side * cappedSpeed;
        body.v[j + 1] += unit[1] * side * cappedSpeed;
        body.v[j + 2] += unit[2] * side * cappedSpeed;
      }
    }
  }

  setGroundSurfaces(surfaces) {
    this.#specimen.body.setGroundSurfaces(surfaces);
  }

  cut(normal, offset, impulse) {
    if (!finiteVec3(normal) || !Number.isFinite(offset)) return false;
    const before = this.#specimen;
    let cut;
    try {
      cut = this.#kernel.cutSpecimenMesh(before, normal, offset);
    } catch {
      return false;
    }
    if (!cut) return false;
    const previousBody = before.body;
    let nextBody;
    try {
      nextBody = new this.#kernel.SoftBody(
        { ...cut.tm, positions: cut.positions, velocities: cut.velocities },
        before.stiffOf,
      );
    } catch {
      return false;
    }
    for (const key of ['firmness', 'damping', 'gravity', 'maxSpeed', 'lambdaRatio', 'muSoft', 'muFirm', 'internalFriction', 'releaseSpeed']) {
      nextBody[key] = previousBody[key];
    }
    nextBody.time = previousBody.time;
    nextBody.setGroundSurfaces(previousBody.groundSurfaces || []);
    nextBody.cutImpulseScale = impulse === undefined ? 1 : Math.max(0, impulse);
    nextBody.applyCutImpulse(normal, offset, cut.splitComponents, false);
    const next = {
      ...before,
      tm: cut.tm,
      body: nextBody,
      jelly: cut.jelly,
      seeds: cut.seeds,
      bubbles: cut.bubbles,
      skins: {},
    };
    for (const name of ['jelly', 'seeds', 'bubbles']) {
      next.skins[name] = new this.#kernel.Skin(cut.embeddings[name], cut[name].idx, cut[name].count);
    }
    this.#specimen = next;
    this.#topologyVersion++;
    this.#accumulator = 0;
    this.#rebuildSurfaceMap();
    return true;
  }

  stats() {
    return this.#specimen.body.stats();
  }
}

/** A source-authored convex cut volume using the exact same XPBD/contact solver.
 * The two closed surfaces come from cutting the original mesh, not a melon
 * profile. Separate centroid fans keep the seam nodes independent. Optional
 * source decorations embed only into their own side of the cut.
 */
export class AuthoredCutBody {
  #body;
  #skins = [];
  #surfaces = [];
  #renderX;
  #componentRest;
  #accumulator = 0;

  constructor(fragments, decorations = [], options = {}) {
    if (fragments.length !== 2) throw new Error('Authored cut requires two closed fragments');
    const kernel = installRuntimeHooks(makeKernel({ substeps: options.substeps || 6 }));
    const positions = [], tets = [], edges = [], parts = [];
    for (const fragment of fragments) {
      const points = [], vertexIds = [], welded = new Map();
      for (let i = 0; i < fragment.positions.length; i += 3) {
        const point = Array.from(fragment.positions.subarray(i, i + 3));
        if (!point.every(Number.isFinite)) throw new Error('Non-finite authored surface');
        const key = point.map(value => Math.round(value * 1e6)).join(',');
        if (!welded.has(key)) { welded.set(key, points.length / 3 + 1); points.push(...point); }
        vertexIds.push(welded.get(key));
      }
      const centre = [0, 0, 0];
      for (let i = 0; i < points.length; i++) centre[i % 3] += points[i] / (points.length / 3);
      const pos = Float64Array.from([...centre, ...points]), localTets = [], localEdges = new Set();
      for (let i = 0; i < fragment.indices.length; i += 3) {
        const tet = [0, ...Array.from(fragment.indices.subarray(i, i + 3), v => vertexIds[v])];
        const volume = kernel.tetVolume(pos, ...tet);
        if (Math.abs(volume) < 1e-12) continue;
        if (volume < 0) [tet[2], tet[3]] = [tet[3], tet[2]];
        localTets.push(...tet);
        for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
          localEdges.add([Math.min(tet[a], tet[b]), Math.max(tet[a], tet[b])].join(','));
        }
      }
      if (!localTets.length) throw new Error('Authored fragment has no valid volume');
      const local = { n: pos.length / 3, pos, tets: Uint32Array.from(localTets),
        edges: Uint32Array.from([...localEdges].flatMap(edge => edge.split(',').map(Number))) };
      const offset = positions.length / 3;
      positions.push(...pos); tets.push(...local.tets.map(v => v + offset)); edges.push(...local.edges.map(v => v + offset));
      parts.push({ local, offset, vertexIds });
    }
    this.#body = new kernel.SoftBody({ n: positions.length / 3, pos: Float64Array.from(positions),
      tets: Uint32Array.from(tets), edges: Uint32Array.from(edges) }, () => 1);
    this.#renderX = new Float64Array(this.#body.x.length);
    this.#componentRest = this.#buildComponentRest();
    this.#body.firmness = clamp01(options.firmness ?? 0.35);
    this.#body.damping = clamp01(options.damping ?? 0.4);
    this.#body.preserveComponentVolume = true;
    for (const [index, fragment] of fragments.entries()) {
      const part = parts[index], count = fragment.positions.length / 3;
      const ids = new Uint32Array(count * 4), wts = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) { ids.fill(part.offset + part.vertexIds[i], i * 4, i * 4 + 4); wts[i * 4] = 1; }
      this.#addSkin(kernel, fragment, { ids, wts }, count);
    }
    for (const decoration of decorations) {
      const part = parts[decoration.component], count = decoration.positions.length / 3;
      const embedding = kernel.makeEmbedder(part.local)(decoration.positions, count);
      for (let i = 0; i < embedding.ids.length; i++) embedding.ids[i] += part.offset;
      if (!embedding.wts.every(Number.isFinite)) throw new Error('Invalid decoration binding');
      this.#addSkin(kernel, decoration, embedding, count);
    }
    this.#refresh();
  }

  #addSkin(kernel, surface, embedding, count) {
    const skin = new kernel.Skin(embedding, surface.indices, count);
    this.#skins.push(skin);
    this.#surfaces.push(surfaceRecord({ pos: Float32Array.from(surface.positions), idx: surface.indices, count }, skin));
  }

  #buildComponentRest() {
    const body = this.#body;
    return body.componentNodes.map((nodes) => {
      let mass = 0, x = 0, y = 0, z = 0;
      for (const i of nodes) {
        const m = body.m[i], j = 3 * i;
        mass += m; x += body.rest[j] * m; y += body.rest[j + 1] * m; z += body.rest[j + 2] * m;
      }
      return { mass, x: x / mass, y: y / mass, z: z / mass };
    });
  }

  #refresh() {
    const body = this.#body, render = this.#renderX;
    // Keep the authored silhouette as the visual baseline. The physics body
    // still receives the full XPBD/contact solve; only the local elastic
    // residual is damped for rendering so a soft cut remains recognizable as
    // an apple, orange, banana or coconut while its two halves open and roll.
    for (let component = 0; component < body.componentNodes.length; component++) {
      const nodes = body.componentNodes[component], rest = this.#componentRest[component];
      let mass = 0, cx = 0, cy = 0, cz = 0;
      for (const i of nodes) {
        const m = body.m[i], j = 3 * i;
        mass += m; cx += body.x[j] * m; cy += body.x[j + 1] * m; cz += body.x[j + 2] * m;
      }
      if (!(mass > 0)) continue;
      cx /= mass; cy /= mass; cz /= mass;
      let cross = 0, dot = 0;
      for (const i of nodes) {
        const m = body.m[i], j = 3 * i;
        const rx = body.rest[j] - rest.x, ry = body.rest[j + 1] - rest.y;
        const qx = body.x[j] - cx, qy = body.x[j + 1] - cy;
        cross += m * (rx * qy - ry * qx);
        dot += m * (rx * qx + ry * qy);
      }
      const angle = Math.atan2(cross, dot), c = Math.cos(angle), s = Math.sin(angle), deformation = 0.28;
      for (const i of nodes) {
        const j = 3 * i, rx = body.rest[j] - rest.x, ry = body.rest[j + 1] - rest.y, rz = body.rest[j + 2] - rest.z;
        const rigidX = cx + c * rx - s * ry, rigidY = cy + s * rx + c * ry, rigidZ = cz + rz;
        render[j] = rigidX + (body.x[j] - rigidX) * deformation;
        render[j + 1] = rigidY + (body.x[j + 1] - rigidY) * deformation;
        render[j + 2] = rigidZ + (body.x[j + 2] - rigidZ) * deformation;
      }
    }
    for (const skin of this.#skins) skin.update(render);
  }
  get surfaces() { return this.#surfaces; }

  release(normal, offset, speed = 0.32, twist = 1.7) {
    if (!finiteVec3(normal) || !Number.isFinite(offset)) return;
    this.#body.cutImpulseScale = Math.min(0.32, Math.max(0, speed)) / 1.25;
    this.#body.applyCutImpulse(normal, offset, new Set([0, 1]));
    if (!Number.isFinite(twist) || twist <= 0) return;
    const body = this.#body;
    const length = Math.hypot(...normal);
    if (!(length > 1e-9)) return;
    const unitX = normal[0] / length, unitY = normal[1] / length;
    let totalMass = 0, originX = 0, originY = 0;
    for (let i = 0; i < body.n; i++) {
      const mass = body.m[i], j = 3 * i;
      totalMass += mass; originX += body.x[j] * mass; originY += body.x[j + 1] * mass;
    }
    if (!(totalMass > 0)) return;
    originX /= totalMass; originY /= totalMass;
    for (const nodes of body.componentNodes) {
      let mass = 0, centreX = 0, centreY = 0;
      for (const i of nodes) {
        const m = body.m[i], j = 3 * i;
        mass += m; centreX += body.x[j] * m; centreY += body.x[j + 1] * m;
      }
      if (!(mass > 0)) continue;
      centreX /= mass; centreY /= mass;
      const side = Math.sign((centreX - originX) * unitX + (centreY - originY) * unitY) || 1;
      // Rotate each component away from the seam around the gameplay depth
      // axis. This is the same opening cue as the reference watermelon, while
      // the shared solver still owns all subsequent contact and settling.
      const angular = side * twist;
      for (const i of nodes) {
        const j = 3 * i, rx = body.x[j] - centreX, ry = body.x[j + 1] - centreY;
        body.v[j] += -angular * ry;
        body.v[j + 1] += angular * rx;
      }
    }
  }

  setGroundSurfaces(surfaces) { this.#body.setGroundSurfaces(surfaces); }

  step(dt) {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    this.#accumulator = Math.min(this.#accumulator + Math.min(dt, STEP * MAX_TICKS), STEP * MAX_TICKS);
    const ticks = Math.min(MAX_TICKS, Math.floor((this.#accumulator + 1e-10) / STEP));
    this.#accumulator -= ticks * STEP;
    for (let i = 0; i < ticks; i++) this.#body.step(STEP);
    if (ticks) this.#refresh();
  }

  stats() {
    const body = this.#body;
    // Local edge strain excludes the independent rigid motion of each piece.
    let error = 0;
    for (let i = 0; i < body.edges.length; i += 2) {
      const a = 3 * body.edges[i], b = 3 * body.edges[i + 1];
      const rest = Math.hypot(body.rest[a] - body.rest[b], body.rest[a + 1] - body.rest[b + 1], body.rest[a + 2] - body.rest[b + 2]);
      const current = Math.hypot(body.x[a] - body.x[b], body.x[a + 1] - body.x[b + 1], body.x[a + 2] - body.x[b + 2]);
      error += (current - rest) ** 2;
    }
    // The reference watermelon opens with opposite rolling motion on the two
    // sides of the blade. Report the actual per-component angular release so
    // runtime QA can distinguish that opening from a pair of translating
    // rigid halves.
    let openingSpeed = 0;
    for (const nodes of body.componentNodes) {
      let mass = 0, cx = 0, cy = 0, angularMomentum = 0, inertia = 0;
      for (const i of nodes) {
        const m = body.m[i], j = 3 * i;
        mass += m; cx += body.x[j] * m; cy += body.x[j + 1] * m;
      }
      if (!(mass > 0)) continue;
      cx /= mass; cy /= mass;
      for (const i of nodes) {
        const m = body.m[i], j = 3 * i;
        const rx = body.x[j] - cx, ry = body.x[j + 1] - cy;
        angularMomentum += m * (rx * body.v[j + 1] - ry * body.v[j]);
        inertia += m * (rx * rx + ry * ry);
      }
      if (inertia > 1e-12) openingSpeed = Math.max(openingSpeed, Math.abs(angularMomentum / inertia));
    }
    return { ...body.stats(), kernel: 'watermelon-xpbd', localShapeError: Math.sqrt(error / Math.max(1, body.E)), openingSpeed };
  }
}
