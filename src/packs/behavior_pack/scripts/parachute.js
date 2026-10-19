// Parachutes: whoever comes out of a rocket in the air hangs under a canopy (an entity
// they ride, so they can't take fall damage) that drifts down and can be steered.
import { system } from '@minecraft/server';
import { PARACHUTE } from './flight.js';
import { blockAt, isGround, nearPlayers, NS, ridersOf, sound } from './util.js';

const Y0 = `${NS}:y0`;
/** Open parachutes: chute id -> { chute, rider, y0 }. */
const chutes = new Map();

/** Puts `entity` under a new parachute, `offset` blocks to the side; y0 is where it landed from. */
export function deployParachute(entity, y0, offset = { x: 0, z: 0 }) {
  if (!entity?.isValid) return undefined;
  const dim = entity.dimension;
  const at = { x: entity.location.x + offset.x, y: entity.location.y, z: entity.location.z + offset.z };
  let chute;
  try {
    chute = dim.spawnEntity(`${NS}:parachute`, at);
    chute.setDynamicProperty(Y0, y0 ?? at.y - 40);
    chute.setRotation({ x: 0, y: entity.getRotation().y });
    chute.getComponent('minecraft:rideable').addRider(entity);
  } catch {
    // Can't ride (e.g. already riding something): slow falling keeps it safe instead.
    try { chute?.remove(); } catch {}
    safety(entity);
    return undefined;
  }
  chutes.set(chute.id, { chute, rider: entity, y0: y0 ?? at.y - 40 });
  sound(dim, 'armor.equip_leather', at, 1, 0.8);
  return chute;
}

/** Slow falling until the ground, for anyone who lets go of their parachute. */
function safety(entity) {
  try {
    entity.addEffect('slow_falling', 200, { showParticles: false });
  } catch {}
}

function steer(rider) {
  try {
    if (rider.typeId !== 'minecraft:player') return { x: 0, z: 0 };
    const v = rider.inputInfo.getMovementVector();
    const a = (rider.getRotation().y * Math.PI) / 180;
    const fwd = { x: -Math.sin(a), z: Math.cos(a) }, left = { x: Math.cos(a), z: Math.sin(a) };
    return { x: (fwd.x * v.y + left.x * v.x) * 0.12, z: (fwd.z * v.y + left.z * v.x) * 0.12 };
  } catch {
    return { x: 0, z: 0 };
  }
}

function land(id, c) {
  chutes.delete(id);
  try {
    if (c.rider?.isValid) c.chute.getComponent('minecraft:rideable')?.ejectRider(c.rider);
  } catch {}
  try {
    sound(c.chute.dimension, 'random.pop', c.chute.location, 0.8, 0.9);
    c.chute.remove();
  } catch {}
}

function chuteTick() {
  for (const [id, c] of chutes) {
    if (!c.chute.isValid) {
      chutes.delete(id);
      continue;
    }
    const riders = ridersOf(c.chute);
    if (!riders.length) {
      // Sneaked out in mid-air: fall slowly the rest of the way.
      if (c.rider?.isValid) safety(c.rider);
      land(id, c);
      continue;
    }
    c.rider = riders[0];
    const loc = c.chute.location;
    const dim = c.chute.dimension;
    const ground = isGround(blockAt(dim, loc.x, loc.y - 0.3, loc.z)) || isGround(blockAt(dim, loc.x, loc.y - 1, loc.z));
    if (ground || loc.y <= dim.heightRange.min + 1) {
      land(id, c);
      continue;
    }
    const speed = loc.y - c.y0 > PARACHUTE.slowBelow ? PARACHUTE.fast : PARACHUTE.slow;
    const h = steer(c.rider);
    try {
      c.chute.clearVelocity();
      c.chute.applyImpulse({ x: h.x, y: -speed, z: h.z });
      c.chute.setRotation({ x: 0, y: c.rider.getRotation().y });
    } catch {}
  }
}

/** Parachutes left over from a saved world: take them up again, or clear them away. */
function resume() {
  for (const chute of nearPlayers('parachute')) {
    if (chutes.has(chute.id)) continue;
    const rider = ridersOf(chute)[0];
    if (!rider) {
      try { chute.remove(); } catch {}
      continue;
    }
    let y0 = chute.location.y - 40;
    try { y0 = Number(chute.getDynamicProperty(Y0) ?? y0); } catch {}
    chutes.set(chute.id, { chute, rider, y0 });
  }
}

export function setupParachutes() {
  system.runInterval(chuteTick, 1);
  system.runInterval(resume, 40);
}

export const openParachutes = () => [...chutes.values()];
