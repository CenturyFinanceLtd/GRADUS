import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter , useLocalSearchParams } from "expo-router";

import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL } from "@/constants/config";
import { screenContainer } from "@/styles/layout";

type Step = "EMAIL" | "OTP" | "RESET";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [step, setStep] = useState<Step>("EMAIL");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (params.email && typeof params.email === "string") {
      const emailParam = params.email;
      setEmail(emailParam);
      // Auto-trigger OTP send
      handleEmailSubmit(emailParam);
    }
  }, [params.email]);
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showBanner = (type: "success" | "error", message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3000);
  };

  const handleEmailSubmit = async (emailOverride?: string) => {
    const targetEmail = emailOverride || email;
    if (!targetEmail.trim()) {
      showBanner("error", "Please enter your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/password/reset/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to send OTP.");

      setSessionId(body.sessionId);
      if (body.devOtp) {
        console.log("Dev OTP:", body.devOtp);
        showBanner("success", `OTP sent! (Dev: ${body.devOtp})`);
      } else {
        showBanner("success", "OTP sent to your email.");
      }
      setStep("OTP");
    } catch (err: any) {
      showBanner("error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otp.trim()) {
      showBanner("error", "Please enter the OTP.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/auth/password/reset/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, otp }),
        }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Invalid OTP.");

      setVerificationToken(body.verificationToken);
      setStep("RESET");
    } catch (err: any) {
      showBanner("error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      showBanner("error", "Please fill all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showBanner("error", "Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/auth/password/reset/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            verificationToken,
            password: newPassword,
            confirmPassword,
          }),
        }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to reset password.");

      showBanner("success", "Password reset successfully. Please sign in.");
      setTimeout(() => router.replace("/auth/signin"), 1500);
    } catch (err: any) {
      showBanner("error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.title}>Forgot Password</Text>
      </View>

      {banner && (
        <View
          style={[
            styles.banner,
            banner.type === "success"
              ? styles.bannerSuccess
              : styles.bannerError,
          ]}
        >
          <Ionicons
            name={
              banner.type === "success" ? "checkmark-circle" : "alert-circle"
            }
            size={18}
            color={banner.type === "success" ? "#0f5132" : "#842029"}
          />
          <Text
            style={[
              styles.bannerText,
              banner.type === "success"
                ? styles.bannerTextSuccess
                : styles.bannerTextError,
            ]}
          >
            {banner.message}
          </Text>
        </View>
      )}

      <View style={styles.form}>
        {step === "EMAIL" && (
          <>
            <Text style={styles.instruction}>
              Enter your email address and we'll send you a verification code to
              reset your password.
            </Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputBox}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="john@example.com"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={() => handleEmailSubmit()}
              activeOpacity={0.85}
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? "Sending..." : "Send OTP"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === "OTP" && (
          <>
            <Text style={styles.instruction}>
              Enter the 6-digit code sent to {email}.
            </Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Verification Code</Text>
              <View style={styles.inputBox}>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="123456"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.input, { letterSpacing: 4, fontSize: 18 }]}
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={handleOtpSubmit}
              activeOpacity={0.85}
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? "Verifying..." : "Verify Code"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === "RESET" && (
          <>
            <Text style={styles.instruction}>
              Create a new password for your account.
            </Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputBox}>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  placeholder="New Password"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => setShowNew(!showNew)}
                  hitSlop={10}
                >
                  <Ionicons
                    name={!showNew ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputBox}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  placeholder="Confirm Password"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  hitSlop={10}
                >
                  <Ionicons
                    name={!showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleResetSubmit}
              activeOpacity={0.85}
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? "Resetting..." : "Reset Password"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...screenContainer,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },
  instruction: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 4,
  },
  banner: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bannerSuccess: {
    backgroundColor: "#d1e7dd",
  },
  bannerError: {
    backgroundColor: "#f8d7da",
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  bannerTextSuccess: {
    color: "#0f5132",
  },
  bannerTextError: {
    color: "#842029",
  },
  inputWrap: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "600",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f9fafb",
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 15,
    color: "#111827",
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: "#2968ff",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
