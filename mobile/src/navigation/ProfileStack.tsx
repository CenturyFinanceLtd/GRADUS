/**
 * Profile Stack Navigator
 * Handles Profile, Edit Profile, Support, Settings screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileStackParamList } from './types';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SupportScreen from '../screens/profile/SupportScreen';
import SupportTicketScreen from '../screens/profile/SupportTicketScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileStack: React.FC = () => {
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
                name="Profile"
                component={ProfileScreen}
                options={{ title: 'Profile' }}
            />
            <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{ title: 'Edit Profile' }}
            />
            <Stack.Screen
                name="Support"
                component={SupportScreen}
                options={{ title: 'Support' }}
            />
            <Stack.Screen
                name="SupportTicket"
                component={SupportTicketScreen}
                options={{ title: 'Ticket Details' }}
            />
            <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: 'Settings' }}
            />
        </Stack.Navigator>
    );
};

export default ProfileStack;
