import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radius, shadow, spacing } from "@/constants/Theme";
import GlassBackground from "@/components/GlassBackground";
import GlassHeader from "@/components/GlassHeader";
import { useAuth } from "@/context/AuthContext";
import { fetchUserProfile, updateUserProfile, UserProfile } from "@/services/users";
import { uploadImage } from "@/services/uploads";

type PersonalDetails = Record<string, unknown>;

export default function ProfileEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, user } = useAuth();
  const token = session?.access_token || "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [details, setDetails] = useState<PersonalDetails>({});
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [occupation, setOccupation] = useState("");
  const [college, setCollege] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await fetchUserProfile(token);
        const personal = (data.personalDetails || {}) as PersonalDetails;
        setProfile(data);
        setDetails(personal);
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setMobile(data.mobile || "");
        setCity((personal.city as string) || "");
        setOccupation((personal.occupation as string) || "");
        setCollege((personal.college as string) || "");
        setAvatarUrl(personal.avatarUrl as string | undefined);
      } catch (error: any) {
        Alert.alert("Unable to load profile", error?.message || "Try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const displayEmail = useMemo(
    () => profile?.email || user?.email || "Not set",
    [profile?.email, user?.email]
  );

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission required", "Allow photo access to upload an avatar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const extension = uri.split(".").pop() || "jpg";
    const file = {
      uri,
      name: `avatar.${extension}`,
      type: asset.mimeType || `image/${extension}`,
    };

    try {
      setUploading(true);
      const upload = await uploadImage(file, "gradus/avatars");
      setAvatarUrl(upload.url);
    } catch (error: any) {
      Alert.alert("Upload failed", error?.message || "Try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!token) {
      router.push({ pathname: "/auth/phone", params: { returnTo: "/profile/edit" } });
      return;
    }
    try {
      setSaving(true);
      const nextDetails = {
        ...details,
        city: city.trim(),
        occupation: occupation.trim(),
        college: college.trim(),
        avatarUrl,
      };
      const updated = await updateUserProfile(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobile: mobile.trim(),
        personalDetails: nextDetails,
      });
      setProfile(updated);
      setDetails(nextDetails);
      Alert.alert("Profile updated", "Your details are saved.");
      router.back();
    } catch (error: any) {
      Alert.alert("Update failed", error?.message || "Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <GlassBackground>
        <View style={styles.loading}>
          <Text style={styles.error}>Sign in to edit your profile.</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: "/auth/phone",
                params: { returnTo: "/profile/edit" },
              })
            }
          >
            <Text style={styles.primaryText}>Sign in</Text>
          </Pressable>
        </View>
      </GlassBackground>
    );
  }

  if (loading) {
    return (
      <GlassBackground>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <GlassHeader title="Account Details" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 70 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.subheading}>Keep your profile up to date.</Text>
        </View>

        <View style={styles.avatarCard}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(firstName || "G").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Pressable style={styles.avatarButton} onPress={handlePickImage}>
            <Text style={styles.avatarButtonText}>
              {uploading ? "Uploading..." : "Change photo"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Last name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Mobile</Text>
          <TextInput
            style={styles.input}
            value={mobile}
            onChangeText={setMobile}
            placeholder="Phone number"
            keyboardType="phone-pad"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Email</Text>
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyText}>{displayEmail}</Text>
          </View>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="City"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Occupation</Text>
          <TextInput
            style={styles.input}
            value={occupation}
            onChangeText={setOccupation}
            placeholder="Student / Professional"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>College / Organization</Text>
          <TextInput
            style={styles.input}
            value={college}
            onChangeText={setCollege}
            placeholder="College or company"
            placeholderTextColor={colors.muted}
          />
          <Pressable
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.primaryText}>
              {saving ? "Saving..." : "Save changes"}
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
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    fontSize: 15,
    color: colors.muted,
    fontFamily: fonts.body,
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
  avatarCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.primary,
    fontFamily: fonts.headingSemi,
  },
  avatarButton: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  avatarButtonText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
    fontFamily: fonts.bodySemi,
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
  readonlyField: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  readonlyText: {
    fontSize: 14,
    color: colors.muted,
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
