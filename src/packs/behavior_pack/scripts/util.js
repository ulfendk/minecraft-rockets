import { GameMode, ItemStack, world } from '@minecraft/server';
import { ROCKETS } from './data.js';

export const NS = 'rockets';
export const SPECS = Object.fromEntries(ROCKETS.map((r) => [`${NS}:${r.id}`, r]));
export const specOf = (entity) => SPECS[entity?.typeId];

/** Entities of a family that are near at least one player (cheap enough to poll). */
export function nearPlayers(family, radius = 96) {
  const out = new Map();
  for (const player of world.getPlayers()) {
    let found;
    try {
      found = player.dimension.getEntities({ families: [family], location: player.location, maxDistance: radius });
    } catch {
      continue;
    }
    for (const e of found) out.set(e.id, e);
  }
  return [...out.values()];
}

export function prop(entity, name, fallback = 0) {
  try {
    return entity.getProperty(`${NS}:${name}`) ?? fallback;
  } catch {
    return fallback;
  }
}

export function setProp(entity, name, value) {
  try {
    entity.setProperty(`${NS}:${name}`, value);
  } catch {}
}

/** Something a rocket can stand or land on: not air (plants and water count). */
export function isGround(block) {
  try {
    return !!block && !block.isAir;
  } catch {
    return false;
  }
}

/** Something that stops a rocket climbing: solid, not a plant or liquid. */
export function isBlocking(block) {
  try {
    return !!block && !block.isAir && !block.isLiquid;
  } catch {
    return false;
  }
}

export function blockAt(dim, x, y, z) {
  try {
    return dim.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) });
  } catch {
    return undefined;
  }
}

export const isCreative = (player) => {
  try {
    return player.getGameMode() === GameMode.Creative;
  } catch {
    return false;
  }
};

/** Takes one of the held item (or swaps a water bucket for an empty one). */
export function consume(player, { bucket = false } = {}) {
  if (isCreative(player)) return;
  try {
    const inv = player.getComponent('minecraft:inventory').container;
    const slot = player.selectedSlotIndex;
    const item = inv.getItem(slot);
    if (!item) return;
    if (bucket) inv.setItem(slot, new ItemStack('minecraft:bucket', 1));
    else if (item.amount > 1) {
      item.amount -= 1;
      inv.setItem(slot, item);
    } else {
      inv.setItem(slot);
    }
  } catch {}
}

export function actionBar(player, message) {
  try {
    player.onScreenDisplay.setActionBar(message);
  } catch {}
}

export function particle(dim, id, at) {
  try {
    dim.spawnParticle(id, at);
  } catch {}
}

export function sound(dim, id, at, volume = 1, pitch = 1) {
  try {
    dim.playSound(id, at, { volume, pitch });
  } catch {}
}

/** Riders of an entity (empty when it has no seats). */
export function ridersOf(entity) {
  try {
    return entity.getComponent('minecraft:rideable')?.getRiders() ?? [];
  } catch {
    return [];
  }
}

/** The rocket a player is riding, if any. */
export function rocketOf(player) {
  try {
    const e = player.getComponent('minecraft:riding')?.entityRidingOn;
    return e && specOf(e) ? e : undefined;
  } catch {
    return undefined;
  }
}

/** A bar like ▮▮▮▯▯ for the action bar. */
export const bar = (value, max, width = 10) => {
  const n = Math.round((Math.max(0, Math.min(max, value)) / max) * width);
  return `§a${'▮'.repeat(n)}§7${'▯'.repeat(width - n)}§r`;
};
