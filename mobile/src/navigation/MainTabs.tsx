/**
 * Main Tab Navigator
 * Bottom tab navigation for authenticated users
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import HomeStack from './HomeStack';
import CoursesStack from './CoursesStack';
import MoreStack from './MoreStack';
import ProfileStack from './ProfileStack';
import { colors, spacing } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

const getTabIcon = (routeName: string, focused: boolean): IconName => {
    const icons: Record<string, { active: IconName; inactive: IconName }> = {
        HomeTab: { active: 'home', inactive: 'home-outline' },
        CoursesTab: { active: 'book', inactive: 'book-outline' },
        MoreTab: { active: 'grid', inactive: 'grid-outline' },
        ProfileTab: { active: 'person', inactive: 'person-outline' },
    };
    const icon = icons[routeName];
    return focused ? icon.active : icon.inactive;
};

const MainTabs: React.FC = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    const iconName = getTabIcon(route.name, focused);
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.gray400,
                tabBarStyle: {
                    backgroundColor: colors.white,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    paddingBottom: spacing.xs,
                    paddingTop: spacing.xs,
                    height: 60,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
            })}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeStack}
                options={{ tabBarLabel: 'Home' }}
            />
            <Tab.Screen
                name="CoursesTab"
                component={CoursesStack}
                options={{ tabBarLabel: 'My Courses' }}
            />
            <Tab.Screen
                name="MoreTab"
                component={MoreStack}
                options={{ tabBarLabel: 'Explore' }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileStack}
                options={{ tabBarLabel: 'Profile' }}
            />
        </Tab.Navigator>
    );
};

export default MainTabs;
