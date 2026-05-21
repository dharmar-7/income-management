import { useSSO, useSignIn } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import PrismLogoMobile from '@/components/PrismLogoMobile';

WebBrowser.maybeCompleteAuthSession();

// On native: useOAuth opens a browser for Google OAuth and deep-links back.
// On web:    useOAuth uses expo-web-browser which doesn't exist in a browser,
//            so we use signIn.authenticateWithRedirect instead.

export default function SignInScreen() {
  const { startSSOFlow } = useSSO();
  const { signIn } = useSignIn();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      setError('');

      if (Platform.OS === 'web') {
        await signIn!.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: window.location.origin + '/sso-callback',
          redirectUrlComplete: '/',
        });
      } else {
        // scheme updated from 'income' to 'prism' to match app.json
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy: 'oauth_google',
          redirectUrl: Linking.createURL('/sso-callback'),
        });
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
        }
      }
    } catch {
      setError('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f3ff' }}>
      <View style={{
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 28,
        paddingTop: 64,
        paddingBottom: 48,
      }}>

        {/* ── Top: Logo + tagline ── */}
        <View style={{ alignItems: 'center', gap: 12 }}>
          <PrismLogoMobile size="lg" />
          <Text style={{
            fontSize: 15, color: '#6b7280',
            textAlign: 'center', lineHeight: 22, marginTop: 4,
          }}>
            Your spending, broken into clarity.
          </Text>
        </View>

        {/* ── Middle: Feature highlights ── */}
        <View style={{ gap: 12 }}>
          {[
            {
              icon: '📊',
              title: 'Visual Spending Breakdown',
              desc: 'See exactly where your money goes each month',
            },
            {
              icon: '🎯',
              title: 'Budget Tracking',
              desc: 'Set limits per category and get warned before you overspend',
            },
            {
              icon: '📧',
              title: 'Auto-Sync from Gmail',
              desc: 'Google Pay transactions imported automatically',
            },
          ].map((item, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center', gap: 14,
              backgroundColor: '#fff', borderRadius: 16, padding: 14,
              borderWidth: 1, borderColor: '#ede9fe',
            }}>
              <View style={{
                width: 42, height: 42, borderRadius: 12,
                backgroundColor: '#f5f3ff',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#111827', fontSize: 13 }}>
                  {item.title}
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 2, lineHeight: 16 }}>
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Bottom: CTA ── */}
        <View style={{ gap: 12 }}>
          {/* Spectrum accent bar — echoes the prism icon */}
          <View style={{ flexDirection: 'row', height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 2 }}>
            {['#8b5cf6', '#6366f1', '#06b6d4', '#22c55e', '#f97316', '#f43f5e'].map((c, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: c }} />
            ))}
          </View>

          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#6366f1',
              paddingVertical: 16,
              borderRadius: 100,
              alignItems: 'center',
              opacity: loading ? 0.6 : 1,
              shadowColor: '#6366f1',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>G</Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                  Continue with Google
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {error ? (
            <Text style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>{error}</Text>
          ) : null}

          {/* Clarity text — answers the user's question directly */}
          <Text style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
            Already have an account? You'll be signed straight in.{'\n'}
            New to Velora? Your account is created automatically.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}
