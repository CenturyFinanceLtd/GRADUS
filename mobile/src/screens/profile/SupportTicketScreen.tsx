/**
 * Support Ticket Screen
 * Placeholder for ticket details
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProfileStackScreenProps } from '../../navigation/types';
import { colors, spacing, fontSize } from '../../theme';

type Props = ProfileStackScreenProps<'SupportTicket'>;

const SupportTicketScreen: React.FC<Props> = ({ route }) => {
    const { ticketId } = route.params;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Ticket #{ticketId}</Text>
            <Text style={styles.placeholder}>Ticket details will be shown here.</Text>
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
        marginBottom: spacing.md,
    },
    placeholder: {
        fontSize: fontSize.md,
        color: colors.gray400,
    },
});

export default SupportTicketScreen;
