// The jetpack (worn in the chest slot; its durability is the fuel) and rocket boosts.
import { ButtonState, EquipmentSlot, InputButton, system, world } from '@minecraft/server';
import { JETPACK } from './data.js';
import { actionBar, bar, consume, NS, particle, sound } from './util.js';

const JET = `${NS}:jetpack`;
const caught = new Map(); // player id -> tick the stabiliser last caught them

function wornJetpack(player) {
  try {
    const eq = player.getComponent('minecraft:equippable');
    const item = eq?.getEquipment(EquipmentSlot.Chest);
    if (item?.typeId !== JET) return undefined;
    return { eq, item, durability: item.getComponent('minecraft:durability') };
  } catch {
    return undefined;
  }
}

const fuelLeft = (j) => (j.durability ? j.durability.maxDurability - j.durability.damage : 0);

function burn(j, amount) {
  try {
    j.durability.damage = Math.max(0, Math.min(j.durability.maxDurability, j.durability.damage + amount));
    j.eq.setEquipment(EquipmentSlot.Chest, j.item);
  } catch {}
}

function jumpHeld(player) {
  try {
    return player.inputInfo.getButtonState(InputButton.Jump) === ButtonState.Pressed;
  } catch {
    return player.isJumping;
  }
}

let tick = 0;

function jetpackTick() {
  tick++;
  for (const player of world.getPlayers()) {
    const j = wornJetpack(player);
    if (!j) continue;
    const left = fuelLeft(j);
    const airborne = !player.isOnGround && !player.isInWater;
    if (!airborne) continue;
    if (jumpHeld(player) && left > 0 && !player.getComponent('minecraft:riding')) {
      if (tick % 2 === 0) {
        const d = player.getViewDirection();
        try {
          player.applyKnockback({ x: d.x * 0.3, z: d.z * 0.3 }, 0.42);
        } catch {}
        burn(j, 2);
        if (left <= 2) actionBar(player, { translate: `${NS}.hud.jetpack_empty` });
      }
      const back = { x: player.location.x, y: player.location.y + 0.6, z: player.location.z };
      particle(player.dimension, 'minecraft:basic_flame_particle', back);
      if (tick % 3 === 0) particle(player.dimension, 'minecraft:basic_smoke_particle', { ...back, y: back.y - 0.4 });
      if (tick % 8 === 0) sound(player.dimension, 'mob.blaze.shoot', player.location, 0.25, 1.4);
      if (tick % 10 === 0) actionBar(player, { rawtext: [{ translate: `${NS}.hud.jetpack` }, { text: ` ${bar(left, JETPACK.capacity)}` }] });
      continue;
    }
    // The stabiliser: falling fast with fuel left, the jetpack catches you.
    let vy = 0;
    try { vy = player.getVelocity().y; } catch {}
    if (vy < -0.6 && left > 0 && tick - (caught.get(player.id) ?? -100) > 30) {
      caught.set(player.id, tick);
      try { player.addEffect('slow_falling', 60, { showParticles: false }); } catch {}
      burn(j, 10);
      particle(player.dimension, 'minecraft:basic_flame_particle', player.location);
      sound(player.dimension, 'mob.blaze.shoot', player.location, 0.4, 1.2);
    }
  }
}

function refuel(player) {
  const j = wornJetpack(player);
  if (!j || !j.durability || j.durability.damage === 0) return false;
  burn(j, -JETPACK.refill);
  consume(player);
  sound(player.dimension, 'random.pop', player.location, 0.7, 1.4);
  actionBar(player, { rawtext: [{ translate: `${NS}.hud.jetpack_refuelled` }, { text: ` ${bar(fuelLeft(j), JETPACK.capacity)}` }] });
  return true;
}

/** Thrown up and forward the way you look; harder while gliding. */
export function boost(player) {
  const d = player.getViewDirection();
  let gliding = false;
  try { gliding = player.isGliding; } catch {}
  const h = gliding ? 2.2 : 1.3;
  const v = gliding ? 0.4 + Math.max(0, d.y) * 1.5 : 0.7 + Math.max(0, d.y) * 0.8;
  try {
    player.applyKnockback({ x: d.x * h, z: d.z * h }, v);
    player.addEffect('slow_falling', 100, { showParticles: false });
  } catch {}
  sound(player.dimension, 'firework.launch', player.location, 1, 1);
  for (let i = 0; i < 5; i++) particle(player.dimension, 'minecraft:basic_flame_particle', { ...player.location, y: player.location.y + 0.2 * i });
}

export function setupGear() {
  system.runInterval(jetpackTick, 1);
  world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
    if (source?.typeId !== 'minecraft:player') return;
    if (itemStack?.typeId === `${NS}:rocket_fuel`) system.run(() => refuel(source));
    if (itemStack?.typeId === `${NS}:rocket_boost`) {
      system.run(() => {
        boost(source);
        consume(source);
      });
    }
  });
}
