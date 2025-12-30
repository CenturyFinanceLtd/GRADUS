import { useEffect, useState } from "react";
import {
  Alert,
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

const MAX_RESENDS = 3;

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { verifyOtp, signInWithPhone } = useAuth();

  const phone = typeof params.phone === "string" ? params.phone : "";
  const returnTo =
    typeof params.returnTo === "string" ? params.returnTo : "/(tabs)";

  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [resendCount, setResendCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSecondsLeft(60);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCount]);

  const handleVerify = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert("Invalid OTP", "Enter the 6-digit code.");
      return;
    }
    if (!phone) {
      Alert.alert("Missing phone", "Return to phone entry and try again.");
      return;
    }

    try {
      setLoading(true);
      await verifyOtp(phone, otp.trim());
      router.replace(returnTo);
    } catch (error: any) {
      Alert.alert("Verification failed", error?.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCount >= MAX_RESENDS || secondsLeft > 0) return;
    if (!phone) {
      Alert.alert("Missing phone", "Return to phone entry and try again.");
      return;
    }
    try {
      setLoading(true);
      await signInWithPhone(phone);
      setResendCount((prev) => prev + 1);
    } catch (error: any) {
      Alert.alert("Resend failed", error?.message || "Try again.");
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
          <Text style={styles.brand}>Gradus</Text>
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to {phone || "your phone"}.
          </Text>

          <TextInput
            style={[styles.input, otp.trim().length === 6 && styles.inputValid]}
            keyboardType="number-pad"
            placeholder="000000"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            placeholderTextColor={colors.muted}
          />

          <Pressable
            style={[
              styles.primaryButton,
              (loading || otp.trim().length !== 6) && styles.buttonDisabled,
            ]}
            onPress={handleVerify}
            disabled={loading || otp.trim().length !== 6}
          >
            <Text style={styles.primaryText}>
              {loading ? "Verifying..." : "Verify"}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.replace("/auth/phone")}>
            <Text style={styles.editText}>Edit phone number</Text>
          </Pressable>

          <View style={styles.timerRow}>
            <Text style={styles.timerText}>
              {secondsLeft > 0
                ? `Resend in ${secondsLeft}s`
                : "Didn't get the code?"}
            </Text>
            <Pressable
              onPress={handleResend}
              disabled={secondsLeft > 0 || resendCount >= MAX_RESENDS}
            >
              <Text
                style={[
                  styles.resend,
                  (secondsLeft > 0 || resendCount >= MAX_RESENDS) &&
                    styles.resendDisabled,
                ]}
              >
                Resend OTP
              </Text>
            </Pressable>
          </View>
          {resendCount >= MAX_RESENDS ? (
            <Text style={styles.limitText}>
              Resend limit reached. Try again later.
            </Text>
          ) : null}
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
  brand: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    fontFamily: fonts.bodySemi,
  },
  title: {
    fontSize: 24,
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
    fontSize: 22,
    letterSpacing: 6,
    textAlign: "center",
    color: colors.text,
    marginBottom: spacing.lg,
    backgroundColor: colors.glassHighlight,
    fontFamily: fonts.bodySemi,
  },
  inputValid: {
    borderColor: colors.primary,
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
  editText: {
    marginTop: spacing.sm,
    textAlign: "center",
    color: colors.muted,
    fontSize: 13,
    fontFamily: fonts.body,
  },
  timerRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timerText: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  resend: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
    fontFamily: fonts.bodySemi,
  },
  resendDisabled: {
    color: colors.muted,
  },
  limitText: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
  },
});
