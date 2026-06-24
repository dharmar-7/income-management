'use client';

import Link from 'next/link';
import { useDashboard } from '@/lib/useDashboard';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function SavingsCard() {
  const { data, isLoading } = useDashboard();
  const savings = data?.savings;
  const isGain = (savings?.totalGainLoss ?? 0) >= 0;

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-black/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <span className="text-sm text-white/80 font-medium">Investments</span>
        </div>
        <Link
          href="/savings"
          className="text-xs bg-white/20 hover:bg-white/30 rounded-full px-3 py-1 font-semibold transition-colors"
        >
          Manage →
        </Link>
      </div>

      {/* Current value */}
      {isLoading ? (
        <div className="h-9 bg-white/20 rounded-xl animate-pulse w-36" />
      ) : (
        <div className="text-3xl font-bold tracking-tight">
          {formatINR(savings?.totalCurrentValue ?? 0)}
        </div>
      )}

      {/* Gain/loss row */}
      {savings && !isLoading && (
        <div className="flex gap-4 mt-3 text-xs text-white/70">
          <span>Invested {formatINR(savings.totalNetCost)}</span>
          <span className={isGain ? 'text-emerald-300' : 'text-rose-300'}>
            {isGain ? '▲' : '▼'} {formatINR(Math.abs(savings.totalGainLoss))}
            {' '}({savings.totalGainPercent >= 0 ? '+' : ''}{savings.totalGainPercent.toFixed(1)}%)
          </span>
        </div>
      )}

      {/* Empty state */}
      {savings && savings.count === 0 && (
        <p className="text-xs text-white/60 mt-2">No investments yet. Add one to start tracking.</p>
      )}
    </div>
  );
}
