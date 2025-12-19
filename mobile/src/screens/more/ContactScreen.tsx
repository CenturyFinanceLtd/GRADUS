/**
 * Contact Screen
 * Contact form and company contact information
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services';
import { MoreStackScreenProps } from '../../navigation/types';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type Props = MoreStackScreenProps<'Contact'>;

interface FormData {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
}

const ContactScreen: React.FC<Props> = () => {
    const [form, setForm] = useState<FormData>({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Partial<FormData>>({});

    const contactInfo = [
        {
            icon: 'call',
            label: 'Phone',
            value: '+91 98765 43210',
            action: () => Linking.openURL('tel:+919876543210'),
        },
        {
            icon: 'mail',
            label: 'Email',
            value: 'info@gradusindia.in',
            action: () => Linking.openURL('mailto:info@gradusindia.in'),
        },
        {
            icon: 'location',
            label: 'Address',
            value: 'Mumbai, Maharashtra, India',
            action: () => Linking.openURL('https://maps.google.com/?q=Mumbai+India'),
        },
    ];

    const validate = (): boolean => {
        const newErrors: Partial<FormData> = {};

        if (!form.name.trim()) newErrors.name = 'Name is required';
        if (!form.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(form.email)) {
            newErrors.email = 'Invalid email address';
        }
        if (!form.subject.trim()) newErrors.subject = 'Subject is required';
        if (!form.message.trim()) newErrors.message = 'Message is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            await apiClient.post('/contact', form);
            Alert.alert(
                'Message Sent!',
                'Thank you for reaching out. We will get back to you soon.',
                [{ text: 'OK', onPress: () => setForm({ name: '', email: '', phone: '', subject: '', message: '' }) }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: keyof FormData, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Contact Info Cards */}
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Get in Touch</Text>
                    {contactInfo.map((info, index) => (
                        <TouchableOpacity key={index} style={styles.infoCard} onPress={info.action}>
                            <View style={styles.infoIcon}>
                                <Ionicons name={info.icon as any} size={24} color={colors.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>{info.label}</Text>
                                <Text style={styles.infoValue}>{info.value}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Contact Form */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Send us a Message</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Name *</Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            placeholder="Your name"
                            placeholderTextColor={colors.gray400}
                            value={form.name}
                            onChangeText={(val) => updateField('name', val)}
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email *</Text>
                        <TextInput
                            style={[styles.input, errors.email && styles.inputError]}
                            placeholder="your@email.com"
                            placeholderTextColor={colors.gray400}
                            value={form.email}
                            onChangeText={(val) => updateField('email', val)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+91 98765 43210"
                            placeholderTextColor={colors.gray400}
                            value={form.phone}
                            onChangeText={(val) => updateField('phone', val)}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Subject *</Text>
                        <TextInput
                            style={[styles.input, errors.subject && styles.inputError]}
                            placeholder="How can we help?"
                            placeholderTextColor={colors.gray400}
                            value={form.subject}
                            onChangeText={(val) => updateField('subject', val)}
                        />
                        {errors.subject && <Text style={styles.errorText}>{errors.subject}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Message *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, errors.message && styles.inputError]}
                            placeholder="Write your message here..."
                            placeholderTextColor={colors.gray400}
                            value={form.message}
                            onChangeText={(val) => updateField('message', val)}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                        {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <>
                                <Text style={styles.submitButtonText}>Send Message</Text>
                                <Ionicons name="send" size={18} color={colors.white} />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    infoSection: {
        padding: spacing.lg,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    infoIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primaryLight + '30',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: fontSize.md,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    formSection: {
        padding: spacing.lg,
        paddingTop: 0,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fontSize.md,
        color: colors.textPrimary,
        backgroundColor: colors.white,
        height: 48,
    },
    textArea: {
        height: 120,
        paddingTop: spacing.md,
    },
    inputError: {
        borderColor: colors.error,
    },
    errorText: {
        fontSize: fontSize.xs,
        color: colors.error,
        marginTop: spacing.xs,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.xxl,
    },
    submitButtonDisabled: {
        backgroundColor: colors.primaryLight,
    },
    submitButtonText: {
        color: colors.white,
        fontSize: fontSize.md,
        fontWeight: '600',
        marginRight: spacing.sm,
    },
});

export default ContactScreen;
