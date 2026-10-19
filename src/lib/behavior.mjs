// Rocket spec -> Bedrock behavior-pack entity, loot table, and the runtime record that
// both the Bedrock scripts (scripts/data.js) and the Java mod (rockets.json) read.
import { NS } from './constants.mjs';

const r3 = (n) => Math.round(n * 1000) / 1000;

/**
 * Bedrock wants float properties written as decimals (0.0, not 0), which JSON.stringify
 * can't do: floats are tagged here and written out by floatJson().
 */
export const floatJson = (data) => JSON.stringify(data, null, 2)
  .replace(/"F:(-?[\d.e-]+)"/g, (_, n) => (n.includes('.') ? n : `${n}.0`)) + '\n';

/** Model pixels -> entity space in blocks (the model faces -z, the entity +z). */
export const toLocal = ([x, y, z], scale) => [r3((-x * scale) / 16), r3((y * scale) / 16), r3((-z * scale) / 16)];

/** Seat positions in entity space (blocks); riders sit a little into the seat. */
export const seatPositions = (spec) => spec.seats.map((s) => {
  const [x, y, z] = toLocal(s.at, spec.scale);
  return [x, r3(y - 0.15), z];
});

/** Entity properties that carry the flight state to the client (animations, HUD). */
export function properties(spec) {
  return {
    [`${NS}:phase`]: { type: 'int', range: [0, 5], default: 0, client_sync: true },
    [`${NS}:fuel`]: { type: 'int', range: [0, Math.max(1, spec.fuel.amount)], default: 0, client_sync: true },
    [`${NS}:pressure`]: { type: 'int', range: [0, 8], default: 0, client_sync: true },
    [`${NS}:water`]: { type: 'bool', default: false, client_sync: true },
  };
}

const noDamage = (causes) => causes.map((cause) => ({ cause, deals_damage: 'no' }));

export function buildEntity(spec) {
  const components = {
    'minecraft:type_family': { family: ['rocket', spec.group, 'inanimate'] },
    'minecraft:collision_box': { width: spec.hitbox.width, height: spec.hitbox.height },
    'minecraft:health': { value: spec.health, max: spec.health },
    'minecraft:physics': {},
    'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false },
    'minecraft:knockback_resistance': { value: 1 },
    'minecraft:nameable': {},
    'minecraft:persistent': {},
    'minecraft:breathable': { breathes_air: true, breathes_water: true, suffocate_time: 0, total_supply: 15 },
    'minecraft:fire_immune': {},
    'minecraft:damage_sensor': {
      triggers: [
        ...noDamage(['fall', 'drowning', 'suffocation', 'fly_into_wall', 'fire', 'fire_tick', 'lava', 'entity_explosion', 'block_explosion']),
        // Only players can break a rocket (and get it back as an item).
        { on_damage: { filters: { test: 'is_family', subject: 'other', operator: '!=', value: 'player' } }, deals_damage: 'no' },
      ],
    },
    'minecraft:loot': { table: `loot_tables/entities/${NS}_${spec.id}.json` },
    'minecraft:conditional_bandwidth_optimization': {},
  };
  if (spec.seats.length) {
    components['minecraft:rideable'] = {
      seat_count: spec.seats.length, crouching_skip_interact: true, family_types: ['player'],
      interact_text: `action.interact.${NS}.board`,
      seats: seatPositions(spec).map((position) => ({
        min_rider_count: 0, max_rider_count: spec.seats.length, position, third_person_camera_radius: spec.camera ?? 8,
      })),
    };
  } else {
    // Toy rockets: interacting fills, pumps or lights them (scripts/rockets.js).
    components['minecraft:interact'] = {
      interactions: [{ on_interact: { filters: { test: 'is_family', subject: 'other', value: 'player' }, event: `${NS}:poke`, target: 'self' }, interact_text: `action.interact.${NS}.use` }],
    };
  }
  return {
    format_version: '1.21.90',
    'minecraft:entity': {
      description: { identifier: `${NS}:${spec.id}`, is_spawnable: false, is_summonable: true, properties: properties(spec) },
      component_groups: {
        // While flying, the script moves the rocket: no gravity.
        [`${NS}:flying`]: { 'minecraft:physics': { has_gravity: false } },
      },
      components,
      events: {
        [`${NS}:launch`]: { add: { component_groups: [`${NS}:flying`] } },
        [`${NS}:land`]: { remove: { component_groups: [`${NS}:flying`] } },
        [`${NS}:poke`]: {},
      },
    },
  };
}

/** The parachute a player (or a mob) hangs under on the way down; the script steers it. */
export function buildParachuteEntity() {
  return {
    format_version: '1.21.90',
    'minecraft:entity': {
      description: { identifier: `${NS}:parachute`, is_spawnable: false, is_summonable: true },
      components: {
        'minecraft:type_family': { family: ['parachute', 'inanimate'] },
        'minecraft:collision_box': { width: 0.4, height: 0.4 },
        'minecraft:health': { value: 1, max: 1 },
        'minecraft:physics': { has_gravity: false, has_collision: false },
        'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false },
        'minecraft:knockback_resistance': { value: 1 },
        'minecraft:damage_sensor': { triggers: [{ cause: 'all', deals_damage: 'no' }] },
        'minecraft:breathable': { breathes_air: true, breathes_water: true, suffocate_time: 0, total_supply: 15 },
        'minecraft:fire_immune': {},
        'minecraft:rideable': {
          seat_count: 1, crouching_skip_interact: true, pull_in_entities: false,
          seats: [{ position: [0, -0.2, 0], min_rider_count: 0, max_rider_count: 1, third_person_camera_radius: 6 }],
        },
      },
    },
  };
}

export const buildLoot = (spec) => ({
  pools: [{ rolls: 1, entries: [{ type: 'item', name: `${NS}:${spec.id}`, weight: 1 }] }],
});

/** Everything the game logic needs about a rocket, for both editions. */
export function runtimeRecord(spec) {
  return {
    id: spec.id,
    group: spec.group,
    scale: spec.scale,
    width: spec.hitbox.width,
    height: spec.hitbox.height,
    health: spec.health,
    camera: spec.camera ?? 8,
    seats: seatPositions(spec),
    fuel: { item: spec.fuel.item, amount: spec.fuel.amount, kind: spec.fuel.kind },
    launch: {
      pump: !!spec.launch.pump, fuse: spec.launch.fuse ?? null, jump: !!spec.launch.jump, pad: !!spec.launch.pad,
    },
    // apex -1: as high as the world goes.
    flight: { ...spec.flight, apex: spec.flight.apex === 'limit' ? -1 : spec.flight.apex ?? 0, pressure: spec.flight.pressure ?? null },
    // Where the exhaust comes out, in blocks above the rocket's feet.
    exhaust: r3(((spec.exhaust ?? 0) * spec.scale) / 16),
    // Room the rocket needs above its feet.
    top: r3(spec.hitbox.height),
  };
}
