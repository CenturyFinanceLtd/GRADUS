import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radius, shadow, spacing } from "@/constants/Theme";
import {
  CourseItem,
  CourseModule,
  LiveSession,
  enrollInCourse,
  fetchActiveLiveSession,
  fetchCourse,
  fetchCourseModules,
} from "@/services/courses";
import { createCourseOrder } from "@/services/payments";
import { useAuth } from "@/context/AuthContext";
import GlassBackground from "@/components/GlassBackground";
import GlassHeader from "@/components/GlassHeader";

const getJoinWindow = (session?: LiveSession | null) => {
  if (!session) return { canJoin: false, label: "No live session yet." };
  const rawStart =
    session.start_time || session.scheduled_for || session.started_at;
  if (!rawStart) return { canJoin: true, label: "Join live session" };
  const start = new Date(rawStart).getTime();
  if (Number.isNaN(start)) return { canJoin: true, label: "Join live session" };
  const now = Date.now();
  const earliest = start - 10 * 60 * 1000;
  const latest = start + 30 * 60 * 1000;
  if (now < earliest) return { canJoin: false, label: "Join opens 10 min before" };
  if (now > latest) return { canJoin: false, label: "Join window closed" };
  return { canJoin: true, label: "Join live session" };
};

export default function CourseDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();
  const params = useLocalSearchParams();
  const rawSlug = typeof params.slug === "string" ? params.slug : "";
  const slug = rawSlug ? decodeURIComponent(rawSlug) : "";
  const token = session?.access_token || "";

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseItem | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }
      try {
        const data = await fetchCourse(slug, token || undefined);
        setCourse(data);
      } catch (error) {
        console.warn("[course] Failed to load", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, token]);

  useEffect(() => {
    const loadModules = async () => {
      if (!slug || !token || !course?.isEnrolled) {
        setModules([]);
        return;
      }
      try {
        const data = await fetchCourseModules(slug, token);
        setModules(data);
      } catch (error) {
        console.warn("[course] Failed to load modules", error);
      }
    };
    loadModules();
  }, [slug, token, course?.isEnrolled]);

  useEffect(() => {
    const loadSession = async () => {
      if (!slug) return;
      try {
        const data = await fetchActiveLiveSession(slug);
        setActiveSession(data);
      } catch (error) {
        console.warn("[course] Failed to load live session", error);
      }
    };
    loadSession();
  }, [slug]);

  const isPaid = Boolean(course?.priceINR);
  const isEnrolled = Boolean(course?.isEnrolled);
  const joinInfo = useMemo(() => getJoinWindow(activeSession), [activeSession]);

  const handleEnroll = async () => {
    if (!course) return;
    if (!user || !token) {
      router.push({
        pathname: "/auth/phone",
        params: { returnTo: `/course/${encodeURIComponent(slug)}` },
      });
      return;
    }

    try {
      setActionLoading(true);
      if (!course.priceINR) {
        await enrollInCourse(course.slug, token);
        const updated = await fetchCourse(slug, token);
        setCourse(updated);
        Alert.alert("Enrollment confirmed", "You now have access to this course.");
        return;
      }

      const order = await createCourseOrder(token, course.slug);
      router.push({
        pathname: "/payment/razorpay",
        params: {
          orderId: order.orderId,
          keyId: order.keyId,
          amount: String(order.amount),
          currency: order.currency,
          courseSlug: course.slug,
          courseName: course.name,
        },
      });
    } catch (error: any) {
      Alert.alert("Enrollment failed", error?.message || "Try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinSession = async () => {
    if (!activeSession) return;
    const link = activeSession.meeting_link || activeSession.meetingLink;
    if (!link) {
      Alert.alert("Session link unavailable", "We will update it shortly.");
      return;
    }
    const supported = await Linking.canOpenURL(link);
    if (!supported) {
      Alert.alert("Unable to open session link.");
      return;
    }
    Linking.openURL(link);
  };

  if (loading) {
    return (
      <GlassBackground>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </GlassBackground>
    );
  }

  if (!course) {
    return (
      <GlassBackground>
        <View style={styles.loading}>
          <Text style={styles.empty}>Course not found.</Text>
        </View>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <GlassHeader title="Course Details" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 70 },
        ]}
      >
        <View style={styles.heroCard}>
          <Image
            source={
              course.image?.url || course.imageUrl
                ? { uri: course.image?.url || course.imageUrl }
                : require("@/assets/images/icon.png")
            }
            style={styles.hero}
            resizeMode="cover"
          />
          <View
            style={[
              styles.heroBadge,
              isPaid ? styles.heroBadgePaid : styles.heroBadgeFree,
            ]}
          >
            <Text
              style={[
                styles.heroBadgeText,
                isPaid ? styles.heroBadgeTextPaid : styles.heroBadgeTextFree,
              ]}
            >
              {course.priceINR ? "Paid cohort" : "Free track"}
            </Text>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{course.name}</Text>
          {course.subtitle ? (
            <Text style={styles.subtitle}>{course.subtitle}</Text>
          ) : null}
          <Text style={styles.meta}>
            {course.programme || "Gradus"}
            {course.duration ? ` - ${course.duration}` : ""}
          </Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Mode</Text>
            <Text style={styles.infoValue}>
              {course.mode || course.stats?.mode || "Live"}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Level</Text>
            <Text style={styles.infoValue}>
              {course.level || course.stats?.level || "Beginner"}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>
              {course.duration || course.stats?.duration || "6-12 weeks"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.price}>
            {course.priceINR
              ? `INR ${course.priceINR.toLocaleString("en-IN")}`
              : "Free"}
          </Text>
          <Text style={styles.priceHint}>
            Secure enrollment with batch-specific access.
          </Text>
          <Pressable
            style={[
              styles.primaryButton,
              (actionLoading || isEnrolled) && styles.buttonDisabled,
            ]}
            onPress={handleEnroll}
            disabled={actionLoading || isEnrolled}
          >
            <Text style={styles.primaryText}>
              {isEnrolled ? "Enrolled" : actionLoading ? "Processing..." : "Enroll now"}
            </Text>
          </Pressable>
        </View>

        {isEnrolled ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Live session</Text>
            <Text style={styles.sectionSubtitle}>
              {activeSession?.title || "Upcoming session details will appear here."}
            </Text>
            <Pressable
              style={[
                styles.secondaryButton,
                !joinInfo.canJoin && styles.buttonDisabled,
              ]}
              onPress={handleJoinSession}
              disabled={!joinInfo.canJoin}
            >
              <Text style={styles.secondaryText}>{joinInfo.label}</Text>
            </Pressable>
          </View>
        ) : null}

        {course.aboutProgram?.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>About this program</Text>
            {course.aboutProgram.map((item, index) => (
              <Text key={`about-${index}`} style={styles.bullet}>
                {`\u2022 ${item}`}
              </Text>
            ))}
          </View>
        ) : null}

        {course.learn?.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>What you will learn</Text>
            {course.learn.map((item, index) => (
              <Text key={`learn-${index}`} style={styles.bullet}>
                {`\u2022 ${item}`}
              </Text>
            ))}
          </View>
        ) : null}

        {isEnrolled && modules.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Modules & materials</Text>
            {modules.map((module, index) => (
              <View key={`module-${index}`} style={styles.moduleBlock}>
                <Text style={styles.moduleTitle}>{module.title || "Module"}</Text>
                {module.weeksLabel ? (
                  <Text style={styles.moduleMeta}>{module.weeksLabel}</Text>
                ) : null}
                {module.outcome ? (
                  <Text style={styles.moduleOutcome}>{module.outcome}</Text>
                ) : null}
                {module.topics?.length ? (
                  <View style={styles.topicList}>
                    {module.topics.slice(0, 6).map((topic, tIndex) => (
                      <Text key={`topic-${index}-${tIndex}`} style={styles.topicItem}>
                        {`\u2022 ${topic}`}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {module.sections?.map((section, sIndex) => (
                  <View key={`section-${index}-${sIndex}`} style={styles.sectionBlock}>
                    <Text style={styles.sectionName}>
                      {section.title || "Section"}
                    </Text>
                    {section.lectures?.map((lecture, lIndex) => (
                      <View key={`lecture-${index}-${sIndex}-${lIndex}`} style={styles.lectureRow}>
                        <Text style={styles.lectureTitle}>
                          {lecture.title || "Lecture"}
                        </Text>
                        {lecture.notes?.fileUrl ||
                          lecture.notes?.url ||
                          lecture.notes?.secureUrl ? (
                          <Pressable
                            onPress={() =>
                              Linking.openURL(
                                lecture.notes?.fileUrl ||
                                lecture.notes?.url ||
                                lecture.notes?.secureUrl ||
                                ""
                              )
                            }
                          >
                            <Text style={styles.noteLink}>View notes</Text>
                          </Pressable>
                        ) : null}
                        {lecture.video?.secure_url || lecture.video?.url ? (
                          <Pressable
                            onPress={() =>
                              Linking.openURL(
                                lecture.video?.secure_url || lecture.video?.url || ""
                              )
                            }
                          >
                            <Text style={styles.noteLink}>Watch recording</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  empty: {
    color: colors.muted,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 130,
  },
  heroCard: {
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  hero: {
    width: "100%",
    height: 210,
    backgroundColor: colors.border,
  },
  heroBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroBadgePaid: {
    backgroundColor: colors.accentSoft,
  },
  heroBadgeFree: {
    backgroundColor: colors.primarySoft,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: fonts.bodySemi,
  },
  heroBadgeTextPaid: {
    color: colors.accent,
  },
  heroBadgeTextFree: {
    color: colors.primary,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.heading,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  meta: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  infoGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  infoCard: {
    flex: 1,
    backgroundColor: colors.glass,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minWidth: 110,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  infoValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "600",
    color: colors.heading,
    fontFamily: fonts.bodySemi,
  },
  card: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.sm,
    ...shadow.card,
  },
  priceLabel: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  price: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  priceHint: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  primaryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    fontFamily: fonts.bodySemi,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
    fontFamily: fonts.bodySemi,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  bullet: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
  moduleBlock: {
    marginTop: spacing.md,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  moduleMeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  moduleOutcome: {
    marginTop: 4,
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.body,
  },
  topicList: {
    marginTop: 6,
    gap: 4,
  },
  topicItem: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.body,
  },
  sectionBlock: {
    marginTop: spacing.sm,
    gap: 6,
  },
  sectionName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.heading,
    fontFamily: fonts.bodySemi,
  },
  lectureRow: {
    gap: 4,
  },
  lectureTitle: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.body,
  },
  noteLink: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.bodySemi,
  },
});
