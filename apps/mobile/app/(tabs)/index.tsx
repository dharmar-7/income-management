import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, useUser } from '@clerk/clerk-expo';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/lib/api';
import CashSheet from '@/components/CashSheet';
import { useTheme } from '@/context/ThemeContext';
import type { Theme } from '@/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  month: number;
  year: number;
}

interface CategoryData {
  category: { name: string; icon: string };
  total: number;
}

interface MonthData {
  month: string;
  year: number;
  income: number;
  expenses: number;
}

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
}

interface SavingsSummary {
  totalNetCost: number;
  totalCurrentValue: number;
  totalGainLoss: number;
  totalGainPercent: number;
  count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatINRShort(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CHART_COLORS = [
  '#6366f1', '#f97316', '#06b6d4', '#ef4444', '#22c55e',
  '#ec4899', '#eab308', '#8b5cf6', '#14b8a6', '#f43f5e',
  '#3b82f6', '#d946ef', '#84cc16', '#0ea5e9', '#fb923c',
];

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { theme: c, scheme, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const summaryQuery = useQuery({
    queryKey: ['summary'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Summary>('/transactions/summary', token!);
    },
    staleTime: 2 * 60 * 1000,
  });

  const categoryQuery = useQuery({
    queryKey: ['by-category'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<CategoryData[]>('/transactions/by-category', token!);
    },
    staleTime: 2 * 60 * 1000,
  });

  const monthlyQuery = useQuery({
    queryKey: ['by-month'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<MonthData[]>('/transactions/by-month', token!);
    },
    staleTime: 2 * 60 * 1000,
  });

  const budgetsQuery = useQuery({
    queryKey: ['budget-progress'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<BudgetsResponse>('/budgets', token!);
    },
    staleTime: 2 * 60 * 1000,
  });

  const queryClient = useQueryClient();
  const [cashMode, setCashMode] = useState<'add' | 'spend' | null>(null);

  const cashQuery = useQuery({
    queryKey: ['cash-balance'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<{ balance: number; totalIn: number; totalOut: number }>('/cash/balance', token!);
    },
    staleTime: 2 * 60 * 1000,
  });

  const savingsQuery = useQuery({
    queryKey: ['savings-summary'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<SavingsSummary>('/savings/summary', token!);
    },
    staleTime: 2 * 60 * 1000,
  });

  const isRefreshing = summaryQuery.isFetching || categoryQuery.isFetching || monthlyQuery.isFetching;

  function handleRefresh() {
    summaryQuery.refetch();
    categoryQuery.refetch();
    monthlyQuery.refetch();
    budgetsQuery.refetch();
    cashQuery.refetch();
    savingsQuery.refetch();
  }

  const s = summaryQuery.data;

  const cashBalance = cashQuery.data?.balance ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {cashMode && (
        <CashSheet
          visible
          mode={cashMode}
          currentBalance={cashBalance}
          onClose={() => setCashMode(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['cash-balance'] })}
        />
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {/* Greeting + theme toggle */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hey, {user?.firstName ?? 'there'} 👋</Text>
            {s && <Text style={styles.subGreeting}>{MONTHS[s.month]} {s.year} summary</Text>}
          </View>
          <TouchableOpacity
            style={styles.themeToggle}
            onPress={() => setMode(scheme === 'dark' ? 'light' : 'dark')}
            accessibilityRole="button"
            accessibilityLabel={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.themeToggleIcon}>{scheme === 'dark' ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        {summaryQuery.isLoading ? (
          <View style={styles.skeletonRow}>
            {[1, 2, 3].map(i => <View key={i} style={styles.skeleton} />)}
          </View>
        ) : s ? (
          <>
            <View style={styles.cardsRow}>
              <SummaryCard label="Income" value={formatINR(s.totalIncome)} color={c.onColor} bg="#10b981" />
              <SummaryCard label="Expenses" value={formatINR(s.totalExpenses)} color={c.onColor} bg="#f43f5e" />
              <SummaryCard
                label="Savings"
                value={formatINR(s.netSavings)}
                color={c.onColor}
                bg={s.netSavings >= 0 ? c.primary : c.orange}
              />
            </View>

            {/* Income vs Expenses visual bar */}
            {(s.totalIncome > 0 || s.totalExpenses > 0) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Income vs Expenses</Text>
                <BarRow label="Income" amount={s.totalIncome} max={Math.max(s.totalIncome, s.totalExpenses)} color={c.success} />
                <BarRow label="Expenses" amount={s.totalExpenses} max={Math.max(s.totalIncome, s.totalExpenses)} color={c.danger} />
              </View>
            )}
          </>
        ) : null}

        {/* Cash in Hand card */}
        <View style={styles.cashCard}>
          <View style={styles.cashHeader}>
            <View>
              <Text style={styles.cashLabel}>💵 Cash in Hand</Text>
              <Text style={styles.cashBalance}>
                {cashQuery.isLoading ? '…' : formatINR(cashBalance)}
              </Text>
              {cashQuery.data && (
                <Text style={styles.cashSub}>
                  ↑ {formatINR(cashQuery.data.totalIn)}  ↓ {formatINR(cashQuery.data.totalOut)}
                </Text>
              )}
            </View>
            <View style={styles.cashBtns}>
              <TouchableOpacity style={styles.cashBtn} onPress={() => setCashMode('add')}>
                <Text style={styles.cashBtnText}>+ Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cashBtn, styles.cashBtnSpend]} onPress={() => setCashMode('spend')}>
                <Text style={styles.cashBtnText}>− Spend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Investments card */}
        {savingsQuery.data && savingsQuery.data.count > 0 && (() => {
          const sv = savingsQuery.data!;
          const isGain = sv.totalGainLoss >= 0;
          return (
            <View style={[styles.cashCard, { backgroundColor: c.primary, shadowColor: c.primary }]}>
              <View style={styles.cashHeader}>
                <View>
                  <Text style={styles.cashLabel}>📊 Investments</Text>
                  <Text style={styles.cashBalance}>{formatINR(sv.totalCurrentValue)}</Text>
                  <Text style={[styles.cashSub, { color: isGain ? 'rgba(167,243,208,0.9)' : 'rgba(252,165,165,0.9)' }]}>
                    {isGain ? '▲' : '▼'} {formatINR(Math.abs(sv.totalGainLoss))} ({sv.totalGainPercent >= 0 ? '+' : ''}{sv.totalGainPercent.toFixed(1)}%)
                  </Text>
                </View>
                <View>
                  <Text style={[styles.cashSub, { textAlign: 'right' }]}>Invested</Text>
                  <Text style={styles.cashBtnText}>{formatINR(sv.totalNetCost)}</Text>
                </View>
              </View>
            </View>
          );
        })()}

        {/* Category breakdown chart */}
        <Text style={styles.sectionTitle}>Spending by Category</Text>
        {categoryQuery.isLoading ? (
          <View style={styles.card}>
            {[1, 2, 3].map(i => <View key={i} style={[styles.skeleton, { height: 20, marginBottom: 8 }]} />)}
          </View>
        ) : !categoryQuery.data || categoryQuery.data.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No spending data yet.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {/* Stacked bar */}
            <View style={styles.stackedBar}>
              {categoryQuery.data.map((cat, i) => {
                const total = categoryQuery.data!.reduce((sum, c) => sum + c.total, 0);
                const pct = total > 0 ? (cat.total / total) * 100 : 0;
                return pct > 0 ? (
                  <View
                    key={i}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      height: '100%',
                      borderRadius: i === 0 ? 6 : 0,
                    }}
                  />
                ) : null;
              })}
            </View>

            {/* Legend rows */}
            {categoryQuery.data.slice(0, 8).map((cat, i) => (
              <View key={i} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                <Text style={styles.legendLabel}>{cat.category.icon} {cat.category.name}</Text>
                <Text style={styles.legendValue}>{formatINR(cat.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Monthly trend chart */}
        <Text style={styles.sectionTitle}>Monthly Trend</Text>
        {monthlyQuery.isLoading ? (
          <View style={styles.card}>
            <View style={[styles.skeleton, { height: 100 }]} />
          </View>
        ) : monthlyQuery.data && monthlyQuery.data.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.monthlyChart}>
              {(() => {
                const maxVal = Math.max(...monthlyQuery.data!.map(m => Math.max(m.income, m.expenses)), 1);
                return monthlyQuery.data!.map((m, i) => (
                  <View key={i} style={styles.monthColumn}>
                    <View style={styles.barContainer}>
                      <View style={[styles.monthBar, { height: `${(m.income / maxVal) * 100}%`, backgroundColor: c.success }]} />
                      <View style={[styles.monthBar, { height: `${(m.expenses / maxVal) * 100}%`, backgroundColor: c.danger }]} />
                    </View>
                    <Text style={styles.monthLabel}>{m.month}</Text>
                  </View>
                ));
              })()}
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: c.success }]} />
                <Text style={styles.legendSmall}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: c.danger }]} />
                <Text style={styles.legendSmall}>Expenses</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Budget progress */}
        <Text style={styles.sectionTitle}>Budget This Month</Text>
        {budgetsQuery.isLoading ? (
          <View style={styles.card}>
            {[1, 2].map(i => <View key={i} style={[styles.skeleton, { marginBottom: 12 }]} />)}
          </View>
        ) : !budgetsQuery.data || budgetsQuery.data.data.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No budgets set. Open the Budgets tab to add one.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {budgetsQuery.data.data.map(budget => {
              const isOver = budget.percentUsed >= 100;
              const isWarning = budget.percentUsed >= 80 && !isOver;
              const barColor = isOver ? c.danger : isWarning ? c.warning : c.success;

              return (
                <View key={budget.id} style={styles.budgetRow}>
                  <View style={styles.budgetHeader}>
                    <Text style={styles.budgetName}>
                      {budget.category.icon} {budget.category.name}
                    </Text>
                    <Text style={[styles.budgetAmount, isOver && styles.overBudget]}>
                      {formatINR(budget.spent)} / {formatINR(budget.amount)}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressBar, { width: `${budget.percentUsed}%`, backgroundColor: barColor }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Reports quick link */}
        <TouchableOpacity style={styles.reportsBtn} onPress={() => router.push('/(tabs)/reports')}>
          <Text style={styles.reportsBtnText}>📈  View Full Reports</Text>
          <Text style={styles.reportsBtnArrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  const { theme: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={[styles.summaryCard, { backgroundColor: bg }]}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </View>
  );
}

function BarRow({ label, amount, max, color }: { label: string; amount: number; max: number; color: string }) {
  const { theme: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const pct = max > 0 ? (amount / max) * 100 : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barAmount}>{formatINRShort(amount)}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (c: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  greeting: { fontSize: 22, fontWeight: '700', color: c.text },
  subGreeting: { fontSize: 13, color: c.textFaint, marginTop: -4 },
  themeToggle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  themeToggleIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: c.text, marginTop: 8 },

  cardsRow: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, borderRadius: 16, padding: 14, gap: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  cardLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  cardValue: { fontSize: 14, fontWeight: '700' },

  card: { backgroundColor: c.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.cardBorder, gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: c.text, marginBottom: 4 },

  // Income vs Expenses bars
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 12, color: c.textMuted, width: 65 },
  barTrack: { flex: 1, height: 10, backgroundColor: c.track, borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 99 },
  barAmount: { fontSize: 12, fontWeight: '600', color: c.text, width: 50, textAlign: 'right' },

  // Stacked category bar
  stackedBar: { height: 16, borderRadius: 8, overflow: 'hidden', flexDirection: 'row' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 13, color: c.text },
  legendValue: { fontSize: 13, fontWeight: '600', color: c.text },

  // Monthly bar chart
  monthlyChart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4 },
  monthColumn: { flex: 1, alignItems: 'center' },
  barContainer: { width: '100%', height: 80, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  monthBar: { width: '40%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  monthLabel: { fontSize: 10, color: c.textFaint, marginTop: 4 },
  chartLegend: { flexDirection: 'row', gap: 16, marginTop: 8, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSmall: { fontSize: 11, color: c.textMuted },

  // Budget rows
  budgetRow: { gap: 6 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetName: { fontSize: 13, color: c.text, fontWeight: '500' },
  budgetAmount: { fontSize: 12, color: c.textFaint },
  overBudget: { color: c.danger, fontWeight: '600' },
  progressTrack: { height: 6, backgroundColor: c.track, borderRadius: 99, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 99 },

  reportsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: c.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: c.inputBorder,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  reportsBtnText: { fontSize: 15, fontWeight: '600', color: c.text },
  reportsBtnArrow: { fontSize: 22, color: c.textFaint },

  emptyText: { fontSize: 13, color: c.textFaint, textAlign: 'center', paddingVertical: 8 },
  skeletonRow: { flexDirection: 'row', gap: 8 },
  skeleton: { flex: 1, height: 72, backgroundColor: c.track, borderRadius: 16 },

  // Cash in Hand card
  cashCard: {
    borderRadius: 16, padding: 16,
    backgroundColor: c.orange,
    shadowColor: c.orange, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  cashHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cashLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 2 },
  cashBalance: { fontSize: 26, fontWeight: '700', color: c.onColor },
  cashSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  cashBtns: { gap: 8 },
  cashBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  cashBtnSpend: { backgroundColor: 'rgba(0,0,0,0.15)' },
  cashBtnText: { color: c.onColor, fontSize: 13, fontWeight: '700' },
});
