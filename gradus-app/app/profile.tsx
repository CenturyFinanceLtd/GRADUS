import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState, useCallback } from "react";
import { Image } from "expo-image";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  RefreshControl,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getAuthSession,
  clearAuthSession,
  hasSignedIn,
  setAuthSession,
} from "@/utils/auth-storage";
import { screenContainer } from "@/styles/layout";
import { API_BASE_URL } from "@/constants/config";

type UserInfo = {
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  imageUrl?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      await loadUser();
    })();
  }, []);

  const loadUser = async () => {
    setLoading(true);
    try {
      const { token, user: stored } = await getAuthSession();
      if (!token) {
        setUser(stored || null);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setUser(stored || null);
        return;
      }
      const body = await res.json();
      const fresh = body?.user || body?.data || body;
      setUser(fresh);
      await setAuthSession(token, fresh);
    } catch {
      const { user: stored } = await getAuthSession();
      setUser(stored || null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUser();
  }, []);

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Guest User";
  const email = user?.email || "Not provided";
  const avatarLetter = fullName.charAt(0).toUpperCase();

  const goAccountDetails = async () => {
    const signed = await hasSignedIn();
    if (!signed) {
      router.push({
        pathname: "/auth/signin",
        params: { redirect: "/profile/account-details" },
      });
      return;
    }
    router.push("/profile/account-details");
  };

  const handleLogout = async () => {
    await clearAuthSession();
    router.replace("/(tabs)");
  };

  const handleCallbackRequest = async () => {
    if (!user) return;
    if (!user.mobile) {
      Alert.alert(
        "Missing Information",
        "Please update your mobile number in Account Details to request a callback."
      );
      return;
    }

    try {
      const { token } = await getAuthSession();
      const res = await fetch(`${API_BASE_URL}/api/callback-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: fullName,
          email: user.email,
          phone: user.mobile,
        }),
      });

      if (res.ok) {
        Alert.alert(
          "Success",
          "Callback request sent! Our team will contact you shortly."
        );
      } else {
        const data = await res.json();
        Alert.alert(
          "Error",
          data.message || "Failed to send callback request."
        );
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again later.");
    }
  };

  const navItems = [
    {
      icon: "person-circle-outline",
      label: "View Account Details",
      action: goAccountDetails,
    },
    {
      icon: "school-outline",
      label: "My Courses",
      action: () => router.push("/profile/my-courses"),
    },

    {
      icon: "headset-outline",
      label: "Help & Support",
      action: () => router.push("/support"),
    },
    {
      icon: "information-circle-outline",
      label: "About Us",
      action: () => router.push("/profile/about-us"),
    },
    { icon: "star-outline", label: "Rate Us", action: () => {} },
    { icon: "share-social-outline", label: "Share App", action: () => {} },
  ];

  const socials = [
    {
      icon: "globe-outline" as const,
      url: "https://gradusindia.in",
    },
    {
      icon: "logo-whatsapp" as const,
      url: "https://wa.me/918448429040",
    },
    {
      icon: "paper-plane-outline" as const, // Telegram fallback
      url: "https://t.me/freeskillsandjobhub",
    },
    {
      icon: "logo-facebook" as const,
      url: "https://www.facebook.com/people/Gradus/61583093960559/?sk=about",
    },
    {
      icon: "logo-instagram" as const,
      url: "https://www.instagram.com/gradusindia.in/",
    },
    {
      icon: "logo-linkedin" as const,
      url: "https://www.linkedin.com/company/gradusindia/",
    },
    {
      icon: "logo-youtube" as const,
      url: "https://www.youtube.com/@gradusindia",
    },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen
        options={{ headerShown: false, animation: "slide_from_left" }}
      />
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.backText}>Profile</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerCard}>
          <View style={styles.avatarWrap}>
            {user?.imageUrl ? (
              <Image
                source={user.imageUrl}
                style={styles.avatarImg}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{avatarLetter}</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.email}>{email}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Get Free consultation</Text>
          <Text style={styles.cardSubtitle}>From Our Experts</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={handleCallbackRequest}
          >
            <Ionicons name="call-outline" size={16} color="#2968ff" />
            <Text style={styles.primaryText}>Get a Callback</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuCard}>
          {navItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuRow}
              activeOpacity={0.8}
              onPress={item.action}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={18} color="#2968ff" />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="log-out-outline" size={18} color="#e53935" />
            </View>
            <Text style={[styles.menuLabel, { color: "#e53935" }]}>
              Sign out
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#e53935" />
          </TouchableOpacity>
        </View>

        <View style={styles.socialRow}>
          {socials.map((s) => (
            <TouchableOpacity
              key={s.icon}
              style={styles.socialIcon}
              onPress={() => Linking.openURL(s.url)}
            >
              <Ionicons name={s.icon} size={22} color="#5b6b7a" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...screenContainer,
    backgroundColor: "#f4f7fb",
    paddingTop: 0,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#f4f7fb",
    zIndex: 10,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
    paddingTop: 6,
  },
  backBtn: {
    padding: 4,
  },
  backText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
  },
  headerCard: {
    backgroundColor: "#0f5ad8",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e5edff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f5ad8",
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  email: {
    color: "#e6edff",
    fontSize: 13,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f5ad8",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#4a5568",
    marginBottom: 8,
  },
  primaryBtn: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#e8f1ff",
  },
  primaryText: {
    color: "#2968ff",
    fontWeight: "700",
    fontSize: 14,
  },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#eaf0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },
  socialRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 12,
    width: "100%",
  },
  socialIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eef1f6",
    alignItems: "center",
    justifyContent: "center",
    margin: 8,
  },
});
