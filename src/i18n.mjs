// Translations. English text for rockets lives in their specs (src/rockets/*.mjs);
// Danish (and any later language) translates it here. Used by the in-game texts
// (src/lang.mjs) and the website (tools/site.mjs).

export const LANGUAGES = {
  en: { label: 'English', dir: '', htmlLang: 'en', dateLocale: 'en-GB' },
  da: { label: 'Dansk', dir: 'da', htmlLang: 'da', dateLocale: 'da-DK' },
};

export const GROUP_NAMES = {
  toy: ['Launch from the ground', 'Affyres fra jorden'],
  ride: ['Fly along', 'Flyv med'],
};

/** What each piece of gear and each block does: [English, Danish]. */
export const GEAR_INFO = {
  rocket_fuel: [
    'Fuel for the sky rocket, the space rocket and the jetpack. Right-click a rocket with it to load it, or use it while you wear a jetpack to top it up.',
    'Brændstof til sky-raketten, rumraketten og jetpacken. Højreklik på en raket med det for at fylde den, eller brug det, mens du har jetpacken på, for at fylde den op.',
  ],
  jetpack: [
    'Wear it like a chestplate. Jump, then hold Jump in the air to fly up; you drift the way you look. The bar under it is the fuel. If you fall fast, the jetpack catches you so you land softly.',
    'Tag den på som en brystplade. Hop, og hold Hop nede i luften for at flyve op; du glider den vej, du kigger. Bjælken under den er brændstoffet. Falder du hurtigt, griber jetpacken dig, så du lander blødt.',
  ],
  rocket_boost: [
    'A one-shot boost: use it to be thrown up and forward the way you look, even harder while gliding with elytra. You float down gently afterwards.',
    'Et enkelt skub: Brug det for at blive kastet op og frem i den retning, du kigger, endnu hårdere, når du svæver med elytra. Bagefter daler du blødt ned.',
  ],
  rocket_manual: ['This book.', 'Denne bog.'],
  launch_pad: [
    'Rockets stand on it. The space rocket only lifts off from a launch pad, and Mission Control launches the rockets on pads nearby.',
    'Raketter står på den. Rumraketten letter kun fra en affyringsrampe, og kontrolcentret affyrer raketterne på ramper i nærheden.',
  ],
  mission_control: [
    'Right-click it to count down from 10 and launch every fuelled rocket on a launch pad within 16 blocks. Right-click again to abort.',
    'Højreklik på det for at tælle ned fra 10 og affyre alle raketter med brændstof på en affyringsrampe inden for 16 blokke. Højreklik igen for at afbryde.',
  ],
};

const en = {
  allMods: 'All our mods',
  title: 'Rockets – Minecraft add-on and mod',
  description: (n) => `${n} rockets for Minecraft Bedrock and Java Edition, from water bottle rockets to a space rocket for four, plus a jetpack, rocket boosts and Mission Control. Free download.`,
  tagline: (n) => `${n} rockets for Minecraft Bedrock and Java Edition. Pump up a water bottle rocket, launch a model rocket, or climb into a rocket and fly to the edge of the sky, then parachute home.`,
  download: 'iPad, phone, console & Windows: Bedrock',
  downloadJava: 'Mac & PC: Java Edition',
  which: '<b>Which one do I need?</b> Playing on an <b>iPad</b>, iPhone, Android, Xbox, PlayStation, Switch or Minecraft for Windows? That is <b>Bedrock Edition</b> – take the first download. Playing on a computer with the Minecraft <b>Java Edition</b> launcher (Mac, Windows or Linux)? Take the Java download. Not sure? If you bought Minecraft in the App Store or Google Play, it is Bedrock.',
  bedrockTitle: 'Install on iPad, phone, console or Windows (Bedrock)',
  javaTitle: 'Install on Mac or PC (Java Edition)',
  javaSteps: (jar, fabric, api, gecko) => [
    `<strong>Install</strong> ${fabric} for Minecraft 26.3.`,
    `<strong>Download</strong> ${jar}, plus ${api} and ${gecko}.`,
    '<strong>Put all three files</strong> in your <em>mods</em> folder and start Minecraft with the Fabric profile.',
    '<strong>Find the rockets</strong> in the <em>Rockets</em> creative tab, or craft them.',
  ],
  allVersions: 'All versions',
  latestVersion: 'Latest version',
  released: 'released',
  install: 'Install',
  steps: (link) => [
    `<strong>Download</strong> ${link} on your Windows PC, Android phone or tablet, or iPhone or iPad.`,
    '<strong>Open the file.</strong> Minecraft starts and imports both packs.',
    '<strong>Create or edit a world.</strong> Under <em>Behavior Packs</em>, turn on <em>Rockets</em>. The resource pack is added automatically.',
    '<strong>Find the rockets</strong> in the creative inventory, or craft them. Place one and right-click (or tap) it.',
  ],
  serverNote: (bp, rp) => `Running a server? Use the separate ${bp('behavior pack')} and ${rp('resource pack')}. Xbox, PlayStation and Switch can’t import add-ons from files, but you can join a world or Realm that has the add-on.`,
  upgradeTitle: 'Upgrading to a new version',
  upgradeSteps: [
    '<strong>Download the new version</strong> and open the file. A newer version replaces the one you have, and your worlds use it the next time you load them.',
    '<strong>Still running the old version?</strong> (or Minecraft says it is already installed): go to <em>Settings → Storage</em>, delete Rockets under both <em>Resource Packs</em> and <em>Behavior Packs</em>, then open the new file again.',
    '<strong>Check the world:</strong> in the world’s <em>Edit</em> screen, under <em>Behavior Packs</em> and <em>Resource Packs</em>, make sure Rockets is active. A world you imported or downloaded can carry its own old copy: deactivate it there, save, and activate the new one.',
  ],
  upgradeServerNote: 'On a server, replace the add-on’s folders in <em>behavior_packs</em> and <em>resource_packs</em> with the new ones and restart it.',
  upgradeJava: 'Java Edition: delete the old Rockets jar from your <em>mods</em> folder and put the new one in its place. Keep only one version in the folder. If the new version needs a newer Fabric API or GeckoLib, update those too.',
  rockets: 'The rockets',
  rocketsLede: 'From a bottle you pump up by hand to a space rocket for four. Hover over (or tap) a rocket to see it fly.',
  filterLabel: 'Filter rockets',
  all: 'All',
  stats: { apex: 'Flies up', limit: 'to the edge of the sky', blocks: 'blocks', seats: 'Seats', fuel: 'Fuel', pressure: '24 blocks at full pressure' },
  howTitle: 'How to fly',
  how: [
    ['Water bottle rocket', 'Right-click with a water bucket to fill it, then right-click with an empty hand to pump. Pump once more at full pressure and it goes.'],
    ['Model rocket', 'Load a gunpowder, then light it with flint and steel. Step back: three seconds.'],
    ['Sky and space rocket', 'Load rocket fuel, climb in and press Jump (the space bar, or the jump button). The space rocket must stand on a launch pad.'],
    ['Mission Control', 'Right-click it to count down from 10. Every fuelled rocket on a launch pad within 16 blocks lifts off at zero.'],
    ['Coming down', 'At the top you jump out with a parachute. Steer with the movement keys; you land softly. Sneak out of a rocket in mid-air and the parachute opens too.'],
    ['Jetpack', 'Wear it, jump, and hold Jump in the air. Use rocket fuel to fill it up.'],
  ],
  gearTitle: 'Gear and blocks',
  featuresTitle: 'More than fireworks',
  features: [
    ['Real flights', 'Rockets speed up, cut their engines and coast to the top, with flames, smoke and a roar. The space rocket goes all the way to the build limit.'],
    ['Countdowns', 'Mission Control counts down on everyone’s screen nearby, beeping each second, and launches all the rockets on the pads at once.'],
    ['Safe landings', 'Riders always come down under a parachute and never take fall damage. The rockets parachute down too, ready for the next flight.'],
    ['Fun for everyone', 'Water bottle rockets need no fuel at all, just water and a lot of pumping. Great for a first rocket.'],
  ],
  footerSource: (src, issues) => `Rockets is free and open source. ${src('Source code on GitHub')} · ${issues('Report a problem')}`,
  footerLegal: 'Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.',
};

const da = {
  allMods: 'Alle vores mods',
  title: 'Rockets – raketter til Minecraft',
  description: (n) => `${n} raketter til Minecraft Bedrock og Java Edition, fra vandraketter til en rumraket til fire, plus jetpack, raketboost og kontrolcenter. Gratis download.`,
  tagline: (n) => `${n} raketter til Minecraft Bedrock og Java Edition. Pump en vandraket op, affyr en modelraket, eller kravl ind i en raket og flyv op til himlens grænse, og svæv hjem i faldskærm.`,
  download: 'iPad, telefon, konsol & Windows: Bedrock',
  downloadJava: 'Mac & pc: Java Edition',
  which: '<b>Hvilken skal jeg bruge?</b> Spiller du på <b>iPad</b>, iPhone, Android, Xbox, PlayStation, Switch eller Minecraft til Windows? Så er det <b>Bedrock Edition</b> – tag den første download. Spiller du på en computer med Minecraft <b>Java Edition</b>-launcheren (Mac, Windows eller Linux)? Så tag Java-downloaden. I tvivl? Hvis Minecraft er købt i App Store eller Google Play, er det Bedrock.',
  bedrockTitle: 'Installation på iPad, telefon, konsol eller Windows (Bedrock)',
  javaTitle: 'Installation på Mac eller pc (Java Edition)',
  javaSteps: (jar, fabric, api, gecko) => [
    `<strong>Installér</strong> ${fabric} til Minecraft 26.3.`,
    `<strong>Hent</strong> ${jar} samt ${api} og ${gecko}.`,
    '<strong>Læg alle tre filer</strong> i din <em>mods</em>-mappe, og start Minecraft med Fabric-profilen.',
    '<strong>Find raketterne</strong> på fanen <em>Raketter</em> i kreativ tilstand, eller lav dem.',
  ],
  allVersions: 'Alle versioner',
  latestVersion: 'Nyeste version',
  released: 'udgivet',
  install: 'Installation',
  steps: (link) => [
    `<strong>Hent</strong> ${link} på din Windows-pc, Android-telefon eller -tablet eller din iPhone eller iPad.`,
    '<strong>Åbn filen.</strong> Minecraft starter og importerer begge pakker.',
    '<strong>Opret eller rediger en verden.</strong> Slå <em>Rockets</em> til under <em>Adfærdspakker</em>. Ressourcepakken bliver tilføjet automatisk.',
    '<strong>Find raketterne</strong> i det kreative inventar, eller lav dem. Stil en raket, og højreklik (eller tryk) på den.',
  ],
  serverNote: (bp, rp) => `Kører du en server? Brug den separate ${bp('adfærdspakke')} og ${rp('ressourcepakke')}. Xbox, PlayStation og Switch kan ikke importere tilføjelser fra filer, men du kan deltage i en verden eller et Realm, der har tilføjelsen.`,
  upgradeTitle: 'Opdatering til en ny version',
  upgradeSteps: [
    '<strong>Hent den nye version</strong>, og åbn filen. En nyere version erstatter den, du har, og dine verdener bruger den, næste gang du åbner dem.',
    '<strong>Kører den gamle version stadig?</strong> (eller siger Minecraft, at den allerede er installeret): Gå til <em>Indstillinger → Lagerplads</em>, slet Rockets under både <em>Ressourcepakker</em> og <em>Adfærdspakker</em>, og åbn så den nye fil igen.',
    '<strong>Tjek verdenen:</strong> Sørg for, at Rockets er slået til under <em>Adfærdspakker</em> og <em>Ressourcepakker</em>, når du redigerer verdenen. En verden, du har importeret eller hentet, kan have sin egen gamle kopi med: Slå den fra dér, gem, og slå den nye til.',
  ],
  upgradeServerNote: 'På en server skal du erstatte tilføjelsens mapper i <em>behavior_packs</em> og <em>resource_packs</em> med de nye og genstarte den.',
  upgradeJava: 'Java Edition: Slet den gamle Rockets-jar fra din <em>mods</em>-mappe, og læg den nye i stedet. Hav kun én version i mappen. Kræver den nye version en nyere Fabric API eller GeckoLib, så opdatér dem også.',
  rockets: 'Raketterne',
  rocketsLede: 'Fra en flaske, du pumper op med hånden, til en rumraket til fire. Hold musen over (eller tryk på) en raket for at se den flyve.',
  filterLabel: 'Filtrer raketter',
  all: 'Alle',
  stats: { apex: 'Flyver op', limit: 'til himlens grænse', blocks: 'blokke', seats: 'Sæder', fuel: 'Brændstof', pressure: '24 blokke ved fuldt tryk' },
  howTitle: 'Sådan flyver du',
  how: [
    ['Vandraket', 'Højreklik med en vandspand for at fylde den, og højreklik så med tom hånd for at pumpe. Pump én gang til ved fuldt tryk, så letter den.'],
    ['Modelraket', 'Fyld krudt i, og tænd den med flint og stål. Gå et skridt tilbage: tre sekunder.'],
    ['Sky- og rumraket', 'Fyld raketbrændstof på, kravl ind, og tryk Hop (mellemrum eller hop-knappen). Rumraketten skal stå på en affyringsrampe.'],
    ['Kontrolcenter', 'Højreklik på det for at tælle ned fra 10. Alle raketter med brændstof på en affyringsrampe inden for 16 blokke letter ved nul.'],
    ['Ned igen', 'På toppen hopper du ud med faldskærm. Styr med bevægelsestasterne; du lander blødt. Sniger du dig ud af en raket i luften, folder faldskærmen sig også ud.'],
    ['Jetpack', 'Tag den på, hop, og hold Hop nede i luften. Brug raketbrændstof til at fylde den op.'],
  ],
  gearTitle: 'Udstyr og blokke',
  featuresTitle: 'Mere end fyrværkeri',
  features: [
    ['Rigtige flyveture', 'Raketterne speeder op, slukker motoren og glider op til toppen, med flammer, røg og brøl. Rumraketten flyver helt op til byggegrænsen.'],
    ['Nedtællinger', 'Kontrolcentret tæller ned på alles skærme i nærheden, bipper hvert sekund og affyrer alle raketterne på ramperne på én gang.'],
    ['Sikre landinger', 'Passagerer kommer altid ned i faldskærm og slår sig aldrig. Raketterne svæver også ned i faldskærm, klar til næste tur.'],
    ['Sjovt for alle', 'Vandraketter skal ikke have brændstof, kun vand og en masse pumpen. Perfekt som første raket.'],
  ],
  footerSource: (src, issues) => `Rockets er gratis og open source. ${src('Kildekode på GitHub')} · ${issues('Rapportér et problem')}`,
  footerLegal: 'Ikke et officielt Minecraft-produkt. Ikke godkendt af eller tilknyttet Mojang eller Microsoft.',

  names: {
    bottle_rocket: 'Vandraket', model_rocket: 'Modelraket', sky_rocket: 'Sky-raket', space_rocket: 'Rumraket',
    rocket_fuel: 'Raketbrændstof', jetpack: 'Jetpack', rocket_boost: 'Raketboost', rocket_manual: 'Rakethåndbog',
    launch_pad: 'Affyringsrampe', mission_control: 'Kontrolcenter', parachute: 'Faldskærm',
  },
  info: {
    bottle_rocket: 'En plastikflaske med finner. Fyld den med en vandspand, og højreklik så på den med tom hånd for at pumpe den op. Pump forbi fuldt tryk, så skyder den op i en sky af vand. Mere tryk flyver højere, og uden vand letter den knap nok.',
    model_rocket: 'En modelraket med en krudtmotor. Fyld den med krudt, og tænd den med flint og stål: Tre sekunder senere skyder den 48 blokke op, folder sin faldskærm ud og svæver ned igen, klar til en ny tur.',
    sky_rocket: 'En raket til én med et glascockpit. Fyld den med raketbrændstof, kravl ind, og tryk Hop: Efter tre sekunders nedtælling flyver den dig omkring hundrede blokke op. På toppen hopper du ud med faldskærm og svæver ned, mens du styrer.',
    space_rocket: 'En stor totrinsraket med en kapsel til fire. Stil den på en affyringsrampe, fyld fire raketbrændstof på, og kravl ind. Tryk Hop (eller start kontrolcentret), så flyver den helt op til himlens grænse. På toppen hopper alle ud og svæver hjem i faldskærm.',
  },
};

export const STRINGS = { en, da };
