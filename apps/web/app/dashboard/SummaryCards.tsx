'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiFetch } from '@/lib/api';

interface Summary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  month: number;
  year: number;
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SummaryCards() {
  const { getToken } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['summary'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Summary>('/transactions/summary', token!);
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl p-6 animate-pulse bg-gray-100 dark:bg-gray-700 h-28" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
        Could not load summary. Make sure you have imported some transactions.
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Income',
      value: formatINR(data.totalIncome),
      icon: '💰',
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Total Expenses',
      value: formatINR(data.totalExpenses),
      icon: '💸',
      gradient: 'from-rose-500 to-pink-600',
    },
    {
      label: 'Net Savings',
      value: formatINR(data.netSavings),
      icon: data.netSavings >= 0 ? '📈' : '📉',
      gradient: data.netSavings >= 0 ? 'from-violet-500 to-indigo-600' : 'from-orange-500 to-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(card => (
        <div
          key={card.label}
          className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-6 text-white shadow-lg shadow-black/10`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{card.icon}</span>
            <span className="text-sm text-white/80 font-medium">{card.label}</span>
          </div>
          <div className="text-3xl font-bold tracking-tight">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
