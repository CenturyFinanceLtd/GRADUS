import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow } from "@/constants/Theme";

type Props = {
  title: string;
  imageUrl?: string;
  startTime?: string;
  onPress?: () => void;
};

const formatDate = (value?: string) => {
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

const getBadgeLabel = (value?: string) => {
  if (!value) return "Free masterclass";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Free masterclass";
  const diffHours = (date.getTime() - Date.now()) / 36e5;
  if (diffHours <= 1 && diffHours >= -1) return "Live soon";
  if (diffHours < -1) return "Replay";
  return "Upcoming";
};

export default function MasterclassCard({
  title,
  imageUrl,
  startTime,
  onPress,
}: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.media}>
        <Image
          source={
            imageUrl
              ? { uri: imageUrl }
              : require("@/assets/images/icon.png")
          }
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{getBadgeLabel(startTime)}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.meta}>{formatDate(startTime)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginRight: 14,
    width: 220,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  media: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 130,
    backgroundColor: colors.border,
  },
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    fontFamily: fonts.bodySemi,
  },
  body: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  meta: {
    marginTop: 6,
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
  },
});
