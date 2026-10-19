// A small model builder plus the parts rockets are made of: round tubes, nose cones,
// fins, nozzles, flames and parachutes. Units are model pixels; rockets stand on y = 0
// and point up (+y). The model faces -z.

const r = (n) => Math.round(n * 100) / 100;

export class Model {
  constructor() {
    this.bones = [];
  }

  /** Adds a bone; returns a handle with box() for adding cubes. */
  bone(name, parent, pivot, { rotation } = {}) {
    if (this.bones.some((b) => b.name === name)) throw new Error(`Duplicate bone ${name}`);
    const bone = { name, ...(parent ? { parent } : {}), pivot: pivot.map(r), cubes: [] };
    if (rotation) bone.rotation = rotation;
    this.bones.push(bone);
    return this.handle(bone);
  }

  get(name) {
    const bone = this.bones.find((b) => b.name === name);
    if (!bone) throw new Error(`No bone ${name}`);
    return this.handle(bone);
  }

  has(name) {
    return this.bones.some((b) => b.name === name);
  }

  handle(bone) {
    const h = {
      name: bone.name,
      /** origin and size in pixels; sizes are rounded to whole pixels (box UV needs them). */
      box(origin, size, mat, opts = {}) {
        const cube = { origin: origin.map(r), size: size.map((n) => Math.max(0, Math.round(n))), mat };
        if (opts.inflate) cube.inflate = opts.inflate;
        if (opts.rotation) {
          cube.rotation = opts.rotation;
          cube.pivot = (opts.pivot ?? origin.map((o, i) => o + size[i] / 2)).map(r);
        }
        bone.cubes.push(cube);
        return h;
      },
    };
    return h;
  }

  build() {
    return { bones: this.bones.map(({ cubes, ...b }) => (cubes.length ? { ...b, cubes } : b)) };
  }
}

/**
 * A round tube along y, centred on x = z = 0: a square with its corners cut off
 * (three boxes that don't overlap, so no faces fight). r is the radius in pixels.
 */
export function tube(b, { r: radius, y, h, mat }) {
  const k = radius >= 3 ? Math.max(1, Math.round(radius * 0.3)) : 0;
  if (!k) return b.box([-radius, y, -radius], [2 * radius, h, 2 * radius], mat);
  b.box([-radius, y, -radius + k], [2 * radius, h, 2 * radius - 2 * k], mat);
  b.box([-radius + k, y, -radius], [2 * radius - 2 * k, h, k], mat);
  b.box([-radius + k, y, radius - k], [2 * radius - 2 * k, h, k], mat);
  return b;
}

/** A nose cone from radius r at y up to a point at y + h, in `steps` stacked rings. */
export function noseCone(b, { r: radius, y, h, steps = 4, mat }) {
  const heights = Array.from({ length: steps }, (_, i) => Math.floor(((i + 1) * h) / steps) - Math.floor((i * h) / steps));
  let at = y;
  heights.forEach((hi, i) => {
    const ri = Math.max(1, Math.round(radius * (1 - i / steps)));
    if (hi > 0) tube(b, { r: ri, y: at, h: hi, mat });
    at += hi;
  });
  return at;
}

/**
 * n fins (3 or 4) round a tube of radius r, from y up to y + h, reaching `span` pixels out.
 * Each fin is swept: full span at the bottom, half span at the top.
 */
export function fins(b, { r: radius, y, h, span, mat, n = 4 }) {
  const low = Math.ceil(h / 2), high = h - low;
  const half = Math.max(1, Math.ceil(span / 2));
  const dirs = n === 3 ? [[0, -1], [1, 1], [-1, 1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dz] of dirs.slice(0, 4)) {
    if (dz === 0) {
      const x0 = dx > 0 ? radius - 1 : -radius + 1 - span;
      const xh = dx > 0 ? radius - 1 : -radius + 1 - half;
      b.box([x0, y, -0.5], [span, low, 1], mat);
      if (high) b.box([xh, y + low, -0.5], [half, high, 1], mat);
    } else if (dx === 0) {
      const z0 = dz > 0 ? radius - 1 : -radius + 1 - span;
      const zh = dz > 0 ? radius - 1 : -radius + 1 - half;
      b.box([-0.5, y, z0], [1, low, span], mat);
      if (high) b.box([-0.5, y + low, zh], [1, high, half], mat);
    } else {
      // Three fins: the two back ones are turned 45 degrees round y.
      const x = dx * (radius - 1 + span / 2) * 0.7, z = dz * (radius - 1 + span / 2) * 0.7;
      const rot = [0, dx * dz > 0 ? -45 : 45, 0];
      b.box([x - span / 2, y, z - 0.5], [span, low, 1], mat, { rotation: rot, pivot: [x, y, z] });
      if (high) b.box([x - half / 2, y + low, z - 0.5], [half, high, 1], mat, { rotation: rot, pivot: [x, y, z] });
    }
  }
  return b;
}

/** An engine bell under the rocket: wider at the bottom. Returns the y of its mouth. */
export function nozzleBell(b, { r: radius, y, h, x = 0, z = 0, mat = 'nozzle' }) {
  const lower = Math.ceil(h / 2);
  b.box([x - radius, y, z - radius], [2 * radius, lower, 2 * radius], mat);
  const ru = Math.max(1, radius - 1);
  b.box([x - ru, y + lower, z - ru], [2 * ru, h - lower, 2 * ru], mat);
  return y;
}

/**
 * The exhaust flame on its own bone (shown only while the engine burns): an outer
 * flame `len` pixels long under the nozzle mouth at y, and a narrower tip below it.
 */
export function flame(m, parent, { y, r: radius, len, name = 'flame', x = 0, z = 0 }) {
  const b = m.bone(name, parent, [x, y, z]);
  const tipLen = Math.round(len * 0.6);
  b.box([x - radius, y - len, z - radius], [2 * radius, len, 2 * radius], 'flame');
  const rt = Math.max(1, radius - 1);
  b.box([x - rt, y - len - tipLen, z - rt], [2 * rt, tipLen, 2 * rt], 'flame');
  return b;
}

/**
 * A parachute canopy on its own bone: a dome `r` pixels wide `lift` pixels above y,
 * with four risers down to y. Hidden until the rocket pops it (see the animations).
 */
export function chute(m, parent, { y, r: radius, lift, name = 'chute' }) {
  const b = m.bone(name, parent, [0, y, 0]);
  const top = y + lift;
  tube(b, { r: radius, y: top, h: 2, mat: 'canopy' });
  tube(b, { r: Math.max(2, radius - 3), y: top + 2, h: 2, mat: 'canopy' });
  tube(b, { r: Math.max(1, radius - 7), y: top + 4, h: 1, mat: 'canopy' });
  // Risers from the canopy edge down to the rocket.
  const e = Math.max(1, Math.round(radius * 0.55));
  for (const [x, z] of [[e, 0], [-e, 0], [0, e], [0, -e]]) b.box([x - 0.5, y, z - 0.5], [1, lift, 1], 'rope');
  return b;
}
