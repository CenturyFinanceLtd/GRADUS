import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { Link, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { API_BASE_URL } from "@/constants/config";
import TopBar from "@/components/top-bar";
import {
  getFirstName,
  getAuthSession,
  setFirstName as setStoredFirstName,
  hasSignedIn,
} from "@/utils/auth-storage";
import { screenContainer } from "@/styles/layout";

const placeholderThumb =
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80";
const liveClassImage = require("@/assets/images/frame.svg");
const liveClassImage2 = require("@/assets/images/prakash.svg");

type Course = {
  id: string;
  slug: string;
  name: string;
  programme: string;
  imageUrl: string;
  enrolledCount: number | null;
  modulesCount: number;
  priceINR: number;
};

export default function HomeScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const capName = (value?: string | null) => {
        const trimmed = (value || "").trim();
        if (!trimmed) return null;
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      };
      const loadName = async () => {
        // Try stored profile first
        const { token, user } = await getAuthSession();
        if (!cancelled && user?.firstName) {
          setFirstName(capName(user.firstName));
        } else if (!cancelled) {
          const name = await getFirstName();
          setFirstName(capName(name));
        }

        // If we have a token, refresh user details from API
        if (token) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/users/me`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (res.ok) {
              const data = await res.json();
              const refreshed = data?.user || data;
              if (!cancelled && refreshed?.firstName) {
                const capped = capName(refreshed.firstName);
                setFirstName(capped);
                await setStoredFirstName(capped);
              }
            }
          } catch {
            // ignore network issues
          }
        }
      };
      loadName();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const [refreshing, setRefreshing] = useState(false);

  const fetchCourses = async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/courses`);
      if (!res.ok) {
        throw new Error(`Failed to load courses (${res.status})`);
      }
      const data = await res.json();
      const parsed: Course[] = Array.isArray(data?.items)
        ? data.items.map((c: any, idx: number) => ({
            id: String(c?.slug || c?.id || idx),
            slug: String(c?.slug || ""),
            name: String(c?.name || "Untitled course"),
            programme: String(c?.programme || "").trim(),
            imageUrl: c?.imageUrl || placeholderThumb,
            enrolledCount:
              typeof c?.enrolledCount === "number" ? c.enrolledCount : null,
            modulesCount:
              typeof c?.modulesCount === "number"
                ? c.modulesCount
                : typeof c?.modules?.length === "number"
                ? c.modules.length
                : 0,
            priceINR: typeof c?.priceINR === "number" ? c.priceINR : 0,
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCourses();
  }, []);

  const { topCourses, sections } = useMemo(() => {
    const normalizeProg = (p: string) => p.toLowerCase().trim();
    const topCoursesFiltered = courses.filter((c) => c.priceINR > 30000);

    const buildSection = (title: string, keyword: string, key: string) => {
      const matches = courses.filter((c) =>
        normalizeProg(c.programme).includes(keyword.toLowerCase())
      );
      return { title, data: matches, key };
    };

    return {
      topCourses: topCoursesFiltered,
      sections: [
        buildSection("Gradus X", "x", "x"),
        buildSection("Gradus Finlit", "finlit", "finlit"),
        buildSection("Gradus Lead", "lead", "lead"),
      ],
    };
  }, [courses]);

  const liveClasses = [
    {
      id: "lc-1",
      title: "Live Class with Gradus Mentor",
      subtitle: "Flagship Program by GradusX",
      time: "12:40 PM",
      date: "03 Jan 2023",
      cta: "Join Master Class on 3 Dec at 19:00",
      image: liveClassImage,
    },
    {
      id: "lc-2",
      title: "Free Career Guidance Masterclass",
      subtitle: "Plan your tech journey with mentors",
      time: "07:30 PM",
      date: "04 Jan 2023",
      cta: "Join Master Class on 3 Dec at 19:00",
      image: liveClassImage2,
    },
  ];
  const primaryLiveClass = liveClasses[0];
  const secondaryLiveClasses = liveClasses.slice(1);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <TopBar
        greetingName={firstName}
        onProfilePress={async () => {
          const signed = await hasSignedIn();
          if (!signed) {
            router.push("/auth/signin");
          }
        }}
        onBellPress={() => {}}
        onSearchPress={() => {}}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Live Class with Gradus Mentor</Text>
        {primaryLiveClass && (
          <View style={{ gap: 16 }}>
            <View key={primaryLiveClass.id} style={styles.heroCard}>
              <Image
                source={primaryLiveClass.image}
                style={styles.heroImage}
                contentFit="cover"
              />
              <View style={styles.heroOverlay} />
              <View style={styles.heroContent} />
              <TouchableOpacity activeOpacity={0.9} style={styles.cta}>
                <Text style={styles.ctaText}>{primaryLiveClass.cta}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
          Join Our Master Classes
        </Text>
        {secondaryLiveClasses.length > 0 && (
          <View style={{ gap: 16 }}>
            {secondaryLiveClasses.map((item, idx) => (
              <View key={item.id} style={styles.heroCard}>
                <Image
                  source={item.image}
                  style={styles.heroImage}
                  contentFit="cover"
                />
                <View style={styles.heroOverlay} />
                <View style={styles.heroContent} />
                <TouchableOpacity activeOpacity={0.9} style={styles.cta}>
                  <Text style={styles.ctaText}>{item.cta}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Top Courses</Text>
          <Link
            href={{ pathname: "/learning-hub", params: { tab: "popular" } }}
            asChild
          >
            <TouchableOpacity>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#2968ff" />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <CourseGrid data={topCourses} />
            {sections.map((section) => (
              <Section
                key={section.title}
                title={section.title}
                data={section.data}
                tabKey={section.key}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  data,
  tabKey,
}: {
  title: string;
  data: Course[];
  tabKey: string;
}) {
  return (
    <>
      <View style={[styles.rowBetween, { marginTop: 18 }]}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Link
          href={{ pathname: "/learning-hub", params: { tab: tabKey } }}
          asChild
        >
          <TouchableOpacity>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </Link>
      </View>
      {data.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Courses coming soon</Text>
          <Text style={styles.emptySubtitle}>
            We’re adding programs here shortly.
          </Text>
        </View>
      ) : (
        <CourseGrid data={data} />
      )}
    </>
  );
}

function CourseGrid({ data }: { data: Course[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.courseRow}
    >
      {data.map((item) => (
        <CourseCard key={item.id} {...item} />
      ))}
    </ScrollView>
  );
}

function CourseCard({
  name,
  imageUrl,
  enrolledCount,
  modulesCount,
  slug,
}: {
  name: string;
  imageUrl: string;
  enrolledCount: number | null;
  modulesCount: number;
  slug: string;
}) {
  const learnersLabel =
    enrolledCount && enrolledCount > 0
      ? `${formatNumber(enrolledCount)} Learners`
      : "New course";
  const modulesLabel = `${modulesCount || 0} Modules`;
  const goToCourse = () => {
    router.push({
      pathname: "/learning-hub/course/[id]",
      params: { id: slug, name, imageUrl },
    });
  };
  return (
    <TouchableOpacity
      style={styles.courseCard}
      activeOpacity={0.9}
      onPress={goToCourse}
    >
      <Image
        source={imageUrl || placeholderThumb}
        style={styles.courseImage}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.cardBody}>
        <View style={{ flex: 1, justifyContent: "flex-start" }}>
          <Text numberOfLines={2} style={styles.courseTitle}>
            {name}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaGroup}>
            <Ionicons name="layers-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{modulesLabel}</Text>
          </View>
          <View style={styles.metaGroup}>
            <Ionicons name="people" size={16} color="#666" />
            <Text style={styles.metaText}>{learnersLabel}</Text>
          </View>
        </View>
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },
  heroCard: {
    backgroundColor: "#0f5ad8",
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 20,
    minHeight: 259,
    width: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 18,
  },
  cta: {
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 12,
    alignSelf: "center",
    width: "80%",
  },
  ctaText: {
    textAlign: "center",
    color: "#2968ff",
    fontWeight: "700",
    fontSize: 14,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewAll: {
    fontSize: 14,
    color: "#2968ff",
    fontWeight: "700",
  },
  courseRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    paddingRight: 12,
  },
  courseCard: {
    width: 230,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    marginBottom: 6,
    justifyContent: "space-between",
  },
  courseImage: {
    width: "100%",
    height: 140,
  },
  cardBody: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "column",
    flex: 1,
    justifyContent: "space-between",
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  loader: {
    paddingVertical: 20,
  },
  errorText: {
    color: "#c00",
    paddingVertical: 12,
    fontWeight: "700",
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
});
