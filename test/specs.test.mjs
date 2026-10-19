import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRockets, ORDER } from '../src/lib/rockets.mjs';
import { buildGeometry } from '../src/lib/model.mjs';
import { rocketAnimation } from '../src/lib/anim.mjs';
import { runtimeRecord } from '../src/lib/behavior.mjs';
import { flightFixtures } from '../tools/java.mjs';
import { GEAR_INFO, STRINGS } from '../src/i18n.mjs';
import { items } from '../src/items.mjs';
import { blocks } from '../src/blocks.mjs';
import { parachute } from '../src/gear.mjs';

const rockets = await loadRockets();

test('all four rockets load, smallest first', () => {
  assert.deepEqual(rockets.map((r) => r.id), ORDER);
});

for (const r of [...rockets, parachute]) {
  test(`${r.id}: model packs into a texture and animates only existing bones`, () => {
    const geo = buildGeometry(`geometry.rockets.${r.id}`, r.model);
    assert.ok(geo.width <= 512 && geo.height <= 512);
    const bones = new Set(r.model.bones.map((b) => b.name));
    for (const anim of Object.values(rocketAnimation(r, 'bedrock').animations)) {
      for (const b of Object.keys(anim.bones)) assert.ok(bones.has(b), `animates missing bone ${b}`);
    }
  });
}

for (const r of rockets) {
  test(`${r.id}: has Danish texts, an icon and a recipe`, () => {
    assert.ok(STRINGS.da.names[r.id], 'no Danish name');
    assert.ok(STRINGS.da.info[r.id], 'no Danish description');
    assert.equal(r.icon.rows.length, 16);
    for (const row of r.icon.rows) assert.ok(row.length <= 16, `icon row too long: ${row}`);
    assert.equal(r.recipe.pattern.join('').replace(/ /g, '').length > 0, true);
  });

  test(`${r.id}: seats sit inside the rocket`, () => {
    const rec = runtimeRecord(r);
    for (const [x, y, z] of rec.seats) {
      assert.ok(Math.abs(x) <= rec.width && Math.abs(z) <= rec.width, `seat ${x} ${z} outside`);
      assert.ok(y > 0 && y < rec.height, `seat height ${y}`);
    }
  });
}

test('every item and block has a Danish name and a description', () => {
  for (const it of [...items(rockets), ...blocks]) {
    assert.ok(STRINGS.da.names[it.id], `no Danish name for ${it.id}`);
    if (!it.rocket) assert.ok(GEAR_INFO[it.id], `no description for ${it.id}`);
  }
});

test('the Java flight fixtures cover every rocket and every sample is a number', () => {
  const fixtures = flightFixtures(rockets.map(runtimeRecord));
  const ids = new Set(fixtures.map((f) => f.id));
  for (const r of rockets) assert.ok(ids.has(r.id), r.id);
  for (const f of fixtures) for (const s of f.samples) assert.ok(s.every(Number.isFinite));
});
