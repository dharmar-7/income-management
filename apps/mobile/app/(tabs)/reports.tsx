import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { apiFetch } from '@/lib/api';

interface MonthlyReport {
  month: number;
  year: number;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    transactionCount: number;
  };
  topCategories: { category: { name: string; icon: string }; total: number; count: number }[];
  topMerchants: { merchant: string; total: number; count: number }[];
}

interface AnnualReport {
  year: number;
  months: { month: number; income: number; expenses: number; savings: number }[];
  totals: { income: number; expenses: number; savings: number };
}

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTHS = ['J','F','M','A','M','J','J','A','S','O','N','D'];

const BAR_COLORS = [
  '#6366f1', '#f97316', '#06b6d4', '#ef4444', '#22c55e',
  '#ec4899', '#eab308', '#8b5cf6',
];

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ReportsScreen() {
  const { getToken } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
    if (isCurrentMonth) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const { data: r, isLoading } = useQuery({
    queryKey: ['report-monthly', month, year],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<MonthlyReport>(`/reports/monthly?month=${month}&year=${year}`, token!);
    },
  });

  const { data: a } = useQuery({
    queryKey: ['report-annual', year],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<AnnualReport>(`/reports/annual?year=${year}`, token!);
    },
  });

  const maxCategory = r?.topCategories[0]?.total ?? 1;
  const maxBar = Math.max(...(a?.months.map(m => Math.max(m.income, m.expenses)) ?? [1]), 1);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      {/* Month navigator */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14,
        borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 16,
      }}>
        <TouchableOpacity onPress={prevMonth} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22, color: '#6366f1', fontWeight: '600' }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
          {FULL_MONTHS[month - 1]} {year}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={{ padding: 4 }}>
          <Text style={{
            fontSize: 22, fontWeight: '600',
            color: (month === now.getMonth() + 1 && year === now.getFullYear()) ? '#d1d5db' : '#6366f1',
          }}>›</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6366f1" size="large" style={{ marginTop: 48 }} />
      ) : r ? (
        <>
          {/* Summary cards */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <SummaryCard label="Income" value={formatINR(r.summary.totalIncome)} bg="#10b981" />
            <SummaryCard label="Expenses" value={formatINR(r.summary.totalExpenses)} bg="#f43f5e" />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <SummaryCard
              label="Net Savings"
              value={formatINR(r.summary.netSavings)}
              bg={r.summary.netSavings >= 0 ? '#6366f1' : '#f97316'}
            />
            <SummaryCard label="Transactions" value={String(r.summary.transactionCount)} bg="#0ea5e9" />
          </View>

          {/* Top categories */}
          <View style={{
            backgroundColor: '#fff', borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 16,
          }}>
            <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15, marginBottom: 14 }}>
              Top Categories
            </Text>
            {r.topCategories.length === 0 ? (
              <Text style={{ color: '#9ca3af', fontSize: 13 }}>No expense data this month.</Text>
            ) : r.topCategories.map((item, i) => (
              <View key={i} style={{ marginBottom: i < r.topCategories.length - 1 ? 14 : 0 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ color: '#374151', fontSize: 13 }}>
                    {item.category.icon} {item.category.name}
                    <Text style={{ color: '#9ca3af', fontSize: 11 }}> ({item.count}×)</Text>
                  </Text>
                  <Text style={{ fontWeight: '700', color: '#111827', fontSize: 13 }}>
                    {formatINR(item.total)}
                  </Text>
                </View>
                <View style={{ height: 7, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{
                    width: `${(item.total / maxCategory) * 100}%` as any,
                    height: '100%',
                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                    borderRadius: 4,
                  }} />
                </View>
              </View>
            ))}
          </View>

          {/* Top merchants */}
          <View style={{
            backgroundColor: '#fff', borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 16,
          }}>
            <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15, marginBottom: 4 }}>
              Top Merchants
            </Text>
            {r.topMerchants.length === 0 ? (
              <Text style={{ color: '#9ca3af', fontSize: 13, marginTop: 8 }}>No expense data this month.</Text>
            ) : r.topMerchants.map((item, i) => (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 11,
                borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#f3f4f6',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#6b7280' }}>{i + 1}</Text>
                  </View>
                  <View>
                    <Text style={{ fontWeight: '600', color: '#111827', fontSize: 13 }}>
                      {item.merchant}
                    </Text>
                    <Text style={{ color: '#9ca3af', fontSize: 11, marginTop: 1 }}>
                      {item.count} transactions
                    </Text>
                  </View>
                </View>
                <Text style={{ fontWeight: '700', color: '#111827', fontSize: 13 }}>
                  {formatINR(item.total)}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* Annual overview */}
      {a && (
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 8,
        }}>
          <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15, marginBottom: 16 }}>
            {year} Annual Overview
          </Text>

          {/* Mini bar chart */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 72, gap: 3, marginBottom: 6 }}>
            {a.months.map((m) => (
              <View key={m.month} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
                <View style={{
                  flex: 1, height: Math.max((m.income / maxBar) * 72, 2),
                  backgroundColor: '#10b981', borderRadius: 2,
                }} />
                <View style={{
                  flex: 1, height: Math.max((m.expenses / maxBar) * 72, 2),
                  backgroundColor: '#f43f5e', borderRadius: 2,
                }} />
              </View>
            ))}
          </View>

          {/* Month labels */}
          <View style={{ flexDirection: 'row', gap: 3, marginBottom: 12 }}>
            {a.months.map((m) => (
              <Text key={m.month} style={{
                flex: 1, textAlign: 'center', fontSize: 9,
                color: m.month === month ? '#111827' : '#9ca3af',
                fontWeight: m.month === month ? '700' : '400',
              }}>
                {SHORT_MONTHS[m.month - 1]}
              </Text>
            ))}
          </View>

          {/* Legend */}
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />
              <Text style={{ fontSize: 11, color: '#6b7280' }}>Income</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f43f5e' }} />
              <Text style={{ fontSize: 11, color: '#6b7280' }}>Expenses</Text>
            </View>
          </View>

          {/* Year totals */}
          <View style={{
            flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 14,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#9ca3af' }}>Total Income</Text>
              <Text style={{ fontWeight: '700', color: '#10b981', fontSize: 14, marginTop: 2 }}>
                {formatINR(a.totals.income)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#9ca3af' }}>Total Expenses</Text>
              <Text style={{ fontWeight: '700', color: '#f43f5e', fontSize: 14, marginTop: 2 }}>
                {formatINR(a.totals.expenses)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#9ca3af' }}>Net Savings</Text>
              <Text style={{
                fontWeight: '700', fontSize: 14, marginTop: 2,
                color: a.totals.savings >= 0 ? '#6366f1' : '#f97316',
              }}>
                {formatINR(a.totals.savings)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function SummaryCard({ label, value, bg }: { label: string; value: string; bg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 16, padding: 16 }}>
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginBottom: 4 }}>{label}</Text>
      <Text
        style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}
