// Generates the Velora brand assets (app icon, Android adaptive icon, splash).
//
// WHY THIS EXISTS: the original assets/*.png files were blank white images, so the
// Android launcher icon rendered as an invisible white square. This script draws the
// real Velora gem as SVG and rasterises it to PNG so the icon is actually visible.
//
// Run:  npm i -D sharp   (one-off; sharp is a build tool, not an app dependency)
//       node scripts/generate-icons.mjs
//
// Re-run any time the brand mark changes.

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'assets');

// ── Brand palette (matches the in-app VeloraLogoMobile gem) ───────────────────
const PINK = '#f72585';
const ORANGE = '#ff9100';
const VIOLET = '#bf5af2';
const GREEN = '#32d74b';

const r2 = (n) => Math.round(n);

/**
 * Build a full-bleed icon SVG: violet→indigo gradient background with the
 * rotated 4-quadrant gem centred on top.
 *
 * @param {number} S       canvas size (square)
 * @param {number} gemFrac gem tip-to-tip diagonal as a fraction of S
 */
function iconSVG(S, gemFrac) {
  const cx = S / 2;
  const a = r2((gemFrac * S) / Math.SQRT2); // side of the (un-rotated) square
  const h = r2(a / 2);
  const left = r2(cx - h);
  const top = r2(cx - h);
  const rad = r2(a * 0.17); // rounded corners → faceted-crystal look
  const sw = Math.max(4, r2(a * 0.02)); // facet separator stroke width

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0"    stop-color="#7c3aed"/>
      <stop offset="0.55" stop-color="#5b21b6"/>
      <stop offset="1"    stop-color="#312e81"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.4" r="0.62">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="spec" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0"   stop-color="#ffffff" stop-opacity="0.6"/>
      <stop offset="0.7" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="1"   stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="gemClip" clipPathUnits="userSpaceOnUse">
      <rect x="${left}" y="${top}" width="${a}" height="${a}" rx="${rad}" ry="${rad}"/>
    </clipPath>
    <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="${r2(a * 0.06)}" flood-color="#160a33" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- background -->
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <rect width="${S}" height="${S}" fill="url(#glow)"/>

  <!-- gem (rotated 45°) -->
  <g transform="rotate(45 ${cx} ${cx})" filter="url(#shadow)">
    <g clip-path="url(#gemClip)">
      <rect x="${left}" y="${top}" width="${h}" height="${h}" fill="${PINK}"/>
      <rect x="${cx}"   y="${top}" width="${h}" height="${h}" fill="${ORANGE}"/>
      <rect x="${left}" y="${cx}"  width="${h}" height="${h}" fill="${VIOLET}"/>
      <rect x="${cx}"   y="${cx}"  width="${h}" height="${h}" fill="${GREEN}"/>
    </g>
    <!-- facet separators -->
    <line x1="${cx}" y1="${top}" x2="${cx}" y2="${top + a}" stroke="#ffffff" stroke-opacity="0.45" stroke-width="${sw}"/>
    <line x1="${left}" y1="${cx}" x2="${left + a}" y2="${cx}" stroke="#ffffff" stroke-opacity="0.45" stroke-width="${sw}"/>
    <!-- crisp edge -->
    <rect x="${left}" y="${top}" width="${a}" height="${a}" rx="${rad}" ry="${rad}"
          fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="${r2(sw * 0.55)}"/>
  </g>

  <!-- specular shine -->
  <ellipse cx="${cx}" cy="${r2(cx - h * 0.55)}" rx="${r2(a * 0.30)}" ry="${r2(a * 0.17)}" fill="url(#spec)"/>
</svg>`;
}

/** Splash: light lavender background (matches sign-in) + centred gem + spectrum bar. */
function splashSVG(W, H) {
  const cx = W / 2;
  const cy = H / 2;
  const a = r2((0.30 * W) / Math.SQRT2);
  const h = r2(a / 2);
  const rad = r2(a * 0.17);
  const sw = Math.max(3, r2(a * 0.02));
  const barW = r2(W * 0.34);
  const barH = r2(W * 0.012);
  const barY = r2(cy + a * 0.85);
  const barColors = ['#8b5cf6', '#6366f1', '#06b6d4', '#22c55e', '#f97316', '#f43f5e'];
  const seg = barW / barColors.length;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="spec" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0"   stop-color="#ffffff" stop-opacity="0.6"/>
      <stop offset="0.7" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="1"   stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="gemClip" clipPathUnits="userSpaceOnUse">
      <rect x="${r2(cx - h)}" y="${r2(cy - h)}" width="${a}" height="${a}" rx="${rad}" ry="${rad}"/>
    </clipPath>
    <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="${r2(a * 0.05)}" flood-color="#7c3aed" flood-opacity="0.28"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="#f5f3ff"/>

  <g transform="rotate(45 ${cx} ${cy})" filter="url(#shadow)">
    <g clip-path="url(#gemClip)">
      <rect x="${r2(cx - h)}" y="${r2(cy - h)}" width="${h}" height="${h}" fill="${PINK}"/>
      <rect x="${cx}"         y="${r2(cy - h)}" width="${h}" height="${h}" fill="${ORANGE}"/>
      <rect x="${r2(cx - h)}" y="${cy}"         width="${h}" height="${h}" fill="${VIOLET}"/>
      <rect x="${cx}"         y="${cy}"         width="${h}" height="${h}" fill="${GREEN}"/>
    </g>
    <line x1="${cx}" y1="${r2(cy - h)}" x2="${cx}" y2="${r2(cy + h)}" stroke="#ffffff" stroke-opacity="0.45" stroke-width="${sw}"/>
    <line x1="${r2(cx - h)}" y1="${cy}" x2="${r2(cx + h)}" y2="${cy}" stroke="#ffffff" stroke-opacity="0.45" stroke-width="${sw}"/>
  </g>

  <ellipse cx="${cx}" cy="${r2(cy - h * 0.55)}" rx="${r2(a * 0.30)}" ry="${r2(a * 0.17)}" fill="url(#spec)"/>

  <!-- spectrum accent bar -->
  ${barColors
    .map(
      (c, i) =>
        `<rect x="${r2(cx - barW / 2 + i * seg)}" y="${barY}" width="${Math.ceil(seg)}" height="${barH}" rx="${r2(barH / 2)}" fill="${c}"/>`,
    )
    .join('\n  ')}
</svg>`;
}

async function render(svg, w, h, outName) {
  const out = join(ASSETS, outName);
  await sharp(Buffer.from(svg)).resize(w, h).png().toFile(out);
  console.log(`✓ ${outName}  (${w}×${h})`);
}

await render(iconSVG(1024, 0.62), 1024, 1024, 'icon.png');
// Adaptive-icon foreground: smaller gem so it survives Android's circular/squircle mask.
await render(iconSVG(1024, 0.54), 1024, 1024, 'adaptive-icon.png');
await render(splashSVG(1284, 2778), 1284, 2778, 'splash.png');

console.log('\nDone. Rebuild the app to see the new icon (icons are baked into the native build).');
