import { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radius, shadow, spacing } from "@/constants/Theme";
import { useAuth } from "@/context/AuthContext";
import { fetchUserProfile, UserProfile } from "@/services/users";
import GlassBackground from "@/components/GlassBackground";
import GlassHeader from "@/components/GlassHeader";

type IconName = ComponentProps<typeof Ionicons>["name"];

type MenuItem = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  danger?: boolean;
  primary?: boolean;
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session, signOut } = useAuth();
  const token = session?.access_token || "";
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await fetchUserProfile(token);
        setProfile(data);
      } catch (error) {
        console.warn("[profile] Unable to load profile", error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [token]);

  const displayName = useMemo(() => {
    const profileName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim();
    if (profileName) return profileName;
    if (user?.email) return user.email.split("@")[0].replace(/[._-]+/g, " ").trim();
    if (user?.phone) return "Gradus Learner";
    return "Guest";
  }, [profile?.firstName, profile?.lastName, user?.email, user?.phone]);

  const displayEmail = useMemo(() => {
    return profile?.email || user?.email || profile?.mobile || user?.phone || "guest@gradus.in";
  }, [profile?.email, profile?.mobile, user?.email, user?.phone]);

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "G";

  const avatarUrl = (profile?.personalDetails as Record<string, unknown> | undefined)
    ?.avatarUrl as string | undefined;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      Alert.alert("Sign out failed", error?.message || "Try again.");
    }
  };

  const openUrl = async (url?: string) => {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Unable to open link");
      return;
    }
    Linking.openURL(url);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: "Download the Gradus app: https://gradusindia.in",
      });
    } catch (error: any) {
      Alert.alert("Share failed", error?.message || "Try again.");
    }
  };

  const menuItems: MenuItem[] = [
    {
      key: "account",
      label: "View Account Details",
      icon: "person-outline",
      onPress: () => router.push("/profile/edit"),
    },
    {
      key: "courses",
      label: "My Courses",
      icon: "school-outline",
      onPress: () => router.push("/my-courses"),
    },
    {
      key: "support",
      label: "Help & Support",
      icon: "chatbubble-ellipses-outline",
      onPress: () => router.push("/support"),
    },
    {
      key: "about",
      label: "About Us",
      icon: "information-circle-outline",
      onPress: () => openUrl("https://gradusindia.in"),
    },
    {
      key: "rate",
      label: "Rate Us",
      icon: "star-outline",
      onPress: () => openUrl("https://gradusindia.in"),
    },
    {
      key: "share",
      label: "Share App",
      icon: "share-outline",
      onPress: handleShare,
    },
  ];

  const actionItem: MenuItem = user
    ? {
      key: "signout",
      label: "Sign out",
      icon: "log-out-outline",
      onPress: handleSignOut,
      danger: true,
    }
    : {
      key: "signin",
      label: "Sign in",
      icon: "log-in-outline",
      onPress: () =>
        router.push({
          pathname: "/auth/phone",
          params: { returnTo: "/profile" },
        }),
      primary: true,
    };

  const socialIcons: IconName[] = [
    "globe-outline",
    "logo-whatsapp",
    "paper-plane-outline",
    "logo-facebook",
    "logo-instagram",
    "logo-linkedin",
    "logo-youtube",
  ];

  const socialLinks: Partial<Record<IconName, string>> = {
    "globe-outline": "https://gradusindia.in",
    "logo-whatsapp": "https://wa.me/",
    "paper-plane-outline": "https://t.me/",
    "logo-facebook": "https://www.facebook.com/",
    "logo-instagram": "https://www.instagram.com/",
    "logo-linkedin": "https://www.linkedin.com/",
    "logo-youtube": "https://www.youtube.com/",
  };

  return (
    <GlassBackground>
      <GlassHeader title="Profile" />
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 70 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {loading && token ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
              <View>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileEmail}>{displayEmail}</Text>
              </View>
            </View>
          )}

          <View style={styles.consultCard}>
            <Text style={styles.consultTitle}>Get Free consultation</Text>
            <Text style={styles.consultSubtitle}>From Our Experts</Text>
            <Pressable
              style={styles.consultButton}
              onPress={() => router.push("/callback")}
            >
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <Text style={styles.consultButtonText}>Get a Callback</Text>
            </Pressable>
          </View>

          <View style={styles.menuCard}>
            {[...menuItems, actionItem].map((item, index, list) => (
              <Pressable
                key={item.key}
                style={[
                  styles.menuItem,
                  index < list.length - 1 && styles.menuItemDivider,
                ]}
                onPress={item.onPress}
              >
                <View
                  style={[
                    styles.menuIconWrap,
                    item.danger && styles.menuIconDanger,
                    item.primary && styles.menuIconPrimary,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={item.danger ? "#e44c4c" : colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.menuLabel,
                    item.danger && styles.menuLabelDanger,
                    item.primary && styles.menuLabelPrimary,
                  ]}
                >
                  {item.label}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>

          <View style={styles.socialWrap}>
            <View style={styles.socialRow}>
              {socialIcons.map((name) => (
                <Pressable
                  key={name}
                  style={styles.socialButton}
                  onPress={() => openUrl(socialLinks[name])}
                >
                  <Ionicons name={name} size={18} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    backgroundColor: "transparent",
    padding: spacing.lg,
    paddingBottom: 130,
    gap: spacing.lg,
  },
  profileCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadow.card,
  },
  loadingCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontWeight: "700",
    color: colors.primary,
    fontSize: 18,
    fontFamily: fonts.headingSemi,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    fontFamily: fonts.headingSemi,
  },
  profileEmail: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    fontFamily: fonts.body,
  },
  consultCard: {
    backgroundColor: colors.glassHighlight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  consultTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    fontFamily: fonts.headingSemi,
  },
  consultSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  consultButton: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  consultButtonText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
    fontFamily: fonts.bodySemi,
  },
  menuCard: {
    backgroundColor: colors.glassHighlight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: "hidden",
    ...shadow.card,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.sm,
  },
  menuItemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconDanger: {
    backgroundColor: "rgba(228, 76, 76, 0.12)",
  },
  menuIconPrimary: {
    backgroundColor: colors.primarySoft,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.bodySemi,
  },
  menuLabelDanger: {
    color: "#e44c4c",
  },
  menuLabelPrimary: {
    color: colors.primary,
  },
  socialWrap: {
    alignItems: "center",
  },
  socialRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.glassHighlight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
});
