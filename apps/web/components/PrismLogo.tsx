// Primary logo: Faceted Crystal hexagon (Full Spectrum Rainbow)
// Secondary export: ArcsIcon (Signal Arcs — Electric Trifecta) used for favicon / tiny sizes

interface PrismLogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkSize?: 'sm' | 'md' | 'lg';
}

export default function PrismLogo({
  size = 28,
  showWordmark = true,
  wordmarkSize = 'md',
}: PrismLogoProps) {
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

// ── Faceted Crystal (primary — nav, splash, sign-in) ─────────────────────────
// Regular hexagon, pointed-top, 6 triangular facets from center.
// Vertices: (24,4) (41.3,14) (41.3,34) (24,44) (6.7,34) (6.7,14), center (24,24)
export function CrystalIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Velora"
    >
      <polygon points="24,24 24,4 41.3,14"    fill="#f72585" />
      <polygon points="24,24 41.3,14 41.3,34" fill="#ff9100" />
      <polygon points="24,24 41.3,34 24,44"   fill="#ffd60a" />
      <polygon points="24,24 24,44 6.7,34"    fill="#32d74b" />
      <polygon points="24,24 6.7,34 6.7,14"   fill="#0a84ff" />
      <polygon points="24,24 6.7,14 24,4"     fill="#bf5af2" />
      {/* facet edges */}
      <polygon
        points="24,4 41.3,14 41.3,34 24,44 6.7,34 6.7,14"
        fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8"
      />
      <line x1="24"   y1="4"  x2="24"   y2="24" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
      <line x1="41.3" y1="14" x2="24"   y2="24" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
      <line x1="41.3" y1="34" x2="24"   y2="24" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
      <line x1="24"   y1="44" x2="24"   y2="24" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
      <line x1="6.7"  y1="34" x2="24"   y2="24" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
      <line x1="6.7"  y1="14" x2="24"   y2="24" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
      {/* specular highlight top-right facet */}
      <ellipse cx="29" cy="11" rx="5" ry="3" fill="rgba(255,255,255,0.24)" transform="rotate(-25,29,11)" />
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

// Keep old name as alias so any existing imports still compile
export { CrystalIcon as PrismIcon };
