import { useSSO } from '@clerk/clerk-expo';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function SSOCallback() {
  const { handleRedirectCallback } = useSSO();

  useEffect(() => {
    handleRedirectCallback();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}
