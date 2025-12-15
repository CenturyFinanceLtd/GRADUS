import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState , useCallback } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  RefreshControl,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import TopBar from "@/components/top-bar";
import { API_BASE_URL } from "@/constants/config";
import { screenContainer } from "@/styles/layout";

type Course = {
  id: string;
  name: string;
  programme: string;
  imageUrl: string;
  duration?: string;
  rating?: number;
  priceINR?: number;
  enrolledCount?: number | null;
  mentor?: string;
};

const tabs = [
  { key: "popular", label: "Popular Courses" },
  { key: "x", label: "Gradus X" },
  { key: "finlit", label: "Gradus Finlit" },
  { key: "lead", label: "Gradus Lead" },
];

const placeholderThumb =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80";

export default function LearningHubScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(tabs[0].key);

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental &&
      !(global as any).nativeFabricUIManager
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/courses`);
      if (!res.ok) throw new Error(`Failed to load courses (${res.status})`);
      const data = await res.json();
      const parsed: Course[] = Array.isArray(data?.items)
        ? data.items.map((c: any, idx: number) => ({
            id: String(c?.slug || c?.id || idx),
            name: String(c?.name || "Untitled course"),
            programme: String(c?.programme || "").trim(),
            imageUrl: c?.imageUrl || placeholderThumb,
            duration: c?.stats?.duration || c?.duration || "12 Weeks",
            rating: typeof c?.rating === "number" ? c.rating : 4.5,
            priceINR: typeof c?.priceINR === "number" ? c.priceINR : 0,
            enrolledCount:
              typeof c?.enrolledCount === "number" ? c.enrolledCount : null,
            mentor: c?.mentor || "Akhil Panday",
          }))
        : [];
      setCourses(parsed);
    } catch (err: any) {
      setError(err?.message || "Unable to load courses");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCourses();
  }, []);

  useEffect(() => {
    if (params?.tab && tabs.some((t) => t.key === params.tab)) {
      setActiveTab(params.tab as string);
    }
  }, [params?.tab]);

  const filtered = useMemo(() => {
    if (activeTab === "popular")
      return courses.filter((c) => (c.priceINR || 0) > 30000);
    if (activeTab === "x")
      return courses.filter((c) => c.programme.toLowerCase().includes("x"));
    if (activeTab === "finlit")
      return courses.filter((c) => c.programme.toLowerCase().includes("fin"));
    if (activeTab === "lead")
      return courses.filter((c) => c.programme.toLowerCase().includes("lead"));
    return courses;
  }, [activeTab, courses]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarWrapper}>
        <TopBar onProfilePress={() => router.push("/auth/signin")} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Learning Hub</Text>

        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut
                );
                setActiveTab(tab.key);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.tabUnderline} />

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#2968ff" />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Courses coming soon</Text>
            <Text style={styles.emptySubtitle}>
              We’re adding programs here shortly.
            </Text>
          </View>
        ) : (
          filtered.map((course) => (
            <CourseTile key={course.id} course={course} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CourseTile({ course }: { course: Course }) {
  const goToCourse = () => {
    router.push({
      pathname: "/learning-hub/course/[id]",
      params: { id: course.id, name: course.name, imageUrl: course.imageUrl },
    });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={goToCourse}
    >
      <View style={styles.cardImageWrap}>
        <Image
          source={course.imageUrl}
          style={styles.cardImage}
          contentFit="cover"
        />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardBody}>
          <View style={styles.badgeRow}>
            <Text style={styles.popularBadge}>Popular</Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#f6b100" />
              <Text style={styles.ratingText}>
                {course.rating?.toFixed(1) || "4.5"} Ratings
              </Text>
            </View>
          </View>

          <Text style={styles.courseTitle} numberOfLines={2}>
            {course.name}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="people" size={18} color="#7a7a7a" />
            <Text style={styles.metaText}>
              {course.enrolledCount && course.enrolledCount > 0
                ? `${formatNumber(course.enrolledCount)} Learners`
                : "New learners"}
            </Text>
            <Ionicons name="time-outline" size={18} color="#7a7a7a" />
            <Text style={styles.metaText}>{course.duration || "12 Weeks"}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.enrollWide}
          activeOpacity={0.9}
          onPress={goToCourse}
        >
          <Text style={styles.enrollWideText}>Start Learning</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const formatNumber = (num: number) => {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}k`;
  }
  return `${num}`;
};

const styles = StyleSheet.create({
  screen: {
    ...screenContainer,
  },
  topBarWrapper: {
    backgroundColor: "#f4f4f4",
    zIndex: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tabRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  tabText: {
    fontSize: 13,
    color: "#777",
  },
  tabActive: {
    color: "#2968ff",
    fontWeight: "700",
  },
  tabUnderline: {
    height: 1,
    backgroundColor: "#e5e5e5",
    marginBottom: 8,
  },
  loader: {
    paddingVertical: 20,
  },
  errorText: {
    color: "#c00",
    paddingVertical: 12,
    fontWeight: "700",
    paddingHorizontal: 4,
  },
  emptyCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#666",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2d86ff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    height: 178,
  },
  cardImageWrap: {
    width: 130,
    backgroundColor: "#0c3a73",
    justifyContent: "flex-end",
    height: "100%",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardContent: {
    flex: 1,
    padding: 12,
    gap: 8,
    height: "100%",
    justifyContent: "space-between",
  },
  cardBody: {
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  popularBadge: {
    backgroundColor: "#c8f1cc",
    color: "#12a84d",
    fontWeight: "800",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    fontSize: 12,
  },
  ratingBadge: {
    backgroundColor: "#f0f0f0",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    color: "#444",
    fontWeight: "700",
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#222",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 11,
    color: "#777",
    fontWeight: "700",
  },
  enrollWide: {
    marginTop: 6,
    backgroundColor: "#2968ff",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  enrollWideText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
});
