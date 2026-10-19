import { chute, fins, flame, Model, noseCone, nozzleBell, tube } from '../lib/parts.mjs';
import { banded, commonMaterials, PALETTE } from '../lib/materials.mjs';

// A one-seat rocket with a glass cockpit at the top. Climb in, press Jump and go up
// about a hundred blocks; at the top you drift back down under a parachute.
const m = new Model();
const root = m.bone('root', null, [0, 0, 0]);
fins(root, { r: 6, y: 0, h: 16, span: 6, mat: 'red' });
nozzleBell(root, { r: 3, y: 1, h: 4 });
tube(root, { r: 6, y: 5, h: 31, mat: 'body' });
tube(root, { r: 6, y: 36, h: 1, mat: 'metal' }); // cockpit floor
root.box([-3, 37, -2], [6, 2, 5], 'seat');
root.box([-3, 39, 2], [6, 7, 1], 'seat'); // backrest
// Glass all round, with corner posts.
root.box([-5, 37, -6], [10, 20, 1], 'glass')
  .box([-5, 37, 5], [10, 20, 1], 'glass')
  .box([-6, 37, -5], [1, 20, 10], 'glass')
  .box([5, 37, -5], [1, 20, 10], 'glass');
for (const [x, z] of [[-6, -6], [5, -6], [-6, 5], [5, 5]]) root.box([x, 37, z], [1, 20, 1], 'metal');
noseCone(root, { r: 6, y: 57, h: 7, steps: 3, mat: 'red' });
chute(m, 'root', { y: 64, r: 16, lift: 12 });
flame(m, 'root', { y: 1, r: 3, len: 14 });

export default {
  id: 'sky_rocket',
  name: 'Sky Rocket',
  group: 'ride',
  info: 'A rocket for one with a glass cockpit. Fill it with rocket fuel, climb in and press Jump: after a three-second countdown it flies you about a hundred blocks up. At the top you jump out with a parachute and float down, steering as you go.',
  scale: 1,
  hitbox: { width: 0.9, height: 4.0 },
  health: 20,
  camera: 10,
  seats: [{ at: [0, 39, 0] }],
  exhaust: 1,
  fuel: { item: 'rockets:rocket_fuel', amount: 1, kind: 'fuel' },
  launch: { jump: true },
  flight: {
    thrust: 0.06, maxSpeed: 1.5, gravity: 0.05, maxFall: 2, apex: 96,
    chute: true, chuteFast: 0.5, chuteSlow: 0.15, slowBelow: 16, countdown: 60,
  },
  recipe: { pattern: [' G ', 'IWI', 'IBI'], key: { G: 'glass', I: 'iron_ingot', W: 'white_wool', B: 'blast_furnace' } },
  icon: {
    rows: [
      '.......rr.......',
      '......rrrr......',
      '.....rrrrrr.....',
      '.....gggggg.....',
      '.....gkkkkg.....',
      '.....gkkkkg.....',
      '.....wwwwww.....',
      '.....wwwwww.....',
      '.....rrrrrr.....',
      '.....wwwwww.....',
      '.....wwwwww.....',
      '...r.wwwwww.r...',
      '..rr.wwwwww.rr..',
      '..rrr.kkkk.rrr..',
      '..rrr.oyyo.rrr..',
      '.......oo.......',
    ],
    palette: { r: PALETTE.red, w: PALETTE.white, g: '#a8d4e6', k: '#3a3a3a', o: '#ff7a1a', y: '#ffd23a' },
  },
  model: m.build(),
  materials: { ...commonMaterials(), body: banded(PALETTE.white, PALETTE.red, { from: 26, to: 30 }) },
};
