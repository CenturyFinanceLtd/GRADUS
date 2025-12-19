/**
 * More Stack Navigator
 * Handles Blogs, Events, Gallery, Jobs, About, Contact screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoreStackParamList } from './types';
import MoreScreen from '../screens/more/MoreScreen';
import BlogsScreen from '../screens/blogs/BlogsScreen';
import BlogDetailScreen from '../screens/blogs/BlogDetailScreen';
import EventsScreen from '../screens/events/EventsScreen';
import EventDetailScreen from '../screens/events/EventDetailScreen';
import GalleryScreen from '../screens/more/GalleryScreen';
import JobsScreen from '../screens/more/JobsScreen';
import AboutScreen from '../screens/more/AboutScreen';
import ContactScreen from '../screens/more/ContactScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<MoreStackParamList>();

const MoreStack: React.FC = () => {
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
                name="More"
                component={MoreScreen}
                options={{ title: 'More' }}
            />
            <Stack.Screen
                name="Blogs"
                component={BlogsScreen}
                options={{ title: 'Blog' }}
            />
            <Stack.Screen
                name="BlogDetail"
                component={BlogDetailScreen}
                options={{ title: 'Blog' }}
            />
            <Stack.Screen
                name="Events"
                component={EventsScreen}
                options={{ title: 'Events' }}
            />
            <Stack.Screen
                name="EventDetail"
                component={EventDetailScreen}
                options={{ title: 'Event' }}
            />
            <Stack.Screen
                name="Gallery"
                component={GalleryScreen}
                options={{ title: 'Gallery' }}
            />
            <Stack.Screen
                name="Jobs"
                component={JobsScreen}
                options={{ title: 'Jobs' }}
            />
            <Stack.Screen
                name="About"
                component={AboutScreen}
                options={{ title: 'About Us' }}
            />
            <Stack.Screen
                name="Contact"
                component={ContactScreen}
                options={{ title: 'Contact Us' }}
            />
        </Stack.Navigator>
    );
};

export default MoreStack;
