import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow } from "@/constants/Theme";

type Props = {
  title: string;
  programme?: string;
  priceINR?: number;
  imageUrl?: string;
  onPress?: () => void;
};

const formatPrice = (price?: number) => {
  if (!price) return "Free";
  return `INR ${price.toLocaleString("en-IN")}`;
};

export default function CourseCard({
  title,
  programme,
  priceINR,
  imageUrl,
  onPress,
}: Props) {
  const isPaid = Boolean(priceINR);
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
        <View style={[styles.priceTag, isPaid && styles.priceTagPaid]}>
          <Text
            style={[
              styles.priceTagText,
              isPaid ? styles.priceTagTextPaid : styles.priceTagTextFree,
            ]}
          >
            {formatPrice(priceINR)}
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {programme ? (
          <View style={styles.programmeTag}>
            <Text style={styles.programmeText}>{programme}</Text>
          </View>
        ) : null}
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
  priceTag: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: colors.glassHighlight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  priceTagPaid: {
    borderColor: "rgba(243, 119, 57, 0.35)",
    backgroundColor: "rgba(243, 119, 57, 0.08)",
  },
  priceTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    fontFamily: fonts.bodySemi,
  },
  priceTagTextPaid: {
    color: colors.accent,
  },
  priceTagTextFree: {
    color: colors.primary,
  },
  body: {
    padding: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  programmeTag: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  programmeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    fontFamily: fonts.bodyMedium,
  },
});
