import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { colors, fonts, radius, shadow, spacing } from "@/constants/Theme";
import GlassBackground from "@/components/GlassBackground";
import { useAuth } from "@/context/AuthContext";

export default function EmailAuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const returnTo =
    typeof params.returnTo === "string" ? params.returnTo : "/(tabs)";

  const isValid = useMemo(() => {
    if (!email.includes("@")) return false;
    return password.length >= 6;
  }, [email, password]);

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert(
        "Check details",
        "Enter a valid email and a password with at least 6 characters."
      );
      return;
    }

    try {
      setLoading(true);
      if (mode === "signup") {
        const hasSession = await signUpWithEmail(email.trim(), password);
        if (hasSession) {
          router.replace(returnTo);
          return;
        }
        Alert.alert(
          "Check your email",
          "Confirm your email address to finish setting up your account."
        );
        setMode("signin");
        return;
      } else {
        await signInWithEmail(email.trim(), password);
      }
      router.replace(returnTo);
    } catch (error: any) {
      Alert.alert("Sign in failed", error?.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <Image
              source={require("@/assets/images/gradus-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>
            {mode === "signup"
              ? "Create your Gradus account"
              : "Continue with email"}
          </Text>
          <Text style={styles.subtitle}>
            {mode === "signup"
              ? "Set up your email and password to get started."
              : "Sign in with your email and password."}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor={colors.muted}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholderTextColor={colors.muted}
          />

          <Pressable
            style={[
              styles.primaryButton,
              (!isValid || loading) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isValid || loading}
          >
            <Text style={styles.primaryText}>
              {loading
                ? "Please wait..."
                : mode === "signup"
                  ? "Create account"
                  : "Continue"}
            </Text>
          </Pressable>

          <Pressable onPress={() => setMode((prev) => (prev === "signup" ? "signin" : "signup"))}>
            <Text style={styles.toggle}>
              {mode === "signup"
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.replace({ pathname: "/auth/phone", params: { returnTo } })
            }
          >
            <Text style={styles.back}>Use phone number instead</Text>
          </Pressable>
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.glass,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  logo: {
    width: 140,
    height: 42,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.heading,
    marginBottom: spacing.sm,
    fontFamily: fonts.headingSemi,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: spacing.lg,
    fontFamily: fonts.body,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: 48,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
    backgroundColor: colors.glassHighlight,
    fontFamily: fonts.body,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    fontFamily: fonts.bodySemi,
  },
  toggle: {
    marginTop: spacing.md,
    textAlign: "center",
    color: colors.primary,
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
  },
  back: {
    marginTop: spacing.sm,
    textAlign: "center",
    color: colors.muted,
    fontSize: 13,
    fontFamily: fonts.body,
  },
});
