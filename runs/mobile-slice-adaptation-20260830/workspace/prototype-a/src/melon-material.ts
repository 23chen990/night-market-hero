/** @deprecated Legacy watermelon softbody material path; retained for study tests only. */
import * as THREE from 'three';

/**
 * A Three/WebGL port of the melon-jelly material study.  The mesh's `position`
 * and `normal` attributes are the current physics result; `rest` is the
 * original, unrotated specimen position used to keep the flesh/rind bands
 * attached to the specimen while it deforms.
 */

// The thickness pass is rendered once for the shared scene and once per jelly
// mesh. Keep its bounded render target deliberately below the main canvas so
// several reference specimens do not stall the gameplay loop on mobile/WebGL
// fallback GPUs.
const MAX_TARGET_PIXELS = 120_000;
const MAX_TARGET_SIDE = 800;
const MELON_MARKER = 'melon-material-pipeline-v1';

const VERTEX_SHADER = /* glsl */`
attribute vec3 rest;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vRest;
varying float vViewDepth;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vRest = rest;
  vViewDepth = max(0.0, -viewPosition.z);
  gl_Position = projectionMatrix * viewPosition;
}
`;

const FRAGMENT_SHADER = /* glsl */`
uniform sampler2D uScene;
uniform sampler2D uBackDepth;
uniform vec2 uOrigin;
uniform vec4 uResolution;
uniform vec2 uDepthRange;
uniform vec3 uCameraForward;
uniform float uScale;
uniform mat4 uProjection;

#include <packing>
uniform float uTime;
uniform float uFineDetail;
uniform float uRadius;
uniform vec2 uBands;
uniform vec3 uFleshSigma;
uniform vec3 uFleshScatter;
uniform vec3 uFleshColor;
uniform vec3 uPaleColor;
uniform vec3 uSkinColor;
uniform vec3 uRindColor;
uniform vec3 uStripeColor;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vRest;
varying float vViewDepth;

const float PI = 3.14159265359;
const vec3 KEY = vec3(-0.32, 0.84, 0.44);
const vec3 BACK = vec3(0.10, 0.58, -0.81);
const vec3 STRIP = vec3(0.79, 0.52, -0.32);

float sat(float value) {
  return clamp(value, 0.0, 1.0);
}

vec3 safeNormalize(vec3 value) {
  return value / max(length(value), 1e-5);
}

float hash12(vec2 value) {
  vec3 p3 = fract(vec3(value.x, value.y, value.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash13(vec3 value) {
  vec3 p3 = fract(value * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise2(vec2 point) {
  vec2 cell = floor(point);
  vec2 fraction = fract(point);
  vec2 smoothFraction = fraction * fraction * (3.0 - 2.0 * fraction);
  float a = hash12(cell);
  float b = hash12(cell + vec2(1.0, 0.0));
  float c = hash12(cell + vec2(0.0, 1.0));
  float d = hash12(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, smoothFraction.x), mix(c, d, smoothFraction.x), smoothFraction.y);
}

float fbm2(vec2 point) {
  vec2 p = point;
  float amplitude = 0.5;
  float sum = 0.0;
  for (int octave = 0; octave < 4; octave += 1) {
    sum += amplitude * valueNoise2(p);
    p = p * 2.03 + vec2(17.1, 3.7);
    amplitude *= 0.5;
  }
  return sum / 0.9375;
}

float valueNoise3(vec3 point) {
  vec3 cell = floor(point);
  vec3 fraction = fract(point);
  vec3 smoothFraction = fraction * fraction * (3.0 - 2.0 * fraction);
  float n000 = hash13(cell);
  float n100 = hash13(cell + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(cell + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(cell + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(cell + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(cell + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(cell + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(cell + vec3(1.0, 1.0, 1.0));
  float low = mix(mix(n000, n100, smoothFraction.x), mix(n010, n110, smoothFraction.x), smoothFraction.y);
  float high = mix(mix(n001, n101, smoothFraction.x), mix(n011, n111, smoothFraction.x), smoothFraction.y);
  return mix(low, high, smoothFraction.z);
}

float softbox(vec3 direction, vec3 axis, vec2 halfExtent, float roughness) {
  float cosine = dot(direction, axis);
  if (cosine <= 0.05) return 0.0;
  vec3 tangent = safeNormalize(cross(vec3(0.0, 1.0, 0.0), axis));
  vec3 bitangent = cross(axis, tangent);
  vec2 point = vec2(dot(direction, tangent), dot(direction, bitangent)) / cosine;
  float spread = 0.035 + roughness * 1.3;
  float mask = (1.0 - smoothstep(halfExtent.x - spread, halfExtent.x + spread, abs(point.x)))
    * (1.0 - smoothstep(halfExtent.y - spread, halfExtent.y + spread, abs(point.y)));
  return mask / (1.0 + roughness * 4.0);
}

vec3 environmentRadiance(vec3 direction, float roughness) {
  vec3 colour = mix(vec3(0.46, 0.45, 0.43), vec3(0.78, 0.77, 0.75), smoothstep(-0.05, 0.8, direction.y));
  colour = mix(vec3(0.60, 0.585, 0.56), colour, smoothstep(-0.12, 0.03 + roughness * 0.2, direction.y));
  colour += vec3(1.0, 0.975, 0.94) * softbox(direction, KEY, vec2(0.55, 0.36), roughness) * 2.6;
  colour += vec3(0.94, 0.97, 1.0) * softbox(direction, STRIP, vec2(0.09, 0.7), roughness) * 1.9;
  colour += vec3(1.0, 0.99, 0.97) * softbox(direction, BACK, vec2(0.4, 0.16), roughness) * 1.5;
  return colour;
}

vec3 irradiance(vec3 normal) {
  vec3 sky = mix(vec3(0.36, 0.35, 0.335), vec3(0.62, 0.615, 0.60), normal.y * 0.5 + 0.5);
  sky += vec3(1.0, 0.975, 0.94) * max(dot(normal, KEY), 0.0) * 0.85;
  sky += vec3(0.9, 0.93, 1.0) * max(dot(normal, STRIP), 0.0) * 0.3;
  return sky;
}

float ggx(vec3 normal, vec3 viewDirection, vec3 lightDirection, float roughness, float f0) {
  vec3 halfVector = safeNormalize(viewDirection + lightDirection);
  float normalLight = sat(dot(normal, lightDirection));
  float normalView = max(dot(normal, viewDirection), 1e-3);
  float normalHalf = sat(dot(normal, halfVector));
  float viewHalf = sat(dot(viewDirection, halfVector));
  float alpha = roughness * roughness;
  float alphaSquared = alpha * alpha;
  float denominator = normalHalf * normalHalf * (alphaSquared - 1.0) + 1.0;
  float distribution = alphaSquared / (PI * denominator * denominator);
  float k = alpha * 0.5;
  float visibility = 1.0 / ((normalLight * (1.0 - k) + k) * (normalView * (1.0 - k) + k) * 4.0);
  float fresnel = f0 + (1.0 - f0) * pow(1.0 - viewHalf, 5.0);
  return min(distribution * visibility * normalLight * fresnel, 6.0);
}

float unpackDepth(vec4 packed) {
  return unpackRGBAToDepth(packed);
}

struct MaterialBands {
  float flesh;
  float pale;
  float skin;
  float stripe;
  float radius;
  float angle;
  float insideDepth;
  float paleDepth;
};

MaterialBands classifyMaterial(vec3 restPosition) {
  MaterialBands material;
  vec2 radial = restPosition.xz - uOrigin;
  material.radius = length(radial);
  material.angle = atan(radial.y, radial.x);
  material.insideDepth = uRadius - material.radius;
  float broadNoise = fbm2(vec2(material.angle * 11.0, restPosition.y * 4.0));
  float fineNoise = valueNoise2(vec2(material.angle * 38.0, restPosition.y * 9.0));
  float skinDepth = uBands.x * (0.75 + 0.6 * broadNoise);
  material.paleDepth = uBands.y + (broadNoise - 0.5) * 0.09 + (fineNoise - 0.5) * 0.012;
  material.skin = 1.0 - smoothstep(skinDepth - 0.01, skinDepth + 0.01, material.insideDepth);
  float inner = 1.0 - smoothstep(material.paleDepth - 0.075, material.paleDepth + 0.05, material.insideDepth);
  material.pale = max(inner - material.skin, 0.0);
  material.flesh = 1.0 - inner;

  float warp = fbm2(vec2(material.angle * 4.0, restPosition.y * 1.5 + 3.0));
  float warpFine = fbm2(vec2(material.angle * 13.0 + 5.0, restPosition.y * 3.2));
  float phase = material.angle * 25.0 + (warp - 0.5) * 7.0 + (warpFine - 0.5) * 2.2;
  float band = 0.5 + 0.5 * sin(phase);
  float width = 0.36 + 0.34 * valueNoise2(vec2(phase * 0.17, 1.7));
  float jagged = fbm2(vec2(material.angle * 70.0, restPosition.y * 18.0));
  material.stripe = smoothstep(width, width + 0.07, band + (jagged - 0.5) * 0.5);
  return material;
}

void main() {
  MaterialBands bands = classifyMaterial(vRest);
  vec3 viewDirection = safeNormalize(cameraPosition - vWorldPosition);
  vec3 normal = safeNormalize(vWorldNormal);

  // Preserve the molded surface and add finer grain only to the green rind.
  if (uFineDetail > 0.0) {
    vec3 proceduralPoint = vRest * mix(6.0, 22.0, bands.skin);
    float noise0 = valueNoise3(proceduralPoint + vec3(uTime * 0.01, 0.0, 0.0));
    float epsilon = 0.03;
    vec3 gradient = vec3(
      valueNoise3(proceduralPoint + vec3(epsilon, 0.0, 0.0)) - noise0,
      valueNoise3(proceduralPoint + vec3(0.0, epsilon, 0.0)) - noise0,
      valueNoise3(proceduralPoint + vec3(0.0, 0.0, epsilon)) - noise0
    ) / epsilon;
    normal = safeNormalize(normal - (gradient - normal * dot(gradient, normal)) * mix(0.010, 0.012, bands.skin) * uFineDetail);
  }
  float normalView = max(dot(normal, viewDirection), 0.0);

  // The back pass stores the exit surface for this exact object.  Dividing
  // projected view-space depth by the camera-forward cosine recovers the
  // physical ray length, then uScale converts world units to specimen units.
  vec2 screenUv = gl_FragCoord.xy * uResolution.zw;
  float backDepth = unpackDepth(texture2D(uBackDepth, screenUv)) * uDepthRange.y;
  float cameraCosine = max(dot(-viewDirection, uCameraForward), 0.25);
  float thickness = max((backDepth - vViewDepth) / cameraCosine * uScale, 0.012);

  vec3 refractedDirection = refract(-viewDirection, normal, 1.0 / 1.38);
  vec3 exitPosition = vWorldPosition + refractedDirection * thickness / uScale * 0.6;
  vec4 projectedExit = uProjection * viewMatrix * vec4(exitPosition, 1.0);
  vec2 refractedUv = clamp(projectedExit.xy / projectedExit.w * 0.5 + 0.5, vec2(0.002), vec2(0.998));
  vec2 offsetUv = refractedUv - screenUv;
  vec3 behind = vec3(
    pow(max(texture2D(uScene, clamp(screenUv + offsetUv * 0.965, vec2(0.0), vec2(1.0))).r, 0.0), 1.0),
    pow(max(texture2D(uScene, clamp(screenUv + offsetUv, vec2(0.0), vec2(1.0))).g, 0.0), 1.0),
    pow(max(texture2D(uScene, clamp(screenUv + offsetUv * 1.04, vec2(0.0), vec2(1.0))).b, 0.0), 1.0)
  );

  // Beer–Lambert absorption keeps the red flesh saturated while pale rind and
  // green skin attenuate light more strongly.
  float blush = mix(0.42, 1.0, smoothstep(bands.paleDepth, bands.paleDepth + 0.32, bands.insideDepth));
  float grain = valueNoise3(vec3(bands.radius * 3.2, bands.angle * 34.0, vRest.y * 5.0));
  float density = 0.86 + 0.28 * grain;
  vec3 paleSigma = vec3(1.05, 0.78, 1.9);
  vec3 sigma = (uFleshSigma * blush * bands.flesh + paleSigma * bands.pale + vec3(7.0) * bands.skin) * density;
  vec3 transmittance = exp(-sigma * thickness);
  vec3 fullTransmittance = exp(-sigma * thickness);
  float averageSigma = dot(sigma, vec3(0.333333));

  vec3 fleshColour = (uFleshScatter + uFleshColor) * 0.5;
  vec3 albedo = fleshColour * bands.flesh + uPaleColor * bands.pale;
  float wrap = sat((dot(normal, KEY) + 0.55) / 1.55);
  vec3 lightIn = irradiance(normal) * 0.32 + vec3(1.0, 0.975, 0.94) * wrap * 0.5;
  vec3 scattering = albedo * lightIn * (1.0 - dot(fullTransmittance, vec3(0.333333))) * mix(0.2, 0.95, bands.pale);

  // Back and strip softboxes provide thin-edge transmission at glancing views.
  vec3 backLight = safeNormalize(BACK + normal * 0.35);
  vec3 stripLight = safeNormalize(STRIP + normal * 0.35);
  vec3 thinTransmittance = exp(-sigma * thickness * 0.55);
  vec3 edgeTransmission = albedo * thinTransmittance
    * (pow(sat(dot(viewDirection, -backLight)), 3.0) * 1.5 + pow(sat(dot(viewDirection, -stripLight)), 3.0) * 0.8)
    + albedo * exp(-sigma * thickness * 0.9) * pow(1.0 - normalView, 1.6) * 0.45;

  // Small, deterministic vesicles keep the flesh from reading as a flat tint.
  float flecks = 0.0;
  float span = min(thickness, 1.0);
  if (uFineDetail > 0.0) for (int index = 0; index < 5; index += 1) {
    float distanceAlongRay = (float(index) + 0.5) / 5.0 * span;
    vec3 cellPoint = (vRest + refractedDirection * distanceAlongRay) * 17.0;
    vec3 cell = floor(cellPoint);
    float cellHash = hash13(cell);
    vec3 centre = cell + 0.15 + 0.7 * vec3(hash13(cell + 7.1), hash13(cell + 13.7), hash13(cell + 29.3));
    float distanceToCentre = length(cellPoint - centre);
    flecks += smoothstep(0.3, 0.05, distanceToCentre) * step(0.8, cellHash) * exp(-averageSigma * distanceAlongRay * 1.1);
  }
  flecks *= bands.flesh * uFineDetail;
  vec3 fleckColour = mix(albedo, vec3(1.0, 0.9, 0.86), 0.3) * flecks * 0.13;

  float roughness = mix(mix(0.07, 0.15, bands.pale), 0.17, bands.skin);
  float f0 = mix(0.03, 0.045, bands.skin);
  float fresnel = min(f0 + (1.0 - f0) * pow(1.0 - normalView, 5.0), 0.8);
  vec3 reflected = reflect(-viewDirection, normal);
  vec3 environment = environmentRadiance(reflected, roughness);
  vec3 specular = vec3(1.0, 0.975, 0.94) * ggx(normal, viewDirection, KEY, max(roughness, 0.16), f0) * 1.4
    + vec3(1.0) * ggx(normal, viewDirection, BACK, max(roughness, 0.2), f0)
    + vec3(0.94, 0.97, 1.0) * ggx(normal, viewDirection, STRIP, max(roughness, 0.18), f0) * 0.8;
  vec3 gummy = (behind * transmittance + scattering + edgeTransmission + fleckColour) * (1.0 - fresnel)
    + environment * fresnel + specular;

  // Irregular, glossy rind stripes remain distinct from the red flesh.
  vec3 baseRind = (uSkinColor + uRindColor) * 0.5;
  vec3 rind = mix(baseRind, uStripeColor, bands.stripe);
  rind *= 0.88 + 0.24 * valueNoise2(vec2(bands.angle * 140.0, vRest.y * 36.0));
  float inner = smoothstep(0.0, uBands.x * 1.2, bands.insideDepth);
  rind = mix(rind, rind * 1.7 + uPaleColor * 0.06, inner * 0.55);
  vec3 skin = rind * irradiance(normal) * (1.0 - fresnel) + environment * fresnel + specular * 1.3;
  vec3 colour = mix(gummy, skin, bands.skin);

  gl_FragColor = vec4(max(colour, vec3(0.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const BACK_DEPTH_VERTEX_SHADER = /* glsl */`
varying float vBackDepth;

#include <packing>

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vBackDepth = max(0.0, -viewPosition.z);
  gl_Position = projectionMatrix * viewPosition;
}
`;

const BACK_DEPTH_FRAGMENT_SHADER = /* glsl */`
uniform float uFar;
varying float vBackDepth;

#include <packing>

vec4 packDepth(const in float depth) {
  return packDepthToRGBA(clamp(depth / max(uFar, 1.0), 0.0, 1.0));
}

void main() {
  gl_FragColor = packDepth(vBackDepth);
}
`;

interface MelonUniforms {
  [uniform: string]: { value: any };
  uOrigin: { value: THREE.Vector2 };
  uScene: { value: THREE.Texture | null };
  uBackDepth: { value: THREE.Texture | null };
  uResolution: { value: THREE.Vector4 };
  uDepthRange: { value: THREE.Vector2 };
  uCameraForward: { value: THREE.Vector3 };
  uScale: { value: number };
  uTime: { value: number };
  uFineDetail: { value: number };
  uRadius: { value: number };
  uBands: { value: THREE.Vector2 };
  uFleshSigma: { value: THREE.Vector3 };
  uFleshScatter: { value: THREE.Vector3 };
  uFleshColor: { value: THREE.Vector3 };
  uPaleColor: { value: THREE.Vector3 };
  uSkinColor: { value: THREE.Vector3 };
  uRindColor: { value: THREE.Vector3 };
  uStripeColor: { value: THREE.Vector3 };
}

type MelonShaderMaterial = THREE.ShaderMaterial & { uniforms: MelonUniforms };

interface RendererSnapshot {
  renderTarget: THREE.WebGLRenderTarget | null;
  clearColor: THREE.Color;
  clearAlpha: number;
  autoClear: boolean;
  autoClearColor: boolean;
  autoClearDepth: boolean;
  autoClearStencil: boolean;
}

function createUniforms(origin: readonly [number, number]): MelonUniforms {
  const fleshScatter = new THREE.Vector3(0.92, 0.09, 0.12);
  const rindColour = new THREE.Vector3(0.075, 0.25, 0.07);
  return {
    uOrigin: { value: new THREE.Vector2(origin[0] ?? 0, origin[1] ?? 0) },
    uScene: { value: null },
    uBackDepth: { value: null },
    uResolution: { value: new THREE.Vector4(1, 1, 1, 1) },
    uDepthRange: { value: new THREE.Vector2(0.1, 50) },
    uCameraForward: { value: new THREE.Vector3(0, 0, -1) },
    uScale: { value: 1 },
    uProjection: { value: new THREE.Matrix4() },
    uTime: { value: 0 },
    uFineDetail: { value: 1 },
    uRadius: { value: 2.55 },
    uBands: { value: new THREE.Vector2(0.075, 0.36) },
    uFleshSigma: { value: new THREE.Vector3(0.42, 5.0, 4.1) },
    uFleshScatter: { value: fleshScatter },
    // Alias retained so a palette controller can call this a flesh colour;
    // both names intentionally point at the same mutable Vector3.
    uFleshColor: { value: fleshScatter },
    uPaleColor: { value: new THREE.Vector3(0.86, 0.9, 0.72) },
    uSkinColor: { value: rindColour },
    uRindColor: { value: rindColour },
    uStripeColor: { value: new THREE.Vector3(0.018, 0.085, 0.028) },
  };
}

function isShaderMaterial(material: THREE.Material): material is MelonShaderMaterial {
  return material instanceof THREE.ShaderMaterial && material.userData.melonMaterialPipeline === MELON_MARKER;
}

function eachMeshMaterial(mesh: THREE.Mesh): MelonShaderMaterial[] {
  const value = mesh.material;
  const materials = Array.isArray(value) ? value : [value];
  return materials.filter(isShaderMaterial);
}

export class MelonMaterialPipeline {
  private sceneTarget: THREE.WebGLRenderTarget | null = null;

  /** Kept as a Map so stale object slots can be reclaimed on scene changes. */
  private readonly backTargets = new Map<THREE.Mesh, THREE.WebGLRenderTarget>();
  private readonly backRevisions = new Map<THREE.Mesh, string>();

  private readonly materials = new Set<MelonShaderMaterial>();
  private readonly backMaterial: THREE.ShaderMaterial;
  private targetWidth = 0;
  private targetHeight = 0;
  private disposed = false;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.backMaterial = new THREE.ShaderMaterial({
      vertexShader: BACK_DEPTH_VERTEX_SHADER,
      fragmentShader: BACK_DEPTH_FRAGMENT_SHADER,
      uniforms: { uFar: { value: 50 } },
      side: THREE.BackSide,
      depthTest: true,
      depthWrite: true,
      toneMapped: false,
    });
    this.backMaterial.name = 'melon-jelly-backface-depth';
    this.backMaterial.colorWrite = true;
  }

  createMaterial(origin: readonly [number, number] = [0, 0], options: { gameplayLOD?: boolean } = {}): THREE.ShaderMaterial {
    if (this.disposed) throw new Error('MelonMaterialPipeline has been disposed');
    const material = new THREE.ShaderMaterial({
      uniforms: createUniforms(origin),
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      side: THREE.FrontSide,
      depthTest: true,
      depthWrite: true,
      transparent: false,
      toneMapped: true,
    }) as MelonShaderMaterial;
    material.name = 'melon-jelly-gummy';
    material.userData.melonMaterialPipeline = MELON_MARKER;
    material.userData.melonGameplayLOD = options.gameplayLOD === true;
    material.userData.thicknessUnits = 'world-units-per-specimen-unit';
    material.userData.thicknessConversion = 'uScale converts world-space back/front depth to specimen units';
    this.materials.add(material);
    material.addEventListener('dispose', () => this.materials.delete(material));
    return material;
  }

  prepare(scene: THREE.Scene, camera: THREE.PerspectiveCamera, jellyMeshes: readonly THREE.Mesh[]): void {
    if (this.disposed) throw new Error('MelonMaterialPipeline has been disposed');
    if (jellyMeshes.length === 0) {
      for (const target of this.backTargets.values()) target.dispose();
      this.backTargets.clear();
      this.backRevisions.clear();
      return;
    }

    const uniqueMeshes = [...new Set(jellyMeshes)];
    const size = this.resolveTargetSize();
    this.ensureTargetSize(size.width, size.height);
    const activeMeshes = new Set(uniqueMeshes);
    for (const [mesh, target] of this.backTargets) {
      if (activeMeshes.has(mesh)) continue;
      target.dispose();
      this.backTargets.delete(mesh);
      this.backRevisions.delete(mesh);
    }

    const snapshot = this.captureRendererState();
    const visibility = new Map<THREE.Object3D, boolean>();
    scene.traverse((object) => visibility.set(object, object.visible));
    const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    const originalBackground = scene.background;
    const originalOverrideMaterial = scene.overrideMaterial;
    const sceneTarget = this.sceneTarget;
    if (!sceneTarget) throw new Error('MelonMaterialPipeline failed to create scene target');

    try {
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      this.updateMaterialUniforms(uniqueMeshes, camera, size.screenWidth, size.screenHeight, sceneTarget.texture);

      // First pass: studio/background/solids/seeds/bubbles with all jelly
      // meshes removed. This texture is shared by every jelly material.
      for (const mesh of uniqueMeshes) mesh.traverse((object) => { object.visible = false; });
      scene.background = originalBackground;
      this.configureOffscreenRenderer(sceneTarget, size.width, size.height);
      this.renderer.render(scene, camera);

      // One isolated back-face pass per jelly object prevents another piece
      // from being mistaken for the exit surface on a refracted ray.
      for (const mesh of uniqueMeshes) {
        const target = this.ensureBackTarget(mesh, size.width, size.height);
        const materials = eachMeshMaterial(mesh);
        for (const material of materials) material.uniforms.uBackDepth.value = target.texture;
        const position = mesh.geometry.getAttribute('position');
        const positionVersion = position instanceof THREE.InterleavedBufferAttribute ? position.data.version : (position as THREE.BufferAttribute).version;
        const revision = [mesh.geometry.uuid, positionVersion, mesh.geometry.index?.version ?? 0,
          ...mesh.matrixWorld.elements, ...camera.matrixWorldInverse.elements, ...camera.projectionMatrix.elements,
          camera.far, size.width, size.height].join(',');
        // Exit depth depends only on geometry and camera. Background, seeds,
        // material time/noise and lighting still refresh in the shared pass.
        if (this.backRevisions.get(mesh) === revision) continue;
        originalMaterials.set(mesh, mesh.material);
        for (const object of visibility.keys()) object.visible = false;
        this.enableMeshPath(mesh, scene);
        scene.background = null;
        scene.overrideMaterial = null;
        mesh.material = this.backMaterial;
        (this.backMaterial.uniforms.uFar.value as number) = camera.far;
        this.configureOffscreenRenderer(target, size.width, size.height);
        this.renderer.render(scene, camera);
        mesh.material = originalMaterials.get(mesh)!;
        this.backRevisions.set(mesh, revision);
      }
    } finally {
      for (const [mesh, material] of originalMaterials) mesh.material = material;
      for (const [object, wasVisible] of visibility) object.visible = wasVisible;
      scene.background = originalBackground;
      scene.overrideMaterial = originalOverrideMaterial;
      this.restoreRendererState(snapshot);
    }
  }

  /** Compile the rich material before the first player cut. The warmup mesh is
   * removed immediately; this moves shader compilation out of the input
   * frame while keeping the runtime pool empty until a real cut exists. */
  warmup(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    const geometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    geometry.setAttribute('rest', new THREE.BufferAttribute(new Float32Array(position.array as ArrayLike<number>), 3));
    const material = this.createMaterial([0, 0]);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'melon-material-warmup';
    scene.add(mesh);
    try {
      this.prepare(scene, camera, [mesh]);
      this.prepare(scene, camera, []);
    } finally {
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.sceneTarget?.dispose();
    this.sceneTarget = null;
    for (const target of this.backTargets.values()) target.dispose();
    this.backTargets.clear();
    this.backRevisions.clear();
    for (const material of this.materials) material.dispose();
    this.materials.clear();
    this.backMaterial.dispose();
    this.targetWidth = 0;
    this.targetHeight = 0;
  }

  private resolveTargetSize(): { width: number; height: number; screenWidth: number; screenHeight: number } {
    const drawingBuffer = new THREE.Vector2(1, 1);
    const result = this.renderer.getDrawingBufferSize?.(drawingBuffer) ?? drawingBuffer;
    const fallbackWidth = (this.renderer.domElement as { width?: number } | undefined)?.width ?? 1;
    const fallbackHeight = (this.renderer.domElement as { height?: number } | undefined)?.height ?? 1;
    const screenWidth = Math.max(1, Math.round(result.x || drawingBuffer.x || fallbackWidth));
    const screenHeight = Math.max(1, Math.round(result.y || drawingBuffer.y || fallbackHeight));
    const scale = Math.min(
      1,
      Math.sqrt(MAX_TARGET_PIXELS / (screenWidth * screenHeight)),
      MAX_TARGET_SIDE / screenWidth,
      MAX_TARGET_SIDE / screenHeight,
    );
    return {
      width: Math.max(1, Math.min(MAX_TARGET_SIDE, Math.round(screenWidth * scale))),
      height: Math.max(1, Math.min(MAX_TARGET_SIDE, Math.round(screenHeight * scale))),
      screenWidth,
      screenHeight,
    };
  }

  private ensureTargetSize(width: number, height: number): void {
    if (this.targetWidth === width && this.targetHeight === height && this.sceneTarget) return;
    this.sceneTarget?.dispose();
    for (const target of this.backTargets.values()) target.dispose();
    this.backTargets.clear();
    this.backRevisions.clear();
    this.sceneTarget = this.createSceneTarget(width, height);
    this.targetWidth = width;
    this.targetHeight = height;
  }

  private createSceneTarget(width: number, height: number): THREE.WebGLRenderTarget {
    const target = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    target.texture.name = 'melon-jelly-studio-scene';
    target.texture.colorSpace = THREE.NoColorSpace;
    target.texture.generateMipmaps = false;
    return target;
  }

  private createBackTarget(width: number, height: number): THREE.WebGLRenderTarget {
    const target = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    target.texture.name = 'melon-jelly-object-back-depth';
    target.texture.colorSpace = THREE.NoColorSpace;
    target.texture.generateMipmaps = false;
    return target;
  }

  private ensureBackTarget(mesh: THREE.Mesh, width: number, height: number): THREE.WebGLRenderTarget {
    const existing = this.backTargets.get(mesh);
    if (existing) return existing;
    const target = this.createBackTarget(width, height);
    this.backTargets.set(mesh, target);
    return target;
  }

  private updateMaterialUniforms(
    meshes: readonly THREE.Mesh[],
    camera: THREE.PerspectiveCamera,
    screenWidth: number,
    screenHeight: number,
    sceneTexture: THREE.Texture,
  ): void {
    const cameraForward = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(cameraForward);
    const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
    for (const mesh of meshes) {
      for (const material of eachMeshMaterial(mesh)) {
        material.uniforms.uScene.value = sceneTexture;
        material.uniforms.uResolution.value.set(screenWidth, screenHeight, 1 / screenWidth, 1 / screenHeight);
        material.uniforms.uDepthRange.value.set(Math.max(0.001, camera.near), Math.max(camera.near + 0.001, camera.far));
        material.uniforms.uCameraForward.value.copy(cameraForward);
        material.uniforms.uProjection.value.copy(camera.projectionMatrix);
        if (material.userData.melonGameplayLOD) {
          if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
          const bounds = mesh.geometry.boundingSphere!.clone().applyMatrix4(mesh.matrixWorld);
          const distance = Math.max(camera.near, bounds.center.distanceTo(cameraPosition));
          const diameter = bounds.radius * screenHeight * Math.abs(camera.projectionMatrix.elements[5]!) / distance;
          material.uniforms.uFineDetail.value = THREE.MathUtils.smoothstep(diameter, 160, 256);
        }
      }
    }
  }

  private configureOffscreenRenderer(target: THREE.WebGLRenderTarget, width: number, height: number): void {
    // Render-target rectangles are physical pixels. Three's setViewport and
    // setScissor apply the canvas DPR, so using them here scales a Retina
    // target twice and breaks the matching front/back-depth coordinates.
    target.viewport.set(0, 0, width, height);
    target.scissor.set(0, 0, width, height);
    target.scissorTest = false;
    this.renderer.setRenderTarget(target);
    this.renderer.autoClear = true;
    this.renderer.autoClearColor = true;
    this.renderer.autoClearDepth = true;
    this.renderer.autoClearStencil = true;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear(true, true, true);
  }

  private enableMeshPath(mesh: THREE.Mesh, scene: THREE.Scene): void {
    let current: THREE.Object3D | null = mesh;
    while (current) {
      current.visible = true;
      if (current === scene) break;
      current = current.parent;
    }
  }

  private captureRendererState(): RendererSnapshot {
    const clearColor = this.renderer.getClearColor(new THREE.Color());
    return {
      renderTarget: this.renderer.getRenderTarget(),
      clearColor: clearColor.clone(),
      clearAlpha: this.renderer.getClearAlpha(),
      autoClear: this.renderer.autoClear,
      autoClearColor: this.renderer.autoClearColor,
      autoClearDepth: this.renderer.autoClearDepth,
      autoClearStencil: this.renderer.autoClearStencil,
    };
  }

  private restoreRendererState(snapshot: RendererSnapshot): void {
    this.renderer.setRenderTarget(snapshot.renderTarget);
    this.renderer.setClearColor(snapshot.clearColor, snapshot.clearAlpha);
    this.renderer.autoClear = snapshot.autoClear;
    this.renderer.autoClearColor = snapshot.autoClearColor;
    this.renderer.autoClearDepth = snapshot.autoClearDepth;
    this.renderer.autoClearStencil = snapshot.autoClearStencil;
  }
}
