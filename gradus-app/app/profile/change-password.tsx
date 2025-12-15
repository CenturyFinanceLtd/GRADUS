import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL } from "@/constants/config";
import { getAuthSession } from "@/utils/auth-storage";
import { screenContainer } from "@/styles/layout";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    getAuthSession().then(({ user }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showBanner = (type: "success" | "error", message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3000);
  };

  const updatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showBanner("error", "Please fill all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showBanner("error", "New password and confirmation must match.");
      return;
    }
    setLoading(true);
    try {
      const { token } = await getAuthSession();
      if (!token) {
        showBanner("error", "Please sign in again.");
        router.replace("/auth/signin");
        return;
      }
      // backend change password endpoint
      const res = await fetch(`${API_BASE_URL}/api/users/me/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword: newPassword,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = body?.message || "Failed to update password.";
        showBanner("error", message);
        return;
      }

      showBanner("success", "Password updated successfully.");
      router.back();
    } catch (err) {
      showBanner("error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderField = ({
    label,
    value,
    onChange,
    secure,
    toggleSecure,
  }: {
    label: string;
    value: string;
    onChange: (t: string) => void;
    secure: boolean;
    toggleSecure: () => void;
  }) => (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputBox}>
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={secure}
          placeholder={label}
          placeholderTextColor="#9ca3af"
          style={styles.input}
        />
        <TouchableOpacity onPress={toggleSecure} hitSlop={10}>
          <Ionicons
            name={secure ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <Text style={styles.title}>Change Password</Text>
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
        {renderField({
          label: "Current Password",
          value: currentPassword,
          onChange: setCurrentPassword,
          secure: !showCurrent,
          toggleSecure: () => setShowCurrent((s) => !s),
        })}
        <TouchableOpacity
          onPress={() => {
            const params = userEmail ? { email: userEmail } : {};
            router.push({ pathname: "/auth/forgot-password", params });
          }}
          style={{ alignSelf: "flex-end", marginTop: -8 }}
        >
          <Text style={{ color: "#2968ff", fontSize: 13, fontWeight: "600" }}>
            Forgot Password?
          </Text>
        </TouchableOpacity>
        {renderField({
          label: "New Password",
          value: newPassword,
          onChange: setNewPassword,
          secure: !showNew,
          toggleSecure: () => setShowNew((s) => !s),
        })}
        {renderField({
          label: "Confirm Password",
          value: confirmPassword,
          onChange: setConfirmPassword,
          secure: !showConfirm,
          toggleSecure: () => setShowConfirm((s) => !s),
        })}

        <TouchableOpacity
          onPress={updatePassword}
          activeOpacity={0.85}
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading ? "Updating..." : "Update Password"}
          </Text>
        </TouchableOpacity>
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
    gap: 12,
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
    marginTop: 12,
    backgroundColor: "#e53935",
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
