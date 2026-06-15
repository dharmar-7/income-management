import { Tabs } from 'expo-router';
import VeloraLogoMobile from '@/components/VeloraLogoMobile';
import GlowStripTabBar from '@/components/GlowStripTabBar';
import { useTheme } from '@/context/ThemeContext';

export default function TabLayout() {
  const { theme: c } = useTheme();

  const bg = c.headerBg;

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
