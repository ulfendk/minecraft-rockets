// Builds the GitHub Pages site into build/site/ (English, plus Danish in da/).
// The latest release is looked up in the browser (GitHub API), with the version from
// package.json as the fallback, and the page reloads itself when a new release is out.
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { build } from './build.mjs';
import { render } from './render.mjs';
import { rocketAnimation } from '../src/lib/anim.mjs';
import { blocks } from '../src/blocks.mjs';
import { GEAR_INFO, GROUP_NAMES, LANGUAGES, STRINGS } from '../src/i18n.mjs';

const OUT = 'build/site';
const RP = 'build/resource_pack';
const repo = process.env.GITHUB_REPOSITORY ?? process.env.SITE_REPO ?? 'ulfendk/minecraft-rockets';
const [owner, name] = repo.split('/');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function upscale(buf, k) {
  const src = PNG.sync.read(buf);
  const out = new PNG({ width: src.width * k, height: src.height * k });
  for (let y = 0; y < out.height; y++)
    for (let x = 0; x < out.width; x++) {
      const s = ((Math.floor(y / k) * src.width) + Math.floor(x / k)) * 4;
      out.data.set(src.data.subarray(s, s + 4), (y * out.width + x) * 4);
    }
  return PNG.sync.write(out);
}

const { rockets, items, version } = await build({ quiet: true });
await mkdir(join(OUT, 'img', 'rockets'), { recursive: true });
await mkdir(join(OUT, 'img', 'items'), { recursive: true });

// Two pictures per rocket: on the pad, and flying (shown on hover).
for (const m of rockets) {
  const geo = JSON.parse(await readFile(join(RP, 'models/entity', `${m.id}.geo.json`), 'utf8'));
  const tex = await readFile(join(RP, 'textures/entity/rockets', `${m.id}.png`));
  const anim = Object.values(rocketAnimation(m, 'preview').animations)[0];
  await writeFile(join(OUT, 'img', 'rockets', `${m.id}.png`), render(geo, tex, { yaw: 35, size: 320, anim, vars: { phase: 0, water: 1 } }));
  await writeFile(join(OUT, 'img', 'rockets', `${m.id}_work.png`), render(geo, tex, { yaw: 35, size: 320, anim, vars: { phase: 2, water: 1 } }));
}
for (const item of [...items, ...blocks.map((b) => ({ ...b, icon: b.textures.top }))]) {
  await writeFile(join(OUT, 'img', 'items', `${item.id}.png`), upscale(item.icon, 4));
}
await copyFile(join(RP, 'pack_icon.png'), join(OUT, 'img', 'icon.png'));
await copyFile(join(RP, 'pack_icon.png'), join(OUT, 'favicon.png'));

const releases = `https://github.com/${repo}/releases`;
const dl = (file) => `${releases}/latest/download/${file}`;
const ROOT_URL = `https://${owner}.github.io/${name}/`;

function page(lang) {
  const L = LANGUAGES[lang];
  const t = STRINGS[lang];
  const i = lang === 'da' ? 1 : 0;
  const up = L.dir ? '../' : '';
  const link = (href) => (text) => `<a href="${href}">${esc(text)}</a>`;
  const nameOf = (id, fallback) => t.names?.[id] ?? fallback;

  const fuelNames = { water: ['Water bucket', 'Vandspand'], gunpowder: ['Gunpowder', 'Krudt'], fuel: ['Rocket Fuel', 'Raketbrændstof'] };
  const rocketHtml = rockets.map((m) => {
    const apex = m.flight.pressure ? t.stats.pressure : m.flight.apex === 'limit' ? t.stats.limit : `${m.flight.apex} ${t.stats.blocks}`;
    const tags = [`${t.stats.apex}: ${apex}`, `${t.stats.fuel}: ${m.fuel.amount} × ${fuelNames[m.fuel.kind][i]}`];
    if (m.seats.length) tags.push(`${t.stats.seats}: ${m.seats.length}`);
    return `
      <article class="card" data-group="${m.group}">
        <div class="portrait"><img src="${up}img/rockets/${m.id}.png" data-work="${up}img/rockets/${m.id}_work.png" alt="${esc(nameOf(m.id, m.name))}" loading="lazy" width="320" height="320"></div>
        <div class="card-body">
          <h3>${esc(nameOf(m.id, m.name))}</h3>
          <p class="where">${esc(GROUP_NAMES[m.group][i])}</p>
          <p>${esc(t.info?.[m.id] ?? m.info)}</p>
          <ul class="tags">${tags.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
        </div>
      </article>`;
  }).join('');

  const gearHtml = [...items.filter((it) => !it.rocket), ...blocks].filter((it) => GEAR_INFO[it.id] && it.id !== 'rocket_manual').map((it) => `
        <div class="feature gear"><img src="${up}img/items/${it.id}.png" alt="" width="48" height="48"><div><h3>${esc(nameOf(it.id, it.name))}</h3><p>${esc(GEAR_INFO[it.id][i])}</p></div></div>`).join('');

  const switcher = Object.entries(LANGUAGES).filter(([code]) => code !== lang)
    .map(([, other]) => `<a class="lang" href="${up}${other.dir ? other.dir + '/' : ''}" hreflang="${other.htmlLang}" lang="${other.htmlLang}">${esc(other.label)}</a>`).join('');
  const alternates = Object.values(LANGUAGES)
    .map((other) => `<link rel="alternate" hreflang="${other.htmlLang}" href="${ROOT_URL}${other.dir ? other.dir + '/' : ''}">`).join('\n');
  const filters = [['all', t.all], ...Object.entries(GROUP_NAMES).map(([k, v]) => [k, v[i]])];

  return `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.description(rockets.length))}">
${alternates}
<link rel="icon" href="${up}favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #f4f1ea; --surface: #ffffff; --ink: #1f1d1a; --muted: #625d55; --line: #e2dccf;
  --accent: #c0321f; --accent-ink: #1b1c1d; --chip: #f3e2dc; --hero-from: #0b1033; --hero-to: #8a3d5c;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #161514; --surface: #211f1d; --ink: #f2eee6; --muted: #b3ab9d; --line: #36322d;
    --accent: #ff8a5c; --accent-ink: #1b1c1d; --chip: #3a2622; --hero-from: #070a22; --hero-to: #5a2840;
  }
}
:root[data-theme="dark"] {
  --bg: #161514; --surface: #211f1d; --ink: #f2eee6; --muted: #b3ab9d; --line: #36322d;
  --accent: #ff8a5c; --accent-ink: #1b1c1d; --chip: #3a2622; --hero-from: #070a22; --hero-to: #5a2840;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
img { image-rendering: pixelated; max-width: 100%; }
a { color: var(--accent); }
h1, h2, h3 { font-family: "Pixelify Sans", system-ui, sans-serif; font-weight: 500; line-height: 1.15; letter-spacing: .01em; }
.wrap { max-width: 1100px; margin: 0 auto; padding: 0 16px; }
header.hero { color: #fff8ec; background: linear-gradient(180deg, var(--hero-from), var(--hero-to)); padding: 48px 0 56px; position: relative; }
header.hero::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 12px; background: repeating-linear-gradient(45deg, #f2c230 0 14px, #1b1c1d 14px 28px); }
.hero .wrap { display: grid; grid-template-columns: auto 1fr; gap: 32px; align-items: center; }
.hero img.icon { width: 160px; height: 160px; border-radius: 12px; box-shadow: 0 8px 30px rgb(0 0 0 / .35); }
.hero h1 { font-size: clamp(2.2rem, 6vw, 3.6rem); margin: 0 0 8px; }
.hero p { margin: 0 0 20px; font-size: 1.15rem; max-width: 48ch; color: #fbe9cf; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 10px; font-weight: 700; text-decoration: none; background: #ff8a3d; color: #1b1c1d; box-shadow: 0 3px 0 #a64a12; }
.btn:hover { transform: translateY(-1px); }
.btn.ghost { background: transparent; color: #fff3df; box-shadow: inset 0 0 0 2px rgb(255 243 223 / .6); }
.version { font-size: .95rem; color: #fbe9cf; }
.version strong { color: #fff; }
.which { margin: 16px 0 6px; background: rgb(0 0 0 / .22); border: 1px solid rgb(255 243 223 / .35); border-radius: 10px; padding: 10px 14px; max-width: 62ch; font-size: .95rem; color: #fff3df; }
.which b { color: #fff; }
.hero .langs { display: flex; justify-content: flex-end; margin-top: -28px; margin-bottom: 8px; }
.hero .langs a { color: #fff3df; font-weight: 600; text-decoration: none; padding: 4px 12px; border-radius: 999px; box-shadow: inset 0 0 0 1.5px rgb(255 243 223 / .55); font-size: .9rem; }
main section { padding: 48px 0 8px; }
h2 { font-size: 2rem; margin: 0 0 8px; }
.lede { color: var(--muted); margin: 0 0 24px; max-width: 70ch; }
.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; padding: 0; list-style: none; counter-reset: s; }
.steps li { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px 16px 16px 56px; position: relative; overflow-wrap: anywhere; }
.steps li::before { counter-increment: s; content: counter(s); position: absolute; left: 16px; top: 14px; width: 28px; height: 28px; border-radius: 50%; background: #ff8a3d; color: #1b1c1d; display: grid; place-items: center; font-weight: 700; }
.note { color: var(--muted); font-size: .92rem; }
h3.edition { margin: 18px 0 10px; font: 700 1.15rem/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }
.filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 20px; }
.filters button { font: inherit; border: 1px solid var(--line); background: var(--surface); color: var(--ink); padding: 6px 14px; border-radius: 999px; cursor: pointer; }
.filters button[aria-pressed="true"] { background: #ff8a3d; color: #1b1c1d; border-color: #ff8a3d; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 18px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
.card[hidden] { display: none; }
.portrait { background: radial-gradient(circle at 50% 80%, #3d4c8f 0, #1c2457 55%, #0b1033 100%); aspect-ratio: 1; display: grid; place-items: center; }
.portrait img { width: 88%; height: auto; }
.card-body { padding: 14px 16px 16px; }
.card h3 { margin: 0; font: 700 1.3rem/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }
.where { margin: 2px 0 8px; color: var(--accent); font-weight: 600; font-size: .9rem; }
.card p { margin: 0 0 10px; }
.stats { color: var(--muted); font-size: .9rem; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; padding: 0; margin: 0 0 10px; list-style: none; }
.tags li { background: var(--chip); border-radius: 6px; padding: 2px 8px; font-size: .82rem; }
.controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; }
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 18px; }
.panel h3 { margin: 0 0 10px; font: 700 1.15rem/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }
.panel table { border-collapse: collapse; width: 100%; }
.panel td { padding: 6px 8px; border-top: 1px solid var(--line); vertical-align: top; }
.panel td:first-child { white-space: nowrap; font-weight: 700; }
kbd { background: var(--chip); border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 5px; padding: 0 6px; font: 600 .85rem/1.6 ui-monospace, monospace; }
.features { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.feature { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 18px; }
.feature h3 { margin: 0 0 6px; font: 700 1.1rem/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }
.feature p { margin: 0; color: var(--muted); }
.feature.gear { display: flex; gap: 14px; align-items: flex-start; }
.feature.gear img { flex: none; }
.how { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
.items { display: flex; flex-wrap: wrap; gap: 12px; list-style: none; padding: 0; }
.items li { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 8px 14px 8px 8px; }
footer { margin-top: 56px; padding: 28px 0 40px; border-top: 1px solid var(--line); color: var(--muted); font-size: .9rem; }
@media (max-width: 640px) {
  .hero .wrap { grid-template-columns: 1fr; text-align: center; justify-items: center; }
  .hero img.icon { width: 112px; height: 112px; }
  .actions { justify-content: center; }
}
</style>
</head>
<body>
<header class="hero">
  <nav class="langs wrap" aria-label="Language">${switcher}</nav>
  <div class="wrap">
    <img class="icon" src="${up}img/icon.png" alt="" width="160" height="160">
    <div>
      <h1>Rockets</h1>
      <p>${esc(t.tagline(rockets.length))}</p>
      <div class="actions">
        <a class="btn" id="download" href="${dl('Rockets.mcaddon')}">⬇ ${esc(t.download)}</a>
        <a class="btn" href="${dl('Rockets-fabric.jar')}">⬇ ${esc(t.downloadJava)}</a>
        <a class="btn ghost" href="${releases}">${esc(t.allVersions)}</a>
      </div>
      <p class="which">${t.which}</p>
      <p class="version" id="version">${esc(t.latestVersion)}: <strong>${esc(version)}</strong></p>
    </div>
  </div>
</header>
<main class="wrap">
  <section id="install">
    <h2>${esc(t.install)}</h2>
    <h3 class="edition">${esc(t.bedrockTitle)}</h3>
    <ol class="steps">
${t.steps(`<a href="${dl('Rockets.mcaddon')}">Rockets.mcaddon</a>`).map((step) => `      <li>${step}</li>`).join('\n')}
    </ol>
    <p class="note">${t.serverNote(link(dl('Rockets_BP.mcpack')), link(dl('Rockets_RP.mcpack')))}</p>
    <h3 class="edition">${esc(t.javaTitle)}</h3>
    <ol class="steps">
${t.javaSteps(
    `<a href="${dl('Rockets-fabric.jar')}">Rockets-fabric.jar</a>`,
    '<a href="https://fabricmc.net/use/installer/">Fabric Loader</a>',
    '<a href="https://modrinth.com/mod/fabric-api">Fabric API</a>',
    '<a href="https://modrinth.com/mod/geckolib">GeckoLib</a>',
  ).map((step) => `      <li>${step}</li>`).join('\n')}
    </ol>
    <h3 class="edition">${esc(t.upgradeTitle)}</h3>
    <ol class="steps">
${t.upgradeSteps.map((step) => `      <li>${step}</li>`).join('\n')}
    </ol>
    <p class="note">${t.upgradeServerNote}</p>
    <p>${t.upgradeJava}</p>
  </section>

  <section id="rockets">
    <h2>${esc(t.rockets)}</h2>
    <p class="lede">${esc(t.rocketsLede)}</p>
    <div class="filters" role="group" aria-label="${esc(t.filterLabel)}">
${filters.map(([key, label], n) => `      <button aria-pressed="${n === 0}" data-filter="${key}">${esc(label)}</button>`).join('\n')}
    </div>
    <div class="grid" id="grid">${rocketHtml}
    </div>
  </section>

  <section id="how">
    <h2>${esc(t.howTitle)}</h2>
    <div class="how">
${t.how.map(([title, text]) => `      <div class="feature"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`).join('\n')}
    </div>
  </section>

  <section id="gear">
    <h2>${esc(t.gearTitle)}</h2>
    <div class="features">${gearHtml}
    </div>
  </section>

  <section id="features">
    <h2>${esc(t.featuresTitle)}</h2>
    <div class="features">
${t.features.map(([title, text]) => `      <div class="feature"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`).join('\n')}
    </div>
  </section>
</main>
<footer>
  <div class="wrap">
    <p>${t.footerSource(link(`https://github.com/${repo}`), link(`https://github.com/${repo}/issues`))}</p>
    <p>${esc(t.footerLegal)}</p>
  </div>
</footer>
<script>
// Rocket filters
const buttons = document.querySelectorAll('.filters button');
buttons.forEach((b) => b.addEventListener('click', () => {
  buttons.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
  const f = b.dataset.filter;
  document.querySelectorAll('.card').forEach((c) => { c.hidden = !(f === 'all' || c.dataset.group === f); });
}));
// Hover (or tap) a rocket to see it fly.
document.querySelectorAll('.portrait img').forEach((img) => {
  const rest = img.src, work = img.dataset.work;
  new Image().src = work;
  const show = (on) => { img.src = on ? work : rest; };
  img.parentElement.addEventListener('mouseenter', () => show(true));
  img.parentElement.addEventListener('mouseleave', () => show(false));
  img.parentElement.addEventListener('click', () => show(img.src === rest));
});
// Latest release from GitHub
fetch('https://api.github.com/repos/${owner}/${name}/releases/latest')
  .then((r) => (r.ok ? r.json() : null))
  .then((rel) => {
    if (!rel || !rel.tag_name) return;
    const date = new Date(rel.published_at).toLocaleDateString('${L.dateLocale}', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('version').innerHTML = '${t.latestVersion}: <strong>' + rel.tag_name.replace(/^v/, '') + '</strong> · ${t.released} ' + date;
  })
  .catch(() => {});

// Reload when a new release has been published. The site is redeployed with every release
// and writes version.json; compare it with the version this page was built with.
const PAGE_VERSION = '${version}';
let reloading = false;
function checkForUpdate() {
  if (reloading || document.hidden) return;
  fetch('${up}version.json?t=' + Date.now(), { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((v) => {
      if (!v || !v.version || v.version === PAGE_VERSION) return;
      // Reload once per new version: if the cached page is still the old one, don't loop.
      let tried = null;
      try { tried = sessionStorage.getItem('rockets-reloaded-for'); } catch {}
      if (tried === v.version) return;
      try { sessionStorage.setItem('rockets-reloaded-for', v.version); } catch {}
      reloading = true;
      location.reload();
    })
    .catch(() => {});
}
setInterval(checkForUpdate, 10 * 60 * 1000);
checkForUpdate();
document.addEventListener('visibilitychange', checkForUpdate);
</script>
</body>
</html>
`;
}

for (const [lang, L] of Object.entries(LANGUAGES)) {
  const dir = join(OUT, L.dir);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), page(lang));
}
await writeFile(join(OUT, '.nojekyll'), '');
await writeFile(join(OUT, 'version.json'), JSON.stringify({ version }) + '\n');
console.log(`Site written to ${OUT}/ (${rockets.length} rockets, ${Object.keys(LANGUAGES).join(' + ')}, repo ${repo})`);
