'use client';

import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { ThemeProvider } from '@/context/ThemeContext';

// Syncs the signed-in Clerk user into our DB on first load.
// POST /users/me is idempotent — safe to call on every sign-in.
function UserSync() {
  const { isSignedIn, getToken } = useAuth();
  const synced = useRef(false);

  useEffect(() => {
    if (!isSignedIn || synced.current) return;
    synced.current = true;

    getToken().then((token) => {
      if (token) apiFetch('/users/me', token, { method: 'POST' }).catch(() => {});
    });
  }, [isSignedIn, getToken]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient once per app — manages all data fetching cache
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,  // data is "fresh" for 5 minutes before refetching
        gcTime: 30 * 60 * 1000,    // keep cached data 30 min so navigation is instant
        refetchOnWindowFocus: false, // don't refetch (and flash spinners) on tab focus
        retry: 1,
        // Keep showing the previously loaded data while a refetch happens in the
        // background (e.g. on a month/key change) instead of blanking to a spinner.
        placeholderData: keepPreviousData,
      },
    },
  }));

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <UserSync />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
