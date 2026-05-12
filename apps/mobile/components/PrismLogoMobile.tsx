import { View, Text } from 'react-native';

const SPECTRUM = ['#8b5cf6', '#6366f1', '#06b6d4', '#22c55e', '#f97316', '#f43f5e'];

interface Props {
  size?: 'sm' | 'md' | 'lg';
}

export default function PrismLogoMobile({ size = 'md' }: Props) {
  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.35 : 1;

  const triHalf = Math.round(14 * scale);   // half-height of triangle
  const triBase = Math.round(20 * scale);   // width (depth) of triangle
  const dotSize = Math.round(3 * scale);
  const dotGap = Math.round(2.5 * scale);
  const fontSize = Math.round(17 * scale);
  const gap = Math.round(8 * scale);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      {/* ── Prism icon ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Math.round(4 * scale) }}>

        {/* Input beam — thin line entering prism from left */}
        <View style={{
          width: Math.round(8 * scale),
          height: 1.5,
          backgroundColor: '#c4b5fd',
          borderRadius: 1,
          opacity: 0.7,
        }} />

        {/* Prism body — right-pointing triangle via border hack */}
        <View style={{
          width: 0,
          height: 0,
          borderStyle: 'solid',
          borderTopWidth: triHalf,
          borderBottomWidth: triHalf,
          borderLeftWidth: triBase,
          borderRightWidth: 0,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: '#6366f1',
        }} />

        {/* Spectrum rays — 6 coloured dots fanning out */}
        <View style={{ gap: dotGap, justifyContent: 'center' }}>
          {SPECTRUM.map((color, i) => (
            <View
              key={i}
              style={{
                width: dotSize + (i < 3 ? 0 : 1),
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: color,
                marginLeft: i < 2 ? 0 : i < 4 ? Math.round(1 * scale) : Math.round(2 * scale),
              }}
            />
          ))}
        </View>
      </View>

      {/* ── Wordmark ── */}
      <Text
        style={{
          fontSize,
          fontWeight: '700',
          color: '#6366f1',
          letterSpacing: -0.4,
        }}
      >
        Prism
      </Text>
    </View>
  );
}
