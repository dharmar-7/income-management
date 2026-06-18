import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, Modal, View, Text, TouchableOpacity, Dimensions, StyleSheet,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/clerk-expo';
import { useAuth } from '@clerk/clerk-expo';
import { apiFetch } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import type { Theme } from '@/lib/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const COLORS = ['#f43f5e', '#6366f1', '#22c55e', '#eab308', '#ec4899', '#06b6d4', '#f97316'];
const PIECES = 30;

interface Occasion {
  id: string; title: string; type: string; isSelf: boolean; isToday: boolean; turning: number;
}

// Falling "paper" confetti piece, driven by a shared 0→1 progress value.
function Piece({ progress, index }: { progress: Animated.Value; index: number }) {
  const startX = (index * 53) % SCREEN_W;
  const endYFactor = 0.85 + (index % 5) * 0.05;
  const drift = index % 2 ? 40 : -40;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-40, SCREEN_H * endYFactor] });
  const translateX = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, drift, 0] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(index % 2 ? 1 : -1) * 720}deg`] });
  const opacity = progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.View
      style={{
        position: 'absolute', top: 0, left: startX,
        width: 8, height: 14, borderRadius: 2,
        backgroundColor: COLORS[index % COLORS.length],
        transform: [{ translateY }, { translateX }, { rotate }],
        opacity,
      }}
    />
  );
}

export default function Celebration() {
  const { theme: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { getToken } = useAuth();
  const { user } = useUser();

  const { data } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Occasion[]>('/events', token!);
    },
    staleTime: 5 * 60 * 1000,
  });

  const [show, setShow] = useState(false);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const pieces = useMemo(() => Array.from({ length: PIECES }, (_, i) => i), []);

  // When a self-occasion falls today, celebrate once per day.
  useEffect(() => {
    const self = (data ?? []).find(e => e.isSelf && e.isToday);
    if (!self) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    SecureStore.getItemAsync('velora-celebrated').then(last => {
      if (last === todayKey) return;
      setOccasion(self);
      setShow(true);
      SecureStore.setItemAsync('velora-celebrated', todayKey).catch(() => {});
    }).catch(() => {});
  }, [data]);

  useEffect(() => {
    if (!show) return;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 3000, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [show]);

  if (!show || !occasion) return null;

  const isBirthday = occasion.type === 'BIRTHDAY';
  const headline = isBirthday ? `Happy Birthday, ${user?.firstName ?? 'you'}! 🎂` : `Happy ${occasion.title}! 🎉`;
  const sub = isBirthday && occasion.turning > 0 ? `Here's to turning ${occasion.turning} 🥳` : 'Wishing you a wonderful day';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setShow(false)}>
      <TouchableOpacity activeOpacity={1} style={styles.root} onPress={() => setShow(false)}>
        {/* Confetti layer */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {pieces.map(i => <Piece key={i} progress={progress} index={i} />)}
        </View>
        {/* Wish card */}
        <View style={styles.card}>
          <Text style={styles.emoji}>🎊</Text>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.sub}>{sub}</Text>
          <TouchableOpacity style={styles.btn} onPress={() => setShow(false)}>
            <Text style={styles.btnText}>Thank you 🎉</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: {
    backgroundColor: c.card, borderRadius: 24, padding: 28, alignItems: 'center',
    width: '100%', maxWidth: 340, borderWidth: 1, borderColor: c.cardBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 16,
  },
  emoji: { fontSize: 44, marginBottom: 10 },
  headline: { fontSize: 22, fontWeight: '800', color: c.text, textAlign: 'center', letterSpacing: -0.3 },
  sub: { fontSize: 14, color: c.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  btn: { backgroundColor: c.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28 },
  btnText: { color: c.onColor, fontSize: 15, fontWeight: '700' },
});
