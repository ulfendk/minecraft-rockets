// Pack icon: a red and white rocket lifting off into a starry night sky, with a flame,
// a smoke cloud on the pad and the launch tower beside it. Drawn at 32x32 and scaled up.
import { PNG } from 'pngjs';
import { hex, mix } from './texture.mjs';

export function packIcon(scale = 8) {
  const N = 32;
  const px = Array.from({ length: N }, () => new Array(N));
  const top = hex('#0b1033'), mid = hex('#3a2a6b'), low = hex('#8a3d5c');
  for (let y = 0; y < N; y++) {
    const t = y / 28;
    const c = t < 0.6 ? mix(top, mid, t / 0.6) : mix(mid, low, Math.min(1, (t - 0.6) / 0.4));
    for (let x = 0; x < N; x++) px[y][x] = c;
  }
  const put = (x, y, c) => { if (x >= 0 && x < N && y >= 0 && y < N) px[y][x] = hex(c); };
  const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c); };

  // Stars and a crescent moon.
  for (const [x, y] of [[2, 3], [7, 1], [25, 2], [29, 6], [4, 10], [27, 12], [9, 6], [21, 5], [1, 16], [30, 18]]) put(x, y, '#fff6d6');
  for (const [x, y] of [[5, 5], [23, 9], [11, 2]]) put(x, y, '#a9b4ff');
  fill(24, 4, 27, 7, '#f4ecc0');
  fill(25, 3, 26, 3, '#f4ecc0');
  fill(26, 4, 28, 6, '#0f1440');

  // Launch tower (lattice) on the right.
  const red = '#c8261b', darkRed = '#7a1610';
  for (let y = 8; y <= 28; y++) { put(22, y, red); put(24, y, red); if (y % 2 === 0) put(23, y, darkRed); }
  fill(19, 12, 21, 12, '#7a8086'); // swing arm

  // Rocket: nose, body with a red band, window, fins.
  fill(15, 2, 16, 3, '#d23a2a');
  fill(14, 4, 17, 5, '#d23a2a');
  fill(13, 6, 18, 19, '#ecebe6');
  fill(13, 6, 13, 19, '#c9c8c2'); // shading on the left
  fill(13, 12, 18, 13, '#d23a2a');
  fill(15, 8, 16, 9, '#5aa7e6');
  fill(11, 16, 12, 21, '#d23a2a'); fill(19, 16, 20, 21, '#d23a2a'); // fins
  fill(10, 19, 10, 21, '#a52a1e'); fill(21, 19, 21, 21, '#a52a1e');
  fill(14, 20, 17, 20, '#3a3d40'); // nozzle

  // Flame and smoke.
  fill(14, 21, 17, 23, '#fff3a0');
  fill(13, 24, 18, 25, '#ffc23a');
  fill(14, 26, 17, 26, '#ff7a1a');
  fill(15, 27, 16, 27, '#e2401c');
  const smoke = [[6, 27, 3], [11, 28, 3], [20, 28, 3], [25, 27, 3], [15, 29, 4]];
  for (const [cx, cy, r] of smoke) for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(x, y, (x + y) % 3 ? '#d9d6d0' : '#b9b5ad');
  }
  // Launch pad: hazard stripes along the bottom.
  for (let y = 30; y < N; y++) for (let x = 0; x < N; x++) px[y][x] = hex(Math.floor((x + y) / 2) % 2 ? '#f2c230' : '#1b1c1d');

  const png = new PNG({ width: N * scale, height: N * scale });
  for (let y = 0; y < N * scale; y++) for (let x = 0; x < N * scale; x++) {
    png.data.set(px[Math.floor(y / scale)][Math.floor(x / scale)], (y * N * scale + x) * 4);
  }
  return PNG.sync.write(png);
}
