/**
 * More/Explore Screen
 * Hub for additional features: Blogs, Events, Gallery, Jobs, etc.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MoreStackScreenProps } from '../../navigation/types';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type Props = MoreStackScreenProps<'More'>;

type IconName = keyof typeof Ionicons.glyphMap;

interface MenuItem {
    icon: IconName;
    label: string;
    description: string;
    route: keyof MoreStackScreenProps<'More'>['navigation']['push'] extends (route: infer R, ...args: any[]) => any ? R : never;
    color: string;
}

const MoreScreen: React.FC<Props> = ({ navigation }) => {
    const menuItems: Array<{
        icon: IconName;
        label: string;
        description: string;
        route: 'Blogs' | 'Events' | 'Gallery' | 'Jobs' | 'About' | 'Contact';
        color: string;
    }> = [
            {
                icon: 'document-text',
                label: 'Blog',
                description: 'Read our latest articles',
                route: 'Blogs',
                color: colors.primary,
            },
            {
                icon: 'calendar',
                label: 'Events',
                description: 'Upcoming events & webinars',
                route: 'Events',
                color: colors.secondary,
            },
            {
                icon: 'images',
                label: 'Gallery',
                description: 'Photos from our events',
                route: 'Gallery',
                color: colors.warning,
            },
            {
                icon: 'briefcase',
                label: 'Jobs',
                description: 'Career opportunities',
                route: 'Jobs',
                color: '#8B5CF6', // Purple
            },
            {
                icon: 'information-circle',
                label: 'About Us',
                description: 'Learn about GRADUS',
                route: 'About',
                color: '#EC4899', // Pink
            },
            {
                icon: 'mail',
                label: 'Contact',
                description: 'Get in touch with us',
                route: 'Contact',
                color: '#14B8A6', // Teal
            },
        ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Explore</Text>
                    <Text style={styles.subtitle}>Discover more from GRADUS</Text>
                </View>

                <View style={styles.menuGrid}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuCard}
                            onPress={() => navigation.navigate(item.route)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                                <Ionicons name={item.icon} size={28} color={item.color} />
                            </View>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Text style={styles.menuDescription}>{item.description}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        padding: spacing.lg,
    },
    title: {
        fontSize: fontSize.xxl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xxl,
    },
    menuCard: {
        width: '47%',
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginHorizontal: '1.5%',
        marginBottom: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    menuLabel: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    menuDescription: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        lineHeight: 16,
    },
});

export default MoreScreen;
