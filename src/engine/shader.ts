import * as THREE from 'three';

export interface FishUniforms {
  uTime: { value: number };
  uGape: { value: number };
  uHinge: { value: THREE.Vector2 };
  uAmp: { value: number };
  uWave: { value: number };
  uFreq: { value: number };
  uA0: { value: number };
  uPow: { value: number };
  uL: { value: number };
  uX0: { value: number };
  uFlap: { value: number };
  uFlapF: { value: number };
  uFinWave: { value: number };
  uWing: { value: number };
  uWingF: { value: number };
  uSpan: { value: number };
}

export function makeUniforms(): FishUniforms {
  return {
    uTime: { value: 0 },
    uGape: { value: 0 },
    uHinge: { value: new THREE.Vector2() },
    uAmp: { value: 0 },
    uWave: { value: 7 },
    uFreq: { value: 6 },
    uA0: { value: 0.15 },
    uPow: { value: 2 },
    uL: { value: 2 },
    uX0: { value: 1 },
    uFlap: { value: 0 },
    uFlapF: { value: 4 },
    uFinWave: { value: 0 },
    uWing: { value: 0 },
    uWingF: { value: 1.5 },
    uSpan: { value: 1 },
  };
}

const VERT_HEAD = /* glsl */ `
attribute float aJaw;
attribute float aFlap;
attribute float aSide;
uniform float uTime, uGape, uAmp, uWave, uFreq, uA0, uPow, uL, uX0, uFlap, uFlapF, uFinWave, uWing, uWingF, uSpan;
uniform vec2 uHinge;
varying vec2 vFin;
varying float vJaw;
`;

const VERT_DEFORM = /* glsl */ `
vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif
vec3 fishP = position;
vFin = uv;
vJaw = aJaw;
// 1. lower jaw – rotation about the quadrate-articular hinge
if (aJaw > 0.0) {
  float ja = -uGape * aJaw;
  float ca = cos(ja), sa = sin(ja);
  vec2 d = fishP.xy - uHinge;
  fishP.xy = uHinge + vec2(ca*d.x - sa*d.y, sa*d.x + ca*d.y);
  objectNormal.xy = vec2(ca*objectNormal.x - sa*objectNormal.y, sa*objectNormal.x + ca*objectNormal.y);
}
// 2. fins – paired fins flap (aSide=±1), median fins ripple (aSide=0)
if (aFlap > 0.0) {
  float pf = uTime*uFlapF - aFlap*2.2;
  fishP.z += aSide * aFlap * uFlap * uL * sin(pf);
  fishP.y += abs(aSide) * aFlap * uFlap * uL * 0.35 * cos(pf);
  fishP.z += (1.0-abs(aSide)) * aFlap * uFinWave * uL * sin(uTime*7.0 + fishP.x*14.0/uL);
}
// 3. batoid wings
if (uWing > 0.0) {
  float az = clamp(abs(fishP.z)/uSpan, 0.0, 1.0);
  float sw = (uX0 - fishP.x)/uL;
  float wp = uTime*uWingF - sw*3.5;
  fishP.y += uWing * pow(az, 1.7) * sin(wp) * uSpan;
  float dy = uWing * 1.7 * pow(max(az,1e-3), 0.7) * sin(wp);
  objectNormal = normalize(vec3(objectNormal.x, objectNormal.y, objectNormal.z - dy*sign(fishP.z)*objectNormal.y));
}
// 4. axial undulation (travelling wave, amplitude envelope by swim mode)
{
  float s = clamp((uX0 - fishP.x)/uL, 0.0, 1.4);
  float A = uAmp * (uA0 + (1.0-uA0)*pow(s, uPow));
  float ph = uWave*s - uTime*uFreq;
  fishP.z += A*sin(ph)*uL;
  float dA = uAmp*(1.0-uA0)*uPow*pow(max(s,1e-3), uPow-1.0);
  float th = atan(-(dA*sin(ph) + A*uWave*cos(ph)));
  float c = cos(th), sn = sin(th);
  objectNormal.xz = vec2(c*objectNormal.x - sn*objectNormal.z, sn*objectNormal.x + c*objectNormal.z);
}
`;

export interface FinLook {
  rays: number;
  incise: number;
  membrane: number;
  base: THREE.Color;
  tip: THREE.Color;
  edge: THREE.Color;
  edgeW: number;
  spots: number;
  spotCol: THREE.Color;
}

const FRAG_HEAD = /* glsl */ `
varying vec2 vFin;
varying float vJaw;
uniform float fRays, fIncise, fMembrane, fEdgeW, fSpots, fIsFin;
uniform vec3 fBase, fTip, fEdge, fSpotCol;
float fHash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
`;

const FRAG_FIN = /* glsl */ `
if (fIsFin > 0.5) {
  float rx = vFin.x * fRays;
  float rd = abs(fract(rx) - 0.5) * 2.0;           // 1 on a ray, 0 between rays
  float ray = smoothstep(0.62, 0.95, rd);
  float v = vFin.y;
  // segmented / branching look of soft rays
  float seg = smoothstep(0.85, 1.0, abs(fract(v*18.0 + rx*0.3) - 0.5)*2.0) * (1.0-ray) * 0.0;
  // incised membrane between spines
  float notch = fIncise * (1.0 - ray);
  if (v > 1.0 - notch * 0.75 * (0.5 + 0.5*abs(sin(rx*3.14159)))) discard;
  vec3 col = mix(fBase, fTip, smoothstep(0.0, 1.0, v));
  col = mix(col, col*0.55, ray*0.65);
  if (fSpots > 0.0) {
    vec2 g = vec2(vFin.x*fSpots*2.0, v*fSpots*0.8);
    vec2 id = floor(g); vec2 f = fract(g) - 0.5;
    float h = fHash(id);
    float dd = length(f + (vec2(fHash(id+3.1), fHash(id+7.7))-0.5)*0.5);
    col = mix(col, fSpotCol, step(dd, 0.22*h+0.06) * step(0.35, h));
  }
  col = mix(col, fEdge, smoothstep(1.0 - fEdgeW, 1.0 - fEdgeW*0.4, v) * step(0.001, fEdgeW));
  diffuseColor.rgb = col;
  float a = mix(fMembrane, 1.0, ray*0.85);
  a *= 1.0 - smoothstep(0.93, 1.0, v) * 0.6;
  a *= smoothstep(0.0, 0.05, v) * 0.3 + 0.7;
  diffuseColor.a *= clamp(a, 0.0, 1.0);
  diffuseColor.rgb += seg;
}
`;

/** Patch a standard/physical material with the fish deformation pipeline */
export function patchMaterial(mat: THREE.Material, u: FishUniforms, fin?: FinLook) {
  const fu = {
    fRays: { value: fin?.rays ?? 0 },
    fIncise: { value: fin?.incise ?? 0 },
    fMembrane: { value: fin?.membrane ?? 1 },
    fEdgeW: { value: fin?.edgeW ?? 0 },
    fSpots: { value: fin?.spots ?? 0 },
    fIsFin: { value: fin ? 1 : 0 },
    fBase: { value: fin?.base ?? new THREE.Color() },
    fTip: { value: fin?.tip ?? new THREE.Color() },
    fEdge: { value: fin?.edge ?? new THREE.Color() },
    fSpotCol: { value: fin?.spotCol ?? new THREE.Color() },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u, fu);
    shader.vertexShader = VERT_HEAD + shader.vertexShader
      .replace('#include <beginnormal_vertex>', VERT_DEFORM)
      .replace('#include <begin_vertex>', 'vec3 transformed = fishP;');
    shader.fragmentShader = FRAG_HEAD + shader.fragmentShader.replace(
      '#include <alphamap_fragment>',
      '#include <alphamap_fragment>\n' + FRAG_FIN,
    );
  };
  mat.customProgramCacheKey = () => 'fish-v3';
  return mat;
}

/** make sure a geometry carries the custom attributes */
export function ensureAttrs(g: THREE.BufferGeometry, jaw = 0, flap = 0, side = 0) {
  const n = g.getAttribute('position').count;
  if (!g.getAttribute('aJaw')) g.setAttribute('aJaw', new THREE.BufferAttribute(new Float32Array(n).fill(jaw), 1));
  if (!g.getAttribute('aFlap')) g.setAttribute('aFlap', new THREE.BufferAttribute(new Float32Array(n).fill(flap), 1));
  if (!g.getAttribute('aSide')) g.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array(n).fill(side), 1));
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}
