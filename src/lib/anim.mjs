// Rocket animations for both editions. Moving parts are described once as drivers:
//   { bone, prop: 'rotation'|'position'|'scale', axis (0..2, or -1 for uniform scale), expr }
// Expressions use $-variables that each edition maps to its own Molang:
//   $phase (0 idle, 1 countdown, 2 burn, 3 coast, 4 chute, 5 fall), $time (seconds),
//   $water (0/1), $pressure (0..8), $fuel (fuel loaded)

import { NS } from './constants.mjs';

const BEDROCK = {
  phase: `q.property('${NS}:phase')`, water: `q.property('${NS}:water')`, pressure: `q.property('${NS}:pressure')`,
  fuel: `q.property('${NS}:fuel')`, time: 'q.life_time',
};
const JAVA = {
  phase: 'variable.r_phase', water: 'variable.r_water', pressure: 'variable.r_pressure', fuel: 'variable.r_fuel', time: 'variable.r_time',
};
/** The parachute entity has no properties of its own: only time. */
const PARACHUTE_BEDROCK = { time: 'q.life_time' };

/** Variable names for one edition ('bedrock' | 'java' | 'preview'). */
export function variables(edition, { parachute = false } = {}) {
  if (edition === 'java') return JAVA;
  if (edition === 'preview') return Object.fromEntries(Object.keys(BEDROCK).map((k) => [k, `$${k}`]));
  return parachute ? PARACHUTE_BEDROCK : BEDROCK;
}

function driverExpr(d, vars) {
  return d.expr.replace(/\$([a-z0-9]+)/g, (m, name) => {
    if (!(name in vars)) throw new Error(`Unknown animation variable ${m}`);
    return vars[name];
  });
}

/** Flames burn (and flicker) during the burn; parachutes pop out at the top of the flight. */
export function standardDrivers(spec) {
  const out = [];
  for (const b of spec.model.bones) {
    if (b.name.startsWith('flame')) {
      out.push({ bone: b.name, prop: 'scale', axis: -1, expr: '($phase == 2 ? 1 + math.sin($time * 2400) * 0.15 : 0)' });
    }
    if (b.name === 'chute') {
      out.push({ bone: 'chute', prop: 'scale', axis: -1, expr: '($phase == 4 ? 1 : 0)' });
      out.push({ bone: 'chute', prop: 'rotation', axis: 2, expr: 'math.sin($time * 120) * 5' });
    }
  }
  return out;
}

export const allDrivers = (spec) => [...standardDrivers(spec), ...(spec.visuals ?? [])];

/** One looping animation that applies every driver. */
export function rocketAnimation(spec, edition, { parachute = false } = {}) {
  const vars = variables(edition, { parachute });
  const bones = {};
  const sums = {};
  for (const d of allDrivers(spec)) {
    const key = `${d.bone}|${d.prop}`;
    const entry = (sums[key] ??= { bone: d.bone, prop: d.prop, axes: [[], [], []], uniform: [] });
    if (d.axis === -1) entry.uniform.push(driverExpr(d, vars));
    else entry.axes[d.axis].push(driverExpr(d, vars));
  }
  for (const { bone, prop, axes, uniform } of Object.values(sums)) {
    const b = (bones[bone] ??= {});
    if (prop === 'scale') {
      if (uniform.length) b.scale = [0, 1, 2].map(() => uniform.join(' * '));
      else b.scale = axes.map((list) => (list.length ? list.join(' * ') : 1));
    } else {
      b[prop] = axes.map((list) => (list.length ? list.map((e) => `(${e})`).join(' + ') : 0));
    }
  }
  return {
    format_version: '1.8.0',
    animations: { [`animation.${NS}.${spec.id}.move`]: { loop: true, bones } },
  };
}
