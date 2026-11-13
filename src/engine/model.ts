import * as THREE from 'three';
import type { Species } from './types';
import { clamp, curve, DEG, lerp, smooth } from './math';

/**
 * BodyModel – the analytic description of one fish, derived purely from its
 * morphometrics. Everything that is later attached to the body (fins, eyes,
 * jaws, barbels, teeth) is positioned through this model, so all parts agree.
 *
 * Coordinates: loft parameter s ∈ [0,1] (snout → caudal base),
 * object space: snout points to +X, dorsal is +Y, right flank is +Z.
 * One loft-length = `L` world units.
 */
export class BodyModel {
  readonly sp: Species;
  readonly L: number;
  private cx = new Float64Array(0);
  private cy = new Float64Array(0);
  private th = new Float64Array(0);
  private K = 600;
  readonly mouthTip: { s: number; y: number };
  readonly rictus: { s: number; y: number };
  readonly hinge: { s: number; y: number };

  constructor(sp: Species, L = 2) {
    this.sp = sp;
    this.L = L;
    this.buildCenterline();
    const m = sp.mouth;
    const yTip = this.normY(m.s, m.y);
    const a = m.angle * DEG;
    const rs = m.s + m.gape * Math.cos(a);
    let ry = yTip - m.gape * Math.sin(a);
    ry = clamp(ry, -this.bot(rs) * 0.9, this.top(rs) * 0.9);
    this.mouthTip = { s: m.s, y: yTip };
    this.rictus = { s: rs, y: ry };
    // quadrate–articular joint: slightly behind and below the rictus
    this.hinge = { s: rs + Math.min(0.02, m.gape * 0.18), y: ry - Math.min(0.012, m.gape * 0.1) };
  }

  // ── outline ────────────────────────────────────────────────────────────────
  private front(t: number, b: number) {
    const a = 1 + b * 1.6;
    const c = 1 + b * 1.3;
    return Math.pow(clamp(1 - Math.pow(1 - clamp(t), a)), 1 / c);
  }
  private back(t: number, e: number) {
    return 0.5 + 0.5 * Math.cos(Math.PI * Math.pow(clamp(t), e));
  }
  private bumps(s: number, side: 1 | -1) {
    let v = 0;
    for (const [bs, h, w, sd] of this.sp.body.bumps ?? []) {
      if (sd !== side) continue;
      const d = (s - bs) / w;
      v += h * Math.exp(-d * d);
    }
    return v;
  }

  /** dorsal height above the axis (SL units) */
  top(s: number) {
    const b = this.sp.body;
    const Dt = b.D * b.df;
    const Pt = b.P / 2 + b.pedY;
    let v: number;
    if (s <= b.pD) v = Dt * this.front(s / b.pD, b.bD);
    else v = Pt + (Dt - Pt) * this.back((s - b.pD) / (1 - b.pD), b.tD);
    return Math.max(0, v + this.bumps(s, 1) * smooth(0, 0.04, s));
  }
  /** ventral depth below the axis (SL units) */
  bot(s: number) {
    const b = this.sp.body;
    const Dv = b.D * (1 - b.df);
    const Pb = b.P / 2 - b.pedY;
    let v: number;
    if (s <= b.pV) v = Dv * this.front(s / b.pV, b.bV);
    else v = Pb + (Dv - Pb) * this.back((s - b.pV) / (1 - b.pV), b.tV);
    return Math.max(0, v + this.bumps(s, -1) * smooth(0, 0.04, s));
  }
  /** half width (SL units) */
  hw(s: number) {
    const b = this.sp.body;
    if (b.disc) return this.discW(s);
    const base = ((this.top(s) + this.bot(s)) / 2) * b.W;
    let w = base * lerp(b.Wh, 1, smooth(0.02, 0.32, s)) * lerp(1, b.Wt, smooth(0.35, 1, s));
    for (const [bs, e, ww] of b.wbumps ?? []) {
      const d = (s - bs) / ww;
      w += e * Math.exp(-d * d * d * d);
    }
    return w;
  }
  private discW(s: number) {
    const d = this.sp.body.disc!;
    const tail = d.tailW * (1 - 0.7 * smooth(d.end, 1, s));
    let w: number;
    if (s <= d.pW) {
      const t = s / d.pW;
      w = d.span * Math.pow(this.front(t, 0.12), d.fr);
      if (d.head) w = Math.max(w, d.head * this.front(s / 0.03, 0.8));
    } else if (s <= d.end) {
      const t = (s - d.pW) / (d.end - d.pW);
      w = d.span * Math.pow(1 - t, d.bk);
    } else w = 0;
    return Math.max(w, s > d.pW * 0.5 ? tail : 0);
  }

  /** half perimeter of a section (SL units) – used for isotropic texturing */
  halfPerim(s: number) {
    const h = (this.top(s) + this.bot(s)) / 2;
    const w = this.hw(s);
    return Math.PI * Math.sqrt((h * h + w * w) / 2) + 1e-4;
  }

  normY(s: number, yn: number) {
    return yn >= 0 ? yn * this.top(s) : yn * this.bot(s);
  }

  // ── centreline (supports seahorse-like bending) ───────────────────────────
  private buildCenterline() {
    const K = this.K;
    const bend = this.sp.body.bend;
    const f = bend && bend.length > 1 ? curve(bend) : () => 0;
    this.cx = new Float64Array(K + 1);
    this.cy = new Float64Array(K + 1);
    this.th = new Float64Array(K + 1);
    let x = 0, y = 0;
    for (let i = 0; i <= K; i++) {
      const s = i / K;
      const t = f(s) * DEG;
      this.th[i] = t;
      this.cx[i] = x;
      this.cy[i] = y;
      x += -Math.cos(t) / K;
      y += -Math.sin(t) / K;
    }
    // centre the fish around the origin (bounding box centre of centreline)
    let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
    for (let i = 0; i <= K; i++) {
      mnx = Math.min(mnx, this.cx[i]); mxx = Math.max(mxx, this.cx[i]);
      mny = Math.min(mny, this.cy[i]); mxy = Math.max(mxy, this.cy[i]);
    }
    const ox = (mnx + mxx) / 2, oy = bend ? (mny + mxy) / 2 : 0;
    for (let i = 0; i <= K; i++) { this.cx[i] -= ox; this.cy[i] -= oy; }
  }
  private sample(arr: Float64Array, s: number) {
    const f = clamp(s) * this.K;
    const i = Math.min(this.K - 1, Math.floor(f));
    const t = f - i;
    if (s > 1) return arr[this.K] + (arr[this.K] - arr[this.K - 1]) * (s - 1) * this.K;
    if (s < 0) return arr[0] + (arr[1] - arr[0]) * s * this.K;
    return lerp(arr[i], arr[i + 1], t);
  }
  heading(s: number) {
    return this.sample(this.th, clamp(s));
  }
  /** local (s, y, z) in SL units → object space */
  local(s: number, y: number, z: number, out = new THREE.Vector3()) {
    const t = this.heading(s);
    const nx = -Math.sin(t), ny = Math.cos(t);
    const cx = this.sample(this.cx, s), cy = this.sample(this.cy, s);
    return out.set((cx + nx * y) * this.L, (cy + ny * y) * this.L, z * this.L);
  }
  /** backward tangent and dorsal normal (object space, unit) */
  frame(s: number) {
    const t = this.heading(s);
    return {
      T: new THREE.Vector3(-Math.cos(t), -Math.sin(t), 0),
      N: new THREE.Vector3(-Math.sin(t), Math.cos(t), 0),
    };
  }

  // ── cross-section ─────────────────────────────────────────────────────────
  sectionYZ(s: number, phi: number): [number, number] {
    const e = 2 / this.sp.body.sq;
    const c = Math.cos(phi), sn = Math.sin(phi);
    const y = c >= 0 ? this.top(s) * Math.pow(c, e) : -this.bot(s) * Math.pow(-c, e);
    const z = Math.sign(sn) * this.hw(s) * Math.pow(Math.abs(sn), e);
    return [y, z];
  }
  surface(s: number, phi: number, out = new THREE.Vector3()) {
    const [y, z] = this.sectionYZ(s, phi);
    return this.local(s, y, z, out);
  }
  /** angle φ on the right flank at which the section reaches height y */
  phiAtY(s: number, y: number) {
    const q = this.sp.body.sq / 2;
    const t = this.top(s), b = this.bot(s);
    let c: number;
    if (y >= 0) c = t < 1e-6 ? 0 : Math.pow(Math.min(y / t, 0.985), q);
    else c = b < 1e-6 ? 0 : -Math.pow(Math.min(-y / b, 0.985), q);
    return Math.acos(clamp(c, -1, 1));
  }
  /** outward surface point & normal for an attachment at (s, normalised y) on the right flank */
  attach(s: number, yn: number, side: 1 | -1 = 1) {
    const s1 = clamp(s, 0.0005, 0.9995);
    const phi = this.phiAtY(s1, this.normY(s1, yn));
    const ph = side === 1 ? phi : 2 * Math.PI - phi;
    const p = this.surface(s1, ph);
    const ds = 0.002, dp = 0.01;
    const a = this.surface(s1 + ds, ph).sub(this.surface(s1 - ds, ph));
    const b = this.surface(s1, ph + dp).sub(this.surface(s1, ph - dp));
    const n = new THREE.Vector3().crossVectors(b, a).normalize();
    const c = this.local(s1, 0, 0);
    if (n.dot(p.clone().sub(c)) < 0) n.negate();
    if (!isFinite(n.x)) n.set(0, 0, side);
    return { p, n, phi: ph };
  }

  // ── mouth ─────────────────────────────────────────────────────────────────
  /** height of the oral cleft at s (only meaningful between tip and rictus) */
  mouthY(s: number) {
    const { mouthTip: a, rictus: r } = this;
    const t = clamp((s - a.s) / Math.max(1e-4, r.s - a.s));
    const y = lerp(a.y, r.y, t) + this.sp.mouth.curve * this.sp.mouth.gape * Math.sin(Math.PI * t);
    return clamp(y, -this.bot(s) * 0.97, this.top(s) * 0.97);
  }
  hasJaw() {
    const k = this.sp.mouth.kind ?? 'jaw';
    return k === 'jaw' && this.sp.mouth.gape > 0.004;
  }
  /** φ of the mouth seam for any station (smoothly continued past the rictus) */
  seamPhi(s: number) {
    const { mouthTip: a, rictus: r } = this;
    if (!this.hasJaw()) return Math.PI * 0.5 + 0.35;
    if (s < a.s) {
      const p0 = this.phiAtY(a.s + 1e-4, this.mouthY(a.s + 1e-4));
      return lerp(Math.PI - 0.05, p0, smooth(a.s - 0.03, a.s, s));
    }
    if (s <= r.s) return this.phiAtY(s, this.mouthY(s));
    const pr = this.phiAtY(r.s, this.mouthY(r.s));
    return lerp(pr, Math.PI * 0.5 + 0.35, smooth(r.s, r.s + 0.25, s));
  }
  /** lower-jaw skinning weight. `depth` 0 at lip, 1 at ventral midline */
  jawWeight(s: number, depth: number) {
    if (!this.hasJaw()) return 0;
    const { mouthTip: a, rictus: r } = this;
    const ext = 0.012 + depth * (this.sp.mouth.throat ?? 0.07);
    let w = 1 - smooth(r.s - 0.012, r.s + ext, s);
    if (s < a.s) w *= smooth(a.s - 0.012, a.s, s);
    return w;
  }
  /** object-space hinge position */
  hingeXY() {
    const p = this.local(this.hinge.s, this.hinge.y, 0);
    return new THREE.Vector2(p.x, p.y);
  }
}
