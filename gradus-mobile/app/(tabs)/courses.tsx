import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";

import { colors, fonts, radius, shadow, spacing } from "@/constants/Theme";
import FilterChip from "@/components/FilterChip";
import GlassBackground from "@/components/GlassBackground";
import { fetchCourses, CourseItem } from "@/services/courses";

export default function CoursesScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CourseItem[]>([]);
  const [programme, setProgramme] = useState("All");

  const programmes = useMemo(() => {
    const values = items
      .map((item) => item.programme)
      .filter((value): value is string => Boolean(value));
    return ["All", ...Array.from(new Set(values))];
  }, [items]);

  const filtered = useMemo(() => {
    if (programme === "All") return items;
    return items.filter((item) => item.programme === programme);
  }, [items, programme]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCourses();
        setItems(data);
      } catch (error) {
        console.warn("[courses] Failed to load", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <GlassBackground>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item._id || item.slug}
            contentContainerStyle={[
              styles.list,
              { paddingTop: spacing.lg + headerHeight },
            ]}
            ListHeaderComponent={
              <View style={styles.header}>
                <Text style={styles.heading}>Flagship courses</Text>
                <Text style={styles.subheading}>
                  Choose a live batch and enroll with secure payments.
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filters}
                >
                  {programmes.map((item) => (
                    <FilterChip
                      key={item}
                      label={item}
                      active={programme === item}
                      onPress={() => setProgramme(item)}
                    />
                  ))}
                </ScrollView>
              </View>
            }
            ListEmptyComponent={
              <Text style={styles.empty}>No courses published yet.</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.media}>
                  <Image
                    source={
                      item.image?.url || item.imageUrl
                        ? { uri: item.image?.url || item.imageUrl }
                        : require("@/assets/images/icon.png")
                    }
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <View
                    style={[
                      styles.badge,
                      item.priceINR ? styles.badgePaid : styles.badgeFree,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        item.priceINR
                          ? styles.badgeTextPaid
                          : styles.badgeTextFree,
                      ]}
                    >
                      {item.priceINR ? "Paid" : "Free"}
                    </Text>
                  </View>
                </View>
                <View style={styles.body}>
                  <Text style={styles.title}>{item.name}</Text>
                  <Text style={styles.meta}>{item.programme || "Gradus"}</Text>
                  <Text
                    style={[
                      styles.price,
                      item.priceINR ? styles.pricePaid : styles.priceFree,
                    ]}
                  >
                    {item.priceINR
                      ? `INR ${item.priceINR.toLocaleString("en-IN")}`
                      : "Free"}
                  </Text>
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() =>
                      router.push({
                        pathname: "/course/[slug]",
                        params: { slug: item.slug },
                      })
                    }
                  >
                    <Text style={styles.primaryText}>View details</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 120,
  },
  header: {
    marginBottom: spacing.sm,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  subheading: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  filters: {
    marginTop: spacing.md,
    paddingRight: spacing.lg,
  },
  card: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  media: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 160,
    backgroundColor: colors.border,
  },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePaid: {
    backgroundColor: "rgba(243, 119, 57, 0.15)",
  },
  badgeFree: {
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: fonts.bodySemi,
  },
  badgeTextPaid: {
    color: colors.accent,
  },
  badgeTextFree: {
    color: colors.primary,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  meta: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  price: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: fonts.bodySemi,
  },
  pricePaid: {
    color: colors.accent,
  },
  priceFree: {
    color: colors.primary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    fontFamily: fonts.bodySemi,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    marginTop: spacing.lg,
    fontSize: 14,
    fontFamily: fonts.body,
  },
});
