// Primary logo: Faceted Crystal hexagon (Full Spectrum Rainbow)
// Secondary export: ArcsIcon (Signal Arcs — Electric Trifecta) used for favicon / tiny sizes

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

// ── Spectrum color wheel (primary — nav, splash, sign-in) ────────────────────
// 12 rainbow wedges around a white hub. Matches the app icon (logo-wheel.png).
export function CrystalIcon({ size = 28 }: { size?: number }) {
  const cx = 24, cy = 24, r = 22, n = 12;
  const wedges = Array.from({ length: n }, (_, i) => {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const x0 = (cx + r * Math.cos(a0)).toFixed(2);
    const y0 = (cy + r * Math.sin(a0)).toFixed(2);
    const x1 = (cx + r * Math.cos(a1)).toFixed(2);
    const y1 = (cy + r * Math.sin(a1)).toFixed(2);
    return (
      <path
        key={i}
        d={`M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`}
        fill={`hsl(${Math.round((i / n) * 360)} 85% 56%)`}
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
    );
  });
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Velora"
    >
      {wedges}
      <circle cx={cx} cy={cy} r={r * 0.22} fill="#ffffff" />
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
