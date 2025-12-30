import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts, radius, spacing } from "@/constants/Theme";

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export default function FilterChip({ label, active, onPress }: Props) {
  return (
    <Pressable
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
      onPress={onPress}
    >
      <Text style={[styles.text, active ? styles.textActive : styles.textIdle]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  chipIdle: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: fonts.bodySemi,
  },
  textIdle: {
    color: colors.text,
  },
  textActive: {
    color: colors.primary,
  },
});
