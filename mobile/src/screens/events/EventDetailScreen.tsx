/**
 * Event Detail Screen
 * Placeholder for event details
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HomeStackScreenProps } from '../../navigation/types';
import { colors, spacing, fontSize } from '../../theme';

type Props = HomeStackScreenProps<'EventDetail'>;

const EventDetailScreen: React.FC<Props> = ({ route }) => {
    const { eventId } = route.params;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Event Details</Text>
            <Text style={styles.subtitle}>Event ID: {eventId}</Text>
            <Text style={styles.placeholder}>Event details will be shown here.</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    placeholder: {
        fontSize: fontSize.md,
        color: colors.gray400,
    },
});

export default EventDetailScreen;
