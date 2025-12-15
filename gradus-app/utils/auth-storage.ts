import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'auth_signed_in';
const NAME_KEY = 'user_first_name';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export async function markSignedIn() {
  try {
    await AsyncStorage.setItem(KEY, 'true');
  } catch {
    // ignore
  }
}

export async function hasSignedIn(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setFirstName(name: string | null) {
  try {
    if (name && name.trim()) {
      await AsyncStorage.setItem(NAME_KEY, name.trim());
    } else {
      await AsyncStorage.removeItem(NAME_KEY);
    }
  } catch {
    // ignore
  }
}

export async function getFirstName(): Promise<string | null> {
  try {
    const val = await AsyncStorage.getItem(NAME_KEY);
    return val ?? null;
  } catch {
    return null;
  }
}

export async function setAuthSession(token: string | null, user: any | null) {
  try {
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }

    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(USER_KEY);
    }
  } catch {
    // ignore
  }
}

export async function getAuthSession(): Promise<{ token: string | null; user: any | null }> {
  try {
    const [token, rawUser] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
    ]);
    let user: any = null;
    if (rawUser) {
      try {
        user = JSON.parse(rawUser);
      } catch {
        user = null;
      }
    }
    return { token: token || null, user };
  } catch {
    return { token: null, user: null };
  }
}

export async function clearAuthSession() {
  try {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
      AsyncStorage.removeItem(NAME_KEY),
      AsyncStorage.removeItem(KEY),
    ]);
  } catch {
    // ignore
  }
}

export async function isSignedIn(): Promise<boolean> {
  const signed = await hasSignedIn();
  const { token } = await getAuthSession();
  return Boolean(signed && token);
}
