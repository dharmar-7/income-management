import { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { apiFetch } from '@/lib/api';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import AppAlert from '@/components/AppAlert';
import { useTheme } from '@/context/ThemeContext';
import type { Theme } from '@/lib/theme';

interface Props {
  visible: boolean;
  goalId: string;
  goalName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ContributeGoalSheet({ visible, goalId, goalName, onClose, onSuccess }: Props) {
  const { getToken } = useAuth();
  const { theme: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string } | null>(null);

  async function submit(sign: 1 | -1) {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setAlertInfo({ title: 'Invalid amount', message: 'Enter an amount greater than zero.' });
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      await apiFetch(`/goals/${goalId}/contribute`, token!, {
        method: 'POST',
        body: JSON.stringify({ amount: sign * value }),
      });
      setAmount('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setAlertInfo({ title: 'Error', message: err.message ?? 'Failed to update goal.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalRoot}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
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
              <Text style={styles.title} numberOfLines={1}>Add to “{goalName}”</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={c.textFaint}
              keyboardType="decimal-pad"
              style={styles.input}
              autoFocus
            />

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, styles.withdrawBtn, loading && { opacity: 0.6 }]}
                onPress={() => submit(-1)}
                disabled={loading}
              >
                <Text style={[styles.btnText, { color: c.text }]}>− Withdraw</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.addBtn, loading && { opacity: 0.6 }]}
                onPress={() => submit(1)}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={c.onColor} />
                  : <Text style={[styles.btnText, { color: c.onColor }]}>+ Add money</Text>
                }
              </TouchableOpacity>
            </View>
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

const makeStyles = (c: Theme) => StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: c.overlay },
  sheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, backgroundColor: c.inputBorder,
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16, gap: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: c.text, flex: 1 },
  closeBtn: { fontSize: 18, color: c.textFaint, padding: 4 },

  label: { fontSize: 12, fontWeight: '500', color: c.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 18, fontWeight: '700', color: c.text, backgroundColor: c.inputBg,
    marginBottom: 16,
  },

  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  withdrawBtn: { backgroundColor: c.chipBg, borderWidth: 1, borderColor: c.inputBorder },
  addBtn: { backgroundColor: c.primary },
  btnText: { fontSize: 15, fontWeight: '700' },
});
