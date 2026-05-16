'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface BudgetWithProgress {
  id: string;
  amount: number;
  category: { name: string; icon: string };
  spent: number;
  remaining: number;
  percentUsed: number;
}

interface BudgetsResponse {
  data: BudgetWithProgress[];
  month: number;
  year: number;
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function BudgetProgress() {
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['budget-progress'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<BudgetsResponse>('/budgets', token!);
    },
    // Always re-fetch when the user navigates back to the dashboard tab.
    // This ensures budgets created on /budgets show up immediately here.
    refetchOnWindowFocus: true,
    staleTime: 30_000, // 30s — shorter than default so mid-month changes appear fast
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Budget This Month</h3>
        <Link href="/budgets" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          Manage →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse space-y-1">
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-24" />
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full" />
            </div>
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">No budgets set for this month.</p>
          <Link
            href="/budgets"
            className="text-sm text-black dark:text-white underline underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Set your first budget
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {data.data.slice(0, 5).map(budget => {
            const isOver = budget.percentUsed >= 100;
            const isWarning = budget.percentUsed >= 80 && !isOver;
            const barColor = isOver
              ? 'bg-gradient-to-r from-red-500 to-rose-500'
              : isWarning
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
              : 'bg-gradient-to-r from-emerald-400 to-teal-500';

            return (
              <div key={budget.id}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gray-700 dark:text-gray-200">
                    {budget.category.icon} {budget.category.name}
                  </span>
                  <span className={isOver ? 'text-red-500 font-medium' : 'text-gray-400 dark:text-gray-500'}>
                    {formatINR(budget.spent)} / {formatINR(budget.amount)}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${budget.percentUsed}%` }}
                  />
                </div>
              </div>
            );
          })}

          {data.data.length > 5 && (
            <Link href="/budgets" className="block text-xs text-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 pt-1">
              +{data.data.length - 5} more budgets
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
