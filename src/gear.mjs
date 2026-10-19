// Gear models: the parachute players hang under, and the jetpack they wear on their back.
import { PNG } from 'pngjs';
import { canopy, commonMaterials, metal, PALETTE, paint, rope } from './lib/materials.mjs';
import { Model, tube } from './lib/parts.mjs';
import { hex, shade } from './lib/texture.mjs';
import { buildGeometry } from './lib/model.mjs';
import { paintTexture } from './lib/texture.mjs';
import { NS } from './lib/constants.mjs';

// ------------------------------------------------------------ parachute
// The entity sits at the rider's seat; the canopy floats about two and a half blocks up.
const p = new Model();
p.bone('root', null, [0, 0, 0]).box([-4, 22, -1], [8, 1, 2], 'dark'); // harness bar over the shoulders
const sway = p.bone('canopy', 'root', [0, 22, 0]);
tube(sway, { r: 14, y: 42, h: 2, mat: 'canopy' });
tube(sway, { r: 11, y: 44, h: 2, mat: 'canopy' });
tube(sway, { r: 6, y: 46, h: 1, mat: 'canopy' });
for (const [x, z] of [[-9, -4], [9, -4], [-9, 4], [9, 4]]) sway.box([x - 0.5, 23, z - 0.5], [1, 19, 1], 'rope');

export const parachute = {
  id: 'parachute',
  name: 'Parachute',
  scale: 1,
  model: p.build(),
  materials: { ...commonMaterials(), canopy: canopy(), rope: rope() },
  visuals: [
    { bone: 'canopy', prop: 'rotation', axis: 2, expr: 'math.sin($time * 90) * 4' },
    { bone: 'canopy', prop: 'rotation', axis: 0, expr: 'math.cos($time * 70) * 3' },
  ],
};

// ------------------------------------------------------------ jetpack
// Bedrock: an attachable whose bone "body" follows the player's body. The player's body
// is x -4..4, y 12..24, z -2..2 and faces -z, so the back is +z.
const j = new Model();
const body = j.bone('body', null, [0, 24, 0]);
for (const x of [-4, 1]) {
  body.box([x, 13, 2], [3, 9, 3], 'tank');
  body.box([x + 0.5, 22, 2.5], [2, 1, 2], 'tank'); // rounded tops
  body.box([x + 0.5, 11, 2.5], [2, 2, 2], 'nozzle');
}
body.box([-1, 14, 2], [2, 8, 2], 'metal'); // the pack between the tanks
body.box([-3, 12, -3], [1, 12, 1], 'strap').box([2, 12, -3], [1, 12, 1], 'strap'); // shoulder straps
body.box([-4, 15, -3], [8, 1, 1], 'strap'); // chest strap

export const jetpackModel = {
  id: 'jetpack',
  model: j.build(),
  materials: { ...commonMaterials(), tank: paint(PALETTE.red), strap: metal('#3b3b3b') },
};

/** Bedrock: geometry + texture for the attachable, plus an empty geometry for the hand. */
export function jetpackAttachable() {
  const geo = buildGeometry(`geometry.${NS}.jetpack`, jetpackModel.model);
  const texture = paintTexture(geo, jetpackModel.materials);
  const empty = {
    format_version: '1.12.0',
    'minecraft:geometry': [{ description: { identifier: `geometry.${NS}.empty`, texture_width: 16, texture_height: 16 }, bones: [{ name: 'body', pivot: [0, 24, 0] }] }],
  };
  const attachable = {
    format_version: '1.10.0',
    'minecraft:attachable': {
      description: {
        identifier: `${NS}:jetpack`,
        materials: { default: 'armor', enchanted: 'armor_enchanted' },
        textures: { default: `textures/models/armor/${NS}_jetpack`, enchanted: 'textures/misc/enchanted_item_glint' },
        geometry: { default: `geometry.${NS}.jetpack`, empty: `geometry.${NS}.empty` },
        scripts: { parent_setup: 'variable.chest_layer_visible = 0.0;' },
        render_controllers: [`controller.render.${NS}.jetpack`],
      },
    },
  };
  const controller = {
    format_version: '1.8.0',
    render_controllers: {
      // Worn: the jetpack on the back. Held in the hand: nothing (the item icon is enough).
      [`controller.render.${NS}.jetpack`]: {
        arrays: { geometries: { 'Array.geo': ['Geometry.default', 'Geometry.empty'] } },
        geometry: "Array.geo[c.item_slot == 'chest' ? 0 : 1]",
        materials: [{ '*': 'Material.default' }],
        textures: ['Texture.default', 'Texture.enchanted'],
      },
    },
  };
  return { geo: geo.geometry, empty, texture, attachable, controller };
}

/**
 * Java: the jetpack as an armour layer (64x32, the vanilla humanoid layout). The body's
 * back is painted with two tanks, the front and sides with straps.
 */
export function jetpackArmorTexture() {
  const png = new PNG({ width: 64, height: 32 });
  png.data.fill(0);
  const put = (x, y, c) => png.data.set(hex(c), (y * 64 + x) * 4);
  const red = PALETTE.red, dark = '#2c2e30', strap = '#3b3b3b', steel = '#8d949a';
  // Back of the body: u 32..39, v 20..31.
  for (let y = 20; y < 32; y++) for (let x = 32; x < 40; x++) {
    const tank = x !== 35 && x !== 36;
    const c = y >= 30 ? dark : tank ? red : steel;
    put(x, y, c);
    if (tank && (x === 32 || x === 37) && y < 30) png.data.set(shade(hex(red), 1.2), (y * 64 + x) * 4);
  }
  // Front: u 20..27, v 20..31 - two shoulder straps and a chest strap.
  for (let y = 20; y < 32; y++) for (const x of [21, 26]) put(x, y, strap);
  for (let x = 20; x < 28; x++) put(x, 23, strap);
  // Sides and top: straps over the shoulders.
  for (let y = 20; y < 32; y++) { put(17, y, strap); put(30, y, strap); }
  for (let x = 20; x < 28; x++) for (let y = 16; y < 20; y++) if (x === 21 || x === 26) put(x, y, strap);
  return PNG.sync.write(png);
}
