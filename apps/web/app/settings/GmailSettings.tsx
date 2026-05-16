'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';

type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';

export default function GmailSettings() {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();

  const [connected, setConnected] = useState<boolean | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Show success banner if redirected back from Gmail OAuth
  const justConnected = searchParams.get('gmail') === 'connected';

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gmail/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setConnected(data.connected);
    } catch {
      setConnected(false);
    }
  }

  async function handleConnect() {
    const token = await getToken();
    // Redirect to the backend which will redirect to Google
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/gmail/connect?token=${token}`;
  }

  async function handleSync() {
    setSyncStatus('syncing');
    setSyncResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gmail/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSyncResult(data.message);
      setSyncStatus('done');
    } catch {
      setSyncStatus('error');
      setSyncResult('Sync failed. Please try again.');
    }
  }

  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect Gmail? Automatic sync will stop.')) return;
    setLoading(true);
    try {
      const token = await getToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gmail/disconnect`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setConnected(false);
    } catch {
      alert('Failed to disconnect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="text-3xl">📧</div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Gmail Integration</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Auto-sync Google Pay transactions from your Gmail every hour.
          </p>
        </div>
      </div>

      {/* Success banner after OAuth redirect */}
      {justConnected && (
        <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-sm">
          Gmail connected successfully! Your first sync will run shortly.
        </div>
      )}

      {/* Status */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {connected === null
            ? 'Checking status...'
            : connected
            ? 'Connected — syncing every hour'
            : 'Not connected'}
        </span>
      </div>

      {/* Actions */}
      {connected === false && (
        <button
          onClick={handleConnect}
          className="w-full rounded-full bg-black py-3 text-white font-medium hover:bg-gray-800 transition-colors"
        >
          Connect Gmail
        </button>
      )}

      {connected === true && (
        <div className="space-y-3">
          <button
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            className="w-full rounded-full bg-black py-3 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </button>

          {syncResult && (
            <p className={`text-sm text-center ${syncStatus === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
              {syncResult}
            </p>
          )}

          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full rounded-full border border-red-200 py-3 text-red-600 font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {loading ? 'Disconnecting...' : 'Disconnect Gmail'}
          </button>
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4 text-sm text-gray-500 dark:text-gray-400 space-y-1">
        <p>🔒 We only request <strong>read-only</strong> access to your Gmail.</p>
        <p>📩 We only read emails from <strong>Google Pay</strong> — nothing else.</p>
        <p>🗑️ You can disconnect at any time and your tokens will be deleted.</p>
      </div>
    </div>
  );
}
