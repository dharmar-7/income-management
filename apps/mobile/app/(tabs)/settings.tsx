import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, PermissionsAndroid,
} from 'react-native';
import { useAuth, useClerk } from '@clerk/clerk-expo';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

// True when running inside Expo Go — native modules like react-native-get-sms-android
// are not compiled in, so any feature that needs them must be blocked with a clear message.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

type ImportStatus = 'idle' | 'uploading' | 'success' | 'error';
type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';
type SmsSyncStatus = 'idle' | 'requesting' | 'reading' | 'syncing' | 'done' | 'error';

interface ImportResult {
  message: string;
  imported: number;
  skipped: number;
  failed: number;
}

interface AtmEntry {
  amount: number;
  date: string;
  rawSms: string;
}

interface SmsSyncResult {
  imported: number;
  skipped: number;
  failed: number;
  atmTransactions: AtmEntry[];
}

export default function SettingsScreen() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();

  // ── Gmail state ──────────────────────────────────────────────────────────
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // ── Import state ─────────────────────────────────────────────────────────
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // ── SMS sync state ────────────────────────────────────────────────────────
  const [smsStatus, setSmsStatus] = useState<SmsSyncStatus>('idle');
  const [smsResult, setSmsResult] = useState<SmsSyncResult | null>(null);
  const [smsError, setSmsError] = useState<string | null>(null);

  useEffect(() => { fetchGmailStatus(); }, []);

  async function fetchGmailStatus() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/gmail/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGmailConnected(data.connected);
    } catch {
      setGmailConnected(false);
    }
  }

  async function handleGmailConnect() {
    const token = await getToken();
    const url = `${API_URL}/gmail/connect?token=${token}`;
    const result = await WebBrowser.openAuthSessionAsync(url);
    if (result.type === 'success') {
      await fetchGmailStatus();
    }
  }

  async function handleGmailSync() {
    setSyncStatus('syncing');
    setSyncMessage(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/gmail/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSyncMessage(data.message);
      setSyncStatus('done');
    } catch {
      setSyncStatus('error');
      setSyncMessage('Sync failed. Please try again.');
    }
  }

  function handleGmailDisconnect() {
    Alert.alert(
      'Disconnect Gmail',
      'Automatic sync will stop. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect', style: 'destructive',
          onPress: async () => {
            setDisconnecting(true);
            try {
              const token = await getToken();
              await fetch(`${API_URL}/gmail/disconnect`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              setGmailConnected(false);
            } catch {
              Alert.alert('Error', 'Failed to disconnect. Please try again.');
            } finally {
              setDisconnecting(false);
            }
          },
        },
      ],
    );
  }

  // ── SMS sync ──────────────────────────────────────────────────────────────
  async function handleSmsSync() {
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'SMS reading is only available on Android devices.');
      return;
    }

    if (IS_EXPO_GO) {
      Alert.alert(
        'Development Build Required',
        'SMS reading uses a native Android library that cannot run inside Expo Go.\n\nTo use this feature, install the development build of the app (.apk) on your device.',
        [{ text: 'Got it' }],
      );
      return;
    }

    setSmsStatus('requesting');
    setSmsError(null);
    setSmsResult(null);

    // Request READ_SMS permission
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'Read SMS Permission',
        message: 'Income Manager needs to read your bank SMS to import transactions automatically.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      setSmsStatus('error');
      setSmsError('SMS permission denied. Go to Settings → Apps → Income Manager → Permissions to enable it.');
      return;
    }

    try {
      const token = await getToken();

      // Ask backend from what date to start reading
      setSmsStatus('reading');
      const lastSyncRes = await fetch(`${API_URL}/sms/last-sync`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { sinceMs } = await lastSyncRes.json();

      // Read SMS inbox via native module
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SmsAndroid = require('react-native-get-sms-android').default;
      const rawMessages: Array<{ body: string; date: number; address: string }> =
        await new Promise((resolve, reject) => {
          SmsAndroid.list(
            JSON.stringify({ box: 'inbox', minDate: sinceMs, maxCount: 2000 }),
            (error: string) => reject(new Error(error)),
            (_count: number, smsList: string) => resolve(JSON.parse(smsList)),
          );
        });

      if (rawMessages.length === 0) {
        setSmsResult({ imported: 0, skipped: 0, failed: 0, atmTransactions: [] });
        setSmsStatus('done');
        return;
      }

      // Send to backend for parsing + deduplication
      setSmsStatus('syncing');
      const syncRes = await fetch(`${API_URL}/sms/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: rawMessages.map(m => ({
            body: m.body,
            date: m.date,
            address: m.address,
          })),
        }),
      });

      if (!syncRes.ok) {
        const err = await syncRes.json().catch(() => ({ message: 'Sync failed' }));
        throw new Error(err.message ?? 'Sync failed');
      }

      const result: SmsSyncResult = await syncRes.json();
      setSmsResult(result);
      setSmsStatus('done');

      // Prompt user to add each ATM withdrawal to Cash in Hand
      if (result.atmTransactions.length > 0 && token) {
        promptAtmCash(result.atmTransactions, 0, token);
      }
    } catch (err) {
      setSmsStatus('error');
      setSmsError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  async function promptAtmCash(list: AtmEntry[], index: number, token: string) {
    if (index >= list.length) return;
    const atm = list[index];
    const dateLabel = new Date(atm.date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short',
    });
    Alert.alert(
      'ATM Withdrawal Detected',
      `You withdrew ₹${atm.amount.toLocaleString('en-IN')} on ${dateLabel}.\nAdd this to Cash in Hand?`,
      [
        {
          text: 'Skip',
          style: 'cancel',
          onPress: () => promptAtmCash(list, index + 1, token),
        },
        {
          text: 'Add Cash',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/cash/add`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  amount: atm.amount,
                  source: 'ATM',
                  date: atm.date,
                  note: 'ATM withdrawal (from SMS)',
                }),
              });
            } catch { /* silent — user can add manually */ }
            promptAtmCash(list, index + 1, token);
          },
        },
      ],
    );
  }

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;

      if (file.size && file.size > 50 * 1024 * 1024) {
        setImportError('File is too large. Maximum size is 50MB.');
        setImportStatus('error');
        return;
      }

      setImportStatus('uploading');
      setImportError(null);
      setImportResult(null);

      const token = await getToken();
      const formData = new FormData();

      // React Native FormData requires a special object shape for files
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: 'application/json',
      } as unknown as Blob);

      const res = await fetch(`${API_URL}/import/takeout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(err.message ?? 'Upload failed');
      }

      const data: ImportResult = await res.json();
      setImportResult(data);
      setImportStatus('success');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Something went wrong.');
      setImportStatus('error');
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
    >

      {/* ── Import Section ─────────────────────────────────────────────────── */}
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 }}>
        IMPORT TRANSACTIONS
      </Text>

      <View style={{
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 20,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Text style={{ fontSize: 28 }}>📂</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>
              Google Takeout
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
              Upload your Google Pay JSON export
            </Text>
          </View>
        </View>

        {/* How-to steps */}
        <View style={{
          backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginBottom: 16,
        }}>
          <Text style={{ fontWeight: '600', color: '#374151', fontSize: 12, marginBottom: 8 }}>
            How to get your file
          </Text>
          {[
            'Go to takeout.google.com',
            'Deselect all → select Google Pay',
            'Create export and download ZIP',
            'Extract the .json file inside',
            'Upload it below',
          ].map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <Text style={{ color: '#6366f1', fontSize: 12, fontWeight: '700', width: 16 }}>{i + 1}.</Text>
              <Text style={{ color: '#6b7280', fontSize: 12, flex: 1 }}>{step}</Text>
            </View>
          ))}
        </View>

        {/* States */}
        {importStatus === 'idle' && (
          <TouchableOpacity
            onPress={handlePickFile}
            style={{
              borderWidth: 2, borderStyle: 'dashed', borderColor: '#c7d2fe',
              borderRadius: 12, paddingVertical: 20, alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 28, marginBottom: 6 }}>📁</Text>
            <Text style={{ fontWeight: '600', color: '#6366f1', fontSize: 14 }}>
              Tap to select JSON file
            </Text>
          </TouchableOpacity>
        )}

        {importStatus === 'uploading' && (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator color="#6366f1" size="large" />
            <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 12 }}>
              Importing transactions...
            </Text>
          </View>
        )}

        {importStatus === 'success' && importResult && (
          <View>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 36, marginBottom: 6 }}>✅</Text>
              <Text style={{ fontWeight: '800', color: '#111827', fontSize: 16 }}>
                Import Complete!
              </Text>
              <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
                {importResult.message}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <StatBadge value={importResult.imported} label="Imported" bg="#dcfce7" text="#15803d" />
              <StatBadge value={importResult.skipped} label="Existed" bg="#fef9c3" text="#a16207" />
              <StatBadge value={importResult.failed} label="Failed" bg="#fee2e2" text="#b91c1c" />
            </View>
            <TouchableOpacity
              onPress={() => { setImportStatus('idle'); setImportResult(null); }}
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 100, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#374151', fontWeight: '600', fontSize: 14 }}>Import Another File</Text>
            </TouchableOpacity>
          </View>
        )}

        {importStatus === 'error' && (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>❌</Text>
            <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              {importError}
            </Text>
            <TouchableOpacity
              onPress={() => { setImportStatus('idle'); setImportError(null); }}
              style={{ backgroundColor: '#6366f1', borderRadius: 100, paddingHorizontal: 24, paddingVertical: 10 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Gmail Section ──────────────────────────────────────────────────── */}
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 }}>
        GMAIL INTEGRATION
      </Text>

      <View style={{
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 20,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Text style={{ fontSize: 28 }}>📧</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>
              Gmail Auto-Sync
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
              Sync Google Pay transactions every hour
            </Text>
          </View>
          {/* Status dot */}
          <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: gmailConnected ? '#22c55e' : '#d1d5db',
          }} />
        </View>

        {gmailConnected === null && (
          <ActivityIndicator color="#6366f1" />
        )}

        {gmailConnected === false && (
          <TouchableOpacity
            onPress={handleGmailConnect}
            style={{ backgroundColor: '#111827', borderRadius: 100, paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Connect Gmail</Text>
          </TouchableOpacity>
        )}

        {gmailConnected === true && (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 12, color: '#22c55e', fontWeight: '600', textAlign: 'center', marginBottom: 4 }}>
              Connected — syncing every hour
            </Text>

            <TouchableOpacity
              onPress={handleGmailSync}
              disabled={syncStatus === 'syncing'}
              style={{
                backgroundColor: '#111827', borderRadius: 100,
                paddingVertical: 14, alignItems: 'center', opacity: syncStatus === 'syncing' ? 0.5 : 1,
              }}
            >
              {syncStatus === 'syncing'
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Sync Now</Text>
              }
            </TouchableOpacity>

            {syncMessage && (
              <Text style={{
                fontSize: 12, textAlign: 'center',
                color: syncStatus === 'error' ? '#ef4444' : '#6b7280',
              }}>
                {syncMessage}
              </Text>
            )}

            <TouchableOpacity
              onPress={handleGmailDisconnect}
              disabled={disconnecting}
              style={{
                borderWidth: 1, borderColor: '#fecaca', borderRadius: 100,
                paddingVertical: 14, alignItems: 'center', opacity: disconnecting ? 0.5 : 1,
              }}
            >
              <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: 14 }}>
                {disconnecting ? 'Disconnecting...' : 'Disconnect Gmail'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info */}
        <View style={{
          backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginTop: 16, gap: 4,
        }}>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>🔒 Read-only access to Gmail</Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>📩 Only reads Google Pay emails</Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>🗑️ Tokens deleted on disconnect</Text>
        </View>
      </View>

      {/* ── Bank SMS Sync ─────────────────────────────────────────────────── */}
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 }}>
        BANK SMS SYNC
      </Text>

      <View style={{
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 20,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Text style={{ fontSize: 28 }}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>
              Bank SMS Import
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
              Import IOB, TMB and other bank transactions from SMS
            </Text>
          </View>
          {Platform.OS !== 'android' && (
            <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 }}>
              <Text style={{ fontSize: 10, color: '#92400e', fontWeight: '700' }}>ANDROID</Text>
            </View>
          )}
        </View>

        {Platform.OS !== 'android' ? (
          <View style={{ backgroundColor: '#fef9c3', borderRadius: 12, padding: 12 }}>
            <Text style={{ fontSize: 12, color: '#92400e', textAlign: 'center' }}>
              SMS reading is only available on Android devices.
            </Text>
          </View>
        ) : (
          <>
            {/* Expo Go warning banner */}
            {IS_EXPO_GO && (
              <View style={{
                backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, marginBottom: 16,
                borderWidth: 1, borderColor: '#fcd34d',
              }}>
                <Text style={{ fontWeight: '700', color: '#92400e', fontSize: 13, marginBottom: 4 }}>
                  Requires Development Build
                </Text>
                <Text style={{ color: '#92400e', fontSize: 12, lineHeight: 18 }}>
                  You're running in Expo Go. SMS sync uses a native library that isn't available here.
                  Install the dev build (.apk) on your device to use this feature.
                </Text>
              </View>
            )}

            {/* Info bullets */}
            <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginBottom: 16, gap: 4 }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>📩 Reads bank SMS from your inbox</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>🔄 Skips transactions already in Google Pay</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>🏧 Prompts to add ATM cash to Cash in Hand</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>📅 Only reads SMS since your last sync</Text>
            </View>

            {/* Idle state */}
            {smsStatus === 'idle' && (
              <TouchableOpacity
                onPress={handleSmsSync}
                style={{
                  backgroundColor: '#f97316', borderRadius: 100,
                  paddingVertical: 14, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Sync Bank SMS</Text>
              </TouchableOpacity>
            )}

            {/* In-progress states */}
            {(smsStatus === 'requesting' || smsStatus === 'reading' || smsStatus === 'syncing') && (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <ActivityIndicator color="#f97316" size="large" />
                <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 12 }}>
                  {smsStatus === 'requesting' && 'Requesting permission…'}
                  {smsStatus === 'reading' && 'Reading SMS inbox…'}
                  {smsStatus === 'syncing' && 'Importing transactions…'}
                </Text>
              </View>
            )}

            {/* Success state */}
            {smsStatus === 'done' && smsResult && (
              <View>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 36, marginBottom: 6 }}>✅</Text>
                  <Text style={{ fontWeight: '800', color: '#111827', fontSize: 16 }}>Sync Complete!</Text>
                  {smsResult.atmTransactions.length > 0 && (
                    <Text style={{ color: '#f97316', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                      {smsResult.atmTransactions.length} ATM withdrawal{smsResult.atmTransactions.length > 1 ? 's' : ''} detected — check Cash in Hand prompts
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  <StatBadge value={smsResult.imported} label="Imported" bg="#dcfce7" text="#15803d" />
                  <StatBadge value={smsResult.skipped} label="Existed" bg="#fef9c3" text="#a16207" />
                  <StatBadge value={smsResult.failed} label="Failed" bg="#fee2e2" text="#b91c1c" />
                </View>
                <TouchableOpacity
                  onPress={() => { setSmsStatus('idle'); setSmsResult(null); }}
                  style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 100, paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#374151', fontWeight: '600', fontSize: 14 }}>Sync Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error state */}
            {smsStatus === 'error' && (
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>⚠️</Text>
                <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
                  {smsError}
                </Text>
                <TouchableOpacity
                  onPress={() => { setSmsStatus('idle'); setSmsError(null); }}
                  style={{ backgroundColor: '#f97316', borderRadius: 100, paddingHorizontal: 24, paddingVertical: 10 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {/* ── Sign Out ────────────────────────────────────────────────────────── */}
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
  );
}

function StatBadge({ value, label, bg, text }: { value: number; label: string; bg: string; text: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 12, padding: 12, alignItems: 'center' }}>
      <Text style={{ fontWeight: '800', fontSize: 20, color: text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: text, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
