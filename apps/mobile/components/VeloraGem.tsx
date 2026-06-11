import { View } from 'react-native';

/**
 * Velora brand mark — a 4-quadrant spectrum gem. Single source of truth, used by
 * both the header logo (VeloraLogoMobile) and the centre tab (GlowStripTabBar).
 *
 * Rendered as a CIRCLE (borderRadius + overflow:hidden) with NO transform on this
 * View or any ancestor. This is deliberate: on Android, overflow:hidden clipping
 * breaks when combined with a transform (e.g. rotate) on the view or an ancestor —
 * the old rotated-diamond version rendered as a broken/invisible icon for exactly
 * that reason. Keep this transform-free so it clips reliably everywhere.
 */
export default function VeloraGem({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
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
  );
}
