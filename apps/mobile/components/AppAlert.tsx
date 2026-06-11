import {
  Modal, View, Text, TouchableOpacity, Pressable, StyleSheet,
} from 'react-native';

interface AppAlertProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: string;
  /** If set, a second action button is shown alongside Cancel */
  confirmLabel?: string;
  confirmDestructive?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}

export default function AppAlert({
  visible, title, message, icon,
  confirmLabel, confirmDestructive,
  onClose, onConfirm,
}: AppAlertProps) {
  const isConfirm = !!confirmLabel;
  const defaultIcon = confirmDestructive ? '🗑️' : isConfirm ? '❓' : '⚠️';
  const iconBg = confirmDestructive ? '#fef2f2' : isConfirm ? '#f0f9ff' : '#fff7ed';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={isConfirm ? undefined : onClose}>
        <Pressable style={s.box}>
          <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
            <Text style={s.iconText}>{icon ?? defaultIcon}</Text>
          </View>

          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>

          {isConfirm ? (
            <View style={s.btnRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, confirmDestructive ? s.destructiveBtn : s.primaryBtn]}
                onPress={() => { onClose(); onConfirm?.(); }}
              >
                <Text style={s.confirmText}>{confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[s.confirmBtn, s.primaryBtn, { width: '100%' }]} onPress={onClose}>
              <Text style={s.confirmText}>OK</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 32,
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: { fontSize: 28 },
  title: {
    fontSize: 18, fontWeight: '700', color: '#111827',
    marginBottom: 8, textAlign: 'center',
  },
  message: {
    fontSize: 14, color: '#6b7280',
    textAlign: 'center', lineHeight: 21,
    marginBottom: 24,
  },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center',
  },
  cancelText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
  confirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  primaryBtn: { backgroundColor: '#6366f1' },
  destructiveBtn: { backgroundColor: '#ef4444' },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
