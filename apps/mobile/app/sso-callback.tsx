import { View, ActivityIndicator } from 'react-native';

// Clerk redirects here after web Google OAuth completes.
// ClerkProvider automatically exchanges the OAuth code when the app receives
// the redirect URI — no manual handling needed here.
export default function SSOCallback() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
