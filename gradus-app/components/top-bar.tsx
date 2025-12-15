import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import {
  clearAuthSession,
  getAuthSession,
  getFirstName,
  hasSignedIn,
} from "@/utils/auth-storage"; // 30s
import { API_BASE_URL } from "@/constants/config";

type TopBarProps = {
  greetingName?: string | null;
  onProfilePress?: () => void;
  onBellPress?: () => void;
  onSearchPress?: () => void;
};

const UNREAD_POLL_INTERVAL = 30000; // Ensure this import exists

function TopBar({
  greetingName,
  onProfilePress,
  onBellPress,
  onSearchPress,
}: TopBarProps) {
  const router = useRouter();
  const [fallbackName, setFallbackName] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll every 30s as backup, but rely on focus for immediate updates
  useEffect(() => {
    const interval = setInterval(fetchUnread, UNREAD_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const fetchUnread = async () => {
    const userSession = await getAuthSession();
    if (userSession?.token) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/notifications/unread-count`,
          {
            headers: { Authorization: `Bearer ${userSession.token}` },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count || 0);
        }
      } catch (e) {
        // silent fail
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUnread();
    }, [])
  );

  useEffect(() => {
    let cancelled = false;
    const capName = (value?: string | null) => {
      const trimmed = (value || "").trim();
      if (!trimmed) return null;
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    };

    const load = async () => {
      const signedIn = await hasSignedIn();
      if (!cancelled) setIsSignedIn(signedIn);

      const { user } = await getAuthSession();

      if (!cancelled && user?.firstName) {
        setFallbackName(capName(user.firstName));
        return;
      }
      const stored = await getFirstName();
      if (!cancelled) {
        setFallbackName(capName(stored));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveName = greetingName ?? fallbackName;
  const greeting =
    isSignedIn && effectiveName ? `Hello! ${effectiveName}` : "Login";

  const toggleMenuOrNavigate = () => {
    if (isSignedIn) {
      router.push("/profile");
    } else if (onProfilePress) {
      onProfilePress();
    } else {
      router.push("/auth/signin");
    }
  };

  const handleBell = () => {
    if (onBellPress) onBellPress(); // backward compat
    router.push("/notifications");
    // Optimistically clear badge
    setUnreadCount(0);
  };

  const handleSearch = () => {
    if (onSearchPress) onSearchPress(); // backward compat
    router.push("/search");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={0.8} onPress={toggleMenuOrNavigate}>
        <Ionicons name="person-circle" size={36} color="#3c7bff" />
      </TouchableOpacity>
      <Pressable style={{ flex: 1 }} onPress={toggleMenuOrNavigate} hitSlop={8}>
        <Text style={styles.greeting}>{greeting}</Text>
      </Pressable>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleBell}
          hitSlop={8}
          activeOpacity={0.8}
          style={styles.iconWrapper}
        >
          <Ionicons name="notifications" size={22} color="#111" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSearch}
          hitSlop={8}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={22} color="#111" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    // marginBottom: 12,
    paddingHorizontal: 16,
    position: "relative",
  },
  greeting: {
    flex: 1,
    marginLeft: 8,
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginTop: 6,
  },
  actions: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  iconWrapper: {
    position: "relative",
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#ff3b30",
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
});

export default TopBar;
