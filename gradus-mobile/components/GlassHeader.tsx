import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, spacing } from "@/constants/Theme";

type Props = {
    title?: string;
    showBack?: boolean;
    rightAction?: React.ReactNode;
};

export default function GlassHeader({ title, showBack = true, rightAction }: Props) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.wrapper, { paddingTop: insets.top }]}>
            {Platform.OS === "ios" ? (
                <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            ) : (
                <View style={styles.fallbackBg} />
            )}
            <View style={styles.container}>
                <View style={styles.left}>
                    {showBack && (
                        <Pressable
                            onPress={() => router.back()}
                            style={({ pressed }) => [
                                styles.backButton,
                                pressed && { opacity: 0.7 },
                            ]}
                        >
                            <Ionicons
                                name="chevron-back"
                                size={24}
                                color={colors.heading}
                            />
                        </Pressable>
                    )}
                </View>

                <View style={styles.center}>
                    {title ? (
                        <Text style={styles.title} numberOfLines={1}>
                            {title}
                        </Text>
                    ) : null}
                </View>

                <View style={styles.right}>{rightAction}</View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        overflow: "hidden",
        borderBottomWidth: 1,
        borderBottomColor: colors.glassBorder,
    },
    fallbackBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255,255,255,0.95)",
    },
    container: {
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
    },
    left: {
        width: 40,
        alignItems: "flex-start",
    },
    center: {
        flex: 1,
        alignItems: "center",
    },
    right: {
        width: 40,
        alignItems: "flex-end",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.5)",
    },
    title: {
        fontSize: 17,
        fontFamily: fonts.headingSemi,
        color: colors.heading,
    },
});
