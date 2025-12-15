import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "@/components/top-bar";
import { screenContainer } from "@/styles/layout";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function PlacementScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarWrapper}>
        <TopBar />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Placement</Text>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="rocket-outline" size={64} color="#2968ff" />
          </View>
          <Text style={styles.title}>Coming Soon</Text>
          <Text style={styles.subtitle}>Placement Assistance</Text>
          <Text style={styles.description}>
            We're building something amazing to help you land your dream job.
            Stay tuned for exclusive placement support, interview prep, and
            career guidance!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...screenContainer,
    // Ensure background matches live classes consistency
  },
  topBarWrapper: {
    // backgroundColor: "#f4f4f4", // matched live-classes default
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  pageTitle: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "800",
    color: "#222",
    marginBottom: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2968ff",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
});
