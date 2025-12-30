import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

import { colors } from "@/constants/Theme";
import { useAuth } from "@/context/AuthContext";
import GlassBackground from "@/components/GlassBackground";

export default function IndexScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [navigated, setNavigated] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const flag = await AsyncStorage.getItem("gradus_onboarded");
      if (!active) return;
      setHasOnboarded(flag === "true");
      setChecking(false);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (checking || authLoading || navigated || hasOnboarded === null) return;
    if (!hasOnboarded) {
      router.replace("/onboarding");
    } else if (session) {
      router.replace("/(tabs)");
    } else {
      router.replace("/auth/phone");
    }
    setNavigated(true);
  }, [checking, authLoading, hasOnboarded, session, navigated, router]);

  return (
    <GlassBackground>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});
