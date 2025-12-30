import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

import { colors, fonts, radius, shadow, spacing } from "@/constants/Theme";
import GlassBackground from "@/components/GlassBackground";

const slides = [
  {
    title: "Free masterclasses",
    description:
      "Browse upcoming masterclasses and explore expert-led sessions before you enroll.",
  },
  {
    title: "Live courses",
    description:
      "Join paid live batches, get session reminders, and access recordings after class.",
  },
  {
    title: "Progress & outcomes",
    description:
      "Track your learning, access materials, and move from free to paid programs.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem("gradus_onboarded", "true");
    router.replace("/auth/phone");
  };

  const next = () => {
    if (index < slides.length - 1) {
      setIndex((prev) => prev + 1);
      return;
    }
    completeOnboarding();
  };

  return (
    <GlassBackground>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.art}>
            <View style={styles.artCircle} />
            <View style={styles.artRing} />
          </View>
          <Text style={styles.kicker}>Gradus learning</Text>
          <Text style={styles.title}>{slides[index].title}</Text>
          <Text style={styles.description}>{slides[index].description}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View
                key={`dot-${i}`}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable onPress={completeOnboarding}>
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={next}>
              <Text style={styles.primaryText}>
                {index === slides.length - 1 ? "Get started" : "Next"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    padding: spacing.lg,
    justifyContent: "space-between",
  },
  card: {
    marginTop: spacing.xxl,
    backgroundColor: colors.glass,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  art: {
    height: 140,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  artCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primarySoft,
    position: "absolute",
    right: 10,
  },
  artRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: "rgba(31, 79, 215, 0.2)",
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: fonts.bodySemi,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.heading,
    marginBottom: spacing.md,
    fontFamily: fonts.heading,
  },
  description: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  footer: {
    gap: spacing.lg,
  },
  dots: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 20,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skip: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    fontFamily: fonts.bodySemi,
  },
});
