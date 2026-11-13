import type { DeepPartial, FinShape, MedianFin, PairedFin, Species } from '../engine/types';

const BASE: Omit<Species, 'id' | 'name' | 'sci' | 'group' | 'note'> = {
  lenM: 0.5,
  plan: 'fish',
  HL: 0.26,
  body: { D: 0.25, df: 0.5, pD: 0.38, pV: 0.42, P: 0.09, pedY: 0, bD: 0.5, bV: 0.5, tD: 1.2, tV: 1.2, W: 0.55, Wh: 1, Wt: 0.6, sq: 2.2 },
  mouth: { s: 0, y: 0, gape: 0.08, angle: 15, curve: 0, open: 30, jut: 0, lip: 0.3, teeth: 'fine', tn: 10, ts: 0.006, kind: 'jaw' },
  eye: { s: 0.1, y: 0.35, d: 0.05, iris: '#c8a040' },
  fins: { caudal: { type: 'forked', span: 0.3 }, color: '#9aa4a8', alpha: 0.7 },
  color: { top: '#4a5a60', side: '#9aa8ae', belly: '#e8ecee' },
  skin: { scales: 60, kind: 'cycloid', bump: 0.6 },
  swim: { mode: 'subcarangiform' },
};

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}
export function merge<T>(a: T, b: DeepPartial<T> | undefined): T {
  if (!b) return a;
  const out: Record<string, unknown> = { ...(a as Record<string, unknown>) };
  for (const [k, v] of Object.entries(b as Record<string, unknown>)) {
    if (v === undefined) { delete out[k]; continue; } // explicit undefined removes an inherited part
    const cur = out[k];
    out[k] = isObj(cur) && isObj(v) ? merge(cur, v as never) : v;
  }
  return out as T;
}

export type SP = DeepPartial<Species> & { id: string; name: string; sci: string; group: string; note: string };

export function make(arch: DeepPartial<Species> | DeepPartial<Species>[], over: SP): Species {
  let s = BASE as Species;
  for (const a of Array.isArray(arch) ? arch : [arch]) s = merge(s, a);
  return merge(s, over as DeepPartial<Species>);
}

/** median fin helper */
export const M = (s0: number, s1: number, h: number, shape: FinShape, x: Partial<MedianFin> = {}): MedianFin => ({ s0, s1, h, shape, ...x });
/** paired fin helper */
export const Pf = (s: number, y: number, base: number, len: number, shape: FinShape, elev: number, splay: number, x: Partial<PairedFin> = {}): PairedFin => ({ s, y, base, len, shape, elev, splay, ...x });

// ── archetypes ──────────────────────────────────────────────────────────────
export const A = {
  perch: {
    body: { D: 0.3, df: 0.55, pD: 0.36, pV: 0.42, P: 0.1, bD: 0.45, bV: 0.55, W: 0.42 },
    skin: { scales: 60, kind: 'ctenoid', bump: 0.7 },
    fins: { pec: Pf(0.3, -0.3, 0.05, 0.16, 'round', -10, 22), pel: Pf(0.33, -0.95, 0.03, 0.13, 'tri', -40, 18, { incise: 0 }), caudal: { type: 'emarginate', span: 0.3, len: 0.2 } },
    swim: { mode: 'subcarangiform' },
  },
  salmonid: {
    lenM: 0.7,
    body: { D: 0.22, df: 0.52, pD: 0.38, pV: 0.45, P: 0.085, bD: 0.42, bV: 0.5, W: 0.55 },
    skin: { scales: 120, kind: 'cycloid', bump: 0.35 },
    HL: 0.22,
    fins: {
      dorsal: [M(0.4, 0.53, 0.12, 'tri'), M(0.8, 0.86, 0.035, 'adipose', { alpha: 1, rays: 0 })],
      anal: [M(0.72, 0.82, 0.09, 'tri')],
      pec: Pf(0.23, -0.6, 0.035, 0.14, 'tri', -18, 20),
      pel: Pf(0.52, -0.93, 0.03, 0.1, 'tri', -25, 18),
      caudal: { type: 'emarginate', span: 0.3, len: 0.18 },
    },
    swim: { mode: 'subcarangiform' },
  },
  clupeid: {
    lenM: 0.3,
    body: { D: 0.2, df: 0.45, pD: 0.4, pV: 0.42, P: 0.065, bD: 0.32, bV: 0.35, W: 0.45, tD: 1.3, tV: 1.3 },
    skin: { scales: 50, kind: 'cycloid', bump: 0.5 },
    HL: 0.24,
    color: { top: '#2f5a6e', side: '#c6d4dc', belly: '#f2f6f8', iri: 0.8, metal: 0.55, rough: 0.25 },
    fins: {
      dorsal: [M(0.42, 0.55, 0.1, 'tri')],
      anal: [M(0.78, 0.9, 0.04, 'low')],
      pec: Pf(0.25, -0.75, 0.025, 0.11, 'tri', -15, 18),
      pel: Pf(0.5, -0.95, 0.02, 0.07, 'tri', -20, 15),
      caudal: { type: 'forked', span: 0.34, len: 0.24, fork: 0.25 },
      color: '#b8c4c8', alpha: 0.5,
    },
    swim: { mode: 'carangiform' },
  },
  cyprinid: {
    body: { D: 0.3, df: 0.6, pD: 0.36, pV: 0.48, P: 0.12, bD: 0.5, bV: 0.6, W: 0.55 },
    skin: { scales: 36, kind: 'cycloid', bump: 0.9 },
    HL: 0.23,
    mouth: { s: 0.012, y: -0.25, gape: 0.05, angle: -8, open: 34, teeth: 'none', tn: 0, lip: 0.6 },
    fins: {
      dorsal: [M(0.4, 0.74, 0.12, 'tri', { sweep: 15 })],
      anal: [M(0.74, 0.82, 0.1, 'tri')],
      pec: Pf(0.24, -0.7, 0.035, 0.13, 'round', -20, 22),
      pel: Pf(0.46, -0.95, 0.03, 0.11, 'tri', -25, 18),
      caudal: { type: 'forked', span: 0.36, len: 0.25, fork: 0.35 },
    },
  },
  scombrid: {
    lenM: 1,
    body: { D: 0.27, df: 0.5, pD: 0.38, pV: 0.42, P: 0.035, bD: 0.45, bV: 0.45, tD: 1.7, tV: 1.7, W: 0.72, Wt: 0.9, sq: 2 },
    skin: { scales: 0, kind: 'smooth', bump: 0.2 },
    HL: 0.27,
    mouth: { gape: 0.085, angle: 18, teeth: 'fine', tn: 14, ts: 0.004 },
    eye: { s: 0.09, y: 0.38, d: 0.042, iris: '#2a2a20' },
    color: { top: '#0d2346', side: '#8fa0b4', belly: '#eef1f4', cs: [0.36, 0.55], iri: 0.5, metal: 0.55, rough: 0.22 },
    fins: {
      dorsal: [M(0.28, 0.45, 0.07, 'spiny', { incise: 0.2 }), M(0.52, 0.6, 0.11, 'falcate')],
      anal: [M(0.56, 0.63, 0.1, 'falcate')],
      finlets: { s0: 0.66, s1: 0.93, n: 8, h: 0.025, color: '#e0c030' },
      pec: Pf(0.27, -0.05, 0.03, 0.17, 'falcate', -12, 18),
      pel: Pf(0.3, -0.95, 0.02, 0.07, 'tri', -30, 12),
      caudal: { type: 'lunate', span: 0.5, len: 0.2 },
      color: '#2a3550', alpha: 0.92,
    },
    swim: { mode: 'thunniform' },
  },
  shark: {
    lenM: 3,
    HL: 0.22,
    body: { D: 0.18, df: 0.55, pD: 0.36, pV: 0.42, P: 0.04, bD: 0.4, bV: 0.35, W: 0.72, Wh: 1.1, sq: 2, tD: 1.15, tV: 1.2 },
    skin: { scales: 0, kind: 'placoid', bump: 0.5 },
    mouth: { s: 0.055, y: -0.86, gape: 0.085, angle: -14, curve: -0.12, open: 40, teeth: 'shark', tn: 12, ts: 0.012, throat: 0.1 },
    eye: { s: 0.075, y: 0.25, d: 0.018, iris: '#20262a' },
    color: { top: '#5f6d78', side: '#7d8b96', belly: '#f2f2ef', cs: [0.42, 0.56], rough: 0.55 },
    fins: {
      dorsal: [M(0.34, 0.46, 0.12, 'shark'), M(0.78, 0.82, 0.03, 'shark')],
      anal: [M(0.8, 0.84, 0.025, 'shark')],
      pec: Pf(0.24, -0.65, 0.06, 0.2, 'shark', -28, 22, { alpha: 1, rays: 0 }),
      pel: Pf(0.56, -0.9, 0.04, 0.07, 'shark', -25, 15, { alpha: 1, rays: 0 }),
      caudal: { type: 'hetero', span: 0.42, len: 0.3 },
      alpha: 1, color: '#66737e',
    },
    swim: { mode: 'carangiform' },
  },
  eel: {
    HL: 0.12,
    lenM: 1,
    body: { D: 0.065, df: 0.5, pD: 0.35, pV: 0.38, P: 0.02, bD: 0.4, bV: 0.45, tD: 0.9, tV: 0.9, W: 0.75, Wt: 0.35, sq: 2 },
    skin: { scales: 0, kind: 'smooth', bump: 0.15 },
    mouth: { gape: 0.04, angle: 8, teeth: 'fine', tn: 12, ts: 0.003 },
    eye: { s: 0.03, y: 0.45, d: 0.012 },
    fins: { caudal: { type: 'pointed', span: 0.04, len: 0.04 }, alpha: 0.75 },
    swim: { mode: 'anguilliform' },
  },
  reef: {
    lenM: 0.25,
    body: { D: 0.5, df: 0.52, pD: 0.4, pV: 0.45, P: 0.12, bD: 0.55, bV: 0.6, W: 0.3, tD: 1.1, tV: 1.1 },
    skin: { scales: 45, kind: 'ctenoid', bump: 0.5 },
    mouth: { gape: 0.03, angle: 10, open: 30, tn: 8, ts: 0.004 },
    eye: { s: 0.17, y: 0.35, d: 0.075 },
    HL: 0.3,
    fins: { pec: Pf(0.32, -0.25, 0.05, 0.16, 'round', -5, 20), pel: Pf(0.33, -0.92, 0.03, 0.13, 'tri', -45, 15), caudal: { type: 'truncate', span: 0.35, len: 0.18 } },
    swim: { mode: 'labriform' },
  },
  ray: {
    plan: 'ray',
    HL: 0.1,
    skin: { scales: 0, kind: 'placoid', bump: 0.6 },
    body: { D: 0.08, df: 0.6, pD: 0.35, pV: 0.35, P: 0.02, bD: 0.7, bV: 0.7, W: 1, sq: 2.1, tD: 1, tV: 1 },
    mouth: { gape: 0, kind: 'none' },
    eye: { s: 0.12, y: 0.9, d: 0.02, iris: '#3b3a2a' },
    fins: { caudal: { type: 'none', span: 0 }, alpha: 1 },
    swim: { mode: 'rajiform' },
  },
  flat: {
    plan: 'flatR',
    HL: 0.22,
    body: { D: 0.45, df: 0.5, pD: 0.42, pV: 0.45, P: 0.1, bD: 0.6, bV: 0.6, W: 0.18, sq: 2.2 },
    skin: { scales: 90, kind: 'ctenoid', bump: 0.4 },
    mouth: { s: 0.0, y: 0.1, gape: 0.04, angle: 30, tn: 8, ts: 0.003 },
    eye: { s: 0.09, y: 0.62, d: 0.04 },
    fins: { pec: Pf(0.22, 0.0, 0.03, 0.09, 'round', 0, 25), pel: Pf(0.2, -0.95, 0.02, 0.05, 'round', -30, 10), caudal: { type: 'rounded', span: 0.28, len: 0.2 }, alpha: 0.85 },
    swim: { mode: 'subcarangiform' },
  },
} satisfies Record<string, DeepPartial<Species>>;
