import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Modal, KeyboardAvoidingView, Platform, Pressable,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Markdown from 'react-native-markdown-display';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { apiFetch } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NoteImage {
  id: string;
  name: string;
  dataUrl: string;
}

interface Note {
  id: string;
  title: string | null;
  content: string;
  color: string;
  isPinned: boolean;
  isArchived: boolean;
  isLocked: boolean;
  tags: string[];
  reminderAt: string | null;
  reminderSent: boolean;
  images: NoteImage[];
  updatedAt: string;
}

// ─── Colors ─────────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  white:  '#ffffff',
  yellow: '#fef9c3',
  teal:   '#ccfbf1',
  pink:   '#fce7f3',
  blue:   '#dbeafe',
  purple: '#f3e8ff',
  orange: '#ffedd5',
  green:  '#dcfce7',
  mirror: 'rgba(255,255,255,0.28)',
};

const COLOR_KEYS = Object.keys(COLOR_MAP);

// ─── Notifications setup ─────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function scheduleLocalNotification(noteId: string, title: string | null, content: string, reminderAt: Date) {
  await Notifications.cancelScheduledNotificationAsync(noteId).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: noteId,
    content: {
      title: title ?? 'Note Reminder',
      body: content.slice(0, 100).replace(/[#*\[\]`]/g, '') || 'Tap to view',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderAt },
  });
}

async function cancelLocalNotification(noteId: string) {
  await Notifications.cancelScheduledNotificationAsync(noteId).catch(() => {});
}

// ─── Modern in-app alert (replaces system Alert.alert) ─────────────────────────

function AppAlert({
  visible, title, message, onClose,
}: { visible: boolean; title: string; message: string; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={appAlertStyles.overlay} onPress={onClose}>
        <View style={appAlertStyles.box}>
          <View style={appAlertStyles.iconWrap}>
            <Text style={{ fontSize: 28 }}>⚠️</Text>
          </View>
          <Text style={appAlertStyles.title}>{title}</Text>
          <Text style={appAlertStyles.msg}>{message}</Text>
          <TouchableOpacity style={appAlertStyles.btn} onPress={onClose}>
            <Text style={appAlertStyles.btnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Date/Time picker (spinner-style, no extra packages) ────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function SpinField({
  label, value, onDec, onInc,
}: { label: string; value: string; onDec: () => void; onInc: () => void }) {
  return (
    <View style={dtStyles.spinField}>
      <Text style={dtStyles.spinLabel}>{label}</Text>
      <TouchableOpacity onPress={onInc} style={dtStyles.spinBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Text style={dtStyles.spinArrow}>▲</Text>
      </TouchableOpacity>
      <Text style={dtStyles.spinValue}>{value}</Text>
      <TouchableOpacity onPress={onDec} style={dtStyles.spinBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Text style={dtStyles.spinArrow}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

function DateTimePickerModal({
  visible, value, onConfirm, onDismiss,
}: {
  visible: boolean;
  value: Date | null;
  onConfirm: (d: Date | null) => void;
  onDismiss: () => void;
}) {
  const now = new Date();
  const [day,  setDay]  = useState(now.getDate());
  const [mon,  setMon]  = useState(now.getMonth());
  const [yr,   setYr]   = useState(now.getFullYear());
  const [hr,   setHr]   = useState(9);
  const [min,  setMin]  = useState(0);

  useEffect(() => {
    if (visible) {
      const d = value ?? (() => {
        const x = new Date();
        x.setHours(9, 0, 0, 0);
        x.setDate(x.getDate() + 1);
        return x;
      })();
      setDay(d.getDate());
      setMon(d.getMonth());
      setYr(d.getFullYear());
      setHr(d.getHours());
      setMin(Math.round(d.getMinutes() / 5) * 5 % 60);
    }
  }, [visible]);

  const daysInMonth = new Date(yr, mon + 1, 0).getDate();
  const clampedDay  = Math.min(day, daysInMonth);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onDismiss} />
      <View style={dtStyles.container}>
        <View style={dtStyles.handle} />
        <Text style={dtStyles.title}>Set Reminder</Text>

        <View style={dtStyles.row}>
          <SpinField
            label="Day"
            value={String(clampedDay)}
            onDec={() => setDay(d => d <= 1 ? daysInMonth : d - 1)}
            onInc={() => setDay(d => d >= daysInMonth ? 1 : d + 1)}
          />
          <SpinField
            label="Month"
            value={MONTH_NAMES[mon]}
            onDec={() => setMon(m => m === 0 ? 11 : m - 1)}
            onInc={() => setMon(m => m === 11 ? 0 : m + 1)}
          />
          <SpinField
            label="Year"
            value={String(yr)}
            onDec={() => setYr(y => y - 1)}
            onInc={() => setYr(y => y + 1)}
          />
        </View>

        <View style={[dtStyles.row, { marginBottom: 20 }]}>
          <SpinField
            label="Hour"
            value={String(hr).padStart(2, '0')}
            onDec={() => setHr(h => h === 0 ? 23 : h - 1)}
            onInc={() => setHr(h => h === 23 ? 0 : h + 1)}
          />
          <SpinField
            label="Minute"
            value={String(min).padStart(2, '0')}
            onDec={() => setMin(m => m === 0 ? 55 : m - 5)}
            onInc={() => setMin(m => m === 55 ? 0 : m + 5)}
          />
        </View>

        <View style={dtStyles.actions}>
          <TouchableOpacity style={dtStyles.clearBtn} onPress={() => onConfirm(null)}>
            <Text style={dtStyles.clearText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={dtStyles.confirmBtn}
            onPress={() => onConfirm(new Date(yr, mon, clampedDay, hr, min))}
          >
            <Text style={dtStyles.confirmText}>Set Reminder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Password Modal ─────────────────────────────────────────────────────────────

function PasswordModal({
  visible, mode, onClose, onConfirm,
}: {
  visible: boolean;
  mode: 'set' | 'enter' | 'remove';
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ title: string; msg: string } | null>(null);

  useEffect(() => {
    if (visible) setPassword('');
  }, [visible]);

  async function handleConfirm() {
    if (!password.trim()) {
      setAlertInfo({ title: 'Required', msg: 'Please enter a password.' });
      return;
    }
    setLoading(true);
    try {
      await onConfirm(password.trim());
    } catch (err: any) {
      setAlertInfo({ title: 'Error', msg: err.message ?? 'Operation failed. Check your password and try again.' });
    } finally {
      setLoading(false);
    }
  }

  const title = mode === 'set' ? '🔒 Lock Note' : mode === 'remove' ? '🔓 Remove Lock' : '🔒 Protected Note';
  const placeholder = mode === 'enter' ? 'Enter password to view' : 'Set a password';

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={passStyles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={passStyles.box}>
              <Text style={passStyles.title}>{title}</Text>
              {mode === 'enter' && (
                <Text style={passStyles.hint}>Enter the password to open this note.</Text>
              )}
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={placeholder}
                placeholderTextColor="#9ca3af"
                secureTextEntry
                style={passStyles.input}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
              />
              <View style={passStyles.actions}>
                <TouchableOpacity onPress={onClose} style={passStyles.cancelBtn}>
                  <Text style={passStyles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirm}
                  disabled={loading}
                  style={[passStyles.confirmBtn, loading && { opacity: 0.6 }]}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={passStyles.confirmText}>
                        {mode === 'set' ? 'Lock' : mode === 'remove' ? 'Remove' : 'Open'}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <AppAlert
        visible={alertInfo !== null}
        title={alertInfo?.title ?? ''}
        message={alertInfo?.msg ?? ''}
        onClose={() => setAlertInfo(null)}
      />
    </>
  );
}

// ─── Note Edit Sheet ────────────────────────────────────────────────────────────

function NoteSheet({
  note, allTags, visible, onClose, onSave, onDelete, onLockToggle,
}: {
  note: Note | null;
  allTags: string[];
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<Note>;
  onDelete?: () => Promise<void>;
  onLockToggle?: () => void;
}) {
  const { getToken } = useAuth();
  const [title,    setTitle]   = useState('');
  const [content,  setContent] = useState('');
  const [color,    setColor]   = useState('white');
  const [tags,     setTags]    = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [reminderAt, setReminderAt] = useState<Date | null>(null);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [images,   setImages]  = useState<NoteImage[]>([]);
  const [preview,  setPreview] = useState(false);
  const [saving,   setSaving]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lockModal, setLockModal] = useState<null | 'set' | 'remove'>(null);
  const [alertInfo, setAlertInfo] = useState<{ title: string; msg: string } | null>(null);

  const isLocked = note?.isLocked ?? false;

  useEffect(() => {
    if (visible) {
      setTitle(note?.title ?? '');
      setContent(note?.content ?? '');
      setColor(note?.color ?? 'white');
      setTags(note?.tags ?? []);
      setTagInput('');
      setImages(note?.images ?? []);
      setPreview(false);
      setReminderAt(note?.reminderAt ? new Date(note.reminderAt) : null);
    }
  }, [visible, note]);

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  }

  function removeTag(t: string) {
    setTags(prev => prev.filter(x => x !== t));
  }

  async function handleSave() {
    setSaving(true);
    // clearReminder must only be sent when patching an existing note (not on POST /notes,
    // which uses CreateNoteDto that doesn't include clearReminder).
    const reminderPayload = reminderAt
      ? { reminderAt: reminderAt.toISOString() }
      : note?.id
        ? { clearReminder: true }
        : {};

    try {
      const saved = await onSave({
        title: title.trim() || undefined,
        content,
        color,
        tags,
        ...reminderPayload,
      });

      if (reminderAt && saved.id) {
        await scheduleLocalNotification(saved.id, saved.title, saved.content, reminderAt);
      } else if (saved.id) {
        await cancelLocalNotification(saved.id);
      }

      onClose();
    } catch (err: any) {
      setAlertInfo({ title: 'Save failed', msg: err.message ?? 'Could not save note. Check your connection.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleLockConfirm(password: string) {
    if (!note?.id) return;
    const token = await getToken();
    if (lockModal === 'set') {
      await apiFetch(`/notes/${note.id}/lock`, token!, {
        method: 'POST', body: JSON.stringify({ password }),
      });
    } else {
      await apiFetch(`/notes/${note.id}/remove-lock`, token!, {
        method: 'POST', body: JSON.stringify({ password }),
      });
    }
    setLockModal(null);
    onLockToggle?.();
    onClose();
  }

  async function handlePickImage() {
    if (!note?.id) {
      setAlertInfo({ title: 'Save first', msg: 'Please save the note before adding images.' });
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setAlertInfo({ title: 'Permission needed', msg: 'Please allow access to your photo library.' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    setUploading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        name: asset.fileName ?? 'photo.jpg',
      } as any);

      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/notes/${note.id}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) { const b = await res.json(); throw new Error(b?.message); }
      const img: NoteImage = await res.json();
      setImages(prev => [...prev, img]);
    } catch (err: any) {
      setAlertInfo({ title: 'Upload failed', msg: err.message ?? 'Could not upload image.' });
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!note?.id) return;
    const token = await getToken();
    await apiFetch(`/notes/${note.id}/images/${imageId}`, token!, { method: 'DELETE' });
    setImages(prev => prev.filter(i => i.id !== imageId));
  }

  const bgColor = COLOR_MAP[color] ?? '#ffffff';
  const isMirrorSheet = color === 'mirror';

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetWrapper}
        >
          <View
            style={[
              styles.sheet,
              isMirrorSheet
                ? {
                    backgroundColor: 'transparent',
                    borderTopWidth: 1.5,
                    borderLeftWidth: 1.5,
                    borderRightWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.65)',
                    overflow: 'hidden',
                  }
                : { backgroundColor: bgColor },
            ]}
          >
            {isMirrorSheet && (
              <BlurView intensity={75} tint="light" style={StyleSheet.absoluteFill} />
            )}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Title"
                placeholderTextColor="#9ca3af"
                style={styles.sheetTitle}
              />
              <TouchableOpacity onPress={() => setPreview(p => !p)} style={styles.previewBtn}>
                <Text style={styles.previewBtnText}>{preview ? '✏️ Edit' : '👁 Preview'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Content */}
              {preview ? (
                <View style={styles.previewContainer}>
                  {content ? (
                    <Markdown style={markdownStyles}>{content}</Markdown>
                  ) : (
                    <Text style={styles.emptyPreview}>Nothing to preview yet.</Text>
                  )}
                </View>
              ) : (
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder={'Write your note...\n\nTip: - [ ] for checklist\n**bold**  *italic*  # Heading'}
                  placeholderTextColor="#9ca3af"
                  multiline
                  style={styles.contentInput}
                  textAlignVertical="top"
                />
              )}

              {/* Images */}
              {images.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
                  {images.map(img => (
                    <View key={img.id} style={styles.imageWrapper}>
                      <Image source={{ uri: img.dataUrl }} style={styles.thumbnail} />
                      <TouchableOpacity
                        style={styles.deleteImageBtn}
                        onPress={() => handleDeleteImage(img.id)}
                      >
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Color picker */}
              <View style={styles.toolRow}>
                <Text style={styles.toolLabel}>Color:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.colorRow}>
                    {COLOR_KEYS.map(c => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setColor(c)}
                        style={[
                          styles.colorDot,
                          c === 'mirror'
                            ? styles.colorDotMirror
                            : { backgroundColor: COLOR_MAP[c] },
                          color === c && styles.colorDotActive,
                        ]}
                      >
                        {c === 'mirror' && (
                          <View style={styles.mirrorDotInner} pointerEvents="none">
                            <View style={[styles.mirrorQ, { backgroundColor: '#f8f8f8', borderTopLeftRadius: 6 }]} />
                            <View style={[styles.mirrorQ, { backgroundColor: '#e0e0e0', borderTopRightRadius: 6 }]} />
                            <View style={[styles.mirrorQ, { backgroundColor: '#ffffff', borderBottomLeftRadius: 6 }]} />
                            <View style={[styles.mirrorQ, { backgroundColor: '#c8c8c8', borderBottomRightRadius: 6 }]} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Tags */}
              <View style={styles.toolRow}>
                <Text style={styles.toolLabel}>Tags:</Text>
                <View style={styles.tagsRow}>
                  {tags.map(t => (
                    <TouchableOpacity key={t} onPress={() => removeTag(t)} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>#{t} ×</Text>
                    </TouchableOpacity>
                  ))}
                  <TextInput
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={addTag}
                    placeholder="+ tag"
                    placeholderTextColor="#9ca3af"
                    style={styles.tagInput}
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Tag suggestions */}
              {tagInput.length > 0 && allTags.filter(t => t.includes(tagInput) && !tags.includes(t)).length > 0 && (
                <View style={styles.tagSuggestions}>
                  {allTags.filter(t => t.includes(tagInput) && !tags.includes(t)).map(t => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => { setTags(prev => [...prev, t]); setTagInput(''); }}
                      style={styles.tagSuggestionItem}
                    >
                      <Text style={styles.tagSuggestionText}>#{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Reminder — tap to open spinner picker */}
              <View style={styles.toolRow}>
                <Text style={styles.toolLabel}>⏰ Remind:</Text>
                <TouchableOpacity
                  onPress={() => setShowReminderPicker(true)}
                  style={[styles.tagInput, styles.reminderBtn]}
                >
                  <Text style={[styles.reminderBtnText, !reminderAt && { color: '#9ca3af' }]}>
                    {reminderAt
                      ? reminderAt.toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : 'Tap to set reminder…'
                    }
                  </Text>
                  {reminderAt && (
                    <TouchableOpacity
                      onPress={() => setReminderAt(null)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={{ color: '#9ca3af', fontSize: 13 }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>

              {/* Image picker */}
              <TouchableOpacity
                style={styles.toolRow}
                onPress={handlePickImage}
                disabled={uploading}
              >
                <Text style={styles.toolLabel}>🖼️ {uploading ? 'Uploading…' : 'Add image'}</Text>
              </TouchableOpacity>

              {/* Actions */}
              <View style={styles.sheetActions}>
                {onDelete && (
                  <TouchableOpacity
                    onPress={() => {
                      // Use in-sheet confirm instead of system Alert
                      setAlertInfo({ title: 'Delete Note', msg: 'Are you sure? This cannot be undone.' });
                    }}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                )}
                {note?.id && (
                  <TouchableOpacity
                    onPress={() => setLockModal(isLocked ? 'remove' : 'set')}
                    style={styles.lockBtn}
                  >
                    <Text style={styles.lockBtnText}>{isLocked ? '🔓 Unlock' : '🔒 Lock'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.saveBtnText}>Save</Text>
                  }
                </TouchableOpacity>
              </View>

              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        <PasswordModal
          visible={lockModal !== null}
          mode={lockModal ?? 'set'}
          onClose={() => setLockModal(null)}
          onConfirm={handleLockConfirm}
        />
      </Modal>

      {/* Reminder picker — separate modal so it stacks above NoteSheet */}
      <DateTimePickerModal
        visible={showReminderPicker}
        value={reminderAt}
        onConfirm={(d) => { setReminderAt(d); setShowReminderPicker(false); }}
        onDismiss={() => setShowReminderPicker(false)}
      />

      {/* Modern in-app alert */}
      <AppAlert
        visible={alertInfo !== null}
        title={alertInfo?.title ?? ''}
        message={alertInfo?.msg ?? ''}
        onClose={() => setAlertInfo(null)}
      />
    </>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────

export default function NotesScreen() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editNote, setEditNote] = useState<Note | null | 'new'>(null);
  const [unlockingNote, setUnlockingNote] = useState<Note | null>(null);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  function handleNotePress(note: Note) {
    if (note.isLocked) {
      setUnlockingNote(note);
    } else {
      setEditNote(note);
    }
  }

  async function handleUnlockOpen(password: string) {
    if (!unlockingNote) return;
    const token = await getToken();
    const unlocked = await apiFetch<Note>(`/notes/${unlockingNote.id}/unlock`, token!, {
      method: 'POST', body: JSON.stringify({ password }),
    });
    setUnlockingNote(null);
    setEditNote(unlocked);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['notes'] });
    queryClient.invalidateQueries({ queryKey: ['note-tags'] });
  }

  const { data: notes = [], isLoading, isFetching } = useQuery({
    queryKey: ['notes', search, activeTag, showArchived],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(activeTag && { tag: activeTag }),
      });
      const endpoint = showArchived ? '/notes/archived' : `/notes?${params}`;
      return apiFetch<Note[]>(endpoint, token!);
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ['note-tags'],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<string[]>('/notes/tags', token!);
    },
    staleTime: 5 * 60 * 1000,
  });

  async function handleSave(data: any): Promise<Note> {
    const token = await getToken();
    let saved: Note;
    if (editNote && editNote !== 'new') {
      saved = await apiFetch<Note>(`/notes/${editNote.id}`, token!, {
        method: 'PATCH', body: JSON.stringify(data),
      });
    } else {
      saved = await apiFetch<Note>('/notes', token!, {
        method: 'POST', body: JSON.stringify(data),
      });
    }
    invalidate();
    return saved;
  }

  async function handleDelete() {
    if (!editNote || editNote === 'new') return;
    const token = await getToken();
    await apiFetch(`/notes/${editNote.id}`, token!, { method: 'DELETE' });
    if (editNote.id) await cancelLocalNotification(editNote.id);
    invalidate();
  }

  async function togglePin(note: Note) {
    const token = await getToken();
    await apiFetch(`/notes/${note.id}`, token!, {
      method: 'PATCH', body: JSON.stringify({ isPinned: !note.isPinned }),
    });
    invalidate();
  }

  const pinned = notes.filter(n => n.isPinned);
  const others = notes.filter(n => !n.isPinned);

  function renderNote(note: Note) {
    const bg = COLOR_MAP[note.color] ?? '#ffffff';
    const m = note.color === 'mirror';
    const mirrorCardStyle = m
      ? {
          backgroundColor: 'transparent',
          borderColor: 'rgba(255,255,255,0.6)',
          borderWidth: 1.5,
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
          overflow: 'hidden' as const,
        }
      : {};
    return (
      <TouchableOpacity
        key={note.id}
        style={[styles.card, { backgroundColor: m ? 'transparent' : bg }, mirrorCardStyle]}
        onPress={() => handleNotePress(note)}
        onLongPress={() => togglePin(note)}
        activeOpacity={0.85}
      >
        {m && <BlurView intensity={72} tint="light" style={StyleSheet.absoluteFill} />}
        {note.isPinned && <Text style={styles.pinnedIndicator}>📌</Text>}
        {note.isLocked && <Text style={styles.cardLockBadge}>🔒 Protected</Text>}
        {note.title ? <Text style={styles.cardTitle} numberOfLines={1}>{note.title}</Text> : null}
        {note.isLocked ? (
          <Text style={[styles.cardContent, { color: '#9ca3af', fontStyle: 'italic' }]}>Tap to unlock</Text>
        ) : note.content ? (
          <Text style={styles.cardContent} numberOfLines={6}>
            {note.content.replace(/[#*`\[\]]/g, '').trim()}
          </Text>
        ) : null}
        {note.images.length > 0 && (
          <Image source={{ uri: note.images[0].dataUrl }} style={styles.cardImage} />
        )}
        {note.tags.length > 0 && (
          <Text style={styles.cardTags} numberOfLines={1}>
            {note.tags.map(t => `#${t}`).join(' ')}
          </Text>
        )}
        {note.reminderAt && !note.reminderSent && (
          <Text style={styles.cardReminder}>
            ⏰ {new Date(note.reminderAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.bgBlob1} />
        <View style={styles.bgBlob2} />
        <View style={styles.bgBlob3} />
      </View>

      <PasswordModal
        visible={unlockingNote !== null}
        mode="enter"
        onClose={() => setUnlockingNote(null)}
        onConfirm={handleUnlockOpen}
      />

      <NoteSheet
        note={editNote === 'new' ? null : editNote}
        allTags={allTags}
        visible={editNote !== null}
        onClose={() => setEditNote(null)}
        onSave={handleSave}
        onDelete={editNote && editNote !== 'new' ? handleDelete : undefined}
        onLockToggle={invalidate}
      />

      {/* Search row */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes…"
          placeholderTextColor="#9ca3af"
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: '#9ca3af', fontSize: 14 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagBar}>
          {['', ...allTags].map(t => (
            <TouchableOpacity
              key={t || '__all'}
              onPress={() => setActiveTag(t)}
              style={[styles.tagBarChip, activeTag === t && styles.tagBarChipActive]}
            >
              <Text style={[styles.tagBarChipText, activeTag === t && styles.tagBarChipTextActive]}>
                {t ? `#${t}` : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Archive toggle */}
      <View style={styles.archiveRow}>
        <TouchableOpacity onPress={() => setShowArchived(a => !a)}>
          <Text style={styles.archiveToggle}>
            {showArchived ? '← Back to notes' : '🗄️ Archived'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notes grid */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color="#6366f1" />
      ) : notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyText}>
            {showArchived ? 'No archived notes.' : search ? 'No notes match your search.' : 'No notes yet.'}
          </Text>
          {!showArchived && !search && (
            <Text style={styles.emptyHint}>Tap + to create your first note.</Text>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.grid}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={invalidate} />}
        >
          {pinned.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>📌 PINNED</Text>
              <View style={styles.columns}>
                <View style={styles.column}>{pinned.filter((_, i) => i % 2 === 0).map(renderNote)}</View>
                <View style={styles.column}>{pinned.filter((_, i) => i % 2 === 1).map(renderNote)}</View>
              </View>
            </>
          )}
          {others.length > 0 && (
            <>
              {pinned.length > 0 && <Text style={styles.sectionLabel}>OTHERS</Text>}
              <View style={styles.columns}>
                <View style={styles.column}>{others.filter((_, i) => i % 2 === 0).map(renderNote)}</View>
                <View style={styles.column}>{others.filter((_, i) => i % 2 === 1).map(renderNote)}</View>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setEditNote('new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Markdown styles ────────────────────────────────────────────────────────────

const markdownStyles = StyleSheet.create({
  body: { fontSize: 14, color: '#374151', lineHeight: 22 },
  heading1: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  heading2: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  heading3: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 },
  strong: { fontWeight: '700' },
  em: { fontStyle: 'italic' },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  blockquote: { borderLeftWidth: 3, borderLeftColor: '#d1d5db', paddingLeft: 12, color: '#6b7280' },
  code_inline: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: '#f3f4f6', paddingHorizontal: 4, borderRadius: 4 },
});

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, marginBottom: 8,
    backgroundColor: '#fff', borderRadius: 99,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },

  tagBar: { paddingHorizontal: 12, marginBottom: 4 },
  tagBarChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 8,
  },
  tagBarChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  tagBarChipText: { fontSize: 12, color: '#6b7280' },
  tagBarChipTextActive: { color: '#fff' },

  archiveRow: { paddingHorizontal: 14, marginBottom: 4 },
  archiveToggle: { fontSize: 12, color: '#6b7280' },

  grid: { padding: 10, paddingBottom: 100 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  columns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },

  card: {
    borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  pinnedIndicator: { fontSize: 10, marginBottom: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardContent: { fontSize: 12, color: '#374151', lineHeight: 18 },
  cardImage: { width: '100%', height: 80, borderRadius: 8, marginTop: 8, resizeMode: 'cover' },
  cardTags: { fontSize: 10, color: '#9ca3af', marginTop: 6 },
  cardReminder: { fontSize: 10, color: '#d97706', marginTop: 4 },

  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  emptyHint: { fontSize: 13, color: '#9ca3af', marginTop: 6 },

  fab: {
    position: 'absolute', bottom: 104, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 26, lineHeight: 28, fontWeight: '300' },

  // Sheet
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '92%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827' },
  previewBtn: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  previewBtnText: { fontSize: 11, color: '#6b7280' },
  closeBtn: { fontSize: 18, color: '#9ca3af', padding: 4 },
  previewContainer: { minHeight: 120, marginBottom: 12 },
  emptyPreview: { color: '#9ca3af', fontSize: 14 },
  contentInput: {
    fontSize: 14, color: '#111827', minHeight: 150,
    lineHeight: 22, marginBottom: 12,
  },
  imagesRow: { marginBottom: 12 },
  imageWrapper: { marginRight: 8, position: 'relative' },
  thumbnail: { width: 80, height: 80, borderRadius: 10, resizeMode: 'cover' },
  deleteImageBtn: {
    position: 'absolute', top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
  },

  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  toolLabel: { fontSize: 12, color: '#6b7280', width: 58 },

  bgBlob1: { position: 'absolute', top: -120, left: -80,  width: 380, height: 380, borderRadius: 190, backgroundColor: 'rgba(139,92,246,0.45)' },
  bgBlob2: { position: 'absolute', top: 280,  right: -80, width: 340, height: 340, borderRadius: 170, backgroundColor: 'rgba(236,72,153,0.38)' },
  bgBlob3: { position: 'absolute', bottom: -80, left: 40, width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(6,182,212,0.32)'  },

  colorRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  colorDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
  colorDotActive: { borderWidth: 3, borderColor: '#374151' },
  colorDotMirror: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(160,160,160,0.6)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  mirrorDotInner: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  mirrorQ: { width: '50%', height: '50%' },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  tagChip: { backgroundColor: '#f3f4f6', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  tagChipText: { fontSize: 12, color: '#374151' },
  tagInput: { fontSize: 13, color: '#111827', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tagSuggestions: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
  tagSuggestionItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tagSuggestionText: { fontSize: 13, color: '#374151' },

  reminderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  reminderBtnText: { fontSize: 13, color: '#111827', flex: 1 },

  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  deleteBtnText: { color: '#9ca3af', fontSize: 14 },
  lockBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  lockBtnText: { fontSize: 13, color: '#6b7280' },
  saveBtn: { backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, marginLeft: 'auto' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  cardLockBadge: { fontSize: 10, color: '#9ca3af', marginBottom: 2 },
});

// ─── Password modal styles ───────────────────────────────────────────────────────

const passStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 12, textAlign: 'center', lineHeight: 18 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111827', marginBottom: 16,
  },
  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
  confirmBtn: { flex: 1, backgroundColor: '#111827', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ─── AppAlert styles ─────────────────────────────────────────────────────────────

const appAlertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 32,
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#fef2f2',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  msg: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  btn: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingHorizontal: 36,
    paddingVertical: 14,
    minWidth: 120,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── DateTimePicker styles ────────────────────────────────────────────────────────

const dtStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 16,
  },
  handle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  spinField: { alignItems: 'center', flex: 1 },
  spinLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  spinBtn: { paddingVertical: 6, paddingHorizontal: 16 },
  spinArrow: { fontSize: 18, color: '#6366f1', fontWeight: '700' },
  spinValue: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', minWidth: 52, paddingVertical: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  clearBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center',
  },
  clearText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#6366f1', alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
