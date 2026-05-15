'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
        staleTime: 60 * 1000, // data is "fresh" for 1 minute before refetching
        retry: 1,
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
