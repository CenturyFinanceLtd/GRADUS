import { Stack, useLocalSearchParams, router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import TopBar from "@/components/top-bar";
import { API_BASE_URL } from "@/constants/config";
import { getAuthSession, hasSignedIn } from "@/utils/auth-storage";
import { screenContainer } from "@/styles/layout";
// Note: Razorpay checkout requires the native module (react-native-razorpay) and a dev/production build.
let RazorpayCheckout: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RazorpayCheckout = require("react-native-razorpay");
} catch (_) {
  RazorpayCheckout = null;
}

type ModuleItem = {
  title: string;
  summary?: string;
  topics?: string[];
  weeksLabel?: string;
  outcome?: string;
};

type Course = {
  id: string;
  name: string;
  imageUrl: string;
  description?: string;
  rating?: number;
  enrolledCount?: number | null;
  duration?: string;
  programme?: string;
  modules?: ModuleItem[];
  aboutProgram?: string[];
  learn?: string[];
  skills?: string[];
  tools?: string[];
  careerOutcomes?: string[];
  capstoneOutcome?: string[];
  capstoneSummary?: string;
  effort?: string;
  language?: string;
  prerequisites?: string;
  whoFor?: string[];
  prerequisitesList?: string[];
  heroSubtitle?: string;
  heroPrice?: number;
  heroEnrolledText?: string;
  stats?: {
    modules?: number;
    level?: string;
    mode?: string;
    duration?: string;
  };
};

const placeholderImg =
  "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80";

function Accordion({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental &&
      !(global as any).nativeFabricUIManager
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const [open, setOpen] = useState(false);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  };
  return (
    <View style={styles.accordion}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={toggle}
        activeOpacity={0.85}
      >
        <View style={styles.accordionTitleWrap}>
          <Text style={styles.moduleTitle} numberOfLines={2}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={styles.moduleSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color="#444"
        />
      </TouchableOpacity>
      {open && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
}

function OverviewBadge({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.badgeCard}>
      <View style={styles.badgeIconWrap}>
        <Ionicons name={icon} size={16} color="#2968ff" />
      </View>
      <Text style={styles.badgeTitle}>{String(title)}</Text>
      {!!subtitle && (
        <Text style={styles.badgeSubtitle}>{String(subtitle)}</Text>
      )}
    </View>
  );
}

export default function CourseDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    imageUrl?: string;
    section?: string;
    backTo?: string;
  }>();
  const { id, name: nameParam, imageUrl: imageParam, backTo } = params;

  const [course, setCourse] = useState<Course | null>(
    id
      ? {
          id: String(id),
          name: nameParam ? String(nameParam) : "",
          imageUrl: imageParam ? String(imageParam) : placeholderImg,
        }
      : null
  );
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<"overview" | "modules" | "reviews">(
    (params.section as any) || "overview"
  );
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    checkEnrollment();
  }, [id]);

  const checkEnrollment = async () => {
    try {
      const { token } = await getAuthSession();
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/users/me/enrollments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (res.ok && body.items) {
        const enrolled = body.items.some(
          (item: any) =>
            (item.course.slug === id || item.course.id === id) &&
            item.paymentStatus === "PAID"
        );
        setIsEnrolled(enrolled);
      }
    } catch (err) {
      console.log("Failed to check enrollment", err);
    }
  };
  const hasAudienceInfo =
    (course?.whoFor?.length ?? 0) > 0 ||
    (course?.prerequisitesList?.length ?? 0) > 0;
  const priceLabel = useMemo(() => {
    if (typeof course?.heroPrice === "number") {
      return `₹${course.heroPrice.toLocaleString("en-IN")}`;
    }
    return null;
  }, [course?.heroPrice]);
  const statBadges = useMemo(() => {
    if (!course) return [];
    const items: {
      icon: keyof typeof Ionicons.glyphMap;
      title: string;
      subtitle?: string;
    }[] = [];
    const modulesCount = course.stats?.modules ?? course.modules?.length;
    if (typeof modulesCount === "number" && modulesCount > 0) {
      items.push({ icon: "albums-outline", title: `${modulesCount} modules` });
    }
    if (course.stats?.mode) {
      items.push({ icon: "laptop-outline", title: course.stats.mode });
    }
    if (course.stats?.level) {
      items.push({ icon: "trending-up-outline", title: course.stats.level });
    }
    const duration = course.stats?.duration || course.duration;
    if (duration) {
      items.push({ icon: "time-outline", title: duration });
    }
    return items;
  }, [course]);
  const detailRows = useMemo(() => {
    const rows: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [];
    if (course?.effort)
      rows.push({ icon: "time-outline", label: course.effort });
    if (course?.language)
      rows.push({ icon: "language-outline", label: course.language });
    if (course?.prerequisites)
      rows.push({ icon: "briefcase-outline", label: course.prerequisites });
    return rows;
  }, [course]);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        setLoading(true);
        const slug = encodeURIComponent(String(id));
        const res = await fetch(`${API_BASE_URL}/api/courses/${slug}`);
        if (!res.ok) throw new Error(`Failed to load course (${res.status})`);
        const data = await res.json();
        if (canceled) return;
        const item = data?.item || data?.course || data;
        const hero = item?.hero || {};
        const capstone = item?.capstone || {};
        const imageUrl =
          item?.image?.url ||
          item?.media?.banner?.url ||
          item?.imageUrl ||
          course?.imageUrl ||
          placeholderImg;
        const modulesRaw =
          item?.modules ||
          item?.program?.modules ||
          item?.course?.modules ||
          data?.modules ||
          [];
        const details = item?.details || {};
        const whoFor =
          item?.whoThisIsFor || item?.whoFor || item?.audience || [];
        const prereqList =
          item?.prerequisitesList || item?.prerequisitesPoints || [];

        const durationVal =
          item?.duration || item?.stats?.duration || course?.duration;
        const nameVal = item?.name ?? course?.name ?? nameParam;
        setCourse({
          id: String(item?.slug || item?.id || item?._id || id),
          name: nameVal ? String(nameVal) : "",
          imageUrl,
          description: item?.description || item?.shortDescription,
          rating:
            typeof item?.rating === "number"
              ? item.rating
              : typeof course?.rating === "number"
              ? course?.rating
              : undefined,
          enrolledCount: item?.enrolledCount ?? course?.enrolledCount ?? null,
          duration: durationVal ? String(durationVal) : undefined,
          programme: item?.programme ? String(item.programme) : undefined,
          heroSubtitle: hero?.subtitle
            ? String(hero.subtitle)
            : item?.heroSubtitle
            ? String(item.heroSubtitle)
            : undefined,
          heroPrice:
            typeof hero?.priceINR === "number"
              ? hero.priceINR
              : typeof item?.priceINR === "number"
              ? item.priceINR
              : undefined,
          heroEnrolledText: hero?.enrolledText
            ? String(hero.enrolledText)
            : item?.heroEnrolledText
            ? String(item.heroEnrolledText)
            : undefined,
          aboutProgram: Array.isArray(item?.aboutProgram)
            ? item.aboutProgram.map((v: any) => String(v))
            : [],
          learn: Array.isArray(item?.learn)
            ? item.learn.map((v: any) => String(v))
            : [],
          skills: Array.isArray(item?.skills)
            ? item.skills.map((v: any) => String(v))
            : [],
          tools: Array.isArray(item?.toolsFrameworks)
            ? item.toolsFrameworks.map((v: any) => String(v))
            : [],
          careerOutcomes: Array.isArray(item?.careerOutcomes)
            ? item.careerOutcomes.map((v: any) => String(v))
            : [],
          capstoneOutcome: Array.isArray(item?.capstoneOutcome)
            ? item.capstoneOutcome.map((v: any) => String(v))
            : Array.isArray(capstone?.bullets)
            ? capstone.bullets.map((v: any) => String(v))
            : [],
          capstoneSummary: capstone?.summary
            ? String(capstone.summary)
            : undefined,
          effort: details?.effort ? String(details.effort) : undefined,
          language: details?.language ? String(details.language) : undefined,
          prerequisites: details?.prerequisites
            ? String(details.prerequisites)
            : undefined,
          whoFor: Array.isArray(whoFor)
            ? whoFor.map((v: any) => String(v))
            : [],
          prerequisitesList: Array.isArray(prereqList)
            ? prereqList.map((v: any) => String(v))
            : [],
          stats: item?.stats,
          modules: Array.isArray(modulesRaw)
            ? modulesRaw.map((m: any) => ({
                title: m?.title ? String(m.title) : "Untitled Module",
                summary: m?.summary
                  ? String(m.summary)
                  : m?.outcome
                  ? String(m.outcome)
                  : undefined,
                topics: Array.isArray(m?.topics)
                  ? m.topics.map((t: any) => String(t))
                  : [],
                weeksLabel: m?.weeksLabel ? String(m.weeksLabel) : undefined,
                outcome: m?.outcome ? String(m.outcome) : undefined,
              }))
            : [],
        });
      } catch (err: any) {
        if (!canceled) {
          Alert.alert("Course", err?.message || "Unable to load course");
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    if (id) load();
    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const learnersText = useMemo(() => {
    if (course?.heroEnrolledText) return course.heroEnrolledText;
    if (typeof course?.enrolledCount === "number") {
      if (course.enrolledCount >= 1000)
        return `${(course.enrolledCount / 1000).toFixed(1)}k Learners`;
      if (course.enrolledCount > 0) return `${course.enrolledCount} Learners`;
    }
    return "New learners";
  }, [course]);

  const handleEnroll = async () => {
    if (!course?.id) return;
    const signedIn = await hasSignedIn();
    const path = `/(tabs)/learning-hub/course/${course.id}`;
    if (!signedIn) {
      console.log("User not signed in. Redirecting to:", path);
      // Pass as string query param to avoid object merging issues
      router.push(`/auth/signin?redirect=${encodeURIComponent(path)}`);
      return;
    }

    // Navigate to checkout screen
    router.push({
      pathname: "/enrollment-checkout",
      params: {
        courseSlug: course.id,
      },
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <View style={styles.topBarWrapper}>
        <TopBar onProfilePress={() => router.push("/auth/signin")} />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#2968ff" />
          </View>
        ) : !course ? (
          <Text style={styles.error}>Course not found.</Text>
        ) : (
          <>
            <View style={styles.breadcrumbRow}>
              <TouchableOpacity
                onPress={() => {
                  if (backTo) {
                    router.push(backTo as any);
                  } else {
                    router.back();
                  }
                }}
                style={styles.inlineBackBtn}
                hitSlop={12}
              >
                <Ionicons name="arrow-back" size={20} color="#333" />
              </TouchableOpacity>
              <Text style={styles.breadcrumb}>
                {course.programme || "Gradus X"}
              </Text>
            </View>

            <View style={styles.heroCard}>
              <Image
                source={course.imageUrl || placeholderImg}
                style={styles.heroImage}
                contentFit="cover"
              />
              <View style={styles.heroFooter}>
                <View style={styles.heroTitleRow}>
                  <Text style={styles.courseName}>{course.name}</Text>
                  {isEnrolled ? (
                    <TouchableOpacity
                      style={[styles.enrollBtn, { backgroundColor: "#12a84d" }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (course?.id) {
                          const encodedSlug = encodeURIComponent(course.id);
                          router.push(`/classroom/${encodedSlug}`);
                        }
                      }}
                    >
                      <Text style={styles.enrollBtnText}>Go to Course</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.enrollBtn}
                      activeOpacity={0.85}
                      onPress={handleEnroll}
                      disabled={enrolling}
                    >
                      <Text style={styles.enrollBtnText}>
                        {enrolling ? "Enrolling..." : "Enroll Now"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {!!course.heroSubtitle && (
                  <Text style={styles.heroSubtitle}>{course.heroSubtitle}</Text>
                )}
                <View style={styles.heroMeta}>
                  <View style={styles.badgeRow}>
                    {!!priceLabel && (
                      <View style={styles.priceBadge}>
                        <Text
                          style={styles.priceText}
                        >{`${priceLabel} + 18% GST`}</Text>
                      </View>
                    )}
                    <Text style={styles.metaMuted}>{learnersText}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.tabsRow}>
              {[
                { key: "overview", label: "Overview" },
                { key: "modules", label: "Modules" },
                { key: "reviews", label: "Reviews" },
              ].map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut
                    );
                    setSection(t.key as any);
                  }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      section === t.key && styles.tabActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.tabUnderline} />

            {section === "overview" && (
              <View style={{ gap: 12 }}>
                {statBadges.length > 0 && (
                  <View style={styles.statGrid}>
                    {statBadges.map((b, idx) => (
                      <OverviewBadge
                        key={idx}
                        icon={b.icon}
                        title={b.title}
                        subtitle={b.subtitle}
                      />
                    ))}
                  </View>
                )}

                {(course.aboutProgram?.length || course.description) && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>About the Program</Text>
                    {course.aboutProgram && course.aboutProgram.length > 0
                      ? course.aboutProgram.map((p, idx) => (
                          <Text key={idx} style={styles.sectionBody}>
                            {String(p)}
                          </Text>
                        ))
                      : course.description && (
                          <Text style={styles.sectionBody}>
                            {course.description}
                          </Text>
                        )}
                  </View>
                )}

                {course.learn && course.learn.length > 0 && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                      What you&apos;ll learn
                    </Text>
                    <View style={styles.bulletGrid}>
                      {course.learn.map((item, idx) => (
                        <View key={`learn-${idx}`} style={styles.bulletRow}>
                          <Ionicons
                            name="checkmark-done-circle-outline"
                            size={18}
                            color="#2968ff"
                          />
                          <Text style={[styles.sectionBody, styles.wrapText]}>
                            {String(item)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {course.skills && course.skills.length > 0 && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                      Skills you&apos;ll gain
                    </Text>
                    <View style={styles.chipWrap}>
                      {course.skills.map((s, idx) => (
                        <View key={idx} style={styles.chip}>
                          <Text style={styles.chipText}>{String(s)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {detailRows.length > 0 && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Details to know</Text>
                    <View style={styles.detailRow}>
                      {detailRows.map((row, idx) => (
                        <Row key={idx} icon={row.icon} label={row.label} />
                      ))}
                    </View>
                  </View>
                )}

                {hasAudienceInfo && (
                  <View style={[styles.sectionCard, styles.twoCol]}>
                    {course.whoFor && course.whoFor.length > 0 && (
                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={styles.sectionTitle}>Who this is for</Text>
                        {course.whoFor.map((c, idx) => (
                          <View key={idx} style={styles.bulletRow}>
                            <Ionicons
                              name="person-circle-outline"
                              size={16}
                              color="#2968ff"
                            />
                            <Text style={styles.sectionBody}>{String(c)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {course.prerequisitesList &&
                      course.prerequisitesList.length > 0 && (
                        <View style={{ flex: 1, gap: 6 }}>
                          <Text style={styles.sectionTitle}>Prerequisites</Text>
                          {course.prerequisitesList.map((c, idx) => (
                            <View key={idx} style={styles.bulletRow}>
                              <Ionicons
                                name="alert-circle-outline"
                                size={16}
                                color="#2968ff"
                              />
                              <Text style={styles.sectionBody}>
                                {String(c)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                  </View>
                )}

                {course.capstoneOutcome &&
                  course.capstoneOutcome.length > 0 && (
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionTitle}>Capstone Outcome</Text>
                      {!!course.capstoneSummary && (
                        <Text style={styles.sectionBody}>
                          {course.capstoneSummary}
                        </Text>
                      )}
                      <View style={styles.bulletGrid}>
                        {course.capstoneOutcome.map((c, idx) => (
                          <View key={idx} style={styles.bulletRow}>
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={16}
                              color="#2968ff"
                            />
                            <Text style={styles.sectionBody}>{String(c)}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                {course.careerOutcomes && course.careerOutcomes.length > 0 && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Career Outcomes</Text>
                    <View style={styles.bulletGrid}>
                      {course.careerOutcomes.map((c, idx) => (
                        <View key={idx} style={styles.bulletRow}>
                          <Ionicons
                            name="briefcase-outline"
                            size={16}
                            color="#2968ff"
                          />
                          <Text style={styles.sectionBody}>{String(c)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {course.tools && course.tools.length > 0 && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                      Tools and Frameworks
                    </Text>
                    <View style={styles.bulletGrid}>
                      {course.tools.map((c, idx) => (
                        <View key={idx} style={styles.bulletRow}>
                          <Ionicons
                            name="construct-outline"
                            size={16}
                            color="#2968ff"
                          />
                          <Text style={styles.sectionBody}>{String(c)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {section === "modules" &&
              course.modules &&
              course.modules.length > 0 && (
                <View style={styles.sectionCard}>
                  {course.modules.map((m, idx) => (
                    <Accordion
                      key={idx}
                      title={m.title || `Module ${idx + 1}`}
                      subtitle={m.weeksLabel}
                    >
                      {Array.isArray(m.topics) && m.topics.length > 0 && (
                        <View style={styles.topicList}>
                          <Text style={styles.topicHeading}>
                            Topics Covered
                          </Text>
                          {m.topics.map((t, tIdx) => (
                            <View key={tIdx} style={styles.topicRow}>
                              <Ionicons
                                name="checkmark-circle-outline"
                                size={16}
                                color="#2968ff"
                              />
                              <Text style={styles.topicText}>{String(t)}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {!!m.summary && (
                        <View style={{ marginTop: 10 }}>
                          <Text style={styles.topicHeading}>Outcome</Text>
                          <Text style={styles.moduleSummary}>{m.summary}</Text>
                        </View>
                      )}
                    </Accordion>
                  ))}
                </View>
              )}

            {section === "reviews" && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Ratings and Reviews</Text>
                <View style={styles.reviewRow}>
                  {!!course.rating && (
                    <Text style={styles.bigRating}>
                      {course.rating.toFixed(1)}
                    </Text>
                  )}
                  <View>
                    <Text style={styles.metaMuted}>{learnersText}</Text>
                    <Text style={styles.metaMuted}>Reviews coming soon.</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={18} color="#3c7bff" />
      </View>
      <Text style={[styles.metaText, styles.detailText]}>{String(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...screenContainer,
  },
  topBarWrapper: {
    backgroundColor: "#f4f4f4",
    zIndex: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
  },
  backButton: {
    padding: 8,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  loader: {
    paddingVertical: 40,
    alignItems: "center",
  },
  error: {
    color: "#c00",
    padding: 16,
    fontWeight: "700",
  },
  breadcrumbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  inlineBackBtn: {
    padding: 4,
  },
  breadcrumb: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  heroImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#eef2f7",
  },
  heroFooter: {
    padding: 14,
    gap: 8,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  courseName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
  },
  enrollBtn: {
    backgroundColor: "#2968ff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  enrollBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceBadge: {
    backgroundColor: "#e8f0ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cfe0ff",
  },
  priceText: {
    color: "#1f2937",
    fontWeight: "800",
    fontSize: 12,
  },
  popularBadge: {
    backgroundColor: "#c8f1cc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  popularText: {
    color: "#12a84d",
    fontWeight: "800",
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
  metaMuted: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
  },
  tabsRow: {
    flexDirection: "row",
    gap: 18,
    alignItems: "center",
    marginTop: 4,
  },
  tabText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  tabActive: {
    color: "#2968ff",
    fontWeight: "800",
  },
  tabUnderline: {
    height: 1,
    backgroundColor: "#e5e5e5",
    marginTop: -4,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  metaText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "700",
    flex: 1,
    flexWrap: "wrap",
    minWidth: 0,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badgeCard: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: "#eef2ff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  badgeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1f2937",
  },
  badgeSubtitle: {
    fontSize: 12,
    color: "#4b5563",
    marginTop: 2,
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "800",
    color: "#1f2937",
  },
  sectionBody: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 18,
  },
  bulletGrid: {
    gap: 8,
    marginTop: 8,
  },
  wrapText: {
    flex: 1,
    flexWrap: "wrap",
    minWidth: 0,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  moduleSummary: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  accordion: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  accordionBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
    paddingTop: 4,
  },
  moduleSubtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  accordionTitleWrap: {
    flex: 1,
  },
  durationText: {
    fontSize: 12,
    color: "#1f2937",
    fontWeight: "700",
    marginBottom: 8,
  },
  topicHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 6,
  },
  topicList: {
    gap: 6,
    marginTop: 4,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topicText: {
    fontSize: 12,
    color: "#333",
    flex: 1,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bigRating: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1f2937",
  },
  detailRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f7f9ff",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e0e8ff",
    flex: 1,
    minWidth: "48%",
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#e6efff",
    alignItems: "center",
    justifyContent: "center",
  },
  detailText: {
    flex: 1,
    color: "#1f2937",
    fontWeight: "700",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#e5f0ff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d6e4ff",
  },
  chipText: {
    fontSize: 12,
    color: "#1f2937",
    fontWeight: "700",
  },
  twoCol: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
});
