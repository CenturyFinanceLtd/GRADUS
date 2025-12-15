import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  Platform,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { SafeAreaView } from "react-native-safe-area-context";

import { WEB_BASE_URL, API_BASE_URL } from "@/constants/config";
import {
  markSignedIn,
  setFirstName,
  setAuthSession,
} from "@/utils/auth-storage";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  // Configure Google Sign-In on mount
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      offlineAccess: true, // Get server auth code for backend
    });
  }, []);

  const handleSignIn = async () => {
    if (!email.trim()) {
      Alert.alert("Sign in", "Please enter your email address.");
      return;
    }
    if (!password) {
      Alert.alert("Sign in", "Please enter your password.");
      return;
    }
    if (!agreed) {
      Alert.alert("Sign in", "Please accept the terms to continue.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          Alert.alert("Sign in", "Email not registered or wrong password.");
        } else {
          Alert.alert("Sign in", "Unable to sign in. Please try again.");
        }
        return;
      }

      const payload = await res.json().catch(() => null);
      const capName = (value?: string | null) => {
        const trimmed = (value || "").trim();
        if (!trimmed) return null;
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      };
      const userFirst =
        payload?.user?.firstName ||
        payload?.user?.name?.split?.(" ")?.[0] ||
        payload?.firstName ||
        payload?.name?.split?.(" ")?.[0] ||
        null;
      const cappedFirst = capName(userFirst);
      const normalizedUser = payload?.user
        ? {
            ...payload.user,
            firstName:
              capName(payload.user.firstName) || payload.user.firstName,
          }
        : null;
      await setAuthSession(payload?.token || null, normalizedUser);
      await setFirstName(cappedFirst);
      await markSignedIn();

      let dest = "/(tabs)";
      if (typeof redirect === "string" && redirect.length > 1) {
        dest = redirect;
      }

      console.log("Navigating to dest:", dest);
      router.replace(dest as any);
    } catch (error) {
      console.warn("Login error", error);
      Alert.alert("Sign in", "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const openLink = async (path: string) => {
    const url = `${WEB_BASE_URL}${path}`;
    await WebBrowser.openBrowserAsync(url);
  };

  const handleGoogle = async () => {
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      Alert.alert(
        "Google Sign-in",
        "Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID to enable Google login."
      );
      return;
    }

    setGoogleBusy(true);
    try {
      // Check if Play Services are available
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Sign out first to always show account picker
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignore sign out errors
      }

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      console.log("Google Sign-in userInfo:", userInfo);

      // Get the idToken for backend authentication
      const idToken = userInfo.data?.idToken;
      const serverAuthCode = userInfo.data?.serverAuthCode;

      if (!idToken && !serverAuthCode) {
        throw new Error("Failed to get authentication token from Google");
      }

      // Send the token to your backend (use onetap endpoint for idToken)
      const response = await fetch(
        `${API_BASE_URL}/api/auth/social/google/onetap`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: idToken,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.message || "Google login failed. Please try again."
        );
      }

      const payload = await response.json().catch(() => null);
      const capName = (value?: string | null) => {
        const trimmed = (value || "").trim();
        if (!trimmed) return null;
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      };
      const userFirst =
        payload?.user?.firstName ||
        payload?.user?.name?.split?.(" ")?.[0] ||
        payload?.firstName ||
        payload?.name?.split?.(" ")?.[0] ||
        null;
      const cappedFirst = capName(userFirst);
      const normalizedUser = payload?.user
        ? {
            ...payload.user,
            firstName:
              capName(payload.user.firstName) || payload.user.firstName,
          }
        : null;
      await setAuthSession(payload?.token || null, normalizedUser);
      await setFirstName(cappedFirst);
      await markSignedIn();
      const dest = redirect ? String(redirect) : "/(tabs)";
      router.replace(dest as any);
    } catch (error: any) {
      console.warn("Google login error", error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the sign-in flow
        return;
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert("Google Sign-in", "Sign-in is already in progress.");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          "Google Sign-in",
          "Google Play Services is not available on this device."
        );
      } else {
        Alert.alert(
          "Google Sign-in",
          error?.message || "An error occurred during sign-in."
        );
      }
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.cardWrapper}>
        <View style={styles.card}>
          <View style={styles.logoRow}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
              contentFit="contain"
            />
          </View>

          <Text style={styles.heading}>Sign in to your account</Text>

          <Text style={styles.label}>Email address</Text>
          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="#aaa"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput
            placeholder="Enter your password"
            placeholderTextColor="#aaa"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={styles.checkboxRow}
            onPress={() => setAgreed((v) => !v)}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.agreeText}>
              I've read and agreed to{" "}
              <Text
                style={styles.link}
                onPress={() => openLink("/user-agreement")}
              >
                User Agreement
              </Text>{" "}
              and{" "}
              <Text
                style={styles.link}
                onPress={() => openLink("/privacy-policy")}
              >
                Privacy Policy
              </Text>
            </Text>
          </Pressable>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (!agreed || busy) && styles.primaryBtnDisabled,
            ]}
            activeOpacity={0.8}
            disabled={!agreed || busy}
            onPress={handleSignIn}
          >
            <Text style={styles.primaryText}>
              {busy ? "Signing in…" : "Sign in"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.orText}>Or continue with</Text>

          <View style={styles.socialRow}>
            <SocialButton icon="logo-google" onPress={handleGoogle} />
            <SocialButton
              icon="logo-facebook"
              onPress={() => openLink("/sign-in")}
            />
            <SocialButton
              icon="logo-apple"
              onPress={() => openLink("/sign-in")}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Pressable onPress={() => router.push("/auth/signup")}>
              <Text style={[styles.footerText, styles.link]}>
                Create Account
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SocialButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.socialBtn}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={22} color="#444" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 420,
  },
  card: {
    backgroundColor: "transparent",
    borderRadius: 0,
    padding: 20,
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  logo: {
    width: "100%",
    height: 56,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111",
  },
  heading: {
    marginTop: 28,
    fontSize: 18,
    color: "#444",
    textAlign: "center",
    fontWeight: "600",
  },
  label: {
    marginTop: 28,
    marginBottom: 6,
    fontSize: 14,
    color: "#444",
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d5d5d5",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#3c7bff",
    borderColor: "#3c7bff",
  },
  agreeText: {
    flex: 1,
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },
  link: {
    color: "#3c7bff",
    fontWeight: "700",
  },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: "#3c7bff",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  orText: {
    textAlign: "center",
    marginTop: 18,
    color: "#666",
    fontSize: 13,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 12,
  },
  socialBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#f1f1f1",
    alignItems: "center",
    justifyContent: "center",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 22,
  },
  footerText: {
    fontSize: 13,
    color: "#555",
  },
});
