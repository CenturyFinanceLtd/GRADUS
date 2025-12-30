import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { colors, fonts, radius, shadow, spacing } from "@/constants/Theme";
import GlassBackground from "@/components/GlassBackground";
import { useAuth } from "@/context/AuthContext";
import { fetchUserProfile } from "@/services/users";
import { requestCallback } from "@/services/content";

export default function CallbackScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.access_token || "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      try {
        const profile = await fetchUserProfile(token);
        const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
        setName(fullName);
        setEmail(profile.email || "");
        setPhone(profile.mobile || "");
      } catch (error) {
        console.warn("[callback] Unable to prefill profile", error);
      }
    };
    loadProfile();
  }, [token]);

  const canSubmit = name.trim().length >= 2 && (email.trim() || phone.trim());

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert("Add details", "Share your name and a phone or email.");
      return;
    }
    try {
      setLoading(true);
      await requestCallback({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      Alert.alert("Request sent", "Our team will reach out soon.");
      router.back();
    } catch (error: any) {
      Alert.alert("Unable to submit", error?.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Get a Callback</Text>
          <Text style={styles.subheading}>
            Leave your details and our experts will call you.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            keyboardType="phone-pad"
            placeholderTextColor={colors.muted}
          />
          <Pressable
            style={[styles.primaryButton, (!canSubmit || loading) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
          >
            <Text style={styles.primaryText}>
              {loading ? "Submitting..." : "Request callback"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 120,
  },
  header: {
    gap: spacing.xs,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  subheading: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  card: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.sm,
    ...shadow.card,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.glassHighlight,
    fontFamily: fonts.body,
  },
  primaryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    fontFamily: fonts.bodySemi,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
