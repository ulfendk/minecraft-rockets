import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launch, PHASE, simulate, step, targetHeight } from '../src/lib/flight.mjs';
import { loadRockets } from '../src/lib/rockets.mjs';

const rockets = await loadRockets();
const byId = Object.fromEntries(rockets.map((r) => [r.id, r]));

for (const r of rockets) {
  const target = targetHeight(r.flight, { pressure: 8, water: true, ceiling: 250 });
  test(`${r.id}: climbs to about its target (${target} blocks), stays under top speed and lands`, () => {
    const run = simulate(r.flight, target);
    assert.ok(run.landed, 'never landed');
    assert.ok(run.top >= target * 0.9 && run.top <= target + r.flight.maxSpeed + 0.5, `top ${run.top}`);
    for (const [, , , vy] of run.samples) assert.ok(vy <= r.flight.maxSpeed + 1e-9, `speed ${vy}`);
  });
}

test('the bottle rocket flies higher with more pressure, and much lower without water', () => {
  const f = byId.bottle_rocket.flight;
  const tops = [2, 4, 8].map((pressure) => simulate(f, targetHeight(f, { pressure, water: true })).top);
  assert.ok(tops[0] < tops[1] && tops[1] < tops[2], tops.join(' < '));
  const dry = simulate(f, targetHeight(f, { pressure: 8, water: false })).top;
  assert.ok(dry < tops[2] / 2, `dry ${dry}`);
});

test('the space rocket goes as high as the world lets it', () => {
  const f = byId.space_rocket.flight;
  assert.equal(targetHeight(f, { ceiling: 250 }), 250);
  assert.equal(targetHeight(f, { ceiling: 100 }), 100);
});

test('rockets with riders parachute down; the bottle rocket just falls', () => {
  for (const r of rockets) {
    let s = launch(r.flight, 20, 0);
    let apex = null;
    for (let i = 0; i < 2000 && s.phase !== PHASE.idle; i++) {
      s = step(s, r.flight);
      if (s.event === 'apex') apex = s.phase;
    }
    assert.equal(apex, r.flight.chute ? PHASE.chute : PHASE.fall, r.id);
  }
});

test('the countdown runs before liftoff', () => {
  const f = byId.sky_rocket.flight;
  let s = launch(f, 50);
  assert.equal(s.phase, PHASE.countdown);
  for (let i = 0; i < f.countdown - 1; i++) s = step(s, f);
  assert.equal(s.phase, PHASE.countdown);
  s = step(s, f);
  assert.equal(s.phase, PHASE.burn);
  assert.equal(s.event, 'liftoff');
});

test('a block over the nose ends the climb', () => {
  const f = byId.sky_rocket.flight;
  let s = launch(f, 90, 0);
  for (let i = 0; i < 5; i++) s = step(s, f);
  s = step(s, f, { blocked: true });
  assert.equal(s.event, 'apex');
  assert.equal(s.phase, PHASE.chute);
});

test('under a parachute rockets come down fast up high and slowly near the ground', () => {
  const f = byId.space_rocket.flight;
  const high = step({ ...launch(f, 100, 0), phase: PHASE.chute, y: 80 }, f);
  const low = step({ ...launch(f, 100, 0), phase: PHASE.chute, y: 5 }, f);
  assert.equal(high.vy, -f.chuteFast);
  assert.equal(low.vy, -f.chuteSlow);
});
