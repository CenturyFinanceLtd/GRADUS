import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts, radius, shadow, spacing } from "@/constants/Theme";

type Props = {
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  tint: string;
  background: string;
  onPress?: () => void;
};

export default function CategoryTile({
  title,
  subtitle,
  icon,
  tint,
  background,
  onPress,
}: Props) {
  return (
    <Pressable style={[styles.card, { backgroundColor: background }]} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={16} color="#fff" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginRight: spacing.sm,
    ...shadow.card,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
  },
});
