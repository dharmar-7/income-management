import { useState, useMemo, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import DatePickerField from '@/components/DatePickerField';
import { useTheme } from '@/context/ThemeContext';
import type { Theme } from '@/lib/theme';
import type { RecurringItem } from '@/app/(tabs)/recurring';

type Frequency = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

const FREQ_OPTIONS: { value: Frequency; label: string; icon: string }[] = [
  { value: 'MONTHLY',  label: 'Monthly',  icon: '📅' },
  { value: 'WEEKLY',   label: 'Weekly',   icon: '🗓️' },
  { value: 'YEARLY',   label: 'Yearly',   icon: '📆' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  visible: boolean;
  editing: RecurringItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddRecurringSheet({ visible, editing, onClose, onSaved }: Props) {
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const { theme: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [name, setName]         = useState('');
  const [amount, setAmount]     = useState('');
  const [type, setType]         = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [frequency, setFreq]    = useState<Frequency>('MONTHLY');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [dayOfWeek, setDayOfWeek]   = useState(0);
  const [startDate, setStartDate]   = useState(new Date().toISOString());
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (visible) {
      if (editing) {
        setName(editing.name);
        setAmount(String(editing.amount));
        setType(editing.type);
        setFreq(editing.frequency);
        setDayOfMonth(String(editing.dayOfMonth ?? 1));
        setDayOfWeek(editing.dayOfWeek ?? 0);
        setStartDate(editing.startDate);
        setCategoryId(editing.category?.id ?? '');
        setNote(editing.note ?? '');
      } else {
        setName(''); setAmount(''); setType('DEBIT');
        setFreq('MONTHLY'); setDayOfMonth('1'); setDayOfWeek(0);
        setStartDate(new Date().toISOString());
        setCategoryId(''); setNote('');
      }
      setError('');
    }
  }, [visible, editing]);

  const { data: categories } = useQuery<{ id: string; name: string; icon: string | null }[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch('/transactions/categories', token!);
    },
  });

  async function handleSubmit() {
    if (!name.trim()) { setError('Name is required.'); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }

    setSaving(true);
    setError('');
    try {
      const token = await getToken();
      const body: Record<string, any> = {
        name: name.trim(),
        amount: amt,
        type,
        frequency,
        startDate: new Date(startDate).toISOString(),
        ...(categoryId && { categoryId }),
        ...(note.trim() && { note: note.trim() }),
      };
      if (frequency === 'MONTHLY')  body.dayOfMonth = parseInt(dayOfMonth) || 1;
      if (frequency === 'WEEKLY')   body.dayOfWeek  = dayOfWeek;

      if (editing) {
        await apiFetch(`/recurring/${editing.id}`, token!, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/recurring', token!, { method: 'POST', body: JSON.stringify(body) });
      }
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
          <Text style={s.title}>{editing ? 'Edit Recurring' : 'Add Recurring'}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Name */}
            <Text style={s.label}>Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Netflix, Rent, SIP"
              placeholderTextColor={c.textMuted}
              value={name}
              onChangeText={setName}
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

            {/* Type */}
            <Text style={s.label}>Type</Text>
            <View style={s.chips}>
              {(['DEBIT', 'CREDIT'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.chip, type === t && s.chipActive]}
                  onPress={() => setType(t)}
                >
                  <Text style={[s.chipText, type === t && s.chipTextActive]}>
                    {t === 'DEBIT' ? '💸 Expense' : '💵 Income'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Frequency */}
            <Text style={s.label}>Frequency</Text>
            <View style={s.chips}>
              {FREQ_OPTIONS.map(f => (
                <TouchableOpacity
                  key={f.value}
                  style={[s.chip, frequency === f.value && s.chipActive]}
                  onPress={() => setFreq(f.value)}
                >
                  <Text style={[s.chipText, frequency === f.value && s.chipTextActive]}>
                    {f.icon} {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Day selector */}
            {frequency === 'MONTHLY' && (
              <>
                <Text style={s.label}>Day of Month (1–28)</Text>
                <TextInput
                  style={s.input}
                  placeholder="1"
                  placeholderTextColor={c.textMuted}
                  keyboardType="number-pad"
                  value={dayOfMonth}
                  onChangeText={setDayOfMonth}
                />
              </>
            )}
            {frequency === 'WEEKLY' && (
              <>
                <Text style={s.label}>Day of Week</Text>
                <View style={s.chips}>
                  {DAY_NAMES.map((d, i) => (
                    <TouchableOpacity
                      key={d}
                      style={[s.chip, dayOfWeek === i && s.chipActive]}
                      onPress={() => setDayOfWeek(i)}
                    >
                      <Text style={[s.chipText, dayOfWeek === i && s.chipTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Start Date */}
            <Text style={s.label}>Start Date</Text>
            <DatePickerField value={startDate} onChange={setStartDate} />

            {/* Category */}
            {categories && categories.length > 0 && (
              <>
                <Text style={s.label}>Category (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
                    <TouchableOpacity
                      style={[s.chip, !categoryId && s.chipActive]}
                      onPress={() => setCategoryId('')}
                    >
                      <Text style={[s.chipText, !categoryId && s.chipTextActive]}>None</Text>
                    </TouchableOpacity>
                    {categories.map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[s.chip, categoryId === cat.id && s.chipActive]}
                        onPress={() => setCategoryId(cat.id)}
                      >
                        <Text style={[s.chipText, categoryId === cat.id && s.chipTextActive]}>
                          {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {/* Note */}
            <Text style={s.label}>Note (optional)</Text>
            <TextInput
              style={[s.input, { height: 72, textAlignVertical: 'top' }]}
              placeholder="Any extra details…"
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
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>{editing ? 'Save' : 'Add'}</Text>}
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
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '92%',
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 },
    title: { color: c.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
    label: { color: c.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
    input: {
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 12,
      color: c.text,
      fontSize: 15,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bg,
    },
    chipActive:     { backgroundColor: 'rgba(99,102,241,0.12)', borderColor: '#6366f1' },
    chipText:       { color: c.textMuted, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#6366f1' },
    error: { color: '#ef4444', fontSize: 13, marginTop: 10 },
    footer: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: {
      flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.border,
    },
    cancelText: { color: c.textMuted, fontSize: 15, fontWeight: '700' },
    saveBtn:    { flex: 2, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#6366f1' },
    saveText:   { color: '#fff', fontSize: 15, fontWeight: '800' },
  });
}
