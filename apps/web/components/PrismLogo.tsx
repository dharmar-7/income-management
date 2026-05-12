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
      <PrismIcon size={size} />
      {showWordmark && (
        <span
          style={{
            fontFamily: 'var(--font-space-grotesk), sans-serif',
            fontSize,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            background: 'linear-gradient(90deg, #7c3aed 0%, #6366f1 50%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Prism
        </span>
      )}
    </span>
  );
}

export function PrismIcon({ size = 28 }: { size?: number }) {
  // Viewbox: 40 × 36
  // The prism is drawn as a side-view triangle pointing right.
  // A white input beam enters from the left edge.
  // Six spectrum rays fan out from the right vertex.
  return (
    <svg
      width={size}
      height={Math.round(size * 0.9)}
      viewBox="0 0 40 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Prism logo icon"
    >
      <defs>
        {/* Main prism body gradient */}
        <linearGradient id="prismBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>

        {/* Prism face highlight */}
        <linearGradient id="prismFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.1" />
        </linearGradient>

        {/* Glow filter on prism */}
        <filter id="prismGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Soft glow on spectrum rays */}
        <filter id="rayGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Input beam (white, entering left edge) ── */}
      <line
        x1="0" y1="18"
        x2="7" y2="18"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* ── Prism body (side-view triangle, apex right) ── */}
      {/* Back dark face for 3-D depth */}
      <polygon
        points="7,4 7,32 28,18"
        fill="url(#prismBody)"
        filter="url(#prismGlow)"
      />
      {/* Top-face highlight overlay */}
      <polygon
        points="7,4 7,18 28,18"
        fill="url(#prismFace)"
      />
      {/* Thin edge lines for sharpness */}
      <polyline
        points="7,4 7,32 28,18 7,4"
        stroke="#c4b5fd"
        strokeWidth="0.6"
        strokeLinejoin="round"
        fill="none"
        opacity="0.7"
      />
      {/* Inner vertical spine */}
      <line
        x1="7" y1="4"
        x2="7" y2="32"
        stroke="#a78bfa"
        strokeWidth="0.5"
        opacity="0.4"
      />

      {/* ── Spectrum rays fanning out from apex ── */}
      {/* Each ray: a wider stroke that fades, + bright cap */}
      {/* Violet */}
      <line x1="28" y1="18" x2="40" y2="8"
        stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"
        opacity="0.9" filter="url(#rayGlow)" />
      {/* Indigo */}
      <line x1="28" y1="18" x2="40" y2="11.5"
        stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round"
        opacity="0.9" filter="url(#rayGlow)" />
      {/* Cyan */}
      <line x1="28" y1="18" x2="40" y2="15"
        stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round"
        opacity="0.9" filter="url(#rayGlow)" />
      {/* Green */}
      <line x1="28" y1="18" x2="40" y2="18.5"
        stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round"
        opacity="0.9" filter="url(#rayGlow)" />
      {/* Orange */}
      <line x1="28" y1="18" x2="40" y2="22"
        stroke="#f97316" strokeWidth="1.8" strokeLinecap="round"
        opacity="0.9" filter="url(#rayGlow)" />
      {/* Rose */}
      <line x1="28" y1="18" x2="40" y2="26"
        stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round"
        opacity="0.9" filter="url(#rayGlow)" />
    </svg>
  );
}
