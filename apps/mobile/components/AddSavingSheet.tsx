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

// ─── Types ─────────────────────────────────────────────────────────────────────

type SavingType =
  | 'POST_OFFICE' | 'FIXED_DEPOSIT' | 'RECURRING_DEPOSIT'
  | 'STOCKS' | 'MUTUAL_FUNDS' | 'GOLD' | 'EPF' | 'NPS' | 'OTHER';

interface InvestmentPlatform {
  id: string;
  name: string;
  balance: number;
}

type SheetMode = 'platform' | 'saving';

interface Props {
  visible: boolean;
  mode: SheetMode;
  platforms: InvestmentPlatform[];
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const SAVING_TYPES: { value: SavingType; label: string; icon: string }[] = [
  { value: 'POST_OFFICE',       label: 'Post Office',    icon: '📮' },
  { value: 'FIXED_DEPOSIT',     label: 'Fixed Deposit',  icon: '🏦' },
  { value: 'RECURRING_DEPOSIT', label: 'RD',             icon: '📅' },
  { value: 'MUTUAL_FUNDS',      label: 'Mutual Funds',   icon: '📈' },
  { value: 'STOCKS',            label: 'Stocks',          icon: '💹' },
  { value: 'GOLD',              label: 'Gold',            icon: '🥇' },
  { value: 'EPF',               label: 'EPF',             icon: '🏢' },
  { value: 'NPS',               label: 'NPS',             icon: '🛡️' },
  { value: 'OTHER',             label: 'Other',           icon: '📦' },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n);
}

// ─── Add Platform Form ──────────────────────────────────────────────────────────

function AddPlatformForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string } | null>(null);
  const [name, setName] = useState('');
  const [totalAdded, setTotalAdded] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !totalAdded) {
      setAlertInfo({ title: 'Missing fields', message: 'Platform name and amount are required.' });
      return;
    }
    const amount = parseFloat(totalAdded);
    if (isNaN(amount) || amount <= 0) {
      setAlertInfo({ title: 'Invalid amount', message: 'Enter a valid positive amount.' });
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      await apiFetch('/savings/platforms', token!, {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          totalAdded: amount,
          note: note.trim() || undefined,
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setAlertInfo({ title: 'Error', message: err.message ?? 'Failed to add platform.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
    >
      <Text style={styles.hint}>
        A platform is your in-app wallet (e.g. Groww, Zerodha). Add the total amount you've transferred into it.
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>Platform Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Groww, Zerodha, Post Office"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          maxLength={100}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Total Transferred In (₹)</Text>
        <TextInput
          value={totalAdded}
          onChangeText={setTotalAdded}
          placeholder="e.g. 5000"
          placeholderTextColor="#9ca3af"
          keyboardType="decimal-pad"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Note <Text style={{ color: '#9ca3af' }}>(optional)</Text></Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Primary brokerage"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          maxLength={300}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>Add Platform</Text>
        }
      </TouchableOpacity>
    </ScrollView>

    <AppAlert
      visible={alertInfo !== null}
      title={alertInfo?.title ?? ''}
      message={alertInfo?.message ?? ''}
      onClose={() => setAlertInfo(null)}
    />
    </>
  );
}

// ─── Add Saving Form ────────────────────────────────────────────────────────────

function AddSavingForm({ platforms, onClose, onSuccess }: { platforms: InvestmentPlatform[]; onClose: () => void; onSuccess: () => void }) {
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string } | null>(null);
  const [savingType, setSavingType] = useState<SavingType>('MUTUAL_FUNDS');
  const [name, setName] = useState('');
  const [investedAmount, setInvestedAmount] = useState('');
  const [charges, setCharges] = useState('0');
  const [currentValue, setCurrentValue] = useState('');
  const [startDate, setStartDate] = useState(todayISO);
  const [maturityDate, setMaturityDate] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !investedAmount || !currentValue || !startDate) {
      setAlertInfo({ title: 'Missing fields', message: 'Name, invested amount, current value, and start date are required.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setAlertInfo({ title: 'Invalid date', message: 'Enter start date as YYYY-MM-DD.' });
      return;
    }
    if (maturityDate && !/^\d{4}-\d{2}-\d{2}$/.test(maturityDate)) {
      setAlertInfo({ title: 'Invalid date', message: 'Enter maturity date as YYYY-MM-DD.' });
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      await apiFetch('/savings', token!, {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          type: savingType,
          investedAmount: parseFloat(investedAmount),
          charges: parseFloat(charges) || 0,
          currentValue: parseFloat(currentValue),
          startDate,
          maturityDate: maturityDate || undefined,
          platformId: platformId || undefined,
          note: note.trim() || undefined,
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setAlertInfo({ title: 'Error', message: err.message ?? 'Failed to add investment.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
    >
      {/* Type chips */}
      <View style={styles.field}>
        <Text style={styles.label}>Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
            {SAVING_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setSavingType(t.value)}
                style={[styles.typeChip, savingType === t.value && styles.typeChipActive]}
              >
                <Text style={[styles.typeChipText, savingType === t.value && styles.typeChipTextActive]}>
                  {t.icon} {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Investment Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Nifty 50 SIP, PPF, SGB 2025"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          maxLength={200}
        />
      </View>

      <View style={styles.row3}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Invested (₹)</Text>
          <TextInput
            value={investedAmount}
            onChangeText={v => { setInvestedAmount(v); if (!currentValue) setCurrentValue(v); }}
            placeholder="0"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Charges (₹)</Text>
          <TextInput
            value={charges}
            onChangeText={setCharges}
            placeholder="0"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Curr. Value (₹)</Text>
          <TextInput
            value={currentValue}
            onChangeText={setCurrentValue}
            placeholder="0"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
      </View>

      <View style={[styles.row3, { gap: 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2026-01-01"
            placeholderTextColor="#9ca3af"
            style={styles.input}
            maxLength={10}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Maturity Date <Text style={{ color: '#9ca3af' }}>(optional)</Text></Text>
          <TextInput
            value={maturityDate}
            onChangeText={setMaturityDate}
            placeholder="2030-01-01"
            placeholderTextColor="#9ca3af"
            style={styles.input}
            maxLength={10}
          />
        </View>
      </View>

      {/* Platform picker */}
      {platforms.length > 0 && (
        <View style={styles.field}>
          <Text style={styles.label}>Platform <Text style={{ color: '#9ca3af' }}>(optional)</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
              <TouchableOpacity
                onPress={() => setPlatformId('')}
                style={[styles.typeChip, !platformId && styles.typeChipActive]}
              >
                <Text style={[styles.typeChipText, !platformId && styles.typeChipTextActive]}>None</Text>
              </TouchableOpacity>
              {platforms.map(p => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPlatformId(p.id)}
                  style={[styles.typeChip, platformId === p.id && styles.typeChipActive]}
                >
                  <Text style={[styles.typeChipText, platformId === p.id && styles.typeChipTextActive]}>
                    {p.name} ({formatINR(p.balance)})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Note <Text style={{ color: '#9ca3af' }}>(optional)</Text></Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Monthly ₹500 SIP"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          maxLength={300}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>Add Investment</Text>
        }
      </TouchableOpacity>
    </ScrollView>

    <AppAlert
      visible={alertInfo !== null}
      title={alertInfo?.title ?? ''}
      message={alertInfo?.message ?? ''}
      onClose={() => setAlertInfo(null)}
    />
    </>
  );
}

// ─── Sheet ──────────────────────────────────────────────────────────────────────

export default function AddSavingSheet({ visible, mode, platforms, onClose, onSuccess }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrapper}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'platform' ? '+ Add Platform' : '+ Add Investment'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {mode === 'platform'
            ? <AddPlatformForm onClose={onClose} onSuccess={onSuccess} />
            : <AddSavingForm platforms={platforms} onClose={onClose} onSuccess={onSuccess} />
          }
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#e5e7eb',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: { fontSize: 18, color: '#9ca3af', padding: 4 },

  hint: { fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 18 },

  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111827', backgroundColor: '#fff',
  },

  row3: { flexDirection: 'row', gap: 8, marginBottom: 14 },

  typeChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  typeChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  typeChipText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  typeChipTextActive: { color: '#fff' },

  submitBtn: {
    backgroundColor: '#6366f1', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
