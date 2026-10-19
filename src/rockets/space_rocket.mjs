import { chute, fins, flame, Model, noseCone, nozzleBell, tube } from '../lib/parts.mjs';
import { commonMaterials, paint, PALETTE, rollPattern } from '../lib/materials.mjs';

// A two-stage space rocket in black and white with a capsule for four on top and an
// escape tower. It only lifts off from a launch pad and flies to the edge of the sky.
const m = new Model();
const root = m.bone('root', null, [0, 0, 0]);
fins(root, { r: 8, y: 0, h: 20, span: 7, mat: 'black' });
const engines = [[-3, -3], [3, -3], [-3, 3], [3, 3]];
for (const [x, z] of engines) nozzleBell(root, { r: 2, y: 2, h: 4, x, z });
tube(root, { r: 8, y: 6, h: 42, mat: 'stage' });
tube(root, { r: 8, y: 48, h: 2, mat: 'dark' }); // interstage
tube(root, { r: 7, y: 50, h: 10, mat: 'white' });
tube(root, { r: 7, y: 60, h: 2, mat: 'metal' }); // capsule floor
tube(root, { r: 7, y: 62, h: 8, mat: 'glass' }); // windows all round
noseCone(root, { r: 7, y: 70, h: 6, steps: 3, mat: 'capsule' });
tube(root, { r: 1, y: 76, h: 8, mat: 'red' }); // escape tower
root.box([-0.5, 84, -0.5], [1, 2, 1], 'red');
chute(m, 'root', { y: 86, r: 20, lift: 14 });
engines.forEach(([x, z], i) => flame(m, 'root', { name: `flame_${i}`, y: 2, r: 2, len: 18, x, z }));

export default {
  id: 'space_rocket',
  name: 'Space Rocket',
  group: 'ride',
  info: 'A big two-stage rocket with a capsule for four. Place it on a launch pad, load four rocket fuel and climb in. Press Jump (or start Mission Control) and it flies all the way to the edge of the sky. At the top everyone jumps out and parachutes home.',
  scale: 2,
  hitbox: { width: 2.0, height: 10.0 },
  health: 40,
  camera: 16,
  seats: [{ at: [2.5, 62, 2.5] }, { at: [-2.5, 62, 2.5] }, { at: [2.5, 62, -2.5] }, { at: [-2.5, 62, -2.5] }],
  exhaust: 2,
  fuel: { item: 'rockets:rocket_fuel', amount: 4, kind: 'fuel' },
  launch: { jump: true, pad: true },
  flight: {
    thrust: 0.05, maxSpeed: 2.5, gravity: 0.05, maxFall: 3, apex: 'limit',
    chute: true, chuteFast: 0.6, chuteSlow: 0.15, slowBelow: 16, countdown: 100,
  },
  recipe: { pattern: [' G ', 'IRI', 'BTB'], key: { G: 'glass', I: 'iron_block', R: 'redstone_block', B: 'blast_furnace', T: 'tnt' } },
  icon: {
    rows: [
      '.......r........',
      '.......r........',
      '......sss.......',
      '.....sgggs......',
      '.....wwwww......',
      '.....wwwww......',
      '.....kkkkk......',
      '.....wwkkw......',
      '.....wwkkw......',
      '.....kkwwk......',
      '.....kkwwk......',
      '....kwwwwwk.....',
      '...kkwwwwwkk....',
      '...kk.n.n.kk....',
      '......o.o.......',
      '......y.y.......',
    ],
    palette: { r: PALETTE.red, s: PALETTE.silver, g: '#a8d4e6', w: PALETTE.white, k: PALETTE.black, n: '#3a3a3a', o: '#ff7a1a', y: '#ffd23a' },
  },
  model: m.build(),
  materials: {
    ...commonMaterials(),
    stage: rollPattern(PALETTE.white, PALETTE.black, { from: 30, to: 48 }),
    capsule: paint(PALETTE.silver),
  },
};
