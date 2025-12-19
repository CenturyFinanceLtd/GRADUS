/**
 * Root Navigator
 * Handles auth state and navigates between Auth and Main stacks
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { RootStackParamList } from './types';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import { useAuth } from '../context';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const LoadingScreen: React.FC = () => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
    </View>
);

const RootNavigator: React.FC = () => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                    <Stack.Screen name="Main" component={MainTabs} />
                ) : (
                    <Stack.Screen name="Auth" component={AuthStack} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
});

export default RootNavigator;
