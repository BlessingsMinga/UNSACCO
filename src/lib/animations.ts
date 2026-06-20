/**
 * Lightweight Lottie animation assets (inline JSON data).
 * These are designed to be used with lottie-react.
 * Each animation is a minimal valid Lottie JSON object.
 */

// ── Success / checkmark animation ──────────────────────────────────────────
export const SUCCESS_ANIMATION: Record<string, unknown> = {
  v: "5.5.0",
  fr: 30,
  ip: 0,
  op: 30,
  w: 100,
  h: 100,
  nm: "Checkmark",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 0,
      ty: 4,
      nm: "Checkmark",
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [0] }, { t: 15, s: [100] }] },
        p: { a: 0, k: [50, 50, 0] },
        s: { a: 1, k: [{ t: 0, s: [0, 0, 100] }, { t: 15, s: [100, 100, 100] }] },
      },
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [60, 60] } },
            { ty: "st", c: { a: 0, k: [0.3, 0.8, 0.4, 1] }, w: 4, lc: 1, lj: 1 },
            { ty: "fl", c: { a: 0, k: [0.9, 1, 0.95, 1] } },
          ],
        },
      ],
    },
  ],
};

// ── Loading / spinner animation ────────────────────────────────────────────
export const LOADING_ANIMATION: Record<string, unknown> = {
  v: "5.5.0",
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  nm: "Loading",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 0,
      ty: 4,
      nm: "Spinner",
      sr: 1,
      ks: {
        o: { a: 0, k: [100] },
        p: { a: 0, k: [50, 50, 0] },
        r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [360] }] },
      },
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [20, 20] } },
            { ty: "st", c: { a: 0, k: [0.55, 0.13, 0.64, 1] }, w: 4, lc: 1, lj: 1, d: [8, 4] },
          ],
        },
      ],
    },
  ],
};

// ── Savings / piggy bank animation ─────────────────────────────────────────
export const SAVINGS_ANIMATION: Record<string, unknown> = {
  v: "5.5.0",
  fr: 30,
  ip: 0,
  op: 45,
  w: 120,
  h: 120,
  nm: "Savings",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 0,
      ty: 4,
      nm: "Coin stack",
      sr: 1,
      ks: {
        p: { a: 0, k: [60, 60, 0] },
        s: { a: 1, k: [{ t: 0, s: [80, 80, 100] }, { t: 10, s: [100, 100, 100] }, { t: 20, s: [95, 95, 100] }] },
      },
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [40, 40] } },
            { ty: "fl", c: { a: 0, k: [0.78, 0.16, 0.35, 1] } },
            { ty: "el", p: { a: 0, k: [0, -8] }, s: { a: 0, k: [36, 36] } },
            { ty: "fl", c: { a: 0, k: [0.85, 0.25, 0.4, 1] } },
          ],
        },
      ],
    },
  ],
};

// ── Growth / trending up animation ─────────────────────────────────────────
export const GROWTH_ANIMATION: Record<string, unknown> = {
  v: "5.5.0",
  fr: 30,
  ip: 0,
  op: 60,
  w: 120,
  h: 120,
  nm: "Growth",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 0,
      ty: 4,
      nm: "Arrow up",
      sr: 1,
      ks: {
        p: { a: 0, k: [60, 60, 0] },
        s: { a: 1, k: [{ t: 0, s: [0, 0, 100] }, { t: 20, s: [110, 110, 100] }, { t: 30, s: [100, 100, 100] }] },
      },
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "sh",
              ks: { a: 0, k: { v: [[0, 20], [20, -10], [40, 20]], i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]] } },
            },
            { ty: "st", c: { a: 0, k: [0.3, 0.8, 0.4, 1] }, w: 4, lc: 2, lj: 2 },
          ],
        },
      ],
    },
  ],
};

// ── Security / shield animation ────────────────────────────────────────────
export const SECURITY_ANIMATION: Record<string, unknown> = {
  v: "5.5.0",
  fr: 30,
  ip: 0,
  op: 40,
  w: 100,
  h: 100,
  nm: "Security",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 0,
      ty: 4,
      nm: "Shield pulse",
      sr: 1,
      ks: {
        p: { a: 0, k: [50, 50, 0] },
        s: { a: 1, k: [{ t: 0, s: [90, 90, 100] }, { t: 20, s: [105, 105, 100] }, { t: 40, s: [90, 90, 100] }] },
      },
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "sh", ks: { a: 0, k: { v: [[50, 10], [80, 22], [80, 50], [50, 80], [20, 50], [20, 22]], i: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]] } } },
            { ty: "fl", c: { a: 0, k: [0.55, 0.13, 0.64, 0.2] } },
            { ty: "st", c: { a: 0, k: [0.55, 0.13, 0.64, 1] }, w: 3, lc: 1, lj: 1 },
          ],
        },
      ],
    },
  ],
};

// ── People / community animation ───────────────────────────────────────────
export const COMMUNITY_ANIMATION: Record<string, unknown> = {
  v: "5.5.0",
  fr: 30,
  ip: 0,
  op: 50,
  w: 100,
  h: 100,
  nm: "Community",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 0,
      ty: 4,
      nm: "People",
      sr: 1,
      ks: {
        p: { a: 0, k: [50, 50, 0] },
        s: { a: 1, k: [{ t: 0, s: [95, 95, 100] }, { t: 25, s: [105, 105, 100] }, { t: 50, s: [95, 95, 100] }] },
      },
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "el", p: { a: 0, k: [-15, -8] }, s: { a: 0, k: [16, 16] } },
            { ty: "el", p: { a: 0, k: [15, -8] }, s: { a: 0, k: [16, 16] } },
            { ty: "fl", c: { a: 0, k: [0.55, 0.13, 0.64, 1] } },
          ],
        },
      ],
    },
  ],
};