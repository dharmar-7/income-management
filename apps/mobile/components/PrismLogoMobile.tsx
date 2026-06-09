import { View, Text, useColorScheme } from 'react-native';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  name?: string;
}

export default function PrismLogoMobile({ size = 'md', name = 'Velora' }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.35 : 1;
  const s     = Math.round(28 * scale);
  const gem   = Math.round(s * 0.86);
  const gap   = Math.round(8 * scale);
  const fontSize = Math.round(17 * scale);

  // NOTE: On Android, overflow:hidden + borderRadius ONLY clips reliably when there is
  // NO transform on this View or any ancestor. A rotated diamond looks great but the
  // Android header renderer breaks it every time. Circle with 4 quadrants is equivalent
  // visually and is guaranteed to clip correctly everywhere.
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      <View style={{
        width: gem, height: gem,
        borderRadius: gem / 2,
        overflow: 'hidden',
      }}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1, backgroundColor: '#f72585' }} />
          <View style={{ flex: 1, backgroundColor: '#ff9100' }} />
        </View>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1, backgroundColor: '#bf5af2' }} />
          <View style={{ flex: 1, backgroundColor: '#32d74b' }} />
        </View>
        <View style={{
          position: 'absolute',
          top: '8%', left: '8%',
          width: '34%', height: '34%',
          backgroundColor: 'rgba(255,255,255,0.42)',
          borderRadius: 99,
        }} />
      </View>

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
