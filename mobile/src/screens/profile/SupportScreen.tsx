/**
 * Support Screen
 * Placeholder for support tickets
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProfileStackScreenProps } from '../../navigation/types';
import { colors, spacing, fontSize } from '../../theme';

type Props = ProfileStackScreenProps<'Support'>;

const SupportScreen: React.FC<Props> = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Support</Text>
            <Text style={styles.placeholder}>Support tickets will be shown here.</Text>
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

export default SupportScreen;
