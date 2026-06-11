import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import VeloraLogoMobile from '@/components/VeloraLogoMobile';
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
        headerTitle: () => <VeloraLogoMobile size="md" />,
        sceneStyle: { paddingBottom: 110 },
      }}
    >
      <Tabs.Screen name="index"        options={{ title: 'Dashboard'    }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions'  }} />
      <Tabs.Screen name="budgets"      options={{ title: 'Budgets'       }} />
      <Tabs.Screen name="savings"      options={{ title: 'Savings'       }} />
      <Tabs.Screen name="notes"        options={{ title: 'Notes'         }} />
      <Tabs.Screen name="reports"      options={{ title: 'Reports'       }} />
      <Tabs.Screen name="settings"     options={{ title: 'Settings'      }} />
      <Tabs.Screen name="import"       options={{ title: 'Import'        }} />
    </Tabs>
  );
}
