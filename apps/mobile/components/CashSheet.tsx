import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { apiFetch } from '@/lib/api';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import AppAlert from '@/components/AppAlert';

type SheetMode = 'add' | 'spend';

const SOURCE_OPTIONS_IN = [
  { value: 'ATM',    label: 'ATM Withdrawal', icon: '🏧' },
  { value: 'PERSON', label: 'From Person',     icon: '🤝' },
  { value: 'OTHER',  label: 'Other',           icon: '💵' },
];

const SOURCE_OPTIONS_OUT = [
  { value: 'SPENT',     label: 'Cash Payment',  icon: '🛍️' },
  { value: 'DEPOSITED', label: 'Bank Deposit',  icon: '🏦' },
];

interface Props {
  visible: boolean;
  mode: SheetMode;
  currentBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n);
}

export default function CashSheet({ visible, mode, currentBalance, onClose, onSuccess }: Props) {
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string } | null>(null);

  const [amount, setAmount] = useState('');
  const [source, setSource] = useState(mode === 'add' ? 'ATM' : 'SPENT');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO);
  const [loading, setLoading] = useState(false);

  const options = mode === 'add' ? SOURCE_OPTIONS_IN : SOURCE_OPTIONS_OUT;

  function reset() {
    setAmount('');
    setSource(mode === 'add' ? 'ATM' : 'SPENT');
    setNote('');
    setDate(todayISO());
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setAlertInfo({ title: 'Invalid amount', message: 'Please enter a valid amount.' });
      return;
    }
    if (mode === 'spend' && parsed > currentBalance) {
      setAlertInfo({ title: 'Insufficient cash', message: `You only have ${formatINR(currentBalance)} in hand.` });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setAlertInfo({ title: 'Invalid date', message: 'Enter date as YYYY-MM-DD.' });
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const endpoint = mode === 'add' ? '/cash/add' : '/cash/spend';
      await apiFetch(endpoint, token!, {
        method: 'POST',
        body: JSON.stringify({
          amount: parsed,
          source,
          note: note.trim() || undefined,
          date,
        }),
      });
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      setAlertInfo({ title: 'Error', message: err.message ?? 'Failed to save.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <View
          style={[
            styles.sheet,
            {
              paddingBottom: keyboardHeight > 0 ? 16 : Math.max(insets.bottom, 24),
              marginBottom: keyboardHeight,
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'add' ? '💵 Add Cash' : '💸 Spend Cash'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {mode === 'spend' && (
            <View style={styles.balanceBanner}>
              <Text style={styles.balanceBannerText}>
                Cash in hand: {formatINR(currentBalance)}
              </Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* Source chips */}
            <Text style={styles.label}>Source</Text>
            <View style={styles.chipRow}>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, source === opt.value && styles.chipActive]}
                  onPress={() => setSource(opt.value)}
                >
                  <Text style={[styles.chipText, source === opt.value && styles.chipTextActive]}>
                    {opt.icon} {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            {/* Date */}
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="2026-05-09"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              maxLength={10}
            />

            {/* Note */}
            <Text style={styles.label}>Note <Text style={{ color: '#9ca3af' }}>(optional)</Text></Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Grocery run"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              maxLength={300}
            />

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 },
                mode === 'spend' && styles.submitBtnSpend]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>
                    {mode === 'add' ? 'Add Cash' : 'Record Spend'}
                  </Text>
              }
            </TouchableOpacity>

          </ScrollView>
        </View>
      </View>
    </Modal>

    <AppAlert
      visible={alertInfo !== null}
      title={alertInfo?.title ?? ''}
      message={alertInfo?.message ?? ''}
      onClose={() => setAlertInfo(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '90%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: { fontSize: 18, color: '#9ca3af', padding: 4 },

  balanceBanner: { backgroundColor: '#fef3c7', borderRadius: 12, padding: 10, marginBottom: 16 },
  balanceBannerText: { fontSize: 13, color: '#92400e', fontWeight: '600', textAlign: 'center' },

  label: { fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111827', marginBottom: 12,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99,
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  chipText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  submitBtn: { backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnSpend: { backgroundColor: '#f97316' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
