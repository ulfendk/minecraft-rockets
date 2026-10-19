// Blocks: the launch pad rockets stand on, and Mission Control, which counts down and
// launches every rocket on a pad nearby.
import { PNG } from 'pngjs';
import { hex, shade } from './lib/texture.mjs';
import { NS } from './lib/constants.mjs';

function texture(fn) {
  const png = new PNG({ width: 16, height: 16 });
  png.data.fill(0);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) png.data.set(hex(fn(x, y)), (y * 16 + x) * 4);
  return PNG.sync.write(png);
}

const hazard = (x, y) => (Math.floor((x + y) / 2) % 2 ? '#1b1c1d' : '#f2c230');

/** Steel deck plate with a flame hole in the middle and a hazard-striped rim. */
const padTop = texture((x, y) => {
  const edge = x < 2 || y < 2 || x > 13 || y > 13;
  if (edge) return hazard(x, y);
  const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
  if (d < 2) return '#1e1b18';
  if (d < 3) return '#4a4d52';
  return (x + y) % 4 === 0 ? '#9aa1a7' : (x * 3 + y) % 7 === 0 ? '#7a8086' : '#8d949a';
});
const padSide = texture((x, y) => (y < 12 ? '#00000000' : y === 12 ? '#6d7379' : hazard(x, y)));

/** Console top: a screen with a rocket trajectory, buttons and a big red launch button. */
const consoleTop = texture((x, y) => {
  if (x === 0 || y === 0 || x === 15 || y === 15) return '#3a3d40';
  if (y >= 2 && y <= 8 && x >= 2 && x <= 13) {
    if (x === 2 || x === 13 || y === 2 || y === 8) return '#1f2326';
    const curve = Math.round(7 - ((x - 3) * (13 - x)) / 6);
    if (y === curve) return '#7dff8a';
    return (x + y) % 5 === 0 ? '#17402a' : '#0e2a1b';
  }
  if (y >= 10 && y <= 13 && x >= 10 && x <= 13) return (x === 10 || x === 13) && (y === 10 || y === 13) ? '#5a5d60' : '#e2401c';
  if (y === 11 || y === 12) return x % 3 === 2 ? ['#f2c230', '#2f6cc2', '#4f9a3a'][Math.floor(x / 3) % 3] : '#5a5d60';
  return '#5a5d60';
});
const consoleSide = texture((x, y) => {
  if (x === 0 || x === 15 || y === 0 || y === 15) return '#3a3d40';
  if (y === 3 && x > 2 && x < 13) return x % 2 ? '#f2c230' : '#7dff8a';
  if (y >= 6 && y <= 12 && x >= 3 && x <= 12) return (x + y) % 2 ? '#4a4d52' : '#43464a';
  return shade(hex('#6d7379'), y < 4 ? 1.1 : 1);
});

const faceUV = (sides) => Object.fromEntries(['north', 'south', 'east', 'west', 'up', 'down'].map((f) => [
  f, { uv: [0, ['up', 'down'].includes(f) ? 0 : 16 - sides], uv_size: [16, ['up', 'down'].includes(f) ? 16 : sides] },
]));

export const blocks = [
  {
    id: 'launch_pad',
    name: 'Launch Pad',
    sound: 'metal',
    // Bedrock: one texture per face group, keyed by material instance.
    textures: { top: padTop, side: padSide },
    height: 4,
    recipe: { pattern: ['YBY', 'III'], key: { Y: 'yellow_dye', B: 'black_dye', I: 'iron_ingot' } },
    geometry: {
      format_version: '1.12.0',
      'minecraft:geometry': [{
        description: { identifier: `geometry.${NS}.launch_pad`, texture_width: 16, texture_height: 16 },
        bones: [{ name: 'pad', pivot: [0, 0, 0], cubes: [{ origin: [-8, 0, -8], size: [16, 4, 16], uv: faceUV(4) }] }],
      }],
    },
    components: {
      'minecraft:collision_box': { origin: [-8, 0, -8], size: [16, 4, 16] },
      'minecraft:selection_box': { origin: [-8, 0, -8], size: [16, 4, 16] },
      'minecraft:light_dampening': 0,
      'minecraft:destructible_by_mining': { seconds_to_destroy: 1.5 },
      'minecraft:destructible_by_explosion': { explosion_resistance: 30 },
      'minecraft:map_color': '#f2c230',
    },
    instances: { '*': 'side', up: 'top', down: 'top' },
  },
  {
    id: 'mission_control',
    name: 'Mission Control',
    sound: 'metal',
    textures: { top: consoleTop, side: consoleSide },
    height: 16,
    recipe: { pattern: ['GGG', 'RCR', 'III'], key: { G: 'glass_pane', R: 'redstone', C: 'clock', I: 'iron_ingot' } },
    geometry: null,
    components: {
      'minecraft:destructible_by_mining': { seconds_to_destroy: 1.5 },
      'minecraft:destructible_by_explosion': { explosion_resistance: 6 },
      'minecraft:light_emission': 6,
      'minecraft:map_color': '#5a5d60',
      // Right-click to start (or abort) the countdown (scripts/mission.js).
      [`${NS}:mission_control`]: {},
    },
    instances: { '*': 'side', up: 'top' },
  },
];

/** Bedrock block definition. */
export function blockDefinition(block) {
  const instances = Object.fromEntries(Object.entries(block.instances).map(([face, tex]) => [
    face, { texture: `${NS}_${block.id}_${tex}`, render_method: 'alpha_test', ambient_occlusion: block.height === 16 },
  ]));
  return {
    format_version: '1.21.90',
    'minecraft:block': {
      description: { identifier: `${NS}:${block.id}`, menu_category: { category: 'items' } },
      components: {
        'minecraft:geometry': block.geometry ? `geometry.${NS}.${block.id}` : 'minecraft:geometry.full_block',
        'minecraft:material_instances': instances,
        'minecraft:display_name': `tile.${NS}:${block.id}.name`,
        ...block.components,
      },
    },
  };
}
