import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors } from "@/constants/Theme";

type Props = {
  children: ReactNode;
};

export default function GlassBackground({ children }: Props) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#fef6f1", "#eef4ff", "#fde9f4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.blobTop} />
      <View pointerEvents="none" style={styles.blobMid} />
      <View pointerEvents="none" style={styles.blobBottom} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  blobTop: {
    position: "absolute",
    top: -140,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255, 255, 255, 0.65)",
  },
  blobMid: {
    position: "absolute",
    top: 240,
    left: -120,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(6, 107, 202, 0.12)",
  },
  blobBottom: {
    position: "absolute",
    bottom: -160,
    right: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(243, 119, 57, 0.16)",
  },
});
