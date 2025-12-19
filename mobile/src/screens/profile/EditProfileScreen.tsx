/**
 * Edit Profile Screen
 * Placeholder for profile editing
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProfileStackScreenProps } from '../../navigation/types';
import { colors, spacing, fontSize } from '../../theme';

type Props = ProfileStackScreenProps<'EditProfile'>;

const EditProfileScreen: React.FC<Props> = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Edit Profile</Text>
            <Text style={styles.placeholder}>Profile editing form will be here.</Text>
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

export default EditProfileScreen;
