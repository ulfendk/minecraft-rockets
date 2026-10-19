// In-game texts (.lang files on Bedrock; tools/java.mjs converts them for Java).
import { NS } from './lib/constants.mjs';
import { GEAR_INFO, STRINGS } from './i18n.mjs';

export const LOCALES = ['en_US', 'da_DK'];

/** Messages and HUD texts: key -> [English, Danish]. %s / %1$s are filled in at runtime. */
const UI = {
  [`action.interact.${NS}.board`]: ['Climb in', 'Kravl ind'],
  [`action.interact.${NS}.use`]: ['Use', 'Brug'],
  [`${NS}.hud.fuel`]: ['Fuel %s/%s', 'Brændstof %s/%s'],
  [`${NS}.fuel.water`]: ['a water bucket', 'en vandspand'],
  [`${NS}.fuel.gunpowder`]: ['gunpowder', 'krudt'],
  [`${NS}.fuel.fuel`]: ['rocket fuel', 'raketbrændstof'],
  [`${NS}.hud.pressure`]: ['Pressure', 'Tryk'],
  [`${NS}.hud.ready`]: ['Ready! Press Jump to launch', 'Klar! Tryk Hop for at affyre'],
  [`${NS}.hud.need_fuel`]: ['Load %s first', 'Fyld først %s på'],
  [`${NS}.hud.need_pad`]: ['The space rocket only lifts off from a launch pad', 'Rumraketten letter kun fra en affyringsrampe'],
  [`${NS}.hud.filled`]: ['Filled with water. Now pump it up!', 'Fyldt med vand. Pump den nu op!'],
  [`${NS}.hud.no_water`]: ['No water inside: it won’t fly far', 'Intet vand i: Den flyver ikke langt'],
  [`${NS}.hud.fuelled`]: ['Fuel loaded', 'Brændstof fyldt på'],
  [`${NS}.hud.full`]: ['Already full', 'Allerede fuld'],
  [`${NS}.hud.lit`]: ['The fuse is lit!', 'Lunten er tændt!'],
  [`${NS}.hud.flying`]: ['Flying', 'Flyver'],
  [`${NS}.hud.altitude`]: ['Height %s', 'Højde %s'],
  [`${NS}.hud.jetpack`]: ['Jetpack fuel', 'Jetpack-brændstof'],
  [`${NS}.hud.jetpack_empty`]: ['Your jetpack is out of fuel', 'Din jetpack er løbet tør for brændstof'],
  [`${NS}.hud.jetpack_refuelled`]: ['Jetpack refuelled', 'Jetpack fyldt op'],
  [`${NS}.liftoff`]: ['LIFTOFF!', 'AFFYRING!'],
  [`${NS}.countdown.sub`]: ['Mission Control: %s rocket(s) on the pads', 'Kontrolcenter: %s raket(ter) på ramperne'],
  [`${NS}.abort`]: ['Launch aborted', 'Affyring afbrudt'],
  [`${NS}.no_rockets`]: ['No fuelled rocket on a launch pad within 16 blocks', 'Ingen raket med brændstof på en affyringsrampe inden for 16 blokke'],
  [`${NS}.space`]: ['Welcome to space!', 'Velkommen til rummet!'],
  [`${NS}.space.sub`]: ['Hold on: the parachute opens now', 'Hold fast: Faldskærmen folder sig ud nu'],
  [`${NS}.no_room`]: ['Not enough room here', 'Ikke plads nok her'],
  [`${NS}.tutorial`]: [
    '§eYou are aboard a rocket.§r Press Jump to launch, sneak to get out. At the top you get a parachute.',
    '§eDu er om bord på en raket.§r Tryk Hop for at affyre, snig for at komme ud. På toppen får du en faldskærm.',
  ],
  [`${NS}.manual.title`]: ['Rocket Manual', 'Rakethåndbog'],
  [`${NS}.manual.intro`]: [
    'Place a rocket, fuel it and launch it. Pick a page to read how.',
    'Stil en raket, fyld brændstof på, og affyr den. Vælg en side for at læse hvordan.',
  ],
  [`${NS}.manual.controls`]: ['How to fly', 'Sådan flyver du'],
  [`${NS}.manual.controls_text`]: [
    'Water bottle rocket: fill it with a water bucket, pump it with an empty hand, and pump once more at full pressure. Model rocket: gunpowder, then flint and steel. Sky and space rocket: rocket fuel, climb in, press Jump. Mission Control launches every fuelled rocket on a launch pad nearby. At the top you get a parachute: steer with the movement keys.',
    'Vandraket: Fyld den med en vandspand, pump med tom hånd, og pump én gang til ved fuldt tryk. Modelraket: krudt og så flint og stål. Sky- og rumraket: raketbrændstof, kravl ind, tryk Hop. Kontrolcentret affyrer alle raketter med brændstof på en affyringsrampe i nærheden. På toppen får du en faldskærm: Styr med bevægelsestasterne.',
  ],
  [`${NS}.manual.back`]: ['Back', 'Tilbage'],
  [`${NS}.manual.apex`]: ['Flies up to %s blocks', 'Flyver op til %s blokke'],
  [`${NS}.manual.limit`]: ['Flies to the edge of the sky', 'Flyver op til himlens grænse'],
  [`${NS}.manual.pressure`]: ['Flies up to 24 blocks: pressure × 3 with water', 'Flyver op til 24 blokke: tryk × 3 med vand'],
  [`${NS}.manual.seats`]: ['Seats: %s', 'Sæder: %s'],
  [`${NS}.manual.fuel`]: ['Fuel: %s × %s', 'Brændstof: %s × %s'],
  [`${NS}.manual.welcome`]: [
    '§6You received a Rocket Manual!§r Use it to see how the rockets work.',
    '§6Du har fået en rakethåndbog!§r Brug den til at se, hvordan raketterne virker.',
  ],
};

/** Lang entries for one locale as [key, value] pairs. */
export function langEntries(locale, { rockets, items, blocks, description, version }) {
  const i = Math.max(0, LOCALES.indexOf(locale));
  const da = locale === 'da_DK' ? STRINGS.da : null;
  const pick = (pair) => pair[i] ?? pair[0];
  const out = [];
  out.push(['pack.description', da
    ? `Rockets: vandraketter, modelraketter, sky- og rumraketter, jetpack og kontrolcenter (v${version})`
    : `${description} (v${version})`]);
  for (const r of rockets) {
    out.push([`entity.${NS}:${r.id}.name`, da?.names[r.id] ?? r.name]);
    out.push([`${NS}.info.${r.id}`, da?.info[r.id] ?? r.info]);
  }
  out.push([`entity.${NS}:parachute.name`, da?.names.parachute ?? 'Parachute']);
  for (const item of items) out.push([`item.${NS}:${item.id}.name`, da?.names[item.id] ?? item.name]);
  for (const block of blocks) out.push([`tile.${NS}:${block.id}.name`, da?.names[block.id] ?? block.name]);
  for (const [id, pair] of Object.entries(GEAR_INFO)) out.push([`${NS}.info.${id}`, pick(pair)]);
  for (const [key, pair] of Object.entries(UI)) out.push([key, pick(pair)]);
  return out;
}
