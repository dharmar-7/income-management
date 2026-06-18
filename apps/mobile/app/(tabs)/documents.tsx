import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api';
import AddDocumentSheet from '@/components/AddDocumentSheet';
import AppAlert from '@/components/AppAlert';
import { useTheme } from '@/context/ThemeContext';
import type { Theme } from '@/lib/theme';

interface DocMeta {
  id: string;
  name: string;
  category: string;
  mimeType: string;
  size: number;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function expiryInfo(iso: string | null) {
  if (!iso) return null;
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  const label = new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (days < 0) return { text: `Expired ${label}`, urgent: true };
  if (days <= 30) return { text: `Expires ${label}`, urgent: true };
  return { text: `Valid till ${label}`, urgent: false };
}

export default function DocumentsScreen() {
  const { theme: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [adding, setAdding] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [alertData, setAlertData] = useState<{
    title: string; message: string; confirmLabel?: string; confirmDestructive?: boolean; onConfirm?: () => void;
  } | null>(null);

  const listQuery = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<DocMeta[]>('/documents', token!);
    },
    staleTime: 2 * 60 * 1000,
  });

  const viewQuery = useQuery({
    queryKey: ['document', viewId],
    enabled: !!viewId,
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<DocMeta & { dataUri: string }>(`/documents/${viewId}`, token!);
    },
  });

  function deleteDoc(d: DocMeta) {
    setAlertData({
      title: 'Delete Document',
      message: `Delete "${d.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      confirmDestructive: true,
      onConfirm: async () => {
        try {
          const token = await getToken();
          await apiFetch(`/documents/${d.id}`, token!, { method: 'DELETE' });
          queryClient.invalidateQueries({ queryKey: ['documents'] });
        } catch {
          setAlertData({ title: 'Error', message: 'Failed to delete document.' });
        }
      },
    });
  }

  const docs = listQuery.data ?? [];
  // Group by category
  const groups = useMemo(() => {
    const map = new Map<string, DocMeta[]>();
    for (const d of docs) {
      if (!map.has(d.category)) map.set(d.category, []);
      map.get(d.category)!.push(d);
    }
    return [...map.entries()];
  }, [docs]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <AddDocumentSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
      />

      {listQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.text} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={listQuery.refetch} />}
        >
          <Text style={styles.heading}>Documents</Text>
          <Text style={styles.sub}>Insurance, IDs, vehicle papers, warranties & receipts — kept safe</Text>

          {docs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🗂️</Text>
              <Text style={styles.emptyText}>No documents yet.</Text>
              <Text style={styles.emptyHint}>Tap “+ Add” to snap or upload an important paper.</Text>
            </View>
          ) : (
            groups.map(([cat, items]) => (
              <View key={cat} style={styles.group}>
                <Text style={styles.groupTitle}>{cat}</Text>
                <View style={styles.card}>
                  {items.map((d, i) => {
                    const exp = expiryInfo(d.expiresAt);
                    return (
                      <TouchableOpacity key={d.id} style={[styles.row, i > 0 && styles.rowBorder]} activeOpacity={0.7} onPress={() => setViewId(d.id)}>
                        <Text style={styles.rowIcon}>{d.mimeType.startsWith('image') ? '🖼️' : '📄'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowName} numberOfLines={1}>{d.name}</Text>
                          <Text style={styles.rowMeta}>
                            {formatSize(d.size)}
                            {exp ? '  ·  ' : ''}
                            {exp ? <Text style={exp.urgent ? styles.expUrgent : styles.expOk}>{exp.text}</Text> : null}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => deleteDoc(d)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Text style={styles.deleteIcon}>🗑️</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* Add FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setAdding(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Viewer */}
      <Modal visible={!!viewId} transparent animationType="fade" onRequestClose={() => setViewId(null)}>
        <View style={styles.viewerRoot}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewId(null)}>
            <Text style={styles.viewerCloseText}>✕</Text>
          </TouchableOpacity>
          {viewQuery.isLoading || !viewQuery.data ? (
            <ActivityIndicator color="#fff" />
          ) : viewQuery.data.mimeType.startsWith('image') ? (
            <Image source={{ uri: viewQuery.data.dataUri }} style={styles.viewerImage} resizeMode="contain" />
          ) : (
            <View style={styles.viewerDoc}>
              <Text style={{ fontSize: 48 }}>📄</Text>
              <Text style={styles.viewerDocName}>{viewQuery.data.name}</Text>
              <Text style={styles.viewerDocHint}>Preview not supported for this file type.</Text>
            </View>
          )}
          {viewQuery.data?.name ? <Text style={styles.viewerName}>{viewQuery.data.name}</Text> : null}
        </View>
      </Modal>

      <AppAlert
        visible={!!alertData}
        title={alertData?.title ?? ''}
        message={alertData?.message ?? ''}
        confirmLabel={alertData?.confirmLabel}
        confirmDestructive={alertData?.confirmDestructive}
        onClose={() => setAlertData(null)}
        onConfirm={alertData?.onConfirm}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: '700', color: c.text },
  sub: { fontSize: 13, color: c.textFaint, marginTop: 2, marginBottom: 12 },

  group: { marginBottom: 14 },
  groupTitle: { fontSize: 13, fontWeight: '700', color: c.textMuted, marginBottom: 6, marginLeft: 4 },
  card: { backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: c.cardBorder },
  rowIcon: { fontSize: 22 },
  rowName: { fontSize: 14, fontWeight: '600', color: c.text },
  rowMeta: { fontSize: 11, color: c.textFaint, marginTop: 2 },
  expUrgent: { color: c.danger, fontWeight: '600' },
  expOk: { color: c.textMuted },
  deleteIcon: { fontSize: 16 },

  emptyCard: { backgroundColor: c.card, borderRadius: 14, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: c.cardBorder, marginTop: 8 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: c.textMuted },
  emptyHint: { fontSize: 12, color: c.textFaint, marginTop: 4, textAlign: 'center' },

  fab: {
    position: 'absolute', bottom: 104, right: 20, width: 52, height: 52, borderRadius: 26,
    backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: c.onColor, fontSize: 26, lineHeight: 28, fontWeight: '300' },

  viewerRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  viewerClose: { position: 'absolute', top: 48, right: 20, zIndex: 2, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  viewerCloseText: { color: '#fff', fontSize: 18 },
  viewerImage: { width: '100%', height: '80%' },
  viewerDoc: { alignItems: 'center', gap: 8 },
  viewerDocName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  viewerDocHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  viewerName: { position: 'absolute', bottom: 40, color: '#fff', fontSize: 14, fontWeight: '600' },
});
