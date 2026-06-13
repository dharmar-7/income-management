import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@/lib/tokenCache';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60_000, gcTime: 10 * 60_000 } },
});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function AuthGuard() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const synced = useRef(false);

  // Create/sync our DB user as soon as we're signed in. Mobile must do this
  // itself — previously ONLY the web app called POST /users/me, so signing in
  // on mobile against a fresh database left no user row ("User not found" on
  // every request). POST /users/me is an idempotent upsert, so it's safe here.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || synced.current) return;
    synced.current = true;
    getToken().then((token) => {
      if (token) apiFetch('/users/me', token, { method: 'POST' }).catch(() => {});
    });
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === 'sign-in';

    if (!isSignedIn && !inAuthGroup) {
      router.replace('/sign-in');
    } else if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isSignedIn, isLoaded, segments]);

  return null;
}

export default function RootLayout() {
  return (
    // SafeAreaProvider is REQUIRED: on Expo SDK 54 Android is edge-to-edge, so the
    // app draws under the gesture nav bar. Without this provider every
    // useSafeAreaInsets() returns zeros and bottom content (sheet buttons, tab bar)
    // gets clipped by the nav bar.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ClerkProvider
        publishableKey={publishableKey}
        tokenCache={Platform.OS === 'web' ? undefined : tokenCache}
      >
        <QueryClientProvider client={queryClient}>
          <AuthGuard />
          <Slot />
        </QueryClientProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
