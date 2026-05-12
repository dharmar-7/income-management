'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import ChartTooltip from '@/components/ChartTooltip';

interface CategoryData {
  category: { name: string; icon: string };
  total: number;
}

// 20 vibrant, high-saturation colours — ordered to maximise contrast between neighbours.
const COLORS = [
  '#6366f1', // indigo
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ef4444', // red
  '#22c55e', // green
  '#ec4899', // pink
  '#eab308', // yellow
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#3b82f6', // blue
  '#d946ef', // fuchsia
  '#84cc16', // lime
  '#0ea5e9', // sky
  '#fb923c', // amber
  '#a855f7', // purple
  '#2dd4bf', // emerald
  '#f472b6', // light pink
  '#facc15', // gold
  '#64748b', // slate
];

export default function CategoryChart() {
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['by-category'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<CategoryData[]>('/transactions/by-category', token!);
    },
  });

  const chartData = (data ?? []).map(d => ({
    name: `${d.category.icon} ${d.category.name}`,
    value: d.total,
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <h3 className="font-semibold text-gray-800 mb-4">Spending by Category</h3>

      {isLoading ? (
        <div className="h-60 bg-gray-100 animate-pulse rounded-xl" />
      ) : chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">
          No spending data yet. Import transactions to see breakdown.
        </div>
      ) : (
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Custom legend with percentage */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
            {chartData.map((d, i) => {
              const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : 0;
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-gray-600 truncate flex-1">{d.name}</span>
                  <span className="text-gray-400 text-xs font-medium">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
