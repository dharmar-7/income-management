import { Image } from 'react-native';

/**
 * Velora brand mark — the spectrum color wheel. Single source of truth, shared by
 * the header logo (VeloraLogoMobile) and the centre tab (GlowStripTabBar).
 *
 * Rendered from a transparent PNG (assets/logo-wheel.png) so it's crisp at any size
 * with no SVG dependency and stays identical to the app icon. Regenerate the artwork
 * via scripts/generate-icons.mjs.
 */
export default function VeloraGem({ size }: { size: number }) {
  return (
    <Image
      source={require('../assets/logo-wheel.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
