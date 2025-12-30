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
import { useAuth } from "@/context/AuthContext";
import GlassBackground from "@/components/GlassBackground";

export default function PhoneAuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { signInWithPhone } = useAuth();
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const returnTo =
    typeof params.returnTo === "string" ? params.returnTo : "/(tabs)";

  const digitsOnly = useMemo(() => phone.replace(/\D/g, ""), [phone]);
  const isValid = digitsOnly.length === 10;

  const handleContinue = async () => {
    if (!isValid) {
      Alert.alert("Invalid phone number", "Enter a 10-digit number.");
      return;
    }
    if (!agreed) {
      Alert.alert(
        "Accept terms",
        "Please agree to the Terms of Service and Privacy Policy."
      );
      return;
    }

    const formatted = `+91${digitsOnly}`;
    try {
      setLoading(true);
      await signInWithPhone(formatted);
      router.push({
        pathname: "/auth/otp",
        params: { phone: formatted, returnTo },
      });
    } catch (error: any) {
      Alert.alert("OTP failed", error?.message || "Unable to send OTP.");
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
          <Text style={styles.title}>Sign in with your phone</Text>
          <Text style={styles.subtitle}>
            Enter your mobile number to receive an OTP.
          </Text>

          <View style={[styles.inputRow, isValid && styles.inputRowValid]}>
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit phone number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={14}
              placeholderTextColor={colors.muted}
            />
          </View>

          <Pressable
            style={styles.checkboxRow}
            onPress={() => setAgreed((prev) => !prev)}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]} />
            <Text style={styles.checkboxText}>
              I agree to the Terms of Service and Privacy Policy
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.primaryButton,
              (!isValid || !agreed || loading) && styles.buttonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!isValid || !agreed || loading}
          >
            <Text style={styles.primaryText}>
              {loading ? "Sending..." : "Continue"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() =>
              router.push({ pathname: "/auth/email", params: { returnTo } })
            }
          >
            <Text style={styles.secondaryText}>
              Continue with email & password
            </Text>
          </Pressable>

          <Pressable onPress={() => router.replace(returnTo)}>
            <Text style={styles.guest}>Continue as guest</Text>
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
    fontSize: 24,
    fontWeight: "700",
    color: colors.heading,
    marginBottom: spacing.sm,
    fontFamily: fonts.headingSemi,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    marginBottom: spacing.lg,
    fontFamily: fonts.body,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.glassHighlight,
  },
  inputRowValid: {
    borderColor: colors.primary,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.heading,
    marginRight: spacing.sm,
    fontFamily: fonts.bodyMedium,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 17,
    color: colors.text,
    fontFamily: fonts.body,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
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
  secondaryButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassHighlight,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
    fontFamily: fonts.bodySemi,
  },
  guest: {
    marginTop: spacing.sm,
    textAlign: "center",
    color: colors.muted,
    fontSize: 14,
    fontFamily: fonts.body,
  },
});
