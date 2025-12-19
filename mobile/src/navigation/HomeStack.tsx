/**
 * Home Stack Navigator
 * Handles Home, Course Details, Blog Details screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import HomeScreen from '../screens/home/HomeScreen';
import CourseDetailScreen from '../screens/courses/CourseDetailScreen';
import BlogDetailScreen from '../screens/blogs/BlogDetailScreen';
import EventDetailScreen from '../screens/events/EventDetailScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<HomeStackParamList>();

const HomeStack: React.FC = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.primary,
                },
                headerTintColor: colors.white,
                headerTitleStyle: {
                    fontWeight: '600',
                },
                contentStyle: { backgroundColor: colors.background },
            }}
        >
            <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="CourseDetail"
                component={CourseDetailScreen}
                options={{ title: 'Course Details' }}
            />
            <Stack.Screen
                name="BlogDetail"
                component={BlogDetailScreen}
                options={{ title: 'Blog' }}
            />
            <Stack.Screen
                name="EventDetail"
                component={EventDetailScreen}
                options={{ title: 'Event' }}
            />
        </Stack.Navigator>
    );
};

export default HomeStack;
