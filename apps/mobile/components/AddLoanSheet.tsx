import { useState, useMemo, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { apiFetch } from '@/lib/api';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import DatePickerField from '@/components/DatePickerField';
import { useTheme } from '@/context/ThemeContext';
import type { Theme } from '@/lib/theme';
import type { LoanItem, LoanType } from '@/app/(tabs)/loans';

const LOAN_TYPES: { value: LoanType; label: string; icon: string }[] = [
  { value: 'HOME_LOAN',        label: 'Home Loan',      icon: '🏠' },
  { value: 'CAR_LOAN',         label: 'Car Loan',       icon: '🚗' },
  { value: 'PERSONAL_LOAN',    label: 'Personal Loan',  icon: '💼' },
  { value: 'EDUCATION_LOAN',   label: 'Education',      icon: '🎓' },
  { value: 'TWO_WHEELER_LOAN', label: '2-Wheeler',      icon: '🏍️' },
  { value: 'CREDIT_CARD_EMI',  label: 'Credit Card EMI',icon: '💳' },
  { value: 'OTHER',            label: 'Other',          icon: '📋' },
];

interface Props {
  visible: boolean;
  editing: LoanItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddLoanSheet({ visible, editing, onClose, onSaved }: Props) {
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const { theme: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [loanType, setLoanType]     = useState<LoanType>('PERSONAL_LOAN');
  const [name, setName]             = useState('');
  const [lender, setLender]         = useState('');
  const [principal, setPrincipal]   = useState('');
  const [rate, setRate]             = useState('');
  const [tenure, setTenure]         = useState('');
  const [emiDay, setEmiDay]         = useState('1');
  const [startDate, setStartDate]   = useState(new Date().toISOString());
  const [note, setNote]             = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  // Computed EMI preview
  const emiPreview = useMemo(() => {
    const P = parseFloat(principal);
    const r = parseFloat(rate) / 12 / 100;
    const n = parseInt(tenure);
    if (!P || !n || isNaN(P) || isNaN(n)) return null;
    if (!rate || parseFloat(rate) === 0) return +(P / n).toFixed(0);
    const emi = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    return +emi.toFixed(0);
  }, [principal, rate, tenure]);

  useEffect(() => {
    if (visible) {
      if (editing) {
        setLoanType(editing.loanType);
        setName(editing.name);
        setLender(editing.lender);
        setPrincipal(String(editing.principalAmount));
        setRate(String(editing.interestRate));
        setTenure(String(editing.tenure));
        setEmiDay(String(editing.emiDay));
        setStartDate(editing.startDate);
        setNote(editing.note ?? '');
      } else {
        setLoanType('PERSONAL_LOAN'); setName(''); setLender('');
        setPrincipal(''); setRate(''); setTenure('');
        setEmiDay('1'); setStartDate(new Date().toISOString()); setNote('');
      }
      setError('');
    }
  }, [visible, editing]);

  async function handleSubmit() {
    if (!name.trim())   { setError('Name is required.'); return; }
    if (!lender.trim()) { setError('Lender name is required.'); return; }
    const P = parseFloat(principal);
    if (!principal || isNaN(P) || P <= 0) { setError('Enter valid loan amount.'); return; }
    const n = parseInt(tenure);
    if (!tenure || isNaN(n) || n < 1) { setError('Enter tenure in months.'); return; }

    setSaving(true);
    setError('');
    try {
      const token = await getToken();
      const body = {
        name: name.trim(),
        loanType,
        lender: lender.trim(),
        principalAmount: P,
        interestRate: parseFloat(rate) || 0,
        tenure: n,
        emiDay: parseInt(emiDay) || 1,
        startDate: new Date(startDate).toISOString(),
        ...(note.trim() && { note: note.trim() }),
      };

      if (editing) {
        await apiFetch(`/loans/${editing.id}`, token!, {
          method: 'PUT',
          body: JSON.stringify({ name: body.name, note: body.note }),
        });
      } else {
        await apiFetch('/loans', token!, { method: 'POST', body: JSON.stringify(body) });
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
          <Text style={s.title}>{editing ? 'Edit Loan' : 'Add Loan'}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Loan type */}
            <Text style={s.label}>Loan Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                {LOAN_TYPES.map(lt => (
                  <TouchableOpacity
                    key={lt.value}
                    style={[s.chip, loanType === lt.value && s.chipActive]}
                    onPress={() => setLoanType(lt.value)}
                    disabled={!!editing}
                  >
                    <Text style={[s.chipText, loanType === lt.value && s.chipTextActive]}>
                      {lt.icon} {lt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Name */}
            <Text style={s.label}>Loan Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. SBI Home Loan, HDFC Car"
              placeholderTextColor={c.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Lender */}
            <Text style={s.label}>Lender / Bank</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. SBI, HDFC, Bajaj"
              placeholderTextColor={c.textMuted}
              value={lender}
              onChangeText={setLender}
              editable={!editing}
            />

            {!editing && (
              <>
                {/* Principal */}
                <Text style={s.label}>Loan Amount (₹)</Text>
                <TextInput
                  style={s.input}
                  placeholder="0"
                  placeholderTextColor={c.textMuted}
                  keyboardType="decimal-pad"
                  value={principal}
                  onChangeText={setPrincipal}
                />

                {/* Interest Rate */}
                <Text style={s.label}>Interest Rate (% per annum)</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. 8.5"
                  placeholderTextColor={c.textMuted}
                  keyboardType="decimal-pad"
                  value={rate}
                  onChangeText={setRate}
                />

                {/* Tenure */}
                <Text style={s.label}>Tenure (months)</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. 180 for 15 years"
                  placeholderTextColor={c.textMuted}
                  keyboardType="number-pad"
                  value={tenure}
                  onChangeText={setTenure}
                />

                {/* EMI preview */}
                {emiPreview && (
                  <View style={s.emiPreview}>
                    <Text style={s.emiPreviewLabel}>Estimated Monthly EMI</Text>
                    <Text style={s.emiPreviewAmount}>₹{emiPreview.toLocaleString('en-IN')}</Text>
                  </View>
                )}

                {/* EMI Day */}
                <Text style={s.label}>EMI Due Day (1–28)</Text>
                <TextInput
                  style={s.input}
                  placeholder="1"
                  placeholderTextColor={c.textMuted}
                  keyboardType="number-pad"
                  value={emiDay}
                  onChangeText={setEmiDay}
                />

                {/* Start Date */}
                <Text style={s.label}>Start / Disbursement Date</Text>
                <DatePickerField value={startDate} onChange={setStartDate} />
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
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>{editing ? 'Save' : 'Add Loan'}</Text>}
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
    emiPreview: {
      backgroundColor: 'rgba(99,102,241,0.08)',
      borderRadius: 12,
      padding: 12,
      marginTop: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(99,102,241,0.2)',
    },
    emiPreviewLabel:  { color: '#6366f1', fontSize: 12, fontWeight: '600' },
    emiPreviewAmount: { color: '#6366f1', fontSize: 22, fontWeight: '800', marginTop: 2 },
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
