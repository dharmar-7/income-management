import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useClerk, useUser } from '@clerk/clerk-expo';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* Account */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 }}>
          ACCOUNT
        </Text>

        <View style={{
          backgroundColor: '#fff', borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 24,
          flexDirection: 'row', alignItems: 'center', gap: 14,
        }}>
          <View style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>
              {user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>
              {user?.fullName ?? 'User'}
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
              {user?.emailAddresses?.[0]?.emailAddress ?? ''}
            </Text>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={() => signOut()}
          style={{
            borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16,
            paddingVertical: 16, alignItems: 'center', backgroundColor: '#fff',
          }}
        >
          <Text style={{ color: '#6b7280', fontWeight: '600', fontSize: 14 }}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
