import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL } from "@/constants/config";
import { screenContainer } from "@/styles/layout";

type AboutData = {
  title: string;
  description: string;
};

export default function AboutUsScreen() {
  const router = useRouter();
  const [data, setData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/why-gradus-video`);
        if (res.ok) {
          const json = await res.json();
          if (json.item) {
            setData({
              title: json.item.title,
              description: json.item.description,
            });
          }
        }
      } catch (e) {
        console.error("Failed to load about us data", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen
        options={{ headerShown: false, animation: "slide_from_right" }}
      />

      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#2968ff" />
          </View>
        ) : (
          <>
            <Text style={styles.title}>{data?.title || "What is Gradus?"}</Text>
            <Text style={styles.description}>
              {data?.description ||
                "Gradus is an online transformative upskilling platform for working tech professionals. Our industry-vetted approach towards teaching & training young professionals not only helps them upskill but also create impact in the real world."}
            </Text>

            <View style={styles.featuresRow}>
              <View style={styles.featureItem}>
                <View
                  style={[styles.iconCircle, { backgroundColor: "#e8f1ff" }]}
                >
                  <Ionicons name="school-outline" size={28} color="#2968ff" />
                </View>
                <Text style={styles.featureText}>
                  Job-driven online Tech-versity
                </Text>
              </View>

              <View style={styles.featureItem}>
                <View
                  style={[styles.iconCircle, { backgroundColor: "#e8f1ff" }]}
                >
                  <Ionicons name="people-outline" size={28} color="#2968ff" />
                </View>
                <Text style={styles.featureText}>
                  Mentorship by industry stalwarts
                </Text>
              </View>
            </View>

            <View style={styles.featureItemCenter}>
              <View style={[styles.iconCircle, { backgroundColor: "#e0f7fa" }]}>
                <Ionicons name="book-outline" size={28} color="#00acc1" />
              </View>
              <Text style={styles.featureText}>
                Forward-Looking and in-depth course curriculum
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...screenContainer,
    backgroundColor: "#fff",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  content: {
    padding: 24,
  },
  loader: {
    marginTop: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginBottom: 24,
    lineHeight: 36,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: "#555",
    marginBottom: 40,
  },
  featuresRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    gap: 16,
  },
  featureItem: {
    flex: 1,
    alignItems: "center",
    gap: 12,
  },
  featureItemCenter: {
    alignItems: "center",
    gap: 12,
    maxWidth: 200,
    alignSelf: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  featureText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    lineHeight: 20,
  },
});
