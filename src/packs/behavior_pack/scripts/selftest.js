import { ItemStack, system, world } from '@minecraft/server';
import { ITEMS } from './data.js';
import { toggleCountdown } from './mission.js';
import { deployParachute, openParachutes } from './parachute.js';
import { spawnRocket } from './place.js';
import { flightOf, launchRocket } from './rockets.js';
import { NS, prop, setProp } from './util.js';

/**
 * Used by tools/bds-test.sh: checks that every rocket and item exists, then flies a few
 * scenarios west of the summoned rockets: a bottle rocket climbs and falls back, an
 * unmanned sky rocket goes up, parachutes down and lands, Mission Control launches a model
 * rocket on a pad, a pig under a parachute lands unhurt, and rockets without fuel or off
 * their pad stay put. Message = space-separated expected rocket ids.
 */
export function selfTest(message) {
  const expected = message.split(/\s+/).filter(Boolean);
  const dim = world.getDimension('overworld');
  const counts = {};
  for (const e of dim.getEntities()) {
    if (e.typeId.startsWith(`${NS}:`)) counts[e.typeId] = (counts[e.typeId] ?? 0) + 1;
  }
  const failed = expected.filter((id) => !counts[`${NS}:${id}`]).map((id) => `summon ${id}`);
  for (const id of ITEMS) {
    try {
      new ItemStack(id, 1);
    } catch {
      failed.push(`item ${id}`);
    }
  }
  console.log(`[Rockets] selftest found ${JSON.stringify(counts)}`);

  const ground = -60;
  // Bottle rocket: water and full pressure.
  const bottle = spawnRocket(dim, 'bottle_rocket', { x: -20.5, y: ground, z: -20.5 });
  // Sky rocket, nobody aboard.
  const sky = spawnRocket(dim, 'sky_rocket', { x: -30.5, y: ground, z: -20.5 });
  // Mission Control and a model rocket on a pad.
  dim.getBlock({ x: -40, y: ground, z: -30 })?.setType(`${NS}:launch_pad`);
  dim.getBlock({ x: -42, y: ground, z: -30 })?.setType(`${NS}:mission_control`);
  const model = spawnRocket(dim, 'model_rocket', { x: -39.5, y: ground + 0.25, z: -29.5 });
  // Rockets that must not fly.
  const empty = spawnRocket(dim, 'sky_rocket', { x: -20.5, y: ground, z: -40.5 });
  const offPad = spawnRocket(dim, 'space_rocket', { x: -30.5, y: ground, z: -40.5 });
  // A pig, forty blocks up, under a parachute.
  const pig = dim.spawnEntity('minecraft:pig', { x: -50.5, y: ground + 40, z: -20.5 });

  const tops = { bottle: ground, sky: ground };
  let skyChute = false;
  // Entity properties take effect at the end of the tick: fuel first, launch a little later.
  system.runTimeout(() => {
    setProp(bottle, 'fuel', 1);
    setProp(bottle, 'water', true);
    setProp(bottle, 'pressure', 8);
    setProp(sky, 'fuel', 1);
    setProp(model, 'fuel', 1);
    setProp(offPad, 'fuel', 4);
  }, 8);
  system.runTimeout(() => {
    if (launchRocket(bottle)) failed.push('bottle rocket launch');
    if (launchRocket(sky)) failed.push('sky rocket launch');
    if (!toggleCountdown(dim, { x: -42, y: ground, z: -30 }, undefined, 2)) failed.push('mission control start');
    if (launchRocket(empty) !== `${NS}.hud.need_fuel`) failed.push('empty rocket stays');
    if (launchRocket(offPad) !== `${NS}.hud.need_pad`) failed.push('space rocket needs a pad');
    deployParachute(pig, ground);
  }, 10);

  const watch = system.runInterval(() => {
    try {
      tops.bottle = Math.max(tops.bottle, bottle.location.y);
      tops.sky = Math.max(tops.sky, sky.location.y);
      if (prop(sky, 'phase') === 4) skyChute = true;
    } catch {}
  }, 5);

  system.runTimeout(() => {
    if (prop(model, 'phase') === 0 && !flightOf(model)) failed.push('mission control launched the model rocket');
  }, 80);

  system.runTimeout(() => {
    system.clearRun(watch);
    if (tops.bottle < ground + 15) failed.push(`bottle rocket height (${(tops.bottle - ground).toFixed(1)})`);
    if (prop(bottle, 'phase') !== 0 || bottle.location.y > ground + 1) failed.push('bottle rocket landed');
    if (tops.sky < ground + 60) failed.push(`sky rocket height (${(tops.sky - ground).toFixed(1)})`);
    if (!skyChute) failed.push('sky rocket parachute');
    if (prop(sky, 'phase') !== 0 || sky.location.y > ground + 1) failed.push(`sky rocket landed (phase ${prop(sky, 'phase')}, y ${sky.location.y.toFixed(1)})`);
    if (prop(empty, 'phase') !== 0 || prop(offPad, 'phase') !== 0) failed.push('rockets without fuel or pad stayed put');
    try {
      const health = pig.getComponent('minecraft:health');
      if (!pig.isValid || health.currentValue < health.effectiveMax) failed.push('pig landed unhurt');
      if (pig.location.y > ground + 1) failed.push(`pig on the ground (y ${pig.location.y.toFixed(1)})`);
    } catch {
      failed.push('pig survived');
    }
    if (openParachutes().length) failed.push('parachutes cleared away');
    console.log(`[Rockets] selftest heights: bottle ${(tops.bottle - ground).toFixed(1)}, sky ${(tops.sky - ground).toFixed(1)}`);
    console.log(failed.length ? `[Rockets] selftest FAIL: ${failed.join(', ')}` : '[Rockets] selftest PASS');
  }, 760);
}
