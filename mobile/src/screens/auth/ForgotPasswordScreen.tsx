/**
 * Forgot Password Screen
 * Handles password reset requests
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services';
import { AuthStackScreenProps } from '../../navigation/types';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type Props = AuthStackScreenProps<'ForgotPassword'>;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const validate = (): boolean => {
        if (!email.trim()) {
            setError('Email is required');
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email');
            return false;
        }
        setError('');
        return true;
    };

    const handleResetPassword = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            await apiClient.post('/auth/forgot-password', { email: email.trim() });
            setSent(true);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Could not send reset link. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                        <Ionicons name="mail-open" size={48} color={colors.primary} />
                    </View>
                    <Text style={styles.successTitle}>Check Your Email</Text>
                    <Text style={styles.successText}>
                        We've sent a password reset link to{'\n'}
                        <Text style={styles.emailText}>{email}</Text>
                    </Text>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.backButtonText}>Back to Login</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.navBackButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="key-outline" size={48} color={colors.primary} />
                        </View>
                        <Text style={styles.title}>Forgot Password?</Text>
                        <Text style={styles.subtitle}>
                            Enter your email address and we'll send you a link to reset your password.
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <View style={[styles.inputContainer, error && styles.inputError]}>
                                <Ionicons name="mail-outline" size={20} color={colors.gray400} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor={colors.gray400}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                />
                            </View>
                            {error && <Text style={styles.errorText}>{error}</Text>}
                        </View>

                        <TouchableOpacity
                            style={[styles.resetButton, loading && styles.resetButtonDisabled]}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <Text style={styles.resetButtonText}>Send Reset Link</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Back to Login */}
                    <TouchableOpacity
                        style={styles.loginLink}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Ionicons name="arrow-back" size={16} color={colors.primary} />
                        <Text style={styles.loginLinkText}>Back to Login</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: spacing.lg,
        justifyContent: 'center',
    },
    navBackButton: {
        position: 'absolute',
        top: spacing.lg,
        left: 0,
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primaryLight + '30',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: fontSize.xxl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    form: {
        marginBottom: spacing.xl,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.gray50,
        height: 52,
    },
    inputError: {
        borderColor: colors.error,
    },
    input: {
        flex: 1,
        marginLeft: spacing.sm,
        fontSize: fontSize.md,
        color: colors.textPrimary,
    },
    errorText: {
        fontSize: fontSize.xs,
        color: colors.error,
        marginTop: spacing.xs,
    },
    resetButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resetButtonDisabled: {
        backgroundColor: colors.primaryLight,
    },
    resetButtonText: {
        color: colors.white,
        fontSize: fontSize.md,
        fontWeight: '600',
    },
    loginLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginLinkText: {
        fontSize: fontSize.sm,
        color: colors.primary,
        fontWeight: '500',
        marginLeft: spacing.xs,
    },
    // Success state styles
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    successIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primaryLight + '30',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    successTitle: {
        fontSize: fontSize.xxl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    successText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: spacing.xl,
    },
    emailText: {
        fontWeight: '600',
        color: colors.textPrimary,
    },
    backButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    backButtonText: {
        color: colors.white,
        fontSize: fontSize.md,
        fontWeight: '600',
    },
});

export default ForgotPasswordScreen;
