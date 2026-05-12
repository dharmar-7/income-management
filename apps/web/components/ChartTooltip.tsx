'use client';

// Custom Recharts tooltip — replaces the default grey box with a modern glassmorphism card.
// Works with both BarChart and PieChart by reading the payload array.

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

interface TooltipPayloadEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

export default function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 14,
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        minWidth: 140,
      }}
    >
      {label && (
        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          {label}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {payload.map((entry, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: entry.color ?? '#6366f1',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, color: '#6b7280', flex: 1 }}>
              {entry.name ?? entry.dataKey}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
              {formatINR(entry.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
