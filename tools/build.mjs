// Generates the behavior pack and resource pack into build/, and the Java edition's
// resources into java/src/generated/resources (tools/java.mjs).
import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { rocketAnimation } from '../src/lib/anim.mjs';
import { buildEntity, buildLoot, buildParachuteEntity, floatJson, runtimeRecord } from '../src/lib/behavior.mjs';
import { buildClientEntity, buildRenderController } from '../src/lib/client.mjs';
import { MIN_ENGINE, NS, PACK_NAME, SCRIPT_SERVER_VERSION, SCRIPT_UI_VERSION } from '../src/lib/constants.mjs';
import { packIcon } from '../src/lib/icon.mjs';
import { loadRockets } from '../src/lib/rockets.mjs';
import { buildGeometry } from '../src/lib/model.mjs';
import { paintTexture } from '../src/lib/texture.mjs';
import { langEntries, LOCALES } from '../src/lang.mjs';
import { buildItem, items as itemsFor, JETPACK, recipes as recipesFor } from '../src/items.mjs';
import { blockDefinition, blocks } from '../src/blocks.mjs';
import { jetpackArmorTexture, jetpackAttachable, parachute } from '../src/gear.mjs';
import { render } from './render.mjs';
import { buildJava } from './java.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'build');
const BP = join(OUT, 'behavior_pack');
const RP = join(OUT, 'resource_pack');

const UUID = {
  bpHeader: 'd7009e7b-f2f4-44ab-9d92-498fbe195ed1',
  bpData: 'd6368bd5-7003-4076-a79d-d55a786b8f93',
  bpScript: 'c5e4439d-2667-46dd-9256-6021e965013b',
  rpHeader: '61a0a2fd-2c7b-4f7f-aea2-d3ae4effc15a',
  rpResources: '633ea3bc-08c8-4809-9617-921b0482f65a',
};

async function write(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n');
}

function manifests(version) {
  const v = version.split('.').map(Number);
  const meta = { authors: ['Rockets contributors'], license: 'MIT' };
  const bp = {
    format_version: 2,
    header: { name: `${PACK_NAME} v${version} (Behavior)`, description: 'pack.description', uuid: UUID.bpHeader, version: v, min_engine_version: MIN_ENGINE },
    modules: [
      { type: 'data', uuid: UUID.bpData, version: v },
      { type: 'script', language: 'javascript', uuid: UUID.bpScript, version: v, entry: 'scripts/main.js' },
    ],
    dependencies: [
      { uuid: UUID.rpHeader, version: v },
      { module_name: '@minecraft/server', version: SCRIPT_SERVER_VERSION },
      { module_name: '@minecraft/server-ui', version: SCRIPT_UI_VERSION },
    ],
    metadata: meta,
  };
  const rp = {
    format_version: 2,
    header: { name: `${PACK_NAME} v${version} (Resources)`, description: 'pack.description', uuid: UUID.rpHeader, version: v, min_engine_version: MIN_ENGINE },
    modules: [{ type: 'resources', uuid: UUID.rpResources, version: v }],
    dependencies: [{ uuid: UUID.bpHeader, version: v }],
    metadata: meta,
  };
  return { bp, rp };
}

/** Flames and parachutes reach outside the rocket at rest: widen the culling bounds. */
function widenBounds(geo) {
  const d = geo.geometry['minecraft:geometry'][0].description;
  d.visible_bounds_width = Math.ceil(d.visible_bounds_width * 1.5) + 2;
  d.visible_bounds_height = Math.ceil(d.visible_bounds_height * 1.4) + 2;
  d.visible_bounds_offset = [0, Math.round((d.visible_bounds_height / 2 - 1) * 100) / 100, 0];
}

export async function build({ quiet = false } = {}) {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  await rm(BP, { recursive: true, force: true });
  await rm(RP, { recursive: true, force: true });
  for (const [from, to] of [['behavior_pack', BP], ['resource_pack', RP]]) {
    if (existsSync(join(ROOT, 'src', 'packs', from))) await cp(join(ROOT, 'src', 'packs', from), to, { recursive: true });
  }

  const { bp, rp } = manifests(pkg.version);
  await write(join(BP, 'manifest.json'), bp);
  await write(join(RP, 'manifest.json'), rp);
  const icon = packIcon();
  await write(join(BP, 'pack_icon.png'), icon);
  await write(join(RP, 'pack_icon.png'), icon);

  const rockets = await loadRockets();
  const java = { geos: {}, anims: {}, textures: {}, records: [] };
  const report = [];

  // Rockets and the parachute share the entity pipeline: geometry, texture, animation, client entity.
  for (const spec of [...rockets, parachute]) {
    const isChute = spec === parachute;
    await write(join(BP, 'entities', `${spec.id}.json`), isChute ? buildParachuteEntity() : floatJson(buildEntity(spec)));
    if (!isChute) await write(join(BP, 'loot_tables', 'entities', `${NS}_${spec.id}.json`), buildLoot(spec));

    const geo = buildGeometry(`geometry.${NS}.${spec.id}`, spec.model);
    widenBounds(geo);
    const texture = paintTexture(geo, spec.materials);
    await write(join(RP, 'models', 'entity', `${spec.id}.geo.json`), geo.geometry);
    await write(join(RP, 'textures', 'entity', NS, `${spec.id}.png`), texture);
    await write(join(RP, 'animations', `${spec.id}.animation.json`), rocketAnimation(spec, 'bedrock', { parachute: isChute }));
    await write(join(RP, 'entity', `${spec.id}.entity.json`), buildClientEntity(spec));
    await write(join(RP, 'render_controllers', `${spec.id}.render_controllers.json`), buildRenderController(spec));

    java.geos[spec.id] = geo.geometry;
    java.anims[spec.id] = rocketAnimation(spec, 'java');
    java.textures[spec.id] = texture;
    if (!isChute) {
      // Portrait for the Rocket Manual.
      const anim = Object.values(rocketAnimation(spec, 'preview').animations)[0];
      await write(join(RP, 'textures', 'ui', NS, `${spec.id}.png`), render(geo.geometry, texture, { yaw: 35, size: 64, anim, vars: { phase: 0, water: 1 } }));
      java.records.push(runtimeRecord(spec));
    }
    report.push(`${spec.id} (${geo.width}x${geo.height})`);
  }

  // The jetpack, worn on the back.
  const jet = jetpackAttachable();
  await write(join(RP, 'attachables', 'jetpack.json'), jet.attachable);
  await write(join(RP, 'models', 'entity', 'jetpack.geo.json'), jet.geo);
  await write(join(RP, 'models', 'entity', 'empty.geo.json'), jet.empty);
  await write(join(RP, 'textures', 'models', 'armor', `${NS}_jetpack.png`), jet.texture);
  await write(join(RP, 'render_controllers', 'jetpack.render_controllers.json'), jet.controller);

  // Data for the scripts, and the flight model they share with the build.
  const records = rockets.map(runtimeRecord);
  const itemList = itemsFor(rockets);
  await write(join(BP, 'scripts', 'data.js'), [
    '// Generated by tools/build.mjs',
    `export const ROCKETS = ${JSON.stringify(records)};`,
    `export const ITEMS = ${JSON.stringify([...itemList.map((i) => `${NS}:${i.id}`), ...blocks.map((b) => `${NS}:${b.id}`)])};`,
    `export const JETPACK = ${JSON.stringify(JETPACK)};`,
    '',
  ].join('\n'));
  await copyFile(join(ROOT, 'src', 'lib', 'flight.mjs'), join(BP, 'scripts', 'flight.js'));

  // Items
  const itemTextures = {};
  for (const item of itemList) {
    await write(join(BP, 'items', `${item.id}.json`), buildItem(item));
    await write(join(RP, 'textures', 'items', NS, `${item.id}.png`), item.icon);
    itemTextures[`${NS}_${item.id}`] = { textures: `textures/items/${NS}/${item.id}` };
  }
  await write(join(RP, 'textures', 'item_texture.json'), { resource_pack_name: NS, texture_name: 'atlas.items', texture_data: itemTextures });

  // Blocks
  const terrain = {};
  const blockSounds = { format_version: [1, 1, 0] };
  for (const block of blocks) {
    await write(join(BP, 'blocks', `${block.id}.json`), blockDefinition(block));
    if (block.geometry) await write(join(RP, 'models', 'blocks', `${block.id}.geo.json`), block.geometry);
    for (const [name, png] of Object.entries(block.textures)) {
      await write(join(RP, 'textures', 'blocks', NS, `${block.id}_${name}.png`), png);
      terrain[`${NS}_${block.id}_${name}`] = { textures: `textures/blocks/${NS}/${block.id}_${name}` };
    }
    blockSounds[`${NS}:${block.id}`] = { sound: block.sound ?? 'stone' };
  }
  await write(join(RP, 'textures', 'terrain_texture.json'), { resource_pack_name: NS, texture_name: 'atlas.terrain', padding: 8, num_mip_levels: 4, texture_data: terrain });
  await write(join(RP, 'blocks.json'), blockSounds);

  const recipes = recipesFor([...itemList, ...blocks]);
  for (const recipe of recipes) {
    const body = Object.values(recipe)[0];
    await write(join(BP, 'recipes', `${body.description.identifier.split(':')[1]}.json`), { format_version: '1.12', ...recipe });
  }

  // Language
  const langs = {};
  for (const locale of LOCALES) {
    const entries = langEntries(locale, { rockets, items: itemList, blocks, description: pkg.description, version: pkg.version });
    langs[locale] = entries;
    const text = entries.map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
    for (const pack of [BP, RP]) await write(join(pack, 'texts', `${locale}.lang`), text);
  }
  for (const pack of [BP, RP]) await write(join(pack, 'texts', 'languages.json'), LOCALES);

  await buildJava({
    rockets, ...java, items: itemList, blocks, recipes, langs, icon, jetpackArmor: jetpackArmorTexture(),
    OUT: join(ROOT, 'java', 'src', 'generated', 'resources'),
  });

  if (!quiet) console.log(`Built ${rockets.length} rockets and the parachute: ${report.join(', ')}\nItems: ${itemList.map((i) => i.id).join(', ')}`);
  return { rockets, items: itemList, version: pkg.version };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
