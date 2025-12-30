import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";

import { colors, fonts, radius, shadow, spacing } from "@/constants/Theme";
import SectionHeader from "@/components/SectionHeader";
import MasterclassCard from "@/components/MasterclassCard";
import CourseCard from "@/components/CourseCard";
import EventCard from "@/components/EventCard";
import CategoryTile from "@/components/CategoryTile";
import GlassBackground from "@/components/GlassBackground";
import { fetchEvents, fetchMasterclasses, EventItem } from "@/services/events";
import { fetchCourses, CourseItem } from "@/services/courses";
import {
  BannerItem,
  ExpertVideoItem,
  GalleryItem,
  TestimonialItem,
  WhyGradusVideo,
  fetchBanners,
  fetchExpertVideos,
  fetchGallery,
  fetchTestimonials,
  fetchWhyGradusVideo,
} from "@/services/content";

export default function HomeScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const [loading, setLoading] = useState(true);
  const [masterclasses, setMasterclasses] = useState<EventItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [expertVideos, setExpertVideos] = useState<ExpertVideoItem[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [whyGradus, setWhyGradus] = useState<WhyGradusVideo | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const paidCourseCount = courses.filter((course) => (course.priceINR || 0) > 0)
    .length;

  useEffect(() => {
    const load = async () => {
      try {
        const [
          masterclassData,
          coursesData,
          eventsData,
          bannerData,
          expertData,
          testimonialData,
          whyData,
          galleryData,
        ] = await Promise.all([
          fetchMasterclasses("upcoming", 8),
          fetchCourses(),
          fetchEvents("upcoming", 8),
          fetchBanners(),
          fetchExpertVideos(),
          fetchTestimonials(),
          fetchWhyGradusVideo(),
          fetchGallery(undefined, 8),
        ]);
        setMasterclasses(masterclassData);
        setCourses(coursesData.slice(0, 8));
        setEvents(
          eventsData.filter(
            (item) => item.eventType?.toLowerCase() !== "masterclass"
          )
        );
        setBanners(bannerData || []);
        setExpertVideos(expertData || []);
        setTestimonials(testimonialData || []);
        setWhyGradus(whyData || null);
        setGallery(galleryData || []);
      } catch (error) {
        console.warn("[home] Failed to load data", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleOpenUrl = async (url?: string) => {
    if (!url) return;
    const target = url.startsWith("http") ? url : `https://${url}`;
    const supported = await Linking.canOpenURL(target);
    if (!supported) return;
    Linking.openURL(target);
  };

  return (
    <GlassBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: spacing.lg + headerHeight },
        ]}
      >
        <View>
          <Text style={styles.heading}>Welcome to Gradus</Text>
          <Text style={styles.subheading}>
            Learn from masterclasses and join live cohorts.
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroTitle}>Masterclasses this week</Text>
          <Text style={styles.heroSubtitle}>
            Join free sessions, then upgrade to paid live batches.
          </Text>
          <Pressable
            style={styles.heroButton}
            onPress={() => router.push("/(tabs)/masterclasses")}
          >
            <Text style={styles.heroButtonText}>Explore masterclasses</Text>
          </Pressable>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {masterclasses.length || "--"}
              </Text>
              <Text style={styles.heroStatLabel}>Free sessions</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{paidCourseCount || "--"}</Text>
              <Text style={styles.heroStatLabel}>Live batches</Text>
            </View>
          </View>
        </View>

        {banners.length ? (
          <View style={styles.section}>
            <SectionHeader title="Highlights" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {banners.map((banner) => (
                <Pressable
                  key={banner.id}
                  style={styles.bannerCard}
                  onPress={() => handleOpenUrl(banner.ctaUrl)}
                >
                  <Image
                    source={
                      banner.mobileImageUrl || banner.imageUrl
                        ? { uri: banner.mobileImageUrl || banner.imageUrl }
                        : require("@/assets/images/icon.png")
                    }
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                  <View style={styles.bannerBody}>
                    <Text style={styles.bannerTitle}>{banner.title || "Gradus"}</Text>
                    <Text style={styles.bannerSubtitle}>
                      {banner.subtitle || banner.description || ""}
                    </Text>
                    {banner.ctaLabel ? (
                      <Text style={styles.bannerCta}>{banner.ctaLabel}</Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader title="Browse categories" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            <CategoryTile
              title="Masterclasses"
              subtitle="Free sessions"
              icon="play-circle-outline"
              tint={colors.primary}
              background={colors.primarySoft}
              onPress={() => router.push("/(tabs)/masterclasses")}
            />
            <CategoryTile
              title="Courses"
              subtitle="Paid cohorts"
              icon="book-outline"
              tint={colors.accent}
              background={colors.accentSoft}
              onPress={() => router.push("/(tabs)/courses")}
            />
            <CategoryTile
              title="Events"
              subtitle="Community"
              icon="calendar-outline"
              tint={colors.success}
              background={colors.successSoft}
              onPress={() => router.push("/(tabs)/events")}
            />
          </ScrollView>
        </View>

        {whyGradus ? (
          <View style={styles.section}>
            <SectionHeader title="Why Gradus" />
            <Pressable
              style={styles.videoCard}
              onPress={() => handleOpenUrl(whyGradus.videoUrl)}
            >
              <Image
                source={
                  whyGradus.thumbnailUrl
                    ? { uri: whyGradus.thumbnailUrl }
                    : require("@/assets/images/icon.png")
                }
                style={styles.videoImage}
                resizeMode="cover"
              />
              <View style={styles.videoBody}>
                <Text style={styles.videoTitle}>{whyGradus.title || "Why Gradus"}</Text>
                {whyGradus.subtitle ? (
                  <Text style={styles.videoSubtitle}>{whyGradus.subtitle}</Text>
                ) : null}
                {whyGradus.duration ? (
                  <Text style={styles.videoMeta}>{whyGradus.duration}</Text>
                ) : null}
              </View>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader
            title="Masterclasses"
            actionLabel="View all"
            onAction={() => router.push("/(tabs)/masterclasses")}
          />
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : masterclasses.length === 0 ? (
            <Text style={styles.empty}>No masterclasses yet.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {masterclasses.map((event) => (
                <MasterclassCard
                  key={event.id}
                  title={event.name}
                  imageUrl={event.heroImage?.url}
                  startTime={event.schedule?.start}
                  onPress={() =>
                    router.push({
                      pathname: "/event/[slug]",
                      params: { slug: event.slug },
                    })
                  }
                />
              ))}
            </ScrollView>
          )}
        </View>

        {expertVideos.length ? (
          <View style={styles.section}>
            <SectionHeader title="Expert Sessions" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {expertVideos.map((video) => (
                <Pressable
                  key={video.id}
                  style={styles.videoTile}
                  onPress={() => handleOpenUrl(video.videoUrl)}
                >
                  <Image
                    source={
                      video.thumbnailUrl
                        ? { uri: video.thumbnailUrl }
                        : require("@/assets/images/icon.png")
                    }
                    style={styles.videoThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.videoTileBody}>
                    <Text style={styles.videoTileTitle} numberOfLines={2}>
                      {video.title || "Expert session"}
                    </Text>
                    {video.duration ? (
                      <Text style={styles.videoMeta}>{video.duration}</Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader
            title="Events"
            actionLabel="View all"
            onAction={() => router.push("/(tabs)/events")}
          />
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : events.length === 0 ? (
            <Text style={styles.empty}>No events yet.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  title={event.name}
                  imageUrl={event.heroImage?.url}
                  startTime={event.schedule?.start}
                  eventType={event.eventType}
                  onPress={() =>
                    router.push({
                      pathname: "/event/[slug]",
                      params: { slug: event.slug },
                    })
                  }
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Courses"
            actionLabel="View all"
            onAction={() => router.push("/(tabs)/courses")}
          />
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : courses.length === 0 ? (
            <Text style={styles.empty}>No courses yet.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {courses.map((course) => (
                <CourseCard
                  key={course._id || course.slug}
                  title={course.name}
                  programme={course.programme}
                  priceINR={course.priceINR}
                  imageUrl={course.image?.url || course.imageUrl}
                  onPress={() =>
                    router.push({
                      pathname: "/course/[slug]",
                      params: { slug: course.slug },
                    })
                  }
                />
              ))}
            </ScrollView>
          )}
        </View>

        {testimonials.length ? (
          <View style={styles.section}>
            <SectionHeader title="Success Stories" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {testimonials.map((item) => (
                <View key={item.id} style={styles.testimonialCard}>
                  <Text style={styles.testimonialQuote} numberOfLines={4}>
                    “{item.quote || "Gradus helped me achieve my goals."}”
                  </Text>
                  <Text style={styles.testimonialName}>{item.name || "Learner"}</Text>
                  {item.role || item.company ? (
                    <Text style={styles.testimonialRole}>
                      {item.role || ""} {item.company ? `· ${item.company}` : ""}
                    </Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {gallery.length ? (
          <View style={styles.section}>
            <SectionHeader title="Gradus Gallery" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {gallery.map((item) => (
                <View key={item.id} style={styles.galleryCard}>
                  <Image
                    source={
                      item.imageUrl
                        ? { uri: item.imageUrl }
                        : require("@/assets/images/icon.png")
                    }
                    style={styles.galleryImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.galleryTitle} numberOfLines={1}>
                    {item.title || "Gradus"}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
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
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.heading,
  },
  subheading: {
    fontSize: 15,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  hero: {
    position: "relative",
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: "hidden",
    ...shadow.card,
  },
  heroGlow: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(243, 119, 57, 0.2)",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    fontFamily: fonts.headingSemi,
  },
  heroSubtitle: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 18,
    fontFamily: fonts.body,
  },
  heroButton: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  heroButtonText: {
    fontWeight: "700",
    fontSize: 13,
    color: colors.primary,
    fontFamily: fonts.bodySemi,
  },
  heroStats: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: spacing.md,
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    fontFamily: fonts.headingSemi,
  },
  heroStatLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontFamily: fonts.body,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  bannerCard: {
    width: 240,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginRight: 14,
    ...shadow.card,
  },
  bannerImage: {
    width: "100%",
    height: 120,
    backgroundColor: colors.border,
  },
  bannerBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  bannerCta: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    fontFamily: fonts.bodySemi,
  },
  section: {
    gap: spacing.sm,
  },
  horizontalList: {
    paddingRight: spacing.lg,
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
    fontFamily: fonts.body,
  },
  videoCard: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  videoImage: {
    width: "100%",
    height: 160,
    backgroundColor: colors.border,
  },
  videoBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  videoSubtitle: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  videoMeta: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.bodySemi,
  },
  videoTile: {
    width: 200,
    marginRight: 14,
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  videoThumb: {
    width: "100%",
    height: 120,
    backgroundColor: colors.border,
  },
  videoTileBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  videoTileTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.heading,
    fontFamily: fonts.bodySemi,
  },
  testimonialCard: {
    width: 240,
    marginRight: 14,
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  testimonialQuote: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
  testimonialName: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  testimonialRole: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  galleryCard: {
    width: 160,
    marginRight: 14,
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  galleryImage: {
    width: "100%",
    height: 120,
    backgroundColor: colors.border,
  },
  galleryTitle: {
    padding: spacing.sm,
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.bodySemi,
  },
});
