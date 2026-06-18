import { useMemo, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { apiFetch } from '@/lib/api';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import AppAlert from '@/components/AppAlert';
import DatePickerField from '@/components/DatePickerField';
import { useTheme } from '@/context/ThemeContext';
import type { Theme } from '@/lib/theme';

type EventType = 'BIRTHDAY' | 'ANNIVERSARY' | 'MEMORIAL' | 'FESTIVAL' | 'CUSTOM';

const TYPES: { value: EventType; label: string; icon: string }[] = [
  { value: 'BIRTHDAY', label: 'Birthday', icon: '🎂' },
  { value: 'ANNIVERSARY', label: 'Anniversary', icon: '💍' },
  { value: 'FESTIVAL', label: 'Festival', icon: '🎊' },
  { value: 'MEMORIAL', label: 'Memorial', icon: '🕯️' },
  { value: 'CUSTOM', label: 'Other', icon: '🗓️' },
];

const NOTIFY_OPTIONS = [
  { label: 'On the day', value: 0 },
  { label: '1 day before', value: 1 },
  { label: '3 days', value: 3 },
  { label: '1 week', value: 7 },
];

export interface EditingEvent {
  id: string;
  title: string;
  type: EventType;
  date: string;
  isSelf: boolean;
  personName: string | null;
  notifyDaysBefore: number;
  note: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editing?: EditingEvent | null;
}

export default function AddEventSheet({ visible, onClose, onSuccess, editing }: Props) {
  const { getToken } = useAuth();
  const { theme: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const isEdit = !!editing;

  const [title, setTitle] = useState(editing?.title ?? '');
  const [type, setType] = useState<EventType>(editing?.type ?? 'BIRTHDAY');
  const [date, setDate] = useState(editing ? editing.date.slice(0, 10) : '');
  const [isSelf, setIsSelf] = useState(editing?.isSelf ?? false);
  const [personName, setPersonName] = useState(editing?.personName ?? '');
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(editing?.notifyDaysBefore ?? 0);
  const [note, setNote] = useState(editing?.note ?? '');
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string } | null>(null);

  async function handleSubmit() {
    if (!title.trim() || !date) {
      setAlertInfo({ title: 'Missing fields', message: 'Title and date are required.' });
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const body = {
        title: title.trim(),
        type,
        date,
        isSelf,
        personName: isSelf ? null : (personName.trim() || null),
        notifyDaysBefore,
        note: note.trim() || (isEdit ? null : undefined),
      };
      if (isEdit && editing) {
        await apiFetch(`/events/${editing.id}`, token!, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await apiFetch('/events', token!, { method: 'POST', body: JSON.stringify(body) });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setAlertInfo({ title: 'Error', message: err.message ?? 'Failed to save event.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalRoot}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
          <View style={[styles.sheet, { paddingBottom: keyboardHeight > 0 ? 16 : Math.max(insets.bottom, 24), marginBottom: keyboardHeight }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>{isEdit ? 'Edit Occasion' : '+ New Occasion'}</Text>
              <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Type */}
              <View style={styles.field}>
                <Text style={styles.label}>Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                    {TYPES.map(t => (
                      <TouchableOpacity key={t.value} onPress={() => setType(t.value)} style={[styles.chip, type === t.value && styles.chipActive]}>
                        <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>{t.icon} {t.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Title */}
              <View style={styles.field}>
                <Text style={styles.label}>Title</Text>
                <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Amma's Birthday" placeholderTextColor={c.textFaint} style={styles.input} maxLength={100} />
              </View>

              {/* Date */}
              <DatePickerField label="Date" value={date} onChange={setDate} placeholder="Tap to pick the date" style={{ marginBottom: 14 }} />

              {/* Whose */}
              <View style={styles.field}>
                <Text style={styles.label}>Whose occasion?</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity style={[styles.toggleBtn, isSelf && styles.toggleActive]} onPress={() => setIsSelf(true)}>
                    <Text style={[styles.toggleText, isSelf && styles.toggleTextActive]}>🎉 About me</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.toggleBtn, !isSelf && styles.toggleActive]} onPress={() => setIsSelf(false)}>
                    <Text style={[styles.toggleText, !isSelf && styles.toggleTextActive]}>👥 Someone else</Text>
                  </TouchableOpacity>
                </View>
                {isSelf && <Text style={styles.selfHint}>We'll celebrate you with confetti on the day 🎊</Text>}
              </View>

              {/* Person name */}
              {!isSelf && (
                <View style={styles.field}>
                  <Text style={styles.label}>Person <Text style={{ color: c.textFaint }}>(optional)</Text></Text>
                  <TextInput value={personName} onChangeText={setPersonName} placeholder="e.g. Brother, Mom, Best friend" placeholderTextColor={c.textFaint} style={styles.input} maxLength={100} />
                </View>
              )}

              {/* Notify */}
              <View style={styles.field}>
                <Text style={styles.label}>Remind me</Text>
                <View style={styles.notifyRow}>
                  {NOTIFY_OPTIONS.map(o => (
                    <TouchableOpacity key={o.value} onPress={() => setNotifyDaysBefore(o.value)} style={[styles.notifyChip, notifyDaysBefore === o.value && styles.chipActive]}>
                      <Text style={[styles.chipText, notifyDaysBefore === o.value && styles.chipTextActive]}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Note */}
              <View style={styles.field}>
                <Text style={styles.label}>Note <Text style={{ color: c.textFaint }}>(optional)</Text></Text>
                <TextInput value={note} onChangeText={setNote} placeholder="e.g. gift idea, restaurant" placeholderTextColor={c.textFaint} style={styles.input} maxLength={300} />
              </View>

              <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color={c.onColor} /> : <Text style={styles.submitText}>{isEdit ? 'Save Changes' : 'Add Occasion'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AppAlert visible={alertInfo !== null} title={alertInfo?.title ?? ''} message={alertInfo?.message ?? ''} onClose={() => setAlertInfo(null)} />
    </>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: c.overlay },
  sheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: '90%' },
  handle: { width: 40, height: 4, backgroundColor: c.inputBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: c.text },
  closeBtn: { fontSize: 18, color: c.textFaint, padding: 4 },

  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '500', color: c.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, backgroundColor: c.inputBg },

  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.card },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 12, color: c.textMuted, fontWeight: '500' },
  chipTextActive: { color: c.onColor },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, alignItems: 'center' },
  toggleActive: { backgroundColor: c.chipBg, borderColor: c.primary },
  toggleText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  toggleTextActive: { color: c.text },
  selfHint: { fontSize: 11, color: c.primary, marginTop: 6 },

  notifyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  notifyChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.card },

  submitBtn: { backgroundColor: c.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitText: { color: c.onColor, fontSize: 16, fontWeight: '700' },
});
