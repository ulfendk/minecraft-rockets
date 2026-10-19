import { chute, fins, flame, Model, noseCone, nozzleBell, tube } from '../lib/parts.mjs';
import { banded, commonMaterials, PALETTE } from '../lib/materials.mjs';

// A hobby model rocket: a slim paper tube, red fins and nose, a gunpowder motor and a
// little parachute that pops out of the nose at the top.
const m = new Model();
const root = m.bone('root', null, [0, 0, 0]);
fins(root, { r: 2, y: 0, h: 8, span: 4, mat: 'red' });
nozzleBell(root, { r: 1, y: 1, h: 2 });
tube(root, { r: 2, y: 3, h: 19, mat: 'body' });
noseCone(root, { r: 2, y: 22, h: 7, steps: 3, mat: 'red' });
chute(m, 'root', { y: 29, r: 9, lift: 7 });
flame(m, 'root', { y: 1, r: 1, len: 8 });

export default {
  id: 'model_rocket',
  name: 'Model Rocket',
  group: 'toy',
  info: 'A model rocket with a gunpowder motor. Load it with gunpowder and light it with flint and steel: three seconds later it shoots 48 blocks up, pops its parachute and floats back down, ready to fly again.',
  scale: 1,
  hitbox: { width: 0.4, height: 1.8 },
  health: 4,
  seats: [],
  exhaust: 1,
  fuel: { item: 'minecraft:gunpowder', amount: 1, kind: 'gunpowder' },
  launch: { fuse: 'minecraft:flint_and_steel' },
  flight: {
    thrust: 0.1, maxSpeed: 1.4, gravity: 0.05, maxFall: 1.5, apex: 48,
    chute: true, chuteFast: 0.35, chuteSlow: 0.12, slowBelow: 8, countdown: 60,
  },
  recipe: { pattern: [' R ', 'PIP', 'P P'], key: { R: 'red_dye', P: 'paper', I: 'iron_ingot' } },
  icon: {
    rows: [
      '.......r........',
      '......rrr.......',
      '......rrr.......',
      '......www.......',
      '......www.......',
      '......rrr.......',
      '......www.......',
      '......www.......',
      '......www.......',
      '......www.......',
      '.....rwwwr......',
      '....rrwwwrr.....',
      '....rr.k.rr.....',
      '.......o........',
      '.......y........',
      '................',
    ],
    palette: { r: PALETTE.red, w: PALETTE.white, k: '#3a3a3a', o: '#ff7a1a', y: '#ffd23a' },
  },
  model: m.build(),
  materials: { ...commonMaterials(), body: banded(PALETTE.white, PALETTE.red, { from: 15, to: 17 }) },
};
