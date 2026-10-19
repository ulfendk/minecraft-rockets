// Material recipes for rockets: glossy paint, bare metal, nozzles, plastic bottles,
// glass, flames and parachute silk. Each returns a { base, layers } material for paintTexture().
import { fur, hex, mix, mottle, shade } from './texture.mjs';

export const PALETTE = {
  white: '#ecebe6',
  red: '#d23a2a',
  orange: '#e8771e',
  yellow: '#f2c230',
  blue: '#2f6cc2',
  navy: '#1c2b57',
  steel: '#8d949a',
  dark: '#2c2e30',
  black: '#1b1c1d',
  silver: '#c9d0d4',
  green: '#4f9a3a',
};

/** Darkens the edge texels of each face a little, so panels read as separate parts. */
const edges = (amount = 0.1) => (c, { i, j, fw, fh }) => {
  const edge = Math.min(i, j, fw - 1 - i, fh - 1 - j);
  return edge === 0 && fw > 2 && fh > 2 ? shade(c, 1 - amount) : c;
};

/** Painted rocket skin: clean paint with faint panel lines every `panel` pixels. */
export const paint = (color, { panel = 8 } = {}) => ({
  base: color,
  layers: [mottle(0.03, { scale: 10 }), fur(0.02), (c, { p }) => (Math.floor(p[1] + 1000) % panel === 0 ? shade(c, 0.9) : c), edges(0.06)],
});

/** Black-and-white roll pattern (like the big moon rockets) in quarters round the body. */
export const rollPattern = (a = PALETTE.white, b = PALETTE.black, { from = 0, to = 999 } = {}) => ({
  base: a,
  layers: [
    (c, { p }) => {
      if (p[1] < from || p[1] > to) return c;
      const q = (p[0] >= 0) === (p[2] >= 0);
      return q ? hex(b) : c;
    },
    fur(0.02),
    edges(0.05),
  ],
});

/** Painted with a band of a second colour between two heights. */
export const banded = (color, band, { from, to }) => ({
  base: color,
  layers: [(c, { p }) => (p[1] >= from && p[1] < to ? hex(band) : c), mottle(0.03, { scale: 10 }), fur(0.02), edges(0.06)],
});

export const metal = (color = PALETTE.steel) => ({ base: color, layers: [fur(0.06), mottle(0.05)], shading: 0.18 });

export const chrome = () => ({ base: PALETTE.silver, layers: [fur(0.05)], shading: 0.25 });

/** Rocket nozzle: dark metal, scorched towards the bottom. */
export const nozzle = () => ({
  base: '#4a4d52',
  shading: 0.2,
  layers: [fur(0.06), (c, { p }) => mix(c, hex('#1e1b18'), Math.max(0, 0.6 - p[1] / 10))],
});

/** Heat shield and scorched underside. */
export const heatShield = () => ({ base: '#5a3e2b', layers: [fur(0.1), mottle(0.15, { scale: 3 })], shading: 0.1 });

/** A clear plastic bottle: see-through blue-green with a highlight stripe. */
export const bottle = () => ({
  base: '#bfe3eab0',
  shading: 0.05,
  layers: [(c, { i, fw, face }) => ((face === 'front' || face === 'left') && i === Math.floor(fw / 3) ? hex('#f4ffffd0') : c)],
});

export const water = () => ({ base: '#3f76e4c0', layers: [fur(0.04)], shading: 0.05 });

export const glass = () => ({ base: '#a8d4e6a0', layers: [(c, { i, j }) => ((i + j) % 7 === 0 ? shade(c, 1.25) : c)], shading: 0.05 });

/** Cardboard fins for the water bottle rocket. */
export const cardboard = (color = '#e0a33a') => ({ base: color, layers: [fur(0.08), (c, { j }) => (j % 3 === 0 ? shade(c, 0.93) : c)], shading: 0.08 });

/** Flames: white-yellow core, orange and red towards the tip (which points down, -y). */
export const flame = () => ({
  base: '#fff3a0',
  shading: 0,
  layers: [(c, { p, cube }) => {
    const top = cube.origin[1] + cube.size[1];
    const t = Math.min(1, (top - p[1]) / Math.max(1, cube.size[1]));
    return t < 0.3 ? hex('#fff6c8') : t < 0.6 ? hex('#ffc23a') : t < 0.85 ? hex('#ff7a1a') : hex('#e2401c');
  }],
});

/** A water jet: white spray at the nozzle, blue towards the tip. */
export const spray = () => ({
  base: '#f0fbffd0',
  shading: 0,
  layers: [(c, { p, cube, i, j }) => {
    const top = cube.origin[1] + cube.size[1];
    const t = Math.min(1, (top - p[1]) / Math.max(1, cube.size[1]));
    const base = t < 0.4 ? '#f4fdffe0' : t < 0.75 ? '#a9d8f5c8' : '#5aa7e6b0';
    return (i + j) % 3 === 0 ? shade(hex(base), 1.08) : hex(base);
  }],
});

/** Parachute canopy: red and white gores around the middle. */
export const canopy = (a = PALETTE.red, b = PALETTE.white) => ({
  base: a,
  shading: 0.1,
  layers: [(c, { p }) => {
    const angle = Math.atan2(p[2], p[0]);
    return Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 8) % 2 ? hex(b) : c;
  }, fur(0.03)],
});

export const rope = () => ({ base: '#e9e2cf', shading: 0.05 });

export const lamp = (color = '#fff1b0') => ({ base: color, shading: 0 });

export const seat = () => ({ base: '#3b3b3b', layers: [fur(0.06)], shading: 0.15 });

/** Yellow and black diagonal warning stripes. */
export const hazard = (period = 4) => ({
  base: PALETTE.yellow,
  shading: 0.1,
  layers: [(c, { p }) => (((Math.floor((p[0] + p[1] + p[2]) / (period / 2)) % 2) + 2) % 2 ? hex(PALETTE.black) : c)],
});

/** The materials every rocket shares; rockets add their own paint. */
export function commonMaterials() {
  return {
    metal: metal(),
    dark: metal('#3a3d40'),
    chrome: chrome(),
    nozzle: nozzle(),
    shield: heatShield(),
    glass: glass(),
    flame: flame(),
    canopy: canopy(),
    rope: rope(),
    seat: seat(),
    lamp: lamp(),
    red: paint(PALETTE.red),
    white: paint(PALETTE.white),
    black: paint(PALETTE.black),
    stripe: hazard(),
  };
}
