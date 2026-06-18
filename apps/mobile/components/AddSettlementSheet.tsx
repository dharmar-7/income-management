import { useState, useMemo, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, StyleSheet, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import DatePickerField from '@/components/DatePickerField';
import { useTheme } from '@/context/ThemeContext';
import type { Theme } from '@/lib/theme';

interface RecentTx {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  type: 'DEBIT' | 'CREDIT' | 'REFUND' | 'INVESTMENT' | 'TRANSFER';
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n);
}

export default function AddSettlementSheet({ visible, onClose, onSaved }: Props) {
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const { theme: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [personName, setPersonName]       = useState('');
  const [amount, setAmount]               = useState('');
  const [direction, setDirection]         = useState<'SENT' | 'RECEIVED'>('SENT');
  const [transferredAt, setTransferredAt] = useState(new Date().toISOString());
  const [note, setNote]                   = useState('');
  const [linkedTxId, setLinkedTxId]       = useState<string | null>(null);
  const [showTxPicker, setShowTxPicker]   = useState(false);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');

  useEffect(() => {
    if (visible) {
      setPersonName(''); setAmount(''); setDirection('SENT');
      setTransferredAt(new Date().toISOString()); setNote('');
      setLinkedTxId(null); setShowTxPicker(false); setError('');
    }
  }, [visible]);

  // Fetch recent transactions to allow linking
  const { data: txData } = useQuery<{ data: RecentTx[] }>({
    queryKey: ['transactions', 'recent-for-settle'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch('/transactions?limit=50&sortBy=date&sortOrder=desc', token!);
    },
    enabled: visible,
  });

  const recentTxs = (txData?.data ?? []).filter(
    tx => tx.type !== 'TRANSFER' && tx.type !== 'INVESTMENT',
  );

  // Filter txs relevant to the direction: SENT → DEBIT txs, RECEIVED → CREDIT txs
  const relevantTxs = recentTxs.filter(
    tx => direction === 'SENT' ? tx.type === 'DEBIT' : tx.type === 'CREDIT',
  );

  const linkedTx = linkedTxId ? recentTxs.find(t => t.id === linkedTxId) : null;

  async function handleSubmit() {
    if (!personName.trim()) { setError('Person name is required.'); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }

    setSaving(true);
    setError('');
    try {
      const token = await getToken();
      const body: Record<string, any> = {
        personName: personName.trim(),
        amount: amt,
        direction,
        transferredAt: new Date(transferredAt).toISOString(),
        ...(note.trim() && { note: note.trim() }),
        ...(linkedTxId && { originalTxId: linkedTxId }),
      };
      await apiFetch('/settlements', token!, { method: 'POST', body: JSON.stringify(body) });
      onSaved();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, kb) + 20 }]}>
          <View style={s.handle} />
          <Text style={s.title}>Add Peer Transfer</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Direction */}
            <Text style={s.label}>What happened?</Text>
            <View style={s.chips}>
              <TouchableOpacity
                style={[s.chip, direction === 'SENT' && s.chipActive]}
                onPress={() => { setDirection('SENT'); setLinkedTxId(null); }}
              >
                <Text style={[s.chipText, direction === 'SENT' && s.chipTextActive]}>
                  📤 I sent money
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.chip, direction === 'RECEIVED' && s.chipActive]}
                onPress={() => { setDirection('RECEIVED'); setLinkedTxId(null); }}
              >
                <Text style={[s.chipText, direction === 'RECEIVED' && s.chipTextActive]}>
                  📥 I received money
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={s.helperText}>
              {direction === 'SENT'
                ? 'You sent money — expecting it back. The debit transaction will be excluded from expenses.'
                : 'You received money — planning to return it. The credit transaction will be excluded from income.'}
            </Text>

            {/* Person name */}
            <Text style={s.label}>Person / Contact</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Ravi, Mom, Colleague"
              placeholderTextColor={c.textMuted}
              value={personName}
              onChangeText={setPersonName}
            />

            {/* Amount */}
            <Text style={s.label}>Amount (₹)</Text>
            <TextInput
              style={s.input}
              placeholder="0"
              placeholderTextColor={c.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            {/* Date */}
            <Text style={s.label}>Transfer Date</Text>
            <DatePickerField value={transferredAt} onChange={setTransferredAt} />

            {/* Link to transaction */}
            <Text style={s.label}>Link to transaction (optional)</Text>
            {linkedTx ? (
              <TouchableOpacity
                style={s.linkedTxChip}
                onPress={() => setLinkedTxId(null)}
              >
                <Text style={s.linkedTxText} numberOfLines={1}>
                  🔗 {linkedTx.merchant} · {formatINR(linkedTx.amount)}
                </Text>
                <Text style={s.linkedTxRemove}>✕</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={s.linkBtn}
                onPress={() => setShowTxPicker(v => !v)}
              >
                <Text style={s.linkBtnText}>
                  {showTxPicker ? '▲ Hide transactions' : '▼ Pick from recent transactions'}
                </Text>
              </TouchableOpacity>
            )}

            {showTxPicker && !linkedTx && (
              <View style={s.txPickerWrap}>
                {relevantTxs.length === 0 ? (
                  <Text style={s.txPickerEmpty}>No {direction === 'SENT' ? 'debit' : 'credit'} transactions found.</Text>
                ) : (
                  relevantTxs.slice(0, 15).map(tx => (
                    <TouchableOpacity
                      key={tx.id}
                      style={s.txPickerItem}
                      onPress={() => { setLinkedTxId(tx.id); setShowTxPicker(false); setAmount(String(tx.amount)); }}
                    >
                      <View>
                        <Text style={s.txPickerMerchant} numberOfLines={1}>{tx.merchant}</Text>
                        <Text style={s.txPickerDate}>{new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                      </View>
                      <Text style={s.txPickerAmt}>{formatINR(tx.amount)}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Note */}
            <Text style={s.label}>Note (optional)</Text>
            <TextInput
              style={[s.input, { height: 68, textAlignVertical: 'top' }]}
              placeholder="e.g. Shared dinner, borrowed for petrol…"
              placeholderTextColor={c.textMuted}
              multiline
              value={note}
              onChangeText={setNote}
            />

            {error ? <Text style={s.error}>{error}</Text> : null}
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSubmit} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.saveText}>Add Transfer</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: Theme) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, maxHeight: '92%',
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 },
    title:  { color: c.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
    label:  { color: c.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
    input:  {
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.border,
      borderRadius: 12, padding: 12, color: c.text, fontSize: 15,
    },
    helperText: {
      color: '#6366f1', fontSize: 12, lineHeight: 17,
      marginTop: 6, paddingHorizontal: 2,
    },
    chips: { flexDirection: 'row', gap: 10 },
    chip: {
      flex: 1, paddingVertical: 10,
      borderRadius: 12, borderWidth: 1, borderColor: c.border,
      backgroundColor: c.bg, alignItems: 'center',
    },
    chipActive:     { backgroundColor: 'rgba(99,102,241,0.12)', borderColor: '#6366f1' },
    chipText:       { color: c.textMuted, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#6366f1' },

    linkedTxChip: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 12,
      padding: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
    },
    linkedTxText:   { color: '#6366f1', fontSize: 13, fontWeight: '600', flex: 1 },
    linkedTxRemove: { color: c.textMuted, fontSize: 16, paddingLeft: 8 },
    linkBtn: {
      padding: 12, borderRadius: 12, borderWidth: 1,
      borderColor: c.border, backgroundColor: c.bg, alignItems: 'center',
    },
    linkBtnText: { color: '#6366f1', fontSize: 13, fontWeight: '600' },

    txPickerWrap: {
      marginTop: 6, borderRadius: 12, overflow: 'hidden',
      borderWidth: 1, borderColor: c.border,
    },
    txPickerItem: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 12, borderBottomWidth: 1, borderBottomColor: c.border,
      backgroundColor: c.bg,
    },
    txPickerMerchant: { color: c.text, fontSize: 14, fontWeight: '600', maxWidth: 200 },
    txPickerDate:     { color: c.textMuted, fontSize: 11, marginTop: 2 },
    txPickerAmt:      { color: c.text, fontSize: 14, fontWeight: '700' },
    txPickerEmpty:    { color: c.textMuted, fontSize: 13, padding: 14, textAlign: 'center' },

    error:     { color: '#ef4444', fontSize: 13, marginTop: 10 },
    footer:    { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: c.bg, borderWidth: 1, borderColor: c.border },
    cancelText:{ color: c.textMuted, fontSize: 15, fontWeight: '700' },
    saveBtn:   { flex: 2, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#6366f1' },
    saveText:  { color: '#fff', fontSize: 15, fontWeight: '800' },
  });
}
