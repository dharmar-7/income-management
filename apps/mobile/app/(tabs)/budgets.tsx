import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { apiFetch } from '@/lib/api';

interface BudgetWithProgress {
  id: string;
  amount: number;
  month: number;
  year: number;
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

const MONTHS = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export default function BudgetsScreen() {
  const { getToken } = useAuth();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['budget-progress'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<BudgetsResponse>('/budgets', token!);
    },
  });

  const overCount = data?.data.filter(b => b.percentUsed >= 100).length ?? 0;
  const onTrackCount = data?.data.filter(b => b.percentUsed < 80).length ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
      >
        {/* Month header */}
        {data && (
          <View style={styles.monthBadge}>
            <Text style={styles.monthText}>
              {MONTHS[data.month]} {data.year}
            </Text>
            {data.data.length > 0 && (
              <Text style={styles.monthSub}>
                {onTrackCount} on track · {overCount} over budget
              </Text>
            )}
          </View>
        )}

        {isLoading ? (
          [1, 2, 3].map(i => <View key={i} style={styles.skeleton} />)
        ) : !data || data.data.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No budgets set.</Text>
            <Text style={styles.emptyHint}>
              Use the web app at /budgets to set monthly limits per category.
              Pull down to refresh once you've added some.
            </Text>
          </View>
        ) : (
          data.data.map(budget => {
            const isOver = budget.percentUsed >= 100;
            const isWarning = budget.percentUsed >= 80 && !isOver;
            const barColor = isOver ? '#ef4444' : isWarning ? '#eab308' : '#22c55e';
            const statusLabel = isOver
              ? `${formatINR(Math.abs(budget.remaining))} over`
              : `${formatINR(budget.remaining)} left`;

            return (
              <View key={budget.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.categoryName}>
                    {budget.category.icon} {budget.category.name}
                  </Text>
                  <Text style={[styles.statusLabel, isOver && styles.overLabel]}>
                    {statusLabel}
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={styles.track}>
                  <View
                    style={[
                      styles.bar,
                      { width: `${budget.percentUsed}%`, backgroundColor: barColor },
                    ]}
                  />
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.footerText}>
                    Spent: {formatINR(budget.spent)}
                  </Text>
                  <Text style={styles.footerText}>
                    Limit: {formatINR(budget.amount)}
                  </Text>
                  <Text style={styles.footerText}>
                    {Math.round(budget.percentUsed)}%
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 10 },
  monthBadge: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  monthText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  monthSub: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  statusLabel: { fontSize: 12, color: '#9ca3af' },
  overLabel: { color: '#ef4444', fontWeight: '600' },
  track: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 99,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: 99 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 12, color: '#9ca3af' },
  skeleton: {
    height: 100,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  emptyHint: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
});
