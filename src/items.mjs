// Items: a placer for every rocket, rocket fuel, the jetpack, rocket boosts and the
// Rocket Manual. Recipes are written in Bedrock format; tools/java.mjs converts them.
import { NS } from './lib/constants.mjs';
import { pixelIcon } from './lib/texture.mjs';

/** 'paper' -> 'minecraft:paper'; ids with a namespace stay as they are (same in both editions). */
export const fullId = (id) => (id.includes(':') ? id : `minecraft:${id}`);

const FUEL_ICON = pixelIcon([
  '................',
  '......kkkk......',
  '......kyyk......',
  '.....kkkkkk.....',
  '....krrrrrrk....',
  '....krwwwwrk....',
  '....krwkkwrk....',
  '....krwkkwrk....',
  '....krwwwwrk....',
  '....krrrrrrk....',
  '....krooyork....',
  '....kroyyyrk....',
  '....krrrrrrk....',
  '....kkkkkkkk....',
  '................',
  '................',
], { k: '#2a2a2a', y: '#f2c230', r: '#d23a2a', w: '#ecebe6', o: '#ff7a1a' });

const JETPACK_ICON = pixelIcon([
  '................',
  '...rrr....rrr...',
  '..rwrrr..rwrrr..',
  '..rwrrrkkrwrrr..',
  '..rwrrrkkrwrrr..',
  '..rwrrrssrwrrr..',
  '..rwrrrssrwrrr..',
  '..rwrrrkkrwrrr..',
  '..rrrrrkkrrrrr..',
  '..rrrrr..rrrrr..',
  '...kkk....kkk...',
  '...kkk....kkk...',
  '...oyo....oyo...',
  '....o......o....',
  '................',
  '................',
], { r: '#d23a2a', w: '#f07a6a', k: '#2c2e30', s: '#8d949a', o: '#ff7a1a', y: '#ffd23a' });

const BOOST_ICON = pixelIcon([
  '................',
  '...........rr...',
  '..........rrrr..',
  '.........rrrrr..',
  '........wwwrr...',
  '.......wwwww....',
  '......wwwww.....',
  '.....kwwww......',
  '....kkkww.......',
  '...yokkk........',
  '..yyoo..........',
  '.yoo............',
  '.oo.............',
  '.o..............',
  '................',
  '................',
], { r: '#d23a2a', w: '#ecebe6', k: '#3a3a3a', o: '#ff7a1a', y: '#ffd23a' });

const MANUAL_ICON = pixelIcon([
  '................',
  '..kkkkkkkkkkk...',
  '..knnnnnnnnnnk..',
  '..knnnnnwnnnnk..',
  '..knnnnwwwnnnk..',
  '..knnnnwrwnnnk..',
  '..knnnnwwwnnnk..',
  '..knnnrwwwrnnk..',
  '..knnnrnonrnnk..',
  '..knnnnnynnnnk..',
  '..knwnnnnnnwnk..',
  '..knnnnnnnnnnk..',
  '..kpppppppppppk.',
  '..kkkkkkkkkkk...',
  '................',
  '................',
], { k: '#222222', n: '#1c2b57', w: '#ecebe6', r: '#d23a2a', o: '#ff7a1a', y: '#ffd23a', p: '#f4ecd8' });

/** Placer items plus the extras, as { id, name, icon, stack, rocket?, kind }. */
export function items(rockets) {
  const out = rockets.map((r) => ({
    id: r.id,
    name: r.name,
    icon: pixelIcon(r.icon.rows, r.icon.palette),
    stack: r.group === 'ride' ? 1 : 16,
    rocket: r.id,
    recipe: r.recipe,
  }));
  out.push(
    { id: 'rocket_fuel', name: 'Rocket Fuel', icon: FUEL_ICON, stack: 16, shapeless: { ingredients: ['blaze_powder', 'gunpowder', 'coal'], count: 2 } },
    { id: 'jetpack', name: 'Jetpack', icon: JETPACK_ICON, stack: 1, wearable: 'chest', durability: 400, recipe: { pattern: ['ILI', 'FIF', 'B B'], key: { I: 'iron_ingot', L: 'leather', F: `${NS}:rocket_fuel`, B: 'blaze_rod' } } },
    { id: 'rocket_boost', name: 'Rocket Boost', icon: BOOST_ICON, stack: 16, shapeless: { ingredients: ['firework_rocket', `${NS}:rocket_fuel`], count: 2 } },
    { id: 'rocket_manual', name: 'Rocket Manual', icon: MANUAL_ICON, stack: 1, shapeless: { ingredients: ['book', 'red_dye'], count: 1 } },
  );
  return out;
}

/** How much fuel the jetpack holds (ticks of thrust) and what one Rocket Fuel adds. */
export const JETPACK = { capacity: 400, refill: 100 };

export function buildItem(item) {
  const components = {
    'minecraft:icon': `${NS}_${item.id}`,
    'minecraft:display_name': { value: `item.${NS}:${item.id}.name` },
    'minecraft:max_stack_size': item.stack ?? 64,
  };
  // Rockets are placed by the script (scripts/place.js), which turns them to face the
  // way the player looks and checks that there is room.
  if (item.rocket) components[`${NS}:placer`] = {};
  if (item.wearable) components['minecraft:wearable'] = { slot: 'slot.armor.chest', protection: 0 };
  if (item.durability) components['minecraft:durability'] = { max_durability: item.durability };
  return {
    format_version: '1.21.90',
    'minecraft:item': {
      description: { identifier: `${NS}:${item.id}`, menu_category: { category: item.rocket ? 'items' : 'equipment' } },
      components,
    },
  };
}

/** Recipes in Bedrock format, for items and blocks alike. */
export function recipes(things) {
  const out = [];
  for (const it of things) {
    if (it.recipe) {
      out.push({
        'minecraft:recipe_shaped': {
          description: { identifier: `${NS}:${it.id}` },
          tags: ['crafting_table'],
          pattern: it.recipe.pattern,
          key: Object.fromEntries(Object.entries(it.recipe.key).map(([k, v]) => [k, { item: fullId(v) }])),
          result: { item: `${NS}:${it.id}`, count: it.recipe.count ?? 1 },
          unlock: [{ item: fullId(Object.values(it.recipe.key)[0]) }],
        },
      });
    }
    if (it.shapeless) {
      out.push({
        'minecraft:recipe_shapeless': {
          description: { identifier: `${NS}:${it.id}` },
          tags: ['crafting_table'],
          ingredients: it.shapeless.ingredients.map((i) => ({ item: fullId(i) })),
          result: { item: `${NS}:${it.id}`, count: it.shapeless.count ?? 1 },
          unlock: [{ item: fullId(it.shapeless.ingredients[0]) }],
        },
      });
    }
  }
  return out;
}
