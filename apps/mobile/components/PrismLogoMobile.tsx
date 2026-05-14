import { View, Text } from 'react-native';

const SPECTRUM = ['#8b5cf6', '#6366f1', '#06b6d4', '#22c55e', '#f97316', '#f43f5e'];

interface Props {
  size?: 'sm' | 'md' | 'lg';
  name?: string;
}

export default function PrismLogoMobile({ size = 'md', name = 'Velora' }: Props) {
  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.35 : 1;

  const iconSize  = Math.round(28 * scale);
  const dotSize   = Math.round(4 * scale);
  const dotGap    = Math.round(2 * scale);
  const fontSize  = Math.round(17 * scale);
  const gap       = Math.round(8 * scale);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      {/* ── Prism icon — diamond rotated 45° ── */}
      <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
        {/* Diamond body */}
        <View style={{
          width: iconSize * 0.65,
          height: iconSize * 0.65,
          backgroundColor: '#6366f1',
          borderRadius: 4 * scale,
          transform: [{ rotate: '45deg' }],
          position: 'absolute',
        }} />
        {/* Spectrum dots overlay — fanning from centre-right */}
        <View style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          justifyContent: 'center',
          gap: dotGap,
        }}>
          {SPECTRUM.map((color, i) => (
            <View
              key={i}
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: color,
                marginLeft: i < 2 ? 0 : i < 4 ? Math.round(2 * scale) : Math.round(4 * scale),
              }}
            />
          ))}
        </View>
      </View>

      {/* ── Wordmark ── */}
      <Text style={{
        fontSize,
        fontWeight: '700',
        color: '#6366f1',
        letterSpacing: -0.4,
      }}>
        {name}
      </Text>
    </View>
  );
}
