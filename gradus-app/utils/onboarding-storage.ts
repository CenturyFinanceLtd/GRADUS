import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'onboarding_seen';

export async function markOnboardingSeen() {
  try {
    await AsyncStorage.setItem(KEY, 'true');
  } catch (err) {
    // Non-critical; proceed even if storage fails.
  }
}

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    return value === 'true';
  } catch (err) {
    return false;
  }
}
