import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { apiFetch } from '@/lib/api';
import AppAlert from '@/components/AppAlert';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Props {
  visible: boolean;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AddTransactionSheet({ visible, categories, onClose, onSuccess }: Props) {
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string } | null>(null);

  const [txType, setTxType] = useState<'DEBIT' | 'CREDIT' | 'REFUND' | 'INVESTMENT'>('DEBIT');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(todayISO);
  const [description, setDescription] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [loading, setLoading] = useState(false);

  function reset() {
    setTxType('DEBIT');
    setAmount('');
    setMerchant('');
    setCategoryId('');
    setDate(todayISO());
    setDescription('');
    setShowCategories(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!amount || !merchant || !date) {
      setAlertInfo({ title: 'Missing fields', message: 'Amount, merchant, and date are required.' });
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setAlertInfo({ title: 'Invalid amount', message: 'Please enter a valid amount.' });
      return;
    }
    // Basic date validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setAlertInfo({ title: 'Invalid date', message: 'Enter date as YYYY-MM-DD.' });
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      await apiFetch('/transactions', token!, {
        method: 'POST',
        body: JSON.stringify({
          amount: parsed,
          merchant: merchant.trim(),
          type: txType,
          date,
          categoryId: categoryId || undefined,
          description: description.trim() || undefined,
        }),
      });
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      setAlertInfo({ title: 'Error', message: err.message ?? 'Failed to add transaction.' });
    } finally {
      setLoading(false);
    }
  }

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Transaction</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
          >

            {/* Type toggle */}
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeBtn, txType === 'DEBIT' && styles.typeBtnDebit]}
                onPress={() => setTxType('DEBIT')}
              >
                <Text style={[styles.typeBtnText, txType === 'DEBIT' && styles.typeBtnTextActive]}>
                  💸 Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, txType === 'CREDIT' && styles.typeBtnCredit]}
                onPress={() => setTxType('CREDIT')}
              >
                <Text style={[styles.typeBtnText, txType === 'CREDIT' && styles.typeBtnTextActive]}>
                  💰 Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, txType === 'REFUND' && styles.typeBtnRefund]}
                onPress={() => setTxType('REFUND')}
              >
                <Text style={[styles.typeBtnText, txType === 'REFUND' && styles.typeBtnTextActive]}>
                  ↩️ Refund
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, txType === 'INVESTMENT' && styles.typeBtnInvestment]}
                onPress={() => setTxType('INVESTMENT')}
              >
                <Text style={[styles.typeBtnText, txType === 'INVESTMENT' && styles.typeBtnTextActive]}>
                  📊 Investment
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View style={styles.field}>
              <Text style={styles.label}>Amount (₹)</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>

            {/* Merchant */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {txType === 'DEBIT' ? 'Merchant / Paid to'
                  : txType === 'REFUND' ? 'Refunded by'
                  : txType === 'INVESTMENT' ? 'Platform / App'
                  : 'Received from'}
              </Text>
              <TextInput
                value={merchant}
                onChangeText={setMerchant}
                placeholder={txType === 'DEBIT' ? 'e.g. Electricity Board'
                  : txType === 'REFUND' ? 'e.g. IRCTC'
                  : txType === 'INVESTMENT' ? 'e.g. Groww, Zerodha'
                  : 'e.g. Salary'}
                placeholderTextColor="#9ca3af"
                style={styles.input}
                maxLength={200}
              />
            </View>

            {/* Category */}
            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowCategories(v => !v)}
              >
                <Text style={selectedCategory ? styles.inputText : styles.inputPlaceholder}>
                  {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : 'Uncategorized (tap to select)'}
                </Text>
              </TouchableOpacity>

              {showCategories && (
                <View style={styles.categoryList}>
                  <TouchableOpacity
                    style={[styles.categoryItem, !categoryId && styles.categoryItemActive]}
                    onPress={() => { setCategoryId(''); setShowCategories(false); }}
                  >
                    <Text style={styles.categoryItemText}>📦 Uncategorized</Text>
                  </TouchableOpacity>
                  {categories.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.categoryItem, categoryId === c.id && styles.categoryItemActive]}
                      onPress={() => { setCategoryId(c.id); setShowCategories(false); }}
                    >
                      <Text style={styles.categoryItemText}>{c.icon} {c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="2026-05-09"
                placeholderTextColor="#9ca3af"
                style={styles.input}
                maxLength={10}
              />
            </View>

            {/* Note */}
            <View style={styles.field}>
              <Text style={styles.label}>Note <Text style={{ color: '#9ca3af' }}>(optional)</Text></Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Q1 electricity bill"
                placeholderTextColor="#9ca3af"
                style={styles.input}
                maxLength={500}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>Add Transaction</Text>
              }
            </TouchableOpacity>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#e5e7eb',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: { fontSize: 18, color: '#9ca3af', padding: 4 },

  typeToggle: {
    flexDirection: 'row', borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#f3f4f6', marginBottom: 16,
  },
  typeBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12,
  },
  typeBtnDebit: { backgroundColor: '#ef4444' },
  typeBtnCredit: { backgroundColor: '#22c55e' },
  typeBtnRefund: { backgroundColor: '#14b8a6' },
  typeBtnInvestment: { backgroundColor: '#6366f1' },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  typeBtnTextActive: { color: '#fff' },

  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111827', backgroundColor: '#fff',
    justifyContent: 'center',
  },
  inputText: { fontSize: 14, color: '#111827' },
  inputPlaceholder: { fontSize: 14, color: '#9ca3af' },

  categoryList: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    marginTop: 6, overflow: 'hidden',
  },
  categoryItem: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  categoryItemActive: { backgroundColor: '#f5f3ff' },
  categoryItemText: { fontSize: 14, color: '#111827' },

  submitBtn: {
    backgroundColor: '#6366f1', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
