import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api';
import AddTransactionSheet from '@/components/AddTransactionSheet';

// ─── Debounce hook — same concept as the web app ─────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  type: 'DEBIT' | 'CREDIT' | 'REFUND' | 'INVESTMENT';
  source: 'TAKEOUT' | 'GMAIL' | 'MANUAL' | 'SMS';
  description: string | null;
  category: { name: string; icon: string } | null;
}

interface TransactionsResponse {
  data: Transaction[];
  meta: { total: number; page: number; totalPages: number };
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function TransactionsScreen() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 300);
  const [type, setType] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showSheet, setShowSheet] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [search]);

  async function handleDelete(id: string) {
    Alert.alert(
      'Delete Transaction',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              const token = await getToken();
              await apiFetch(`/transactions/${id}`, token!, { method: 'DELETE' });
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
            } catch {
              Alert.alert('Error', 'Failed to delete transaction.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  }

  const params = new URLSearchParams({
    page: String(page),
    limit: '20',
    sortBy: 'date',
    sortOrder,
    ...(search && { search }),
    ...(type && { type }),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['transactions', page, search, type, sortOrder],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<TransactionsResponse>(`/transactions?${params}`, token!);
    },
    staleTime: 2 * 60 * 1000,
  });

  // Categories needed for the sheet
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<{ id: string; name: string; icon: string }[]>('/transactions/categories', token!);
    },
    staleTime: 10 * 60 * 1000,
  });

  return (
    <SafeAreaView style={styles.safe}>
      <AddTransactionSheet
        visible={showSheet}
        categories={categories ?? []}
        onClose={() => setShowSheet(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['transactions'] })}
      />
      {/* Search bar */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search merchant..."
          style={styles.searchInput}
          placeholderTextColor="#9ca3af"
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => setSearchInput('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter row: type chips + sort toggle */}
      <View style={styles.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chips}
          contentContainerStyle={{ gap: 8 }}
        >
          {(['', 'DEBIT', 'CREDIT', 'REFUND', 'INVESTMENT'] as const).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => { setType(t); setPage(1); }}
              style={[styles.chip, type === t && styles.chipActive]}
            >
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                {t === '' ? 'All' : t === 'DEBIT' ? 'Expenses' : t === 'CREDIT' ? 'Income' : t === 'REFUND' ? 'Refunds' : 'Investments'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          onPress={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
          style={styles.sortBtn}
        >
          <Text style={styles.sortBtnText}>
            {sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Total count */}
      {data && (
        <Text style={styles.countText}>
          {data.meta.total} transaction{data.meta.total !== 1 ? 's' : ''}
          {search ? ` matching "${search}"` : ''}
        </Text>
      )}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#111827" />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: tx }) => (
            <View style={styles.row}>
              <View style={[styles.iconBox,
                tx.type === 'CREDIT' ? styles.iconBoxCredit
                : tx.type === 'REFUND' ? styles.iconBoxRefund
                : tx.type === 'INVESTMENT' ? styles.iconBoxInvestment
                : styles.iconBoxDebit]}>
                <Text style={styles.icon}>{tx.type === 'REFUND' ? '↩️' : tx.type === 'INVESTMENT' ? '📊' : (tx.category?.icon ?? '📦')}</Text>
              </View>
              <View style={styles.rowBody}>
                <View style={styles.merchantRow}>
                  <Text style={styles.merchant} numberOfLines={1}>{tx.merchant}</Text>
                  {tx.type === 'INVESTMENT' && (
                    <View style={styles.investmentBadge}>
                      <Text style={styles.investmentBadgeText}>Investment</Text>
                    </View>
                  )}
                  {tx.type === 'REFUND' && (
                    <View style={styles.refundBadge}>
                      <Text style={styles.refundBadgeText}>Refund</Text>
                    </View>
                  )}
                  {tx.source === 'MANUAL' && (
                    <View style={styles.manualBadge}>
                      <Text style={styles.manualBadgeText}>Manual</Text>
                    </View>
                  )}
                  {tx.source === 'SMS' && (
                    <View style={styles.smsBadge}>
                      <Text style={styles.smsBadgeText}>SMS</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.meta}>
                  {tx.category?.name ?? 'Uncategorized'} · {formatDate(tx.date)}
                </Text>
                {tx.description ? (
                  <Text style={styles.note} numberOfLines={1}>💬 {tx.description}</Text>
                ) : null}
              </View>
              <View style={styles.amountCol}>
                <Text style={[styles.amount,
                  tx.type === 'CREDIT' ? styles.credit
                  : tx.type === 'REFUND' ? styles.refund
                  : tx.type === 'INVESTMENT' ? styles.investment
                  : null]}>
                  {tx.type === 'CREDIT' ? '+' : tx.type === 'REFUND' ? '↩' : tx.type === 'INVESTMENT' ? '→' : '-'}{formatINR(tx.amount)}
                </Text>
                {tx.source === 'MANUAL' ? (
                  <TouchableOpacity
                    onPress={() => handleDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.deleteBtn}>
                      {deletingId === tx.id ? '…' : '🗑️'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.typeLabel}>
                    {tx.type === 'CREDIT' ? 'Income' : 'Expense'}
                  </Text>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No transactions found.</Text>
              {search ? <Text style={styles.emptyHint}>Try a different search term.</Text> : null}
            </View>
          }
          ListFooterComponent={
            data && data.meta.totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  onPress={() => setPage(p => p - 1)}
                  disabled={page === 1}
                  style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                >
                  <Text style={styles.pageBtnText}>← Previous</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>
                  Page {page} of {data.meta.totalPages}
                </Text>
                <TouchableOpacity
                  onPress={() => setPage(p => p + 1)}
                  disabled={page === data.meta.totalPages || isFetching}
                  style={[styles.pageBtn, page === data.meta.totalPages && styles.pageBtnDisabled]}
                >
                  <Text style={styles.pageBtnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* FAB — add transaction */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowSheet(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  clearBtn: { padding: 4 },
  clearBtnText: { color: '#9ca3af', fontSize: 14 },

  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 4 },
  chips: { flex: 1 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { fontSize: 13, color: '#6b7280' },
  chipTextActive: { color: '#fff' },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  sortBtnText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },

  countText: { fontSize: 12, color: '#9ca3af', paddingHorizontal: 16, paddingVertical: 4 },

  list: { paddingHorizontal: 12, paddingBottom: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  iconBox: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  iconBoxDebit: { backgroundColor: '#fef2f2' },
  iconBoxCredit: { backgroundColor: '#f0fdf4' },
  iconBoxRefund: { backgroundColor: '#f0fdfa' },
  iconBoxInvestment: { backgroundColor: '#eef2ff' },
  icon: { fontSize: 18 },
  rowBody: { flex: 1 },
  merchant: { fontSize: 14, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  note: { fontSize: 11, color: '#6b7280', marginTop: 3, fontStyle: 'italic' },
  amountCol: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  credit: { color: '#16a34a' },
  refund: { color: '#0d9488' },
  investment: { color: '#4f46e5' },
  typeLabel: { fontSize: 10, color: '#9ca3af', marginTop: 2 },

  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  manualBadge: {
    backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ede9fe',
    borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1,
  },
  manualBadgeText: { fontSize: 10, color: '#7c3aed', fontWeight: '600' },
  refundBadge: {
    backgroundColor: '#f0fdfa', borderWidth: 1, borderColor: '#ccfbf1',
    borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1,
  },
  refundBadgeText: { fontSize: 10, color: '#0d9488', fontWeight: '600' },
  smsBadge: {
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe',
    borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1,
  },
  smsBadgeText: { fontSize: 10, color: '#2563eb', fontWeight: '600' },
  investmentBadge: {
    backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#e0e7ff',
    borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1,
  },
  investmentBadgeText: { fontSize: 10, color: '#4f46e5', fontWeight: '600' },
  deleteBtn: { fontSize: 16, marginTop: 2 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 26, lineHeight: 28, fontWeight: '300' },

  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { textAlign: 'center', color: '#6b7280', fontSize: 15, fontWeight: '600' },
  emptyHint: { textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 4 },

  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 99, borderWidth: 1, borderColor: '#e5e7eb' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, color: '#374151' },
  pageInfo: { fontSize: 13, color: '#9ca3af' },
});
