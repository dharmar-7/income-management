import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import AppAlert from '@/components/AppAlert';
import { useTheme } from '@/context/ThemeContext';
import type { Theme } from '@/lib/theme';

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

interface Category {
  id: string;
  name: string;
  icon: string;
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

// ─── Add Budget Sheet ──────────────────────────────────────────────────────────

function AddBudgetSheet({
  visible,
  categories,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { getToken } = useAuth();
  const { theme: c } = useTheme();
  const sheet = useMemo(() => makeSheet(c), [c]);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const now = new Date();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState(false);
  const [alertData, setAlertData] = useState<{ title: string; message: string } | null>(null);
  function showAlert(t: string, m: string) { setAlertData({ title: t, message: m }); }

  function reset() {
    setCategoryId('');
    setAmount('');
    setMonth(String(new Date().getMonth() + 1));
    setYear(String(new Date().getFullYear()));
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit() {
    if (!categoryId) { showAlert('Required', 'Please select a category.'); return; }
    if (!amount) { showAlert('Required', 'Please enter an amount.'); return; }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { showAlert('Invalid', 'Enter a valid positive amount.'); return; }
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || m < 1 || m > 12) { showAlert('Invalid', 'Month must be 1–12.'); return; }
    if (isNaN(y) || y < 2020) { showAlert('Invalid', 'Enter a valid year.'); return; }

    setLoading(true);
    try {
      const token = await getToken();
      await apiFetch('/budgets', token!, {
        method: 'PUT',
        body: JSON.stringify({ categoryId, amount: parsed, month: m, year: y }),
      });
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      showAlert('Error', err.message ?? 'Could not save budget.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={sheet.modalRoot}>
        <TouchableOpacity style={sheet.backdrop} activeOpacity={1} onPress={handleClose} />
        <View
          style={[
            sheet.container,
            {
              paddingBottom: keyboardHeight > 0 ? 16 : Math.max(insets.bottom, 24),
              marginBottom: keyboardHeight,
            },
          ]}
        >
          <View style={sheet.handle} />
          <View style={sheet.header}>
            <Text style={sheet.title}>+ Set Monthly Budget</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={sheet.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Category */}
            <Text style={sheet.label}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {categories.map(c => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={[sheet.chip, categoryId === c.id && sheet.chipActive]}
                >
                  <Text style={[sheet.chipText, categoryId === c.id && sheet.chipTextActive]}>
                    {c.icon} {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Amount */}
            <Text style={sheet.label}>Budget Amount (₹)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 5000"
              placeholderTextColor={c.textFaint}
              keyboardType="decimal-pad"
              style={sheet.input}
            />

            {/* Month / Year */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={sheet.label}>Month (1–12)</Text>
                <TextInput
                  value={month}
                  onChangeText={setMonth}
                  placeholder="5"
                  placeholderTextColor={c.textFaint}
                  keyboardType="number-pad"
                  style={sheet.input}
                  maxLength={2}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sheet.label}>Year</Text>
                <TextInput
                  value={year}
                  onChangeText={setYear}
                  placeholder="2026"
                  placeholderTextColor={c.textFaint}
                  keyboardType="number-pad"
                  style={sheet.input}
                  maxLength={4}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[sheet.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={c.contrastText} />
                : <Text style={sheet.submitText}>Save Budget</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
      <AppAlert
        visible={!!alertData}
        title={alertData?.title ?? ''}
        message={alertData?.message ?? ''}
        onClose={() => setAlertData(null)}
      />
    </Modal>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function BudgetsScreen() {
  const { getToken } = useAuth();
  const { theme: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['budget-progress'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<BudgetsResponse>('/budgets', token!);
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Category[]>('/transactions/categories', token!);
    },
    staleTime: 10 * 60 * 1000,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['budget-progress'] });
  }

  const overCount = data?.data.filter(b => b.percentUsed >= 100).length ?? 0;
  const onTrackCount = data?.data.filter(b => b.percentUsed < 80).length ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AddBudgetSheet
        visible={showAdd}
        categories={categories}
        onClose={() => setShowAdd(false)}
        onSuccess={invalidate}
      />

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
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No budgets set for this month.</Text>
            <Text style={styles.emptyHint}>
              Tap + to set a monthly spending limit per category.
            </Text>
          </View>
        ) : (
          data.data.map(budget => {
            const isOver = budget.percentUsed >= 100;
            const isWarning = budget.percentUsed >= 80 && !isOver;
            const barColor = isOver ? c.danger : isWarning ? c.warning : c.success;
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
                      { width: `${Math.min(budget.percentUsed, 100)}%`, backgroundColor: barColor },
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

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (c: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, gap: 10, paddingBottom: 100 },
  monthBadge: {
    backgroundColor: c.contrast,
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  monthText: { color: c.contrastText, fontWeight: '700', fontSize: 15 },
  monthSub: { color: c.textFaint, fontSize: 12, marginTop: 2 },
  card: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: { fontSize: 15, fontWeight: '600', color: c.text },
  statusLabel: { fontSize: 12, color: c.textFaint },
  overLabel: { color: c.danger, fontWeight: '600' },
  track: {
    height: 8,
    backgroundColor: c.track,
    borderRadius: 99,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: 99 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 12, color: c.textFaint },
  skeleton: {
    height: 100,
    backgroundColor: c.track,
    borderRadius: 16,
  },
  emptyCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  emptyIcon: { fontSize: 36, marginBottom: 4 },
  emptyText: { fontSize: 15, fontWeight: '600', color: c.text },
  emptyHint: {
    fontSize: 13,
    color: c.textFaint,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute', bottom: 104, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: c.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: c.onColor, fontSize: 26, lineHeight: 28, fontWeight: '300' },
});

const makeSheet = (c: Theme) => StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: c.overlay },
  container: {
    backgroundColor: c.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
    maxHeight: '90%',
  },
  handle: { width: 40, height: 4, backgroundColor: c.inputBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 17, fontWeight: '700', color: c.text },
  closeBtn: { fontSize: 18, color: c.textFaint, padding: 4 },
  label: { fontSize: 12, fontWeight: '500', color: c.textMuted, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: c.text, marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99,
    borderWidth: 1, borderColor: c.chipBorder, backgroundColor: c.chipBg,
  },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 13, color: c.textMuted, fontWeight: '500' },
  chipTextActive: { color: c.onColor },
  submitBtn: { backgroundColor: c.contrast, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitText: { color: c.contrastText, fontSize: 16, fontWeight: '700' },
});
