import { View, ActivityIndicator } from 'react-native';

// After Google OAuth, Clerk deep-links back here.
// ClerkProvider + startSSOFlow in sign-in.tsx handle the session automatically.
// This screen just shows a spinner while that completes.
export default function SSOCallback() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f3ff' }}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}
