// Loads the rocket specs from src/rockets/ and checks them.
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'rockets');

/** Display order everywhere (creative tab, site, manual): smallest first. */
export const ORDER = ['bottle_rocket', 'model_rocket', 'sky_rocket', 'space_rocket'];

/** toy: launched from the ground, ride: players fly along. */
export const GROUPS = ['toy', 'ride'];

const FLIGHT_KEYS = ['thrust', 'maxSpeed', 'gravity', 'maxFall', 'chute', 'chuteFast', 'chuteSlow', 'slowBelow', 'countdown'];

export async function loadRockets() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.mjs'));
  const rockets = [];
  for (const f of files) rockets.push((await import(pathToFileURL(join(DIR, f)).href)).default);
  rockets.sort((a, b) => rank(a.id) - rank(b.id));
  for (const r of rockets) check(r);
  return rockets;
}

const rank = (id) => (ORDER.includes(id) ? ORDER.indexOf(id) : 999);

function check(r) {
  const where = `rocket ${r.id}`;
  for (const key of ['id', 'name', 'group', 'info', 'scale', 'hitbox', 'health', 'seats', 'fuel', 'launch', 'flight', 'recipe', 'icon', 'model', 'materials']) {
    if (r[key] === undefined) throw new Error(`${where}: missing "${key}"`);
  }
  if (!GROUPS.includes(r.group)) throw new Error(`${where}: unknown group ${r.group}`);
  for (const key of FLIGHT_KEYS) if (r.flight[key] === undefined) throw new Error(`${where}: flight is missing "${key}"`);
  if (r.flight.apex === undefined && !r.flight.pressure) throw new Error(`${where}: flight needs an apex or a pressure rule`);
  if (r.group === 'ride' && !r.seats.length) throw new Error(`${where}: a ride needs seats`);
  if (r.seats.length && !r.flight.chute) throw new Error(`${where}: riders need a parachute rocket`);
  const bones = new Set(r.model.bones.map((b) => b.name));
  for (const d of r.visuals ?? []) if (!bones.has(d.bone)) throw new Error(`${where}: visual for unknown bone ${d.bone}`);
  if (r.flight.chute && !bones.has('chute')) throw new Error(`${where}: a parachute rocket needs a "chute" bone`);
  if (![...bones].some((b) => b.startsWith('flame'))) throw new Error(`${where}: no flame bone`);
}
