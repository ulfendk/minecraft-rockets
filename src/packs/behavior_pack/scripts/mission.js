// Mission Control: counts down from 10 on the screens of everyone nearby, then launches
// every fuelled rocket on a launch pad within 16 blocks. Right-click again to abort.
import { system } from '@minecraft/server';
import { isReady, launchRocket, onPad } from './rockets.js';
import { NS, particle, sound, specOf } from './util.js';

const RANGE = 16;
const AUDIENCE = 64;
/** Running countdowns: "dim x y z" -> { dim, pos, t } (t in ticks). */
const countdowns = new Map();

const keyOf = (dim, pos) => `${dim.id} ${pos.x} ${pos.y} ${pos.z}`;
const centre = (pos) => ({ x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 });

/** Fuelled rockets standing on launch pads near a console. */
export function rocketsOnPads(dim, pos) {
  let found = [];
  try {
    found = dim.getEntities({ families: ['rocket'], location: centre(pos), maxDistance: RANGE });
  } catch {}
  return found.filter((e) => specOf(e) && onPad(e) && isReady(e));
}

function audience(dim, pos) {
  try {
    return dim.getPlayers({ location: centre(pos), maxDistance: AUDIENCE });
  } catch {
    return [];
  }
}

function title(players, text, subtitle) {
  for (const p of players) {
    try {
      p.onScreenDisplay.setTitle(text, { subtitle, fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 4 });
    } catch {}
  }
}

/** Starts a countdown of `seconds` at a console (or aborts the one running there). */
export function toggleCountdown(dim, pos, player, seconds = 10) {
  const key = keyOf(dim, pos);
  if (countdowns.has(key)) {
    countdowns.delete(key);
    title(audience(dim, pos), { translate: `${NS}.abort` });
    sound(dim, 'note.bass', centre(pos), 1, 0.5);
    return false;
  }
  if (!rocketsOnPads(dim, pos).length) {
    try { player?.onScreenDisplay.setActionBar({ translate: `${NS}.no_rockets` }); } catch {}
    sound(dim, 'note.bass', centre(pos), 0.8, 0.7);
    return false;
  }
  countdowns.set(key, { dim, pos, t: seconds * 20 });
  return true;
}

function missionTick() {
  for (const [key, c] of countdowns) {
    const seconds = Math.ceil(c.t / 20);
    if (c.t % 20 === 0) {
      if (c.t === 0) {
        countdowns.delete(key);
        const rockets = rocketsOnPads(c.dim, c.pos);
        for (const r of rockets) {
          launchRocket(r, { countdown: 0, fullPressure: true });
          for (let i = 0; i < 6; i++) particle(c.dim, 'minecraft:campfire_smoke_particle', { x: r.location.x + (Math.random() - 0.5) * 3, y: r.location.y, z: r.location.z + (Math.random() - 0.5) * 3 });
        }
        title(audience(c.dim, c.pos), { rawtext: [{ text: '§6' }, { translate: `${NS}.liftoff` }] });
        sound(c.dim, 'note.bell', centre(c.pos), 1, 1);
        continue;
      }
      const count = rocketsOnPads(c.dim, c.pos).length;
      title(audience(c.dim, c.pos), `§e${seconds}`, { translate: `${NS}.countdown.sub`, with: [String(count)] });
      sound(c.dim, 'note.pling', centre(c.pos), 1, seconds <= 3 ? 1.3 + (3 - seconds) * 0.2 : 1);
    }
    c.t -= 1;
  }
}

export function setupMissionControl() {
  system.runInterval(missionTick, 1);
}

/** Registered at startup with the other custom components (scripts/place.js). */
export const missionControlComponent = {
  onPlayerInteract(e) {
    const dim = e.block.dimension, pos = e.block.location;
    system.run(() => toggleCountdown(dim, pos, e.player));
  },
};

export const runningCountdowns = () => countdowns.size;
