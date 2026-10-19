// Generates the Java edition's resources (java/src/generated/resources) from the same
// specs as the Bedrock packs. GeckoLib reads the Bedrock geometry and animation formats
// directly, so models and animations are shared.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { NS } from '../src/lib/constants.mjs';
import { simulate, targetHeight } from '../src/lib/flight.mjs';

async function write(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n');
}

async function itemModel(A, id) {
  await write(join(A, 'models', 'item', `${id}.json`), { parent: 'minecraft:item/generated', textures: { layer0: `${NS}:item/${id}` } });
  await write(join(A, 'items', `${id}.json`), { model: { type: 'minecraft:model', model: `${NS}:item/${id}` } });
}

/** The launches the Java flight model must reproduce (RocketGameTests.flightMatches). */
export function flightFixtures(records) {
  const out = [];
  for (const r of records) {
    const launches = r.flight.pressure
      ? [{ pressure: 8, water: true }, { pressure: 5, water: false }]
      : [{ ceiling: 250 }];
    for (const opts of launches) {
      const target = targetHeight(r.flight, opts);
      const { samples, top, ticks } = simulate(r.flight, target);
      out.push({ id: r.id, target, top: Math.round(top * 1e4) / 1e4, ticks, samples });
    }
  }
  return out;
}

/** Bedrock recipe -> Java recipe. */
function javaRecipe(recipe) {
  const [type, body] = Object.entries(recipe)[0];
  const result = { id: body.result.item, count: body.result.count ?? 1 };
  if (type === 'minecraft:recipe_shaped') {
    return {
      type: 'minecraft:crafting_shaped', category: 'misc', pattern: body.pattern,
      key: Object.fromEntries(Object.entries(body.key).map(([k, v]) => [k, v.item])), result,
    };
  }
  return { type: 'minecraft:crafting_shapeless', category: 'misc', ingredients: body.ingredients.map((i) => i.item), result };
}

/** Java block model for a block, from its Bedrock definition. */
function blockModel(block) {
  if (block.height === 16) {
    return { parent: 'minecraft:block/cube_bottom_top', textures: { top: `${NS}:block/${block.id}_top`, bottom: `${NS}:block/${block.id}_side`, side: `${NS}:block/${block.id}_side` } };
  }
  const h = block.height;
  const side = { uv: [0, 16 - h, 16, 16], texture: '#side' };
  return {
    parent: 'minecraft:block/block',
    render_type: 'minecraft:cutout',
    textures: { particle: `${NS}:block/${block.id}_top`, top: `${NS}:block/${block.id}_top`, side: `${NS}:block/${block.id}_side` },
    elements: [{
      from: [0, 0, 0], to: [16, h, 16],
      faces: {
        down: { uv: [0, 0, 16, 16], texture: '#top', cullface: 'down' },
        up: { uv: [0, 0, 16, 16], texture: '#top' },
        north: { ...side, cullface: 'north' }, south: { ...side, cullface: 'south' },
        west: { ...side, cullface: 'west' }, east: { ...side, cullface: 'east' },
      },
    }],
  };
}

export async function buildJava({ rockets, geos, anims, textures, records, items, blocks, recipes, langs, icon, jetpackArmor, OUT }) {
  await rm(OUT, { recursive: true, force: true });
  const A = join(OUT, 'assets', NS);
  const D = join(OUT, 'data', NS);

  for (const id of [...rockets.map((r) => r.id), 'parachute']) {
    await write(join(A, 'geckolib', 'models', 'entity', `${id}.geo.json`), geos[id]);
    await write(join(A, 'geckolib', 'animations', 'entity', `${id}.animation.json`), anims[id]);
    await write(join(A, 'textures', 'entity', `${id}.png`), textures[id]);
  }
  await write(join(OUT, NS, 'rockets.json'), records);
  await write(join(OUT, NS, 'flight_fixtures.json'), flightFixtures(records));

  for (const item of items) {
    await write(join(A, 'textures', 'item', `${item.id}.png`), item.icon);
    await itemModel(A, item.id);
  }
  for (const recipe of recipes) {
    const id = Object.values(recipe)[0].description.identifier.split(':')[1];
    await write(join(D, 'recipe', `${id}.json`), javaRecipe(recipe));
  }
  // The jetpack is worn as an armour layer.
  await write(join(A, 'equipment', 'jetpack.json'), { layers: { humanoid: [{ texture: `${NS}:jetpack` }] } });
  await write(join(A, 'textures', 'entity', 'equipment', 'humanoid', 'jetpack.png'), jetpackArmor);

  for (const block of blocks) {
    for (const [name, png] of Object.entries(block.textures)) await write(join(A, 'textures', 'block', `${block.id}_${name}.png`), png);
    await write(join(A, 'models', 'block', `${block.id}.json`), blockModel(block));
    await write(join(A, 'blockstates', `${block.id}.json`), { variants: { '': { model: `${NS}:block/${block.id}` } } });
    await write(join(A, 'models', 'item', `${block.id}.json`), { parent: `${NS}:block/${block.id}` });
    await write(join(A, 'items', `${block.id}.json`), { model: { type: 'minecraft:model', model: `${NS}:item/${block.id}` } });
    await write(join(D, 'loot_table', 'blocks', `${block.id}.json`), {
      type: 'minecraft:block',
      pools: [{ rolls: 1, entries: [{ type: 'minecraft:item', name: `${NS}:${block.id}` }], conditions: [{ condition: 'minecraft:survives_explosion' }] }],
    });
  }
  await write(join(OUT, 'data', 'minecraft', 'tags', 'block', 'mineable', 'pickaxe.json'), { replace: false, values: blocks.map((b) => `${NS}:${b.id}`) });

  // Language files: Bedrock keys -> Java keys.
  for (const [locale, entries] of Object.entries(langs)) {
    const out = {};
    for (const [k, v] of entries) {
      let m;
      if ((m = k.match(new RegExp(`^entity\\.${NS}:(.+)\\.name$`)))) out[`entity.${NS}.${m[1]}`] = v;
      else if ((m = k.match(new RegExp(`^item\\.${NS}:(.+)\\.name$`)))) out[`item.${NS}.${m[1]}`] = v;
      else if ((m = k.match(new RegExp(`^tile\\.${NS}:(.+)\\.name$`)))) out[`block.${NS}.${m[1]}`] = v;
      else if (k.startsWith(`${NS}.`)) out[k] = v;
    }
    out[`itemGroup.${NS}`] = locale === 'da_DK' ? 'Raketter' : 'Rockets';
    await write(join(A, 'lang', `${locale.toLowerCase()}.json`), out);
  }

  await write(join(A, 'icon.png'), icon);
}
