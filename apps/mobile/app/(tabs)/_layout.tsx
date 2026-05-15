import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import PrismLogoMobile from '@/components/PrismLogoMobile';
import GlowStripTabBar from '@/components/GlowStripTabBar';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? '#0a0a14' : '#ffffff';

  return (
    <Tabs
      tabBar={(props) => <GlowStripTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: bg },
        headerShadowVisible: false,
        headerTitle: () => <PrismLogoMobile size="md" />,
        // bottom padding so content clears the floating strip
        contentStyle: { paddingBottom: 88 },
      }}
    >
      <Tabs.Screen name="index"        options={{ title: 'Dashboard'    }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions'  }} />
      <Tabs.Screen name="budgets"      options={{ title: 'Budgets'       }} />
      <Tabs.Screen name="savings"      options={{ title: 'Savings'       }} />
      <Tabs.Screen name="notes"        options={{ title: 'Notes'         }} />
      <Tabs.Screen name="reports"      options={{ title: 'Reports'       }} />
      <Tabs.Screen name="settings"     options={{ title: 'Settings'      }} />
    </Tabs>
  );
}
