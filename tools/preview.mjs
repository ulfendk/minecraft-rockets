// Renders every rocket (on the pad, burning, under its parachute, from several sides) into
// build/preview/, plus the parachute, the jetpack and a contact sheet: build/preview/sheet.png.
// `npm run preview sky_rocket` renders only that rocket.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from './build.mjs';
import { rocketAnimation } from '../src/lib/anim.mjs';
import { parachute } from '../src/gear.mjs';
import { render, sheet } from './render.mjs';

const RP = 'build/resource_pack';
const OUT = 'build/preview';
const only = process.argv.slice(2);

const { rockets } = await build({ quiet: true });
await mkdir(OUT, { recursive: true });
const thumbs = [];
const load = async (id) => [JSON.parse(await readFile(join(RP, 'models/entity', `${id}.geo.json`), 'utf8')), await readFile(join(RP, 'textures/entity/rockets', `${id}.png`))];

for (const r of rockets) {
  if (only.length && !only.includes(r.id)) continue;
  const [geo, tex] = await load(r.id);
  const anim = Object.values(rocketAnimation(r, 'preview').animations)[0];
  const views = [
    render(geo, tex, { anim, vars: { phase: 0, water: 1 }, yaw: 35 }),
    render(geo, tex, { anim, vars: { phase: 2, water: 1 }, yaw: 145 }),
    render(geo, tex, { anim, vars: { phase: 4 }, yaw: 35, pitch: 10 }),
    render(geo, tex, { anim, vars: { phase: 0, water: 1 }, yaw: 90, pitch: 0 }),
    render(geo, tex, { anim, vars: { phase: 0 }, yaw: 215, pitch: 35 }),
    render(geo, tex, { anim, vars: { phase: 0 }, yaw: 0, pitch: 89 }),
  ];
  await writeFile(join(OUT, `${r.id}.png`), sheet(views, { cols: 3 }));
  thumbs.push(views[0], views[1]);
}
if (!only.length) {
  const [geo, tex] = await load('parachute');
  const anim = Object.values(rocketAnimation(parachute, 'preview').animations)[0];
  const chute = render(geo, tex, { anim, vars: {}, yaw: 35, pitch: 15 });
  const jg = JSON.parse(await readFile(join(RP, 'models/entity/jetpack.geo.json'), 'utf8'));
  const jt = await readFile(join(RP, 'textures/models/armor/rockets_jetpack.png'));
  const jet = render(jg, jt, { yaw: 160, pitch: 15 });
  await writeFile(join(OUT, 'gear.png'), sheet([chute, jet], { cols: 2 }));
  thumbs.push(chute, jet);
}
await writeFile(join(OUT, 'sheet.png'), sheet(thumbs, { cols: 4 }));
console.log(`Wrote previews to ${OUT}/`);
