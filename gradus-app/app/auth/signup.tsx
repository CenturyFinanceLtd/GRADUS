import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL } from "@/constants/config";
import {
  markSignedIn,
  setAuthSession,
  setFirstName,
} from "@/utils/auth-storage";

type Step = 1 | 2 | 3 | 4;

type SignupSession = {
  sessionId: string;
  email: string;
  devOtp?: string | null;
};

const genderOptions = [
  "Man",
  "Woman",
  "Non-binary",
  "Something else",
  "Prefer not to say",
];

export default function SignupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [session, setSession] = useState<SignupSession | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(
    null
  );
  const [verified, setVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [studentName, setStudentName] = useState("");
  const [gender, setGender] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [city] = useState("");
  const [state] = useState("");
  const [country] = useState("");
  const [zipCode] = useState("");
  const [address] = useState("");
  const [institutionName] = useState("Not provided");
  const [passingYear] = useState("Not provided");
  const [fieldOfStudy] = useState("Not provided");

  const [otp, setOtp] = useState("");

  const dob = useMemo(() => {
    if (!dobYear || !dobMonth || !dobDay) return "";
    const paddedMonth = dobMonth.padStart(2, "0");
    const paddedDay = dobDay.padStart(2, "0");
    return `${dobYear}-${paddedMonth}-${paddedDay}`;
  }, [dobYear, dobMonth, dobDay]);

  const maskedEmail = useMemo(() => {
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const [user, domain] = parts;
    if (user.length <= 2) return `**@${domain}`;
    return `${user[0]}***${user[user.length - 1]}@${domain}`;
  }, [email]);

  const validateStep1 = () => {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Sign up", "Please enter a valid email address.");
      return false;
    }
    if (!mobile.trim()) {
      Alert.alert("Sign up", "Please enter your phone number.");
      return false;
    }
    return true;
  };

  const handleStart = async () => {
    if (!validateStep1()) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Gradus",
          lastName: "Learner",
          email: email.trim(),
          mobile: mobile.trim(),
          personalDetails: { studentName: "" },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || "Could not start sign up.");
      }
      setSession({
        sessionId: body.sessionId,
        email: body.email || email.trim(),
        devOtp: body.devOtp || null,
      });
      setVerificationToken(null);
      setVerified(false);
      setCodeSent(false);
      setStep(2);
    } catch (error: any) {
      Alert.alert(
        "Sign up",
        error?.message || "Unable to start sign up. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleStep2Next = () => {
    setStep(3);
  };

  const validateStep3 = () => true;

  const handleStep3Next = () => {
    if (!validateStep3()) return;
    setStep(4);
  };

  const handleResend = async () => {
    if (!validateStep1()) return;
    setOtpBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: studentName.trim().split(" ")[0] || "Learner",
          lastName: studentName.trim().split(" ").slice(1).join(" ") || "User",
          email: email.trim(),
          mobile: mobile.trim(),
          personalDetails: {
            studentName: studentName.trim() || "Gradus Learner",
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || "Could not resend code.");
      }
      setSession({
        sessionId: body.sessionId,
        email: body.email || email.trim(),
        devOtp: body.devOtp || null,
      });
      setVerificationToken(null);
      setVerified(false);
      setCodeSent(true);
      Alert.alert("Verification", "We sent a new code to your email.");
    } catch (error: any) {
      Alert.alert("Verification", error?.message || "Unable to resend code.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleComplete = async () => {
    if (!session?.sessionId) {
      Alert.alert("Verification", "Session expired. Please restart sign up.");
      setStep(1);
      return;
    }
    if (!verificationToken) {
      Alert.alert(
        "Verification",
        "Please verify the code before completing sign up."
      );
      return;
    }

    setBusy(true);
    try {
      const completeRes = await fetch(
        `${API_BASE_URL}/api/auth/signup/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.sessionId,
            verificationToken,
            password,
            confirmPassword,
            firstName: studentName.trim().split(" ")[0] || "Learner",
            lastName:
              studentName.trim().split(" ").slice(1).join(" ") || "User",
            mobile: mobile.trim(),
            personalDetails: {
              studentName: studentName.trim() || "Gradus Learner",
              gender: gender || "Not specified",
              dateOfBirth: dob || "1990-01-01",
              city: "Not provided",
              state: "Not provided",
              country: "Not provided",
              zipCode: "000000",
              address: "Not provided",
            },
            educationDetails: {
              institutionName: institutionName.trim() || "Not provided",
              passingYear: passingYear.trim() || "Not provided",
              fieldOfStudy: fieldOfStudy.trim() || "Not provided",
            },
          }),
        }
      );
      const completeBody = await completeRes.json().catch(() => ({}));
      if (!completeRes.ok) {
        throw new Error(completeBody?.message || "Could not complete sign up.");
      }

      const payload = completeBody;
      const cap = (value?: string | null) => {
        const t = (value || "").trim();
        if (!t) return null;
        return t.charAt(0).toUpperCase() + t.slice(1);
      };
      const userFirst =
        payload?.user?.firstName ||
        payload?.user?.name?.split?.(" ")?.[0] ||
        payload?.firstName ||
        payload?.name?.split?.(" ")?.[0] ||
        null;
      const cappedFirst = cap(userFirst);
      const normalizedUser = payload?.user
        ? {
            ...payload.user,
            firstName: cap(payload.user.firstName) || payload.user.firstName,
          }
        : null;
      await setAuthSession(payload?.token || null, normalizedUser);
      await setFirstName(cappedFirst);
      await markSignedIn();
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert(
        "Sign up",
        error?.message || "Unable to finish sign up. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!session?.sessionId) {
      Alert.alert("Verification", "Session expired. Please restart sign up.");
      setStep(1);
      return;
    }
    if (!otp.trim()) {
      Alert.alert("Verification", "Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    try {
      const verifyRes = await fetch(
        `${API_BASE_URL}/api/auth/signup/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.sessionId,
            otp: otp.trim(),
          }),
        }
      );
      const verifyBody = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) {
        throw new Error(
          verifyBody?.message || "Invalid code. Please try again."
        );
      }
      const token = verifyBody.verificationToken;
      if (!token) {
        throw new Error("Verification failed. Please retry.");
      }
      setVerificationToken(token);
      setVerified(true);
      setCodeSent(true);
      Alert.alert(
        "Verified",
        "Email verified successfully. You can now complete sign up."
      );
    } catch (error: any) {
      Alert.alert("Verification", error?.message || "Unable to verify code.");
    } finally {
      setBusy(false);
    }
  };

  const StepHeader = ({
    title,
    subtitle,
  }: {
    title: string;
    subtitle?: string;
  }) => (
    <View style={styles.stepHeader}>
      <Image
        source={require("@/assets/images/logo.png")}
        style={styles.logo}
        contentFit="contain"
      />
      <Text style={styles.stepTitle}>{title}</Text>
      {subtitle ? <Text style={styles.stepSubtitle}>{subtitle}</Text> : null}
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <StepHeader title="Sign up to start learning" />
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="name@domain.com"
              placeholderTextColor="#9aa0ab"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your number"
              placeholderTextColor="#9aa0ab"
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={setMobile}
            />
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={handleStart}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Next</Text>
              )}
            </TouchableOpacity>
            <Text
              style={[styles.orText, { marginTop: 18, textAlign: "center" }]}
            >
              Or continue with
            </Text>
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialBtn}
                activeOpacity={0.85}
                onPress={() => router.replace("/auth/signin")}
              >
                <Ionicons name="logo-google" size={22} color="#444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialBtn}
                activeOpacity={0.85}
                onPress={() => router.replace("/auth/signin")}
              >
                <Ionicons name="logo-facebook" size={22} color="#444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialBtn}
                activeOpacity={0.85}
                onPress={() => router.replace("/auth/signin")}
              >
                <Ionicons name="logo-apple" size={22} color="#444" />
              </TouchableOpacity>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Already have an account? </Text>
              <Pressable onPress={() => router.replace("/auth/signin")}>
                <Text style={[styles.switchText, styles.link]}>Log in</Text>
              </Pressable>
            </View>
          </>
        );
      case 2:
        return (
          <>
            <StepHeader
              title="Create a password"
              subtitle="Use at least 8 characters with letters and numbers."
            />
            <Text style={styles.progressText}>Step 1 of 3</Text>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor="#9aa0ab"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor="#9aa0ab"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={[styles.secondaryBtn, styles.secondaryWide]}
                onPress={() => setStep(1)}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, styles.primaryWide]}
                onPress={handleStep2Next}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryText}>Next</Text>
              </TouchableOpacity>
            </View>
          </>
        );
      case 3:
        return (
          <>
            <StepHeader
              title="Tell us about yourself"
              subtitle="This helps us personalize your learning experience."
            />
            <Text style={styles.progressText}>Step 2 of 3</Text>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="This name will appear on your profile"
              placeholderTextColor="#9aa0ab"
              value={studentName}
              onChangeText={setStudentName}
            />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Year</Text>
                <TextInput
                  style={styles.input}
                  placeholder="yyyy"
                  placeholderTextColor="#9aa0ab"
                  keyboardType="numeric"
                  maxLength={4}
                  value={dobYear}
                  onChangeText={setDobYear}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Month</Text>
                <TextInput
                  style={styles.input}
                  placeholder="mm"
                  placeholderTextColor="#9aa0ab"
                  keyboardType="numeric"
                  maxLength={2}
                  value={dobMonth}
                  onChangeText={setDobMonth}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Day</Text>
                <TextInput
                  style={styles.input}
                  placeholder="dd"
                  placeholderTextColor="#9aa0ab"
                  keyboardType="numeric"
                  maxLength={2}
                  value={dobDay}
                  onChangeText={setDobDay}
                />
              </View>
            </View>

            <Text style={styles.label}>Gender</Text>
            <View style={styles.chipRow}>
              {genderOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, gender === opt && styles.chipActive]}
                  onPress={() => setGender(opt)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.chipText,
                      gender === opt && styles.chipTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={[styles.secondaryBtn, styles.secondaryWide]}
                onPress={() => setStep(2)}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, styles.primaryWide]}
                onPress={handleStep3Next}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryText}>Next</Text>
              </TouchableOpacity>
            </View>
          </>
        );
      case 4:
      default:
        return (
          <>
            <StepHeader
              title="Finish setting up your account"
              subtitle="We sent a 6-digit code to verify your email."
            />
            <Text style={styles.progressText}>Step 3 of 3</Text>
            {codeSent && (
              <View style={styles.infoBanner}>
                <Text style={styles.infoText}>
                  We've sent a verification code to{" "}
                  {maskedEmail || email || "your email"}.
                  {session?.devOtp ? ` (Dev OTP: ${session.devOtp})` : ""}
                </Text>
              </View>
            )}
            <View style={styles.verifyBox}>
              <Text style={styles.verifyTitle}>Verify your email</Text>
              <Text style={styles.verifySubtitle}>
                We'll send a 6-digit code to{" "}
                {maskedEmail || email || "your email"}.
                {session?.devOtp ? ` (Dev OTP: ${session.devOtp})` : ""}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#9aa0ab"
                keyboardType="numeric"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />
              <TouchableOpacity
                style={[styles.secondaryBtn, { marginTop: 8 }]}
                onPress={handleResend}
                activeOpacity={0.85}
                disabled={otpBusy}
              >
                {otpBusy ? (
                  <ActivityIndicator color="#0a5bd7" />
                ) : (
                  <Text style={styles.secondaryText}>Send code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 8 }]}
                onPress={handleVerify}
                activeOpacity={0.85}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={[styles.secondaryBtn, styles.secondaryWide]}
                onPress={() => setStep(3)}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, styles.primaryWide]}
                onPress={handleComplete}
                activeOpacity={0.85}
                disabled={busy || !verified}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Complete Sign Up</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Already have an account? </Text>
              <Pressable onPress={() => router.replace("/auth/signin")}>
                <Text style={[styles.switchText, styles.link]}>Log in</Text>
              </Pressable>
            </View>
          </>
        );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1, width: "100%" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
    gap: 12,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: "100%",
  },
  stepHeader: {
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  logo: {
    width: 180,
    height: 54,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0b1a33",
    textAlign: "center",
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#4f5b66",
    textAlign: "center",
  },
  progressText: {
    fontSize: 13,
    color: "#4f5b66",
    marginTop: -4,
    marginBottom: 6,
  },
  label: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2933",
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#d9e1ec",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111",
  },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#0a5bd7",
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryWide: {
    flex: 1,
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    marginTop: 14,
    backgroundColor: "#eef2f7",
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    minWidth: 110,
  },
  secondaryWide: {
    minWidth: 120,
  },
  rowButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 6,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  switchText: {
    fontSize: 14,
    color: "#1f2933",
  },
  link: {
    color: "#0a5bd7",
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#cfd7e3",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: "#0a5bd7",
    borderColor: "#0a5bd7",
  },
  chipText: {
    color: "#1f2933",
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fff",
  },
  verifyBox: {
    borderWidth: 1,
    borderColor: "#d9e1ec",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#f8fbff",
    marginTop: 10,
    gap: 8,
  },
  verifyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0b1a33",
  },
  verifySubtitle: {
    fontSize: 14,
    color: "#4f5b66",
  },
  infoBanner: {
    backgroundColor: "#e7f1ff",
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginBottom: 4,
  },
  infoText: {
    color: "#0a5bd7",
    fontSize: 13,
    fontWeight: "600",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 10,
  },
  socialBtn: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#f1f1f1",
    alignItems: "center",
    justifyContent: "center",
  },
  socialIcon: {
    width: 26,
    height: 26,
  },
  orText: {
    fontSize: 14,
    color: "#999",
  },
  secondaryText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
});
