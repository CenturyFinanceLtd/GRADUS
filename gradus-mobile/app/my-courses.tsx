import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { colors, fonts, radius, shadow, spacing } from "@/constants/Theme";
import GlassBackground from "@/components/GlassBackground";
import GlassHeader from "@/components/GlassHeader";
import { useAuth } from "@/context/AuthContext";
import { fetchUserEnrollments, EnrollmentItem } from "@/services/users";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const getStatusLabel = (status?: string) => {
  if (!status) return "Active";
  return status.replace(/_/g, " ");
};

export default function MyCoursesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const token = session?.access_token || "";
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false);
        setEnrollments([]);
        return;
      }
      try {
        setLoading(true);
        const data = await fetchUserEnrollments(token);
        setEnrollments(data || []);
      } catch (error: any) {
        Alert.alert("Unable to load courses", error?.message || "Try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  return (
    <GlassBackground>
      <GlassHeader title="My Courses" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 70 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.subheading}>
            Access your enrolled programs and continue learning.
          </Text>
        </View>

        {!token ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sign in to view enrollments</Text>
            <Text style={styles.emptyText}>
              Log in to see your paid and free cohorts.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push({
                  pathname: "/auth/phone",
                  params: { returnTo: "/my-courses" },
                })
              }
            >
              <Text style={styles.primaryText}>Sign in</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : enrollments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No enrollments yet</Text>
            <Text style={styles.emptyText}>
              Explore courses and enroll to unlock modules and live sessions.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/(tabs)/courses")}
            >
              <Text style={styles.primaryText}>Browse courses</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {enrollments.map((enrollment) => {
              const course = enrollment.course || {};
              const slug =
                course.slug || enrollment.course_slug || course.id || "";
              return (
                <View key={enrollment.id} style={styles.card}>
                  <Image
                    source={
                      course.image?.url || course.imageUrl
                        ? { uri: course.image?.url || course.imageUrl }
                        : require("@/assets/images/icon.png")
                    }
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <View style={styles.cardBody}>
                    <Text style={styles.title}>{course.name || "Course"}</Text>
                    <Text style={styles.meta}>
                      Status: {getStatusLabel(enrollment.status)}
                    </Text>
                    <Text style={styles.meta}>
                      Payment:{" "}
                      {(enrollment.paymentStatus || enrollment.payment_status || "PAID")
                        .toString()
                        .toLowerCase()}
                    </Text>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() =>
                        router.push({
                          pathname: "/course/[slug]",
                          params: { slug: String(slug) },
                        })
                      }
                      disabled={!slug}
                    >
                      <Text style={styles.secondaryText}>Open course</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 120,
  },
  header: {
    gap: spacing.xs,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  subheading: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
  emptyCard: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.sm,
    alignItems: "center",
    ...shadow.card,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  image: {
    width: "100%",
    height: 160,
    backgroundColor: colors.border,
  },
  cardBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  meta: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  primaryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    fontFamily: fonts.bodySemi,
  },
  secondaryButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassHighlight,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 13,
    fontFamily: fonts.bodySemi,
  },
});
