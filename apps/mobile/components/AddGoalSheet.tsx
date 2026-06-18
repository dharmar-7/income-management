import { useMemo, useState } from 'react';
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
import DatePickerField from '@/components/DatePickerField';
import { useTheme } from '@/context/ThemeContext';
import type { Theme } from '@/lib/theme';

// The fields the form needs to pre-fill when editing a goal.
export interface EditingGoal {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
  note: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editing?: EditingGoal | null;
}

export default function AddGoalSheet({ visible, onClose, onSuccess, editing }: Props) {
  const { getToken } = useAuth();
  const { theme: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const isEdit = !!editing;

  // The sheet mounts fresh each open, so seed state from `editing` directly.
  const [name, setName] = useState(editing?.name ?? '');
  const [icon, setIcon] = useState(editing?.icon ?? '🎯');
  const [targetAmount, setTargetAmount] = useState(editing ? String(editing.targetAmount) : '');
  const [savedAmount, setSavedAmount] = useState(editing ? String(editing.savedAmount) : '');
  const [targetDate, setTargetDate] = useState(editing?.targetDate ? editing.targetDate.slice(0, 10) : '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string } | null>(null);

  const ICON_CHOICES = ['🎯', '🏖️', '🚗', '🏠', '💍', '🎓', '🚑', '📱', '✈️', '🎁'];

  async function handleSubmit() {
    if (!name.trim() || !targetAmount) {
      setAlertInfo({ title: 'Missing fields', message: 'Goal name and target amount are required.' });
      return;
    }
    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      setAlertInfo({ title: 'Invalid target', message: 'Enter a valid target amount.' });
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const body = {
        name: name.trim(),
        icon: icon.trim() || '🎯',
        targetAmount: target,
        savedAmount: savedAmount ? parseFloat(savedAmount) : (isEdit ? undefined : 0),
        targetDate: targetDate || (isEdit ? null : undefined),
        note: note.trim() || (isEdit ? null : undefined),
      };
      if (isEdit && editing) {
        await apiFetch(`/goals/${editing.id}`, token!, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await apiFetch('/goals', token!, { method: 'POST', body: JSON.stringify(body) });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setAlertInfo({
        title: 'Error',
        message: err.message ?? (isEdit ? 'Failed to save goal.' : 'Failed to add goal.'),
      });
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
              <Text style={styles.title}>{isEdit ? 'Edit Goal' : '+ New Goal'}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* Icon picker */}
              <View style={styles.field}>
                <Text style={styles.label}>Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                    {ICON_CHOICES.map(em => (
                      <TouchableOpacity
                        key={em}
                        onPress={() => setIcon(em)}
                        style={[styles.iconChip, icon === em && styles.iconChipActive]}
                      >
                        <Text style={{ fontSize: 20 }}>{em}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Name */}
              <View style={styles.field}>
                <Text style={styles.label}>Goal Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Emergency fund, Goa trip"
                  placeholderTextColor={c.textFaint}
                  style={styles.input}
                  maxLength={200}
                />
              </View>

              {/* Target + Saved */}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Target (₹)</Text>
                  <TextInput
                    value={targetAmount}
                    onChangeText={setTargetAmount}
                    placeholder="50000"
                    placeholderTextColor={c.textFaint}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Saved so far (₹)</Text>
                  <TextInput
                    value={savedAmount}
                    onChangeText={setSavedAmount}
                    placeholder="0"
                    placeholderTextColor={c.textFaint}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Target date */}
              <DatePickerField
                label="Target Date (optional)"
                value={targetDate}
                onChange={setTargetDate}
                placeholder="Tap to pick (optional)"
                optional
                style={{ marginBottom: 14 }}
              />

              {/* Note */}
              <View style={styles.field}>
                <Text style={styles.label}>Note <Text style={{ color: c.textFaint }}>(optional)</Text></Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. 6 months of expenses"
                  placeholderTextColor={c.textFaint}
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
                  ? <ActivityIndicator color={c.onColor} />
                  : <Text style={styles.submitText}>{isEdit ? 'Save Changes' : 'Create Goal'}</Text>
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

const makeStyles = (c: Theme) => StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: c.overlay },
  sheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: c.inputBorder,
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: c.text },
  closeBtn: { fontSize: 18, color: c.textFaint, padding: 4 },

  field: { marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '500', color: c.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: c.text, backgroundColor: c.inputBg,
  },

  iconChip: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.card,
  },
  iconChipActive: { backgroundColor: c.chipBg, borderColor: c.primary },

  submitBtn: {
    backgroundColor: c.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  submitText: { color: c.onColor, fontSize: 16, fontWeight: '700' },
});
