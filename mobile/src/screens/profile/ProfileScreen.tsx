/**
 * Profile Screen
 * Shows user profile information
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context';
import { ProfileStackScreenProps } from '../../navigation/types';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type Props = ProfileStackScreenProps<'Profile'>;

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout },
            ]
        );
    };

    const menuItems = [
        {
            icon: 'person-outline' as const,
            label: 'Edit Profile',
            onPress: () => navigation.navigate('EditProfile'),
        },
        {
            icon: 'help-circle-outline' as const,
            label: 'Support',
            onPress: () => navigation.navigate('Support'),
        },
        {
            icon: 'settings-outline' as const,
            label: 'Settings',
            onPress: () => navigation.navigate('Settings'),
        },
        {
            icon: 'document-text-outline' as const,
            label: 'Terms & Conditions',
            onPress: () => { },
        },
        {
            icon: 'shield-outline' as const,
            label: 'Privacy Policy',
            onPress: () => { },
        },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        {user?.profileImage ? (
                            <Image source={{ uri: user.profileImage }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.editAvatarButton}>
                            <Ionicons name="camera" size={16} color={colors.white} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{user?.name || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Courses</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Certificates</Text>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuItem}
                            onPress={item.onPress}
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={styles.menuIconContainer}>
                                    <Ionicons name={item.icon} size={22} color={colors.primary} />
                                </View>
                                <Text style={styles.menuItemText}>{item.label}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color={colors.error} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Version 1.0.0</Text>
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
        alignItems: 'center',
        paddingVertical: spacing.xl,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: spacing.md,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: colors.white,
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.white,
    },
    userName: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    userEmail: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        marginTop: spacing.lg,
        marginHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: fontSize.xxl,
        fontWeight: 'bold',
        color: colors.primary,
    },
    statLabel: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.border,
    },
    menuContainer: {
        backgroundColor: colors.white,
        marginTop: spacing.lg,
        marginHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight + '30',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    menuItemText: {
        fontSize: fontSize.md,
        color: colors.textPrimary,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        marginTop: spacing.lg,
        marginHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.error + '30',
    },
    logoutText: {
        fontSize: fontSize.md,
        color: colors.error,
        fontWeight: '500',
        marginLeft: spacing.sm,
    },
    version: {
        textAlign: 'center',
        fontSize: fontSize.xs,
        color: colors.textMuted,
        marginTop: spacing.xl,
        marginBottom: spacing.xxl,
    },
});

export default ProfileScreen;
