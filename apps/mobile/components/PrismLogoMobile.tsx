import { View, Text, useColorScheme } from 'react-native';

// Primary: Faceted Crystal (Full Spectrum Rainbow) — 4-quadrant rotated diamond
// Wordmark: "Velora" in violet (gradient text needs expo-linear-gradient; solid for now)

interface Props {
  size?: 'sm' | 'md' | 'lg';
  name?: string;
}

export default function PrismLogoMobile({ size = 'md', name = 'Velora' }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.35 : 1;
  const s     = Math.round(28 * scale);   // icon bounding box
  const gem   = Math.round(s * 0.82);     // inner rotated square size
  const gap   = Math.round(8 * scale);
  const fontSize = Math.round(17 * scale);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>

      {/* ── Crystal icon: rotated square with 4 spectrum quadrants ── */}
      <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: gem,
          height: gem,
          transform: [{ rotate: '45deg' }],
          borderRadius: Math.round(gem * 0.14),
          overflow: 'hidden',
        }}>
          {/* Top row: pink | orange */}
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{ flex: 1, backgroundColor: '#f72585' }} />
            <View style={{ flex: 1, backgroundColor: '#ff9100' }} />
          </View>
          {/* Bottom row: violet | green */}
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{ flex: 1, backgroundColor: '#bf5af2' }} />
            <View style={{ flex: 1, backgroundColor: '#32d74b' }} />
          </View>
          {/* Specular highlight — top-left corner */}
          <View style={{
            position: 'absolute',
            top: '4%', left: '4%',
            width: '38%', height: '38%',
            backgroundColor: 'rgba(255,255,255,0.28)',
            borderRadius: Math.round(gem * 0.1),
          }} />
        </View>
      </View>

      {/* ── Wordmark ── */}
      <Text style={{
        fontSize,
        fontWeight: '700',
        color: isDark ? '#c084fc' : '#7c3aed',
        letterSpacing: -0.4,
      }}>
        {name}
      </Text>

    </View>
  );
}
