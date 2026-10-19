// The flight of a rocket, one game tick at a time. Pure and self-contained: the build
// copies this file into the behavior pack (scripts/flight.js), and the Java mod has the
// same steps in dk.ulfen.rockets.rocket.Flight (a game test checks that both agree).
//
// Heights are in blocks above the launch point, speeds in blocks per tick.
//   idle -> countdown -> burn -> coast -> chute (or fall, without a parachute) -> idle

export const PHASE = { idle: 0, countdown: 1, burn: 2, coast: 3, chute: 4, fall: 5 };

/** Players and mobs under a parachute: fast down high up, then slow for the landing. */
export const PARACHUTE = { fast: 0.5, slow: 0.15, slowBelow: 16 };

export const isFlying = (phase) => phase === PHASE.burn || phase === PHASE.coast || phase === PHASE.chute || phase === PHASE.fall;

export function idle() {
  return { phase: PHASE.idle, t: 0, y: 0, vy: 0, target: 0, event: null };
}

/**
 * How high a launch goes: the rocket's own apex, the bottle rocket's apex from its
 * pressure (lower without water), never above `ceiling` (room under the build limit).
 */
export function targetHeight(flight, { pressure = 0, water = true, ceiling = Infinity } = {}) {
  let h;
  if (flight.pressure) h = pressure * (water ? flight.pressure.water : flight.pressure.dry);
  else h = flight.apex === 'limit' || flight.apex < 0 ? Infinity : flight.apex;
  return Math.max(1, Math.min(h, ceiling));
}

/** Starts the countdown (or the burn straight away when `countdown` is 0). */
export function launch(flight, target, countdown = flight.countdown) {
  const s = idle();
  s.target = target;
  if (countdown > 0) {
    s.phase = PHASE.countdown;
    s.t = countdown;
  } else {
    s.phase = PHASE.burn;
    s.event = 'liftoff';
  }
  return s;
}

const r6 = (n) => Math.round(n * 1e6) / 1e6;

/**
 * One tick. `env.grounded`: something solid or water under a falling rocket (when left
 * out, the ground is at y = 0). `env.blocked`: a block over the nose while climbing.
 * The runtime puts the rocket's measured height into s.y before every step.
 */
export function step(state, flight, env = {}) {
  const s = { ...state, event: null };
  const grounded = env.grounded ?? s.y <= 0;
  switch (s.phase) {
    case PHASE.countdown:
      s.t -= 1;
      if (s.t <= 0) {
        s.phase = PHASE.burn;
        s.t = 0;
        s.event = 'liftoff';
      }
      break;
    case PHASE.burn:
      s.t += 1;
      s.vy = r6(Math.min(flight.maxSpeed, s.vy + flight.thrust));
      // Cut the engine when coasting would carry the rocket up to its target.
      if (env.blocked || s.y + (s.vy * s.vy) / (2 * flight.gravity) >= s.target) s.phase = PHASE.coast;
      if (env.blocked) return apex(s, flight);
      s.y = r6(s.y + s.vy);
      break;
    case PHASE.coast:
      s.vy = r6(s.vy - flight.gravity);
      if (s.vy <= 0 || env.blocked) return apex(s, flight);
      s.y = r6(s.y + s.vy);
      break;
    case PHASE.chute:
      s.vy = -(s.y > flight.slowBelow ? flight.chuteFast : flight.chuteSlow);
      if (grounded) return land(s);
      s.y = r6(s.y + s.vy);
      break;
    case PHASE.fall:
      s.vy = r6(Math.max(-flight.maxFall, s.vy - flight.gravity));
      if (grounded) return land(s);
      s.y = r6(s.y + s.vy);
      break;
    default:
      break;
  }
  return s;
}

function apex(s, flight) {
  s.phase = flight.chute ? PHASE.chute : PHASE.fall;
  s.vy = 0;
  s.t = 0;
  s.event = 'apex';
  return s;
}

function land(s) {
  s.phase = PHASE.idle;
  s.vy = 0;
  s.t = 0;
  s.event = 'landed';
  return s;
}

/**
 * Flies a whole launch on flat ground and returns the height every `every` ticks plus
 * the highest point (used by the tests and the Java fixtures).
 */
export function simulate(flight, target, { every = 10, maxTicks = 6000 } = {}) {
  let s = launch(flight, target);
  const samples = [];
  let top = 0;
  for (let tick = 0; tick < maxTicks; tick++) {
    if (tick % every === 0) samples.push([tick, s.phase, s.y, s.vy]);
    s = step(s, flight);
    top = Math.max(top, s.y);
    if (s.phase === PHASE.idle) {
      samples.push([tick + 1, s.phase, s.y, s.vy]);
      return { samples, top, ticks: tick + 1, landed: true };
    }
  }
  return { samples, top, ticks: maxTicks, landed: false };
}
