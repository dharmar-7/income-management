import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import PrismLogoMobile from '@/components/PrismLogoMobile';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f3f4f6',
          paddingBottom: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        headerStyle: { backgroundColor: '#ffffff' },
        headerShadowVisible: false,
        headerTitle: () => <PrismLogoMobile size="md" />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon label="📊" color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          tabBarLabel: 'Transactions',
          tabBarIcon: ({ color }) => <TabIcon label="💳" color={color} />,
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          tabBarLabel: 'Budgets',
          tabBarIcon: ({ color }) => <TabIcon label="🎯" color={color} />,
        }}
      />
      <Tabs.Screen
        name="savings"
        options={{
          tabBarLabel: 'Savings',
          tabBarIcon: ({ color }) => <TabIcon label="💰" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          tabBarLabel: 'Notes',
          tabBarIcon: ({ color }) => <TabIcon label="📝" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          href: null, // Hidden from tab bar — accessible via Dashboard button
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon label="⚙️" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ label }: { label: string; color: string }) {
  return <Text style={{ fontSize: 18 }}>{label}</Text>;
}
