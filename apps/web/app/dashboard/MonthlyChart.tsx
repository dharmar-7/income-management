'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useDashboard } from '@/lib/useDashboard';
import ChartTooltip from '@/components/ChartTooltip';

function formatINRShort(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value}`;
}

export default function MonthlyChart() {
  const { data, isLoading } = useDashboard();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Income vs Expenses (6 months)</h3>

      {isLoading ? (
        <div className="h-48 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-xl" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data?.monthly ?? []} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatINRShort} tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
