import { View, Text, useColorScheme } from 'react-native';
import VeloraGem from '@/components/VeloraGem';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  name?: string;
}

export default function VeloraLogoMobile({ size = 'md', name = 'Velora' }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.35 : 1;
  const s     = Math.round(28 * scale);
  const gem   = Math.round(s * 0.86);
  const gap   = Math.round(8 * scale);
  const fontSize = Math.round(17 * scale);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      <VeloraGem size={gem} />

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
