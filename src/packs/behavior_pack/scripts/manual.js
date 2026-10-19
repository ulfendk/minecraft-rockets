// The Rocket Manual: how to fly, a page per rocket and a page per piece of gear.
import { ItemStack, system, world } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { ROCKETS } from './data.js';
import { NS } from './util.js';

const GIVEN = `${NS}:manual_given`;
const GEAR = [
  ['rocket_fuel', 'item', `textures/items/${NS}/rocket_fuel`],
  ['jetpack', 'item', `textures/items/${NS}/jetpack`],
  ['rocket_boost', 'item', `textures/items/${NS}/rocket_boost`],
  ['launch_pad', 'tile', `textures/blocks/${NS}/launch_pad_top`],
  ['mission_control', 'tile', `textures/blocks/${NS}/mission_control_top`],
];

function openIndex(player) {
  const form = new ActionFormData().title({ translate: `${NS}.manual.title` }).body({ translate: `${NS}.manual.intro` });
  form.button({ translate: `${NS}.manual.controls` }, 'textures/ui/controller_glyph_color');
  for (const r of ROCKETS) form.button({ translate: `entity.${NS}:${r.id}.name` }, `textures/ui/${NS}/${r.id}`);
  for (const [id, kind, icon] of GEAR) form.button({ translate: `${kind}.${NS}:${id}.name` }, icon);
  form.show(player).then((res) => {
    if (res.canceled || res.selection === undefined) return;
    if (res.selection === 0) return back(player, { translate: `${NS}.manual.controls` }, [{ translate: `${NS}.manual.controls_text` }]);
    const i = res.selection - 1;
    if (i < ROCKETS.length) return openRocket(player, ROCKETS[i]);
    const [id, kind] = GEAR[i - ROCKETS.length];
    back(player, { translate: `${kind}.${NS}:${id}.name` }, [{ translate: `${NS}.info.${id}` }]);
  });
}

function back(player, title, body) {
  new ActionFormData().title(title).body({ rawtext: body }).button({ translate: `${NS}.manual.back` }).show(player).then((res) => {
    if (!res.canceled) openIndex(player);
  });
}

function openRocket(player, r) {
  const body = [{ translate: `${NS}.info.${r.id}` }, { text: '\n\n' }];
  if (r.flight.pressure) body.push({ translate: `${NS}.manual.pressure` });
  else if (r.flight.apex < 0) body.push({ translate: `${NS}.manual.limit` });
  else body.push({ translate: `${NS}.manual.apex`, with: [String(r.flight.apex)] });
  body.push({ text: '\n' }, { translate: `${NS}.manual.fuel`, with: { rawtext: [{ text: String(r.fuel.amount) }, { translate: `${NS}.fuel.${r.fuel.kind}` }] } });
  if (r.seats.length) body.push({ text: '\n' }, { translate: `${NS}.manual.seats`, with: [String(r.seats.length)] });
  back(player, { translate: `entity.${NS}:${r.id}.name` }, body);
}

export function setupManual() {
  world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
    if (itemStack?.typeId !== `${NS}:rocket_manual`) return;
    source.playSound('item.book.page_turn');
    system.run(() => openIndex(source));
  });
  // Everyone gets a manual the first time they join a world with the add-on.
  world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (!initialSpawn || player.getDynamicProperty(GIVEN)) return;
    player.setDynamicProperty(GIVEN, true);
    system.runTimeout(() => {
      try {
        player.getComponent('minecraft:inventory')?.container?.addItem(new ItemStack(`${NS}:rocket_manual`, 1));
        player.sendMessage({ translate: `${NS}.manual.welcome` });
      } catch {
        // Player left before the timeout.
      }
    }, 60);
  });
}
