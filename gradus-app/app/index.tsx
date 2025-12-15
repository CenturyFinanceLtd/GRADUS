import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  hasSeenOnboarding,
  markOnboardingSeen,
} from "@/utils/onboarding-storage";
import { hasSignedIn } from "@/utils/auth-storage";

export default function Index() {
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const signedIn = await hasSignedIn();
        const seen = await hasSeenOnboarding();
        if (!seen) {
          await markOnboardingSeen();
        }
        if (isMounted) {
          // Use replace to avoid keeping this screen in the stack
          router.replace("/(tabs)");
        }
      } catch (e) {
        if (isMounted) router.replace("/(tabs)");
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#2968ff" />
    </View>
  );
}
