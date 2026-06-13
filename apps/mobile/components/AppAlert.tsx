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

/**
 * Refined modal alert — a clean white card with a small accent icon, a bold
 * title, supporting copy, and a clearly-labelled solid action button.
 * Replaces the previous heavy dark popup. Used app-wide for validation and errors.
 */
export default function AppAlert({
  visible, title, message, icon,
  confirmLabel, confirmDestructive,
  onClose, onConfirm,
}: AppAlertProps) {
  const dark = useColorScheme() === 'dark';
  const scale = useRef(new Animated.Value(0.96)).current;
  const fade = useRef(new Animated.Value(0)).current;

  // Gentle spring scale-in so the card feels responsive without being bouncy.
  useEffect(() => {
    if (visible) {
      scale.setValue(0.96);
      fade.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 120 }),
        Animated.timing(fade, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const isConfirm = !!confirmLabel;
  // Icon-ring tint stays semantic (amber warn / red destructive / indigo question).
  const accent = confirmDestructive ? '#ef4444' : isConfirm ? '#6366f1' : '#f59e0b';
  // Primary button uses the brand violet from the logo (red for destructive).
  const buttonColor = confirmDestructive ? '#ef4444' : '#7c3aed';
  const defaultIcon = confirmDestructive ? '🗑️' : isConfirm ? '❓' : '⚠️';
  const C = dark ? darkColors : lightColors;

  // The primary button label: a custom confirm action, or a plain acknowledge.
  const primaryLabel = isConfirm ? confirmLabel! : 'OK';

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={isConfirm ? undefined : onClose}>
        <Animated.View style={[s.cardWrap, { opacity: fade, transform: [{ scale }] }]}>
          <Pressable style={[s.box, { backgroundColor: C.bg, borderColor: C.cardBorder }]} onPress={() => {}}>
            <View style={[s.iconChip, { backgroundColor: accent + '1f' }]}>
              <Text style={s.iconText}>{icon ?? defaultIcon}</Text>
            </View>

            <Text style={[s.title, { color: C.title }]}>{title}</Text>
            {!!message && <Text style={[s.message, { color: C.msg }]}>{message}</Text>}

            <View style={s.btnRow}>
              {isConfirm && (
                <TouchableOpacity
                  style={[s.btn, s.flex1, s.cancelBtn, { borderColor: C.border, backgroundColor: C.cancelBg }]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={[s.cancelText, { color: C.title }]}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.btn, s.flex1, { backgroundColor: buttonColor }]}
                onPress={() => { onClose(); if (isConfirm) onConfirm?.(); }}
                activeOpacity={0.85}
              >
                <Text style={s.primaryText}>{primaryLabel}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const lightColors = {
  bg: '#ffffff', title: '#0f172a', msg: '#64748b',
  border: '#e5e7eb', cardBorder: 'transparent', cancelBg: '#ffffff',
};
const darkColors = {
  bg: '#1e1e2e', title: '#f1f5f9', msg: '#94a3b8',
  border: 'rgba(255,255,255,0.16)', cardBorder: 'rgba(255,255,255,0.08)', cancelBg: 'transparent',
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  cardWrap: { width: '100%', maxWidth: 360, alignItems: 'center' },
  box: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 20,
  },
  iconChip: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  iconText: { fontSize: 26 },
  title: {
    fontSize: 18, fontWeight: '800', marginBottom: 6,
    textAlign: 'center', letterSpacing: -0.3,
  },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  flex1: { flex: 1 },
  btn: {
    paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: { borderWidth: 1.5 },
  cancelText: { fontWeight: '700', fontSize: 15 },
  primaryText: { color: '#ffffff', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },
});
