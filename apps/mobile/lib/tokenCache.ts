import * as SecureStore from 'expo-secure-store';

interface TokenCache {
  getToken(key: string): Promise<string | null | undefined>;
  saveToken(key: string, value: string): Promise<void>;
  clearToken?(key: string): Promise<void>;
}

// Clerk uses this to securely cache JWT tokens on the device.
// SecureStore = iOS Keychain / Android Keystore — encrypted hardware storage.
// This is why mobile auth is safe: tokens aren't stored in plain files.
export const tokenCache: TokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
  async clearToken(key: string) {
    return SecureStore.deleteItemAsync(key);
  },
};
