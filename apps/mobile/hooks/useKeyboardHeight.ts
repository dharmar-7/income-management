import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Tracks the on-screen keyboard height.
 *
 * Why this exists: our bottom sheets are React Native <Modal>s. On Android a
 * Modal opens in its OWN window that does NOT inherit the activity's
 * windowSoftInputMode, so neither `softwareKeyboardLayoutMode` nor
 * <KeyboardAvoidingView> can push their content above the keyboard. Listening to
 * the Keyboard events works regardless of the window, so the sheet can lift
 * itself by exactly the keyboard height.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS exposes the smoother "will" events; Android only fires "did".
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
