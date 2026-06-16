import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import type { Theme } from '@/lib/theme';

/**
 * Reusable date / month picker — tap the field to expand an inline spinner panel
 * (Day · Month · Year, or Month · Year when mode="month"). No typing, and no
 * nested <Modal> (which fails to render on Android when opened from inside another
 * Modal — the reason the Notes reminder picker lives as a sibling). Values are
 * plain ISO strings so callers stay simple.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

type Mode = 'date' | 'month';

interface Props {
  label?: string;
  /** 'YYYY-MM-DD' (date mode) or 'YYYY-MM'/'YYYY-MM-DD' (month mode). '' = unset. */
  value: string;
  onChange: (iso: string) => void;
  mode?: Mode;
  placeholder?: string;
  /** Show a Clear action that emits ''. */
  optional?: boolean;
  style?: object;
}

function parseISO(v: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/.exec(v ?? '');
  if (!m) return null;
  const mo = +m[2] - 1;
  if (mo < 0 || mo > 11) return null;
  return { y: +m[1], m: mo, d: m[3] ? +m[3] : 1 };
}

function SpinCol({ label, value, onDec, onInc }: { label: string; value: string; onDec: () => void; onInc: () => void }) {
  const { theme: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.spinCol}>
      <Text style={s.spinLabel}>{label}</Text>
      <TouchableOpacity onPress={onInc} style={s.spinBtn} hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}>
        <Text style={s.spinArrow}>▲</Text>
      </TouchableOpacity>
      <Text style={s.spinValue}>{value}</Text>
      <TouchableOpacity onPress={onDec} style={s.spinBtn} hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}>
        <Text style={s.spinArrow}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DatePickerField({
  label, value, onChange, mode = 'date', placeholder = 'Tap to pick…', optional, style,
}: Props) {
  const { theme: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [open, setOpen] = useState(false);

  const now = new Date();
  const [y, setY] = useState(now.getFullYear());
  const [m, setM] = useState(now.getMonth());
  const [d, setD] = useState(now.getDate());

  // Seed spinners from the current value whenever it changes or the panel opens.
  useEffect(() => {
    const p = parseISO(value);
    if (p) { setY(p.y); setM(p.m); setD(p.d); }
  }, [value, open]);

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const clampedDay = Math.min(d, daysInMonth);

  const parsed = parseISO(value);
  const display = (() => {
    if (!parsed) return placeholder;
    const dt = new Date(parsed.y, parsed.m, parsed.d);
    return mode === 'month'
      ? dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  function set() {
    const iso = mode === 'month'
      ? `${y}-${pad(m + 1)}-01`
      : `${y}-${pad(m + 1)}-${pad(clampedDay)}`;
    onChange(iso);
    setOpen(false);
  }
  function clear() { onChange(''); setOpen(false); }

  return (
    <View style={style}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TouchableOpacity style={[s.field, open && s.fieldOpen]} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <Text style={[s.fieldText, !parsed && { color: c.textFaint }]}>{display}</Text>
        <Text style={s.cal}>📅</Text>
      </TouchableOpacity>

      {open && (
        <View style={s.panel}>
          <View style={s.spinRow}>
            {mode === 'date' && (
              <SpinCol
                label="Day"
                value={String(clampedDay)}
                onDec={() => setD(v => (v <= 1 ? daysInMonth : v - 1))}
                onInc={() => setD(v => (v >= daysInMonth ? 1 : v + 1))}
              />
            )}
            <SpinCol
              label="Month"
              value={MONTHS[m]}
              onDec={() => setM(v => (v === 0 ? 11 : v - 1))}
              onInc={() => setM(v => (v === 11 ? 0 : v + 1))}
            />
            <SpinCol
              label="Year"
              value={String(y)}
              onDec={() => setY(v => v - 1)}
              onInc={() => setY(v => v + 1)}
            />
          </View>
          <View style={s.actions}>
            {optional && (
              <TouchableOpacity style={s.clearBtn} onPress={clear}>
                <Text style={s.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.setBtn} onPress={set}>
              <Text style={s.setText}>Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  label: { fontSize: 12, fontWeight: '500', color: c.textMuted, marginBottom: 8 },
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: c.inputBg,
  },
  fieldOpen: { borderColor: c.primary },
  fieldText: { fontSize: 14, color: c.text },
  cal: { fontSize: 15 },
  panel: {
    marginTop: 8, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 14,
    backgroundColor: c.elevated, padding: 14,
  },
  spinRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  spinCol: { alignItems: 'center', flex: 1 },
  spinLabel: { fontSize: 10, fontWeight: '700', color: c.textFaint, letterSpacing: 0.8, marginBottom: 4, textTransform: 'uppercase' },
  spinBtn: { paddingVertical: 4, paddingHorizontal: 14 },
  spinArrow: { fontSize: 16, color: c.primary, fontWeight: '700' },
  spinValue: { fontSize: 20, fontWeight: '700', color: c.text, textAlign: 'center', minWidth: 56, paddingVertical: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  clearBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.inputBorder, alignItems: 'center' },
  clearText: { color: c.textMuted, fontWeight: '600', fontSize: 14 },
  setBtn: { flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' },
  setText: { color: c.onColor, fontWeight: '700', fontSize: 15 },
});
