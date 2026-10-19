// Rockets: fuelling, pumping and lighting, launching, the flight itself and the HUD.
// The flight model is shared with the build and the Java mod (flight.js).
import { ButtonState, InputButton, system, world } from '@minecraft/server';
import { idle, isFlying, launch, PHASE, step, targetHeight } from './flight.js';
import { deployParachute } from './parachute.js';
import {
  actionBar, bar, blockAt, consume, isBlocking, isGround, nearPlayers, NS, particle, prop, ridersOf, rocketOf,
  setProp, sound, specOf,
} from './util.js';

const STATE = `${NS}:flight`;
/** Flights in progress: rocket id -> { entity, s, y0, lastY, riders }. */
const flights = new Map();

const fuelName = (spec) => ({ translate: `${NS}.fuel.${spec.fuel.kind}` });

export const onPad = (entity) => blockAt(entity.dimension, entity.location.x, entity.location.y - 0.1, entity.location.z)?.typeId === `${NS}:launch_pad`;

/** Has everything it needs to fly (bottle rockets: water or pressure). */
export function isReady(entity, spec = specOf(entity)) {
  if (!spec || prop(entity, 'phase') !== PHASE.idle) return false;
  if (spec.flight.pressure) return prop(entity, 'fuel') >= 1 || prop(entity, 'pressure') > 0;
  return prop(entity, 'fuel') >= spec.fuel.amount;
}

function save(entity, f) {
  try {
    entity.setDynamicProperty(STATE, JSON.stringify({ s: f.s, y0: f.y0 }));
  } catch {}
}

/**
 * Starts a launch. `countdown` overrides the rocket's own (Mission Control passes 0).
 * Returns undefined on success, or the lang key of what is missing.
 */
export function launchRocket(entity, { countdown, fullPressure = false } = {}) {
  const spec = specOf(entity);
  if (!spec) return `${NS}.hud.need_fuel`;
  if (prop(entity, 'phase') !== PHASE.idle || flights.has(entity.id)) return undefined;
  if (!isReady(entity, spec)) return `${NS}.hud.need_fuel`;
  if (spec.launch.pad && !onPad(entity)) return `${NS}.hud.need_pad`;
  const water = prop(entity, 'fuel') >= 1;
  const pressure = fullPressure ? 8 : prop(entity, 'pressure');
  let ceiling = 300;
  try {
    ceiling = entity.dimension.heightRange.max - entity.location.y - spec.top - spec.flight.maxSpeed - 2;
  } catch {}
  const target = targetHeight(spec.flight, { pressure: Math.max(pressure, 1), water, ceiling });
  const f = { entity, s: launch(spec.flight, target, countdown ?? spec.flight.countdown), y0: entity.location.y, lastY: entity.location.y, riders: new Set() };
  flights.set(entity.id, f);
  setProp(entity, 'phase', f.s.phase);
  // The fuel is used up at the start of the countdown.
  setProp(entity, 'fuel', 0);
  setProp(entity, 'pressure', 0);
  if (spec.flight.pressure) setProp(entity, 'water', water);
  if (f.s.phase === PHASE.countdown && spec.launch.fuse) sound(entity.dimension, 'random.fuse', entity.location);
  if (f.s.event === 'liftoff') liftoff(entity, spec);
  save(entity, f);
  return undefined;
}

function liftoff(entity, spec) {
  try {
    entity.triggerEvent(`${NS}:launch`);
  } catch {}
  const at = entity.location;
  sound(entity.dimension, spec.flight.pressure ? 'bucket.empty_water' : 'firework.launch', at, 1.2, spec.group === 'ride' ? 0.6 : 1);
  if (spec.group === 'ride') sound(entity.dimension, 'random.explode', at, 0.6, 0.5);
  for (let i = 0; i < (spec.group === 'ride' ? 12 : 4); i++) {
    particle(entity.dimension, spec.flight.pressure ? 'minecraft:water_splash_particle' : 'minecraft:large_explosion', {
      x: at.x + (Math.random() - 0.5) * spec.width * 2, y: at.y + 0.3, z: at.z + (Math.random() - 0.5) * spec.width * 2,
    });
  }
}

/** Exhaust: flames and smoke while burning, a water spray for the bottle rocket. */
function exhaust(entity, spec, tick) {
  const at = { x: entity.location.x, y: entity.location.y + spec.exhaust - 0.3, z: entity.location.z };
  if (spec.flight.pressure) {
    particle(entity.dimension, 'minecraft:water_splash_particle', at);
    return;
  }
  particle(entity.dimension, 'minecraft:basic_flame_particle', at);
  if (spec.group === 'ride') particle(entity.dimension, 'minecraft:mobflame_single', { ...at, y: at.y - 0.5 });
  if (tick % 2 === 0) particle(entity.dimension, spec.group === 'ride' ? 'minecraft:campfire_smoke_particle' : 'minecraft:basic_smoke_particle', { ...at, y: at.y - 0.8 });
  if (spec.group === 'ride' && tick % 10 === 0) sound(entity.dimension, 'mob.blaze.shoot', entity.location, 0.6, 0.5);
}

/** At the top: everyone out, each under a parachute. */
function apex(entity, spec, f) {
  const riders = ridersOf(entity);
  const rideable = entity.getComponent('minecraft:rideable');
  riders.forEach((rider, i) => {
    try {
      rideable?.ejectRider(rider);
    } catch {}
    f.riders.delete(rider.id);
    const a = (i / Math.max(1, riders.length)) * Math.PI * 2;
    system.run(() => deployParachute(rider, f.y0, { x: Math.cos(a) * 1.6, z: Math.sin(a) * 1.6 }));
    if (rider.typeId === 'minecraft:player' && spec.flight.apex < 0) {
      try {
        rider.onScreenDisplay.setTitle({ translate: `${NS}.space` }, { subtitle: { translate: `${NS}.space.sub` }, fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 10 });
      } catch {}
    }
  });
  sound(entity.dimension, 'random.pop', entity.location, 1, 0.7);
}

function landed(entity, spec, f) {
  try {
    entity.clearVelocity();
    entity.triggerEvent(`${NS}:land`);
  } catch {}
  setProp(entity, 'phase', PHASE.idle);
  if (spec.flight.pressure) setProp(entity, 'water', false);
  flights.delete(entity.id);
  try {
    entity.setDynamicProperty(STATE, undefined);
  } catch {}
  sound(entity.dimension, 'random.pop', entity.location, 0.6, 1.2);
}

let tick = 0;

function flightTick() {
  tick++;
  for (const [id, f] of flights) {
    const entity = f.entity;
    if (!entity.isValid) {
      flights.delete(id);
      continue;
    }
    const spec = specOf(entity);
    const loc = entity.location;
    const s = { ...f.s, y: loc.y - f.y0 };
    const env = {};
    if (s.phase === PHASE.burn || s.phase === PHASE.coast) {
      const head = blockAt(entity.dimension, loc.x, loc.y + spec.top + 0.3, loc.z);
      const stuck = s.vy > 0.3 && loc.y - f.lastY < s.vy * 0.25 && s.t > 3;
      env.blocked = isBlocking(head) || stuck;
    }
    if (s.phase === PHASE.chute || s.phase === PHASE.fall) {
      env.grounded = isGround(blockAt(entity.dimension, loc.x, loc.y - 0.05, loc.z)) || loc.y <= entity.dimension.heightRange.min;
    }
    f.lastY = loc.y;
    const before = s.phase;
    f.s = step(s, spec.flight, env);

    // Riders who get out on the way up or down get a parachute.
    const now = new Set(ridersOf(entity).map((r) => r.id));
    for (const rid of f.riders) {
      if (now.has(rid) || !isFlying(f.s.phase)) continue;
      const rider = world.getEntity(rid);
      if (rider?.isValid) system.run(() => deployParachute(rider, f.y0, { x: 1.4, z: 0 }));
    }
    f.riders = now;

    if (f.s.event === 'liftoff') liftoff(entity, spec);
    if (f.s.event === 'apex') apex(entity, spec, f);
    if (f.s.event === 'landed') {
      landed(entity, spec, f);
      continue;
    }
    if (f.s.phase !== before) setProp(entity, 'phase', f.s.phase);
    if (f.s.phase === PHASE.countdown) countdownTick(entity, spec, f);
    if (isFlying(f.s.phase)) {
      try {
        entity.clearVelocity();
        entity.applyImpulse({ x: 0, y: f.s.vy, z: 0 });
      } catch {}
    }
    if (f.s.phase === PHASE.burn) exhaust(entity, spec, tick);
    if (tick % 20 === 0) save(entity, f);
  }
}

/** Riders see the last seconds counted down; the fuse fizzes. */
function countdownTick(entity, spec, f) {
  if (f.s.t % 20 !== 0) {
    if (spec.launch.fuse && tick % 4 === 0) particle(entity.dimension, 'minecraft:basic_smoke_particle', { ...entity.location, y: entity.location.y + 0.2 });
    return;
  }
  const seconds = f.s.t / 20;
  for (const rider of ridersOf(entity)) {
    if (rider.typeId !== 'minecraft:player') continue;
    try {
      rider.onScreenDisplay.setTitle(`§e${seconds}`, { fadeInDuration: 0, stayDuration: 18, fadeOutDuration: 2 });
    } catch {}
  }
  sound(entity.dimension, 'note.pling', entity.location, 0.8, 1 + (3 - Math.min(3, seconds)) * 0.15);
}

/** Picks up flights that were in progress when the world was saved. */
function resume() {
  for (const entity of nearPlayers('rocket')) {
    if (flights.has(entity.id) || prop(entity, 'phase') === PHASE.idle) continue;
    let saved;
    try {
      saved = JSON.parse(entity.getDynamicProperty(STATE) ?? 'null');
    } catch {}
    const f = { entity, s: saved?.s ?? { ...idle(), phase: PHASE.chute }, y0: saved?.y0 ?? entity.location.y - 30, lastY: entity.location.y, riders: new Set() };
    flights.set(entity.id, f);
    try {
      entity.triggerEvent(`${NS}:launch`);
    } catch {}
  }
}

/** What riders see above the hotbar. */
function hudTick() {
  for (const player of world.getPlayers()) {
    const rocket = rocketOf(player);
    if (!rocket) continue;
    const spec = specOf(rocket);
    const f = flights.get(rocket.id);
    if (f && isFlying(f.s.phase)) {
      actionBar(player, { rawtext: [{ text: '§b' }, { translate: `${NS}.hud.altitude`, with: [String(Math.round(rocket.location.y))] }] });
      continue;
    }
    if (f) continue;
    const fuel = prop(rocket, 'fuel');
    const parts = [{ translate: `${NS}.hud.fuel`, with: [String(fuel), String(spec.fuel.amount)] }, { text: '  §7·§r  ' }];
    if (fuel < spec.fuel.amount) parts.push({ translate: `${NS}.hud.need_fuel`, with: { rawtext: [fuelName(spec)] } });
    else if (spec.launch.pad && !onPad(rocket)) parts.push({ translate: `${NS}.hud.need_pad` });
    else parts.push({ text: '§a' }, { translate: `${NS}.hud.ready` });
    actionBar(player, { rawtext: parts });
    if (!player.getDynamicProperty(`${NS}:tutorial`)) {
      player.setDynamicProperty(`${NS}:tutorial`, true);
      player.sendMessage({ translate: `${NS}.tutorial` });
    }
  }
}

/** Filling, fuelling, pumping and lighting by using things on a rocket. */
function interact(player, rocket, item) {
  const spec = specOf(rocket);
  if (prop(rocket, 'phase') !== PHASE.idle) return false;
  const typeId = item?.typeId;
  if (typeId === spec.fuel.item) {
    const fuel = prop(rocket, 'fuel');
    if (fuel >= spec.fuel.amount) {
      actionBar(player, { translate: `${NS}.hud.full` });
      return true;
    }
    system.run(() => {
      setProp(rocket, 'fuel', fuel + 1);
      if (spec.fuel.kind === 'water') setProp(rocket, 'water', true);
      consume(player, { bucket: spec.fuel.kind === 'water' });
      sound(rocket.dimension, spec.fuel.kind === 'water' ? 'bucket.empty_water' : 'random.pop', rocket.location, 0.7, 1.2);
      actionBar(player, { rawtext: [{ translate: spec.fuel.kind === 'water' ? `${NS}.hud.filled` : `${NS}.hud.fuelled` }, { text: `  ${fuel + 1}/${spec.fuel.amount}` }] });
    });
    return true;
  }
  if (spec.launch.pump && !item) {
    system.run(() => {
      const pressure = prop(rocket, 'pressure');
      if (pressure >= 8) {
        launchRocket(rocket);
        return;
      }
      setProp(rocket, 'pressure', pressure + 1);
      sound(rocket.dimension, 'random.click', rocket.location, 0.8, 0.7 + pressure * 0.12);
      particle(rocket.dimension, 'minecraft:water_splash_particle', { ...rocket.location, y: rocket.location.y + 0.2 });
      const parts = [{ translate: `${NS}.hud.pressure` }, { text: ` ${bar(pressure + 1, 8, 8)}` }];
      if (prop(rocket, 'fuel') < 1) parts.push({ text: '  §7' }, { translate: `${NS}.hud.no_water` });
      actionBar(player, { rawtext: parts });
    });
    return true;
  }
  if (spec.launch.fuse && typeId === spec.launch.fuse) {
    system.run(() => {
      const missing = launchRocket(rocket);
      actionBar(player, missing ? { translate: missing, with: { rawtext: [fuelName(spec)] } } : { translate: `${NS}.hud.lit` });
    });
    return true;
  }
  return false;
}

export function setupRockets() {
  system.runInterval(flightTick, 1);
  system.runInterval(hudTick, 10);
  system.runInterval(resume, 40);
  world.beforeEvents.playerInteractWithEntity.subscribe((e) => {
    if (!specOf(e.target)) return;
    if (interact(e.player, e.target, e.itemStack)) e.cancel = true;
  });
  // Riders launch with Jump.
  world.afterEvents.playerButtonInput.subscribe(({ button, newButtonState, player }) => {
    if (button !== InputButton.Jump || newButtonState !== ButtonState.Pressed) return;
    const rocket = rocketOf(player);
    if (!rocket || !specOf(rocket).launch.jump) return;
    system.run(() => {
      const missing = launchRocket(rocket);
      if (missing) actionBar(player, { translate: missing, with: { rawtext: [fuelName(specOf(rocket))] } });
    });
  });
}

export const flightOf = (entity) => flights.get(entity.id);
