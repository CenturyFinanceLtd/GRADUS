import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";

import { API_BASE_URL } from "@/constants/config";
import { getAuthSession } from "@/utils/auth-storage";
import { screenContainer } from "@/styles/layout";

type Enrollment = {
  id: string;
  course: {
    id: string;
    slug: string;
    name: string;
    subtitle?: string;
    imageUrl?: string;
  };
  enrolledAt: string;
  paymentStatus?: string;
};

export default function MyCoursesScreen() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnrollments();
  }, []);

  const loadEnrollments = async () => {
    try {
      const { token } = await getAuthSession();
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/users/me/enrollments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (res.ok && body.items) {
        const validItems = (body.items as Enrollment[]).filter(
          (item) => item.course && item.paymentStatus === "PAID"
        );
        setEnrollments(validItems);
      }
    } catch (err) {
      console.error("Failed to load enrollments", err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item, index }: { item: Enrollment; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <TouchableOpacity
        style={styles.courseCard}
        activeOpacity={0.9}
        onPress={() => {
          router.push({
            pathname: "/classroom/[courseSlug]",
            params: { courseSlug: item.course.slug || item.course.id },
          });
        }}
      >
        <Image
          source={item.course.imageUrl}
          style={styles.courseImg}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.courseContent}>
          <Text style={styles.courseName} numberOfLines={2}>
            {item.course.name}
          </Text>
          {item.course.subtitle && (
            <Text style={styles.courseSubtitle} numberOfLines={1}>
              {item.course.subtitle}
            </Text>
          )}
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Enrolled</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
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
        <Text style={styles.title}>My Courses</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2968ff" />
        </View>
      ) : (
        <FlatList
          data={enrollments}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="school-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                You haven't enrolled in any courses yet.
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.push("/(tabs)/learning-hub")}
              >
                <Text style={styles.browseBtnText}>Browse Courses</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...screenContainer,
    backgroundColor: "#f4f7fb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  courseCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    height: 100,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  courseImg: {
    width: 100,
    height: "100%",
    backgroundColor: "#e5edff",
  },
  courseContent: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  courseName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
    lineHeight: 20,
  },
  courseSubtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: "#d1e7dd",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f5132",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  browseBtn: {
    backgroundColor: "#2968ff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  browseBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
