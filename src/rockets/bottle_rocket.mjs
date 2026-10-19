import { fins, flame, Model, noseCone, tube } from '../lib/parts.mjs';
import { bottle, cardboard, commonMaterials, paint, PALETTE, spray, water } from '../lib/materials.mjs';

// An upside-down plastic bottle with a cap for a nozzle, cardboard fins and a paper
// nose cone. Fill it with water, pump it up and let go.
const m = new Model();
const root = m.bone('root', null, [0, 0, 0]);
fins(root, { r: 3, y: 0, h: 7, span: 3, mat: 'fin' });
root.box([-1, 1, -1], [2, 2, 2], 'cap'); // the cap is the nozzle
tube(root, { r: 2, y: 3, h: 2, mat: 'bottle' }); // neck and shoulder
tube(root, { r: 3, y: 5, h: 10, mat: 'bottle' });
noseCone(root, { r: 3, y: 15, h: 6, steps: 3, mat: 'nose' });
// The water inside, seen through the bottle (shown while it is filled).
tube(m.bone('water', 'root', [0, 5, 0]), { r: 2, y: 5, h: 5, mat: 'water' });
// Not a flame: the water jet.
flame(m, 'root', { y: 1, r: 1, len: 6 });

export default {
  id: 'bottle_rocket',
  name: 'Water Bottle Rocket',
  group: 'toy',
  info: 'A plastic bottle with fins. Fill it with a water bucket, then right-click it with an empty hand to pump it up. Pump past full pressure and it shoots up in a spray of water. More pressure flies higher, and without water it barely leaves the ground.',
  scale: 1,
  hitbox: { width: 0.5, height: 1.3 },
  health: 4,
  seats: [],
  exhaust: 1,
  fuel: { item: 'minecraft:water_bucket', amount: 1, kind: 'water' },
  launch: { pump: true },
  flight: {
    thrust: 0.12, maxSpeed: 1.2, gravity: 0.06, maxFall: 1.2,
    pressure: { water: 3, dry: 1 },
    chute: false, chuteFast: 0, chuteSlow: 0, slowBelow: 0, countdown: 0,
  },
  visuals: [{ bone: 'water', prop: 'scale', axis: -1, expr: '$water' }],
  recipe: { pattern: [' R ', ' B ', 'P P'], key: { R: 'red_dye', B: 'glass_bottle', P: 'paper' } },
  icon: {
    rows: [
      '.......rr.......',
      '......rrrr......',
      '......rrrr......',
      '.....bbbbbb.....',
      '.....bwbbbb.....',
      '.....bwbbbb.....',
      '.....bwbbbb.....',
      '.....bwllll.....',
      '.....bwllll.....',
      '.....bllllll....',
      '..o..bllllll.o..',
      '..oo..bbbb..oo..',
      '..ooo..bb..ooo..',
      '..oooo.cc.oooo..',
      '..oooo.cc.oooo..',
      '................',
    ],
    palette: { r: PALETTE.red, b: '#bfe3ea', w: '#f4ffff', l: '#3f76e4', o: '#e0a33a', c: '#f4f4f4' },
  },
  model: m.build(),
  materials: {
    ...commonMaterials(),
    bottle: bottle(),
    water: water(),
    fin: cardboard(),
    cap: paint('#f4f4f4'),
    nose: paint(PALETTE.red),
    flame: spray(),
  },
};
