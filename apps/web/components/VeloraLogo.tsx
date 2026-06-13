// Primary logo: "V from two leaves + silver ₹ seed coin" — matches the mobile app icon.
// Secondary export: ArcsIcon (Signal Arcs) — kept for legacy / tiny uses.

interface VeloraLogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkSize?: 'sm' | 'md' | 'lg';
}

export default function VeloraLogo({
  size = 28,
  showWordmark = true,
  wordmarkSize = 'md',
}: VeloraLogoProps) {
  const fontSize =
    wordmarkSize === 'sm' ? '0.95rem'
    : wordmarkSize === 'lg' ? '1.5rem'
    : '1.15rem';

  return (
    <span className="flex items-center gap-2 select-none">
      <CrystalIcon size={size} />
      {showWordmark && (
        <span
          style={{
            fontFamily: 'var(--font-space-grotesk), sans-serif',
            fontSize,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            background: 'linear-gradient(90deg,#f72585,#ff9100,#ffd60a,#32d74b,#0a84ff,#bf5af2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Velora
        </span>
      )}
    </span>
  );
}

// ── V from two leaves + silver ₹ seed coin (primary — nav, splash, sign-in) ──
// Matches the mobile app icon (logo-wheel.png). Authored in a 200×200 space.
export function CrystalIcon({ size = 28 }: { size?: number }) {
  const lf = 'veloraLeaf', seed = 'veloraSeed';
  const leafPath = 'M0 0 C -18 -10,-26 -34,-16 -52 C 4 -42,12 -18,0 0 Z';
  const veinPath = 'M0 -2 C -8 -16,-14 -32,-15 -46';
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="Velora">
      <defs>
        <linearGradient id={lf} x1="0" y1="1" x2="0.45" y2="0">
          <stop offset="0" stopColor="#166534" /><stop offset="1" stopColor="#86efac" />
        </linearGradient>
        <radialGradient id={seed} cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" /><stop offset="0.5" stopColor="#cbd5e1" /><stop offset="1" stopColor="#64748b" />
        </radialGradient>
      </defs>
      <g transform="translate(0 -31)">
        <g transform="translate(100 156) rotate(-27) scale(1.7)">
          <path d={leafPath} fill={`url(#${lf})`} />
          <path d={veinPath} fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />
        </g>
        <g transform="translate(100 156) rotate(27) scale(1.7)">
          <path d={leafPath} fill={`url(#${lf})`} />
          <path d={veinPath} fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />
        </g>
        <circle cx="100" cy="168" r="13" fill={`url(#${seed})`} />
        <circle cx="100" cy="168" r="13" fill="none" stroke="#64748b" strokeOpacity="0.5" strokeWidth="1.5" />
        <text x="100" y="169" fontSize="13" fontWeight="800" fill="#334155" textAnchor="middle" dominantBaseline="central">₹</text>
      </g>
    </svg>
  );
}

// ── Signal Arcs (secondary — favicon, 16px in-app micro icon) ────────────────
// Three nested V-chevrons: Electric Trifecta palette (pink / indigo / green).
// Shares the same hues as Crystal facets — same brand family.
export function ArcsIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Velora"
    >
      <path d="M 18,36 L 24,28 L 30,36" stroke="#ff2d55" strokeWidth="4.5"  strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 10,40 L 24,18 L 38,40" stroke="#5e5ce6" strokeWidth="3.5"  strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 3,43 L 24,10 L 45,43"  stroke="#32d74b" strokeWidth="2.5"  strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
