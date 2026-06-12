import { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, Pressable, StyleSheet,
  Animated, useColorScheme,
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
  const dark = useColorScheme() === 'dark';
  const scale = useRef(new Animated.Value(0.9)).current;
  const fade = useRef(new Animated.Value(0)).current;

  // Spring scale-in when the alert appears — feels far more alive than a flat fade.
  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      fade.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 90 }),
        Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const isConfirm = !!confirmLabel;
  const accent = confirmDestructive ? '#ef4444' : isConfirm ? '#6366f1' : '#f59e0b';
  const defaultIcon = confirmDestructive ? '🗑️' : isConfirm ? '❓' : '⚠️';
  const C = dark ? darkColors : lightColors;

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={isConfirm ? undefined : onClose}>
        <Animated.View style={[s.cardWrap, { opacity: fade, transform: [{ scale }] }]}>
          <Pressable style={[s.box, { backgroundColor: C.bg }]} onPress={() => {}}>
            <View style={[s.iconRing, { backgroundColor: accent + '14', borderColor: accent + '40' }]}>
              <Text style={s.iconText}>{icon ?? defaultIcon}</Text>
            </View>

            <Text style={[s.title, { color: C.title }]}>{title}</Text>
            <Text style={[s.message, { color: C.msg }]}>{message}</Text>

            {isConfirm ? (
              <View style={s.btnRow}>
                <TouchableOpacity
                  style={[s.btn, s.cancelBtn, { borderColor: C.border }]}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={[s.cancelText, { color: C.msg }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btn, { backgroundColor: accent }]}
                  onPress={() => { onClose(); onConfirm?.(); }}
                  activeOpacity={0.85}
                >
                  <Text style={s.confirmText}>{confirmLabel}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.btn, { backgroundColor: accent, width: '100%' }]}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={s.confirmText}>OK</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const lightColors = { bg: '#ffffff', title: '#0f172a', msg: '#64748b', border: '#e5e7eb' };
const darkColors  = { bg: '#1c1c2e', title: '#f1f5f9', msg: '#94a3b8', border: 'rgba(255,255,255,0.14)' };

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,15,30,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  cardWrap: { width: '100%', maxWidth: 380, alignItems: 'center' },
  box: {
    width: '100%',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 24,
  },
  iconRing: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  iconText: { fontSize: 30 },
  title: {
    fontSize: 19, fontWeight: '800', marginBottom: 8,
    textAlign: 'center', letterSpacing: -0.3,
  },
  message: { fontSize: 14.5, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  btn: { flex: 1, paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  cancelBtn: { borderWidth: 1.5, backgroundColor: 'transparent' },
  cancelText: { fontWeight: '700', fontSize: 15 },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
