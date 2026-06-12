// Generates the Velora brand assets: app icon, Android adaptive icon, splash,
// and a transparent in-app logo (logo-wheel.png used by the header + tab bar).
//
// Brand mark: a spectrum COLOR WHEEL — a segmented rainbow disc. Reads as
// "clarity / full spectrum", fits a finance app, and is not game-like.
//
// Run:  npm i -D sharp   (one-off build tool, not an app dependency)
//       node scripts/generate-icons.mjs

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'assets');

const r2 = (n) => Math.round(n * 1000) / 1000;

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** SVG for the segmented color wheel, centred in an SxS box, wheel diameter = frac*S. */
function wheelGroup(S, frac, segments = 12) {
  const cx = S / 2;
  const cy = S / 2;
  const r = (frac * S) / 2;
  const gap = r * 0.022;          // white separator stroke between wedges
  const wedges = [];
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / segments) * 2 * Math.PI - Math.PI / 2;
    const x0 = r2(cx + r * Math.cos(a0)), y0 = r2(cy + r * Math.sin(a0));
    const x1 = r2(cx + r * Math.cos(a1)), y1 = r2(cy + r * Math.sin(a1));
    const hue = Math.round((i / segments) * 360);
    const fill = hslToHex(hue, 85, 56);
    wedges.push(
      `<path d="M ${r2(cx)} ${r2(cy)} L ${x0} ${y0} A ${r2(r)} ${r2(r)} 0 0 1 ${x1} ${y1} Z" ` +
      `fill="${fill}" stroke="#ffffff" stroke-width="${r2(gap)}" stroke-linejoin="round"/>`,
    );
  }
  return `
    <g filter="url(#wheelShadow)">
      ${wedges.join('\n      ')}
      <!-- subtle inner gloss -->
      <circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="url(#gloss)"/>
      <!-- white hub -->
      <circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r * 0.2)}" fill="#ffffff"/>
      <circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r * 0.2)}" fill="url(#hubGloss)"/>
    </g>`;
}

const DEFS = `
  <defs>
    <radialGradient id="gloss" cx="0.5" cy="0.34" r="0.62">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.4"/>
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="hubGloss" cx="0.4" cy="0.34" r="0.7">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#e9e9f5" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="iconBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f1edff"/>
    </linearGradient>
    <filter id="wheelShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="${r2}" flood-color="#3b1d6e" flood-opacity="0.18"/>
    </filter>
  </defs>`;

// feDropShadow stdDeviation can't be a function — patch DEFS per call instead.
function defsFor(S) {
  return DEFS.replace('stdDeviation="${r2}"', `stdDeviation="${Math.round(S * 0.02)}"`);
}

function iconSVG(S, frac) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  ${defsFor(S)}
  <rect width="${S}" height="${S}" fill="url(#iconBg)"/>
  ${wheelGroup(S, frac)}
</svg>`;
}

function transparentWheelSVG(S, frac) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  ${defsFor(S)}
  ${wheelGroup(S, frac)}
</svg>`;
}

function splashSVG(W, H) {
  const box = Math.min(W, H);
  // Centre the wheel by drawing it in a square then placing it.
  const wheel = wheelGroup(W, (0.34 * W) / W, 12); // frac relative to W width
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defsFor(box)}
  <rect width="${W}" height="${H}" fill="#f5f3ff"/>
  <g transform="translate(0, ${r2(H / 2 - W / 2)})">
    ${wheel}
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
await render(transparentWheelSVG(512, 0.92), 512, 512, 'logo-wheel.png'); // transparent, in-app

console.log('\nDone. Rebuild the app to see the new icon (icons are baked into the native build).');
