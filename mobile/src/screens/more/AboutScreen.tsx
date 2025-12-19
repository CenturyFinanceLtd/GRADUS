/**
 * About Screen
 * Company information and mission
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    Linking,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreStackScreenProps } from '../../navigation/types';
import { colors, spacing, fontSize, borderRadius, gradients } from '../../theme';

type Props = MoreStackScreenProps<'About'>;

const AboutScreen: React.FC<Props> = () => {
    const stats = [
        { value: '10,000+', label: 'Students' },
        { value: '100+', label: 'Courses' },
        { value: '50+', label: 'Experts' },
        { value: '95%', label: 'Success Rate' },
    ];

    const socials = [
        { name: 'logo-facebook', url: 'https://facebook.com/gradusindia' },
        { name: 'logo-instagram', url: 'https://instagram.com/gradusindia' },
        { name: 'logo-linkedin', url: 'https://linkedin.com/company/gradusindia' },
        { name: 'logo-twitter', url: 'https://twitter.com/gradusindia' },
        { name: 'logo-youtube', url: 'https://youtube.com/gradusindia' },
    ];

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Hero Section */}
            <LinearGradient
                colors={gradients.hero as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroSection}
            >
                <View style={styles.logoContainer}>
                    <Text style={styles.logoText}>GRADUS</Text>
                </View>
                <Text style={styles.heroTitle}>Empowering the Next Generation</Text>
                <Text style={styles.heroSubtitle}>
                    Your gateway to world-class education and career growth
                </Text>
            </LinearGradient>

            {/* Stats */}
            <View style={styles.statsContainer}>
                {stats.map((stat, index) => (
                    <View key={index} style={styles.statItem}>
                        <Text style={styles.statValue}>{stat.value}</Text>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                ))}
            </View>

            {/* Mission */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Our Mission</Text>
                <Text style={styles.paragraph}>
                    At GRADUS, we believe that quality education should be accessible to everyone.
                    Our mission is to bridge the gap between traditional education and industry
                    requirements by providing practical, skill-based learning that prepares
                    students for real-world success.
                </Text>
            </View>

            {/* Vision */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Our Vision</Text>
                <Text style={styles.paragraph}>
                    To become the leading educational platform in India, empowering millions
                    of students to achieve their dreams through innovative learning experiences
                    and career-focused programs.
                </Text>
            </View>

            {/* Values */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Our Values</Text>
                <View style={styles.valuesList}>
                    {[
                        { icon: 'school', title: 'Excellence', desc: 'We strive for the highest quality in everything we do.' },
                        { icon: 'people', title: 'Inclusivity', desc: 'Education for all, regardless of background.' },
                        { icon: 'bulb', title: 'Innovation', desc: 'Constantly evolving to meet changing needs.' },
                        { icon: 'heart', title: 'Integrity', desc: 'Building trust through transparency and honesty.' },
                    ].map((value, index) => (
                        <View key={index} style={styles.valueCard}>
                            <View style={styles.valueIcon}>
                                <Ionicons name={value.icon as any} size={24} color={colors.primary} />
                            </View>
                            <View style={styles.valueContent}>
                                <Text style={styles.valueTitle}>{value.title}</Text>
                                <Text style={styles.valueDesc}>{value.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {/* Social Links */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Connect With Us</Text>
                <View style={styles.socialsContainer}>
                    {socials.map((social, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.socialButton}
                            onPress={() => Linking.openURL(social.url)}
                        >
                            <Ionicons name={social.name as any} size={24} color={colors.white} />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>© 2024 GRADUS India. All rights reserved.</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    heroSection: {
        padding: spacing.xl,
        paddingTop: spacing.xxl,
        alignItems: 'center',
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    logoText: {
        fontSize: fontSize.md,
        fontWeight: 'bold',
        color: colors.primary,
        letterSpacing: 1,
    },
    heroTitle: {
        fontSize: fontSize.xxl,
        fontWeight: 'bold',
        color: colors.white,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    heroSubtitle: {
        fontSize: fontSize.md,
        color: colors.white,
        opacity: 0.9,
        textAlign: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: colors.white,
        marginHorizontal: spacing.lg,
        marginTop: -spacing.xl,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    statItem: {
        width: '50%',
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    statValue: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.primary,
    },
    statLabel: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        marginTop: 2,
    },
    section: {
        padding: spacing.lg,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    paragraph: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    valuesList: {
        gap: spacing.md,
    },
    valueCard: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    valueIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primaryLight + '30',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    valueContent: {
        flex: 1,
        justifyContent: 'center',
    },
    valueTitle: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    valueDesc: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    socialsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.md,
    },
    socialButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: spacing.xs,
    },
    footer: {
        padding: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    footerText: {
        fontSize: fontSize.xs,
        color: colors.textMuted,
    },
});

export default AboutScreen;
