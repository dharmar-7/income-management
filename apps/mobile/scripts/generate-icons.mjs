// Generates the Velora brand assets: app icon, Android adaptive icon, splash,
// and a transparent in-app logo (logo-wheel.png used by the header + tab bar).
//
// Brand mark: a FACETED GEM HEXAGON — a pointy-top hexagon cut into crown and
// table facets in a violet brand gradient, with a couple of bright accent facets
// for sparkle. Reads as a premium "gem", not game-like, fits a finance app.
//
// (The in-app file is still named logo-wheel.png so existing imports keep working.)
//
// Run:  npm i -D sharp   (one-off build tool, not an app dependency)
//       node scripts/generate-icons.mjs

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'assets');

const r2 = (n) => Math.round(n * 1000) / 1000;

function hsl(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Two bright accent facets (a magenta and a cyan) to give the gem some spectrum
// sparkle without turning it into a rainbow. Keyed by table-facet index.
const ACCENTS = { 1: '#ec4899', 4: '#22d3ee' };

/** SVG group for the faceted gem hexagon, centred in an SxS box. */
function gemGroup(S, frac) {
  const cx = S / 2, cy = S / 2;
  const R = (frac * S) / 2;     // outer hexagon radius
  const r = R * 0.52;           // inner hexagon (table) radius
  const stroke = r2(R * 0.016);
  const N = 6;
  // Pointy-top hexagon: a vertex sits at the very top (-90°).
  const ang = (i) => (Math.PI / 180) * (60 * i - 90);
  const V = [], W = [];
  for (let i = 0; i < N; i++) {
    V.push([r2(cx + R * Math.cos(ang(i))), r2(cy + R * Math.sin(ang(i)))]);
    W.push([r2(cx + r * Math.cos(ang(i))), r2(cy + r * Math.sin(ang(i)))]);
  }

  const facets = [];

  // Crown facets: 6 trapezoids between the outer and inner hexagons. Lit from the
  // top — higher facets are lighter, lower ones darker, for a cut-gem gradient.
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const yc = (V[i][1] + V[j][1] + W[j][1] + W[i][1]) / 4;
    const norm = (yc - cy) / R;                 // -1 (top) .. 1 (bottom)
    const fill = hsl(264, 68, 53 - norm * 17);
    facets.push(
      `<path d="M ${V[i][0]} ${V[i][1]} L ${V[j][0]} ${V[j][1]} L ${W[j][0]} ${W[j][1]} L ${W[i][0]} ${W[i][1]} Z" ` +
      `fill="${fill}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="${stroke}" stroke-linejoin="round"/>`,
    );
  }

  // Table facets: the inner hexagon split into 6 triangles from the centre.
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const yc = (cy + W[i][1] + W[j][1]) / 3;
    const norm = (yc - cy) / r;
    const fill = ACCENTS[i] ?? hsl(262, 60, 62 - norm * 13);
    facets.push(
      `<path d="M ${r2(cx)} ${r2(cy)} L ${W[i][0]} ${W[i][1]} L ${W[j][0]} ${W[j][1]} Z" ` +
      `fill="${fill}" stroke="#ffffff" stroke-opacity="0.4" stroke-width="${stroke}" stroke-linejoin="round"/>`,
    );
  }

  return `
    <g filter="url(#gemShadow)">
      ${facets.join('\n      ')}
      <!-- overall top-left sheen across the whole gem -->
      <polygon points="${V.map((p) => `${p[0]},${p[1]}`).join(' ')}" fill="url(#gloss)"/>
      <!-- bright centre sparkle -->
      <circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r * 0.22)}" fill="url(#hubGloss)"/>
    </g>`;
}

const DEFS = `
  <defs>
    <radialGradient id="gloss" cx="0.42" cy="0.3" r="0.7">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.45"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="hubGloss" cx="0.4" cy="0.34" r="0.75">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#ede9fe" stop-opacity="0.55"/>
    </radialGradient>
    <linearGradient id="iconBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f1edff"/>
    </linearGradient>
    <filter id="gemShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="__BLUR__" flood-color="#3b1d6e" flood-opacity="0.2"/>
    </filter>
  </defs>`;

// feDropShadow stdDeviation can't be a function — patch DEFS per call instead.
function defsFor(S) {
  return DEFS.replace('__BLUR__', `${Math.round(S * 0.02)}`);
}

function iconSVG(S, frac) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  ${defsFor(S)}
  <rect width="${S}" height="${S}" fill="url(#iconBg)"/>
  ${gemGroup(S, frac)}
</svg>`;
}

function transparentGemSVG(S, frac) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  ${defsFor(S)}
  ${gemGroup(S, frac)}
</svg>`;
}

function splashSVG(W, H) {
  const box = Math.min(W, H);
  const gem = gemGroup(W, 0.34); // frac relative to W width
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defsFor(box)}
  <rect width="${W}" height="${H}" fill="#f5f3ff"/>
  <g transform="translate(0, ${r2(H / 2 - W / 2)})">
    ${gem}
  </g>
</svg>`;
}

async function render(svg, w, h, outName) {
  await sharp(Buffer.from(svg)).resize(w, h).png().toFile(join(ASSETS, outName));
  console.log(`✓ ${outName}  (${w}×${h})`);
}

await render(iconSVG(1024, 0.74), 1024, 1024, 'icon.png');
await render(iconSVG(1024, 0.62), 1024, 1024, 'adaptive-icon.png');   // smaller for Android safe zone
await render(splashSVG(1284, 2778), 1284, 2778, 'splash.png');
await render(transparentGemSVG(512, 0.92), 512, 512, 'logo-wheel.png'); // transparent, in-app

console.log('\nDone. Rebuild the app to see the new icon (icons are baked into the native build).');
