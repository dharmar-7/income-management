import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Pressable,
  StyleSheet, useColorScheme,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const MAIN = ['index', 'transactions', 'budgets', 'savings'] as const;
type MainRoute = (typeof MAIN)[number];

const ICONS: Record<MainRoute, string> = {
  index: '🏠',
  transactions: '💳',
  budgets: '🎯',
  savings: '💰',
};

const MORE_ITEMS = [
  { label: 'Notes',    icon: '📝', route: 'notes'    },
  { label: 'Reports',  icon: '📊', route: 'reports'  },
  { label: 'Settings', icon: '⚙️', route: 'settings' },
  { label: 'Import',   icon: '📥', route: 'settings'  },
];

export default function GlowStripTabBar({ state, navigation }: BottomTabBarProps) {
  const [open, setOpen] = useState(false);
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  const active = state.routes[state.index]?.name;

  function jumpTo(name: string) {
    const target = state.routes.find(r => r.name === name);
    if (!target) return;
    const ev = navigation.emit({ type: 'tabPress', target: target.key, canPreventDefault: true });
    if (!ev.defaultPrevented) {
      navigation.dispatch({ type: 'JUMP_TO', payload: { name } });
    }
  }

  const gemActive = !MAIN.includes(active as MainRoute);
  const bottom = Math.max(insets.bottom, 0) + 14;

  return (
    <>
      {/* ── more popup ── */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <View style={[s.popup, { bottom: bottom + 72 }, dark ? s.popupDark : s.popupLight]}>
            <View style={s.pgrid}>
              {MORE_ITEMS.map(item => (
                <TouchableOpacity
                  key={item.label}
                  style={[s.pitem, dark ? s.pitemDark : s.pitemLight]}
                  onPress={() => {
                    setOpen(false);
                    if (item.route) jumpTo(item.route);
                  }}
                >
                  <Text style={s.picon}>{item.icon}</Text>
                  <Text style={[s.plabel, { color: dark ? 'rgba(255,255,255,0.6)' : '#4b5563' }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── floating strip ── */}
      <View style={[s.wrap, { bottom }]} pointerEvents="box-none">
        <BlurView
          intensity={dark ? 60 : 50}
          tint={dark ? 'dark' : 'light'}
          style={[s.strip, { borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)' }]}
        >
          {/* Dashboard */}
          <TabItem icon={ICONS.index}        active={active === 'index'}        dark={dark} onPress={() => jumpTo('index')} />
          {/* Transactions */}
          <TabItem icon={ICONS.transactions} active={active === 'transactions'} dark={dark} onPress={() => jumpTo('transactions')} />

          {/* Crystal gem — centre tab (glow strip style, no raised button) */}
          <TouchableOpacity style={s.ti} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
            <View style={[s.ic, gemActive && (dark ? s.icActiveDark : s.icActiveLight), open && s.icOpen]}>
              <GemIcon />
            </View>
            <View style={[s.dot, (gemActive || open) && s.dotActive]} />
          </TouchableOpacity>

          {/* Budgets */}
          <TabItem icon={ICONS.budgets}  active={active === 'budgets'}  dark={dark} onPress={() => jumpTo('budgets')} />
          {/* Savings */}
          <TabItem icon={ICONS.savings}  active={active === 'savings'}  dark={dark} onPress={() => jumpTo('savings')} />
        </BlurView>
      </View>
    </>
  );
}

function TabItem({
  icon, active, dark, onPress,
}: { icon: string; active: boolean; dark: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.ti} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.ic, active && (dark ? s.icActiveDark : s.icActiveLight)]}>
        <Text style={s.emoji}>{icon}</Text>
      </View>
      <View style={[s.dot, active && s.dotActive]} />
    </TouchableOpacity>
  );
}

function GemIcon() {
  const size = 18;
  const r    = Math.round(size * 0.14);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size, height: size,
        transform: [{ rotate: '45deg' }],
        borderRadius: r,
        overflow: 'hidden',
      }}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1, backgroundColor: '#f72585' }} />
          <View style={{ flex: 1, backgroundColor: '#ff9100' }} />
        </View>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1, backgroundColor: '#bf5af2' }} />
          <View style={{ flex: 1, backgroundColor: '#32d74b' }} />
        </View>
        <View style={{
          position: 'absolute', top: '8%', left: '8%',
          width: '36%', height: '36%',
          backgroundColor: 'rgba(255,255,255,0.3)',
          borderRadius: 2,
        }} />
      </View>
    </View>
  );
}

const INDIGO_BG_D = 'rgba(99,102,241,0.18)';
const INDIGO_BG_L = 'rgba(99,102,241,0.13)';
const INDIGO_OPEN = 'rgba(99,102,241,0.25)';

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20, right: 20,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 50,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  ti: {
    alignItems: 'center',
    gap: 5,
  },
  ic: {
    width: 32, height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icActiveDark:  { backgroundColor: INDIGO_BG_D },
  icActiveLight: { backgroundColor: INDIGO_BG_L },
  icOpen:        { backgroundColor: INDIGO_OPEN  },
  emoji: { fontSize: 16 },
  dot: {
    width: 4, height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 3,
    elevation: 4,
  },

  /* popup */
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  popup: {
    position: 'absolute',
    left: 20, right: 20,
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
  },
  popupDark: {
    backgroundColor: 'rgba(7,7,20,0.97)',
    borderColor: 'rgba(255,255,255,0.09)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 16,
  },
  popupLight: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 16,
  },
  pgrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pitem: {
    width: '47%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  pitemDark:  { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.07)' },
  pitemLight: { backgroundColor: 'rgba(99,102,241,0.06)',  borderColor: 'rgba(99,102,241,0.12)'  },
  picon:  { fontSize: 19 },
  plabel: { fontSize: 8.5, fontWeight: '700' },
});
