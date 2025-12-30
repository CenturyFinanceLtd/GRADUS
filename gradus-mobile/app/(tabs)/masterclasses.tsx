import { useEffect, useState } from "react";
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
import { fetchMasterclasses, EventItem } from "@/services/events";

const formatSchedule = (value?: string) => {
  if (!value) return "Schedule TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Schedule TBA";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function MasterclassesScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<EventItem[]>([]);
  const [timeframe, setTimeframe] = useState<"upcoming" | "past" | "all">(
    "upcoming"
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchMasterclasses(timeframe, 20);
        setItems(data);
      } catch (error) {
        console.warn("[masterclasses] Failed to load", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [timeframe]);

  const handleWatch = (item: EventItem) => {
    router.push({
      pathname: "/event/[slug]",
      params: { slug: item.slug },
    });
  };

  return (
    <GlassBackground>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.list,
              { paddingTop: spacing.lg + headerHeight },
            ]}
            ListHeaderComponent={
              <View style={styles.header}>
                <Text style={styles.heading}>Free masterclasses</Text>
                <Text style={styles.subheading}>
                  Browse upcoming sessions and watch instantly after verification.
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filters}
                >
                  <FilterChip
                    label="Upcoming"
                    active={timeframe === "upcoming"}
                    onPress={() => setTimeframe("upcoming")}
                  />
                  <FilterChip
                    label="Past"
                    active={timeframe === "past"}
                    onPress={() => setTimeframe("past")}
                  />
                  <FilterChip
                    label="All"
                    active={timeframe === "all"}
                    onPress={() => setTimeframe("all")}
                  />
                </ScrollView>
              </View>
            }
            ListEmptyComponent={
              <Text style={styles.empty}>No masterclasses published yet.</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.media}>
                  <Image
                    source={
                      item.heroImage?.url
                        ? { uri: item.heroImage.url }
                        : require("@/assets/images/icon.png")
                    }
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Free</Text>
                  </View>
                </View>
                <View style={styles.body}>
                  <Text style={styles.title}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {formatSchedule(item.schedule?.start)}
                  </Text>
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => handleWatch(item)}
                  >
                    <Text style={styles.primaryText}>Watch now</Text>
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
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    fontFamily: fonts.bodySemi,
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
