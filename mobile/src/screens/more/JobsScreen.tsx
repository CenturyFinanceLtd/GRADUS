/**
 * Jobs Screen
 * Displays job listings
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services';
import { MoreStackScreenProps } from '../../navigation/types';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type Props = MoreStackScreenProps<'Jobs'>;

interface Job {
    _id: string;
    title: string;
    company?: string;
    location?: string;
    type?: 'full-time' | 'part-time' | 'contract' | 'internship';
    salary?: string;
    description?: string;
    requirements?: string[];
    applyLink?: string;
    postedAt?: string;
}

const JobsScreen: React.FC<Props> = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [jobs, setJobs] = useState<Job[]>([]);

    const fetchJobs = async () => {
        try {
            const response = await apiClient.get('/jobs');
            setJobs(response.jobs || response || []);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            // Mock data for demo
            setJobs([
                {
                    _id: '1',
                    title: 'Junior Web Developer',
                    company: 'Tech Corp',
                    location: 'Mumbai, India',
                    type: 'full-time',
                    salary: '₹4-6 LPA',
                    description: 'Looking for a motivated junior developer...',
                    postedAt: new Date().toISOString(),
                },
                {
                    _id: '2',
                    title: 'Marketing Intern',
                    company: 'StartUp Inc',
                    location: 'Remote',
                    type: 'internship',
                    salary: '₹15,000/month',
                    description: 'Join our marketing team as an intern...',
                    postedAt: new Date().toISOString(),
                },
                {
                    _id: '3',
                    title: 'Data Analyst',
                    company: 'Analytics Hub',
                    location: 'Bangalore, India',
                    type: 'full-time',
                    salary: '₹8-12 LPA',
                    description: 'Seeking a data analyst with SQL expertise...',
                    postedAt: new Date().toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchJobs();
    };

    const getJobTypeColor = (type?: string) => {
        switch (type) {
            case 'full-time':
                return colors.secondary;
            case 'part-time':
                return colors.warning;
            case 'internship':
                return colors.primary;
            case 'contract':
                return '#8B5CF6';
            default:
                return colors.gray500;
        }
    };

    const renderJobCard = ({ item: job }: { item: Job }) => (
        <View style={styles.jobCard}>
            <View style={styles.jobHeader}>
                <View style={styles.jobTitleRow}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    {job.type && (
                        <View style={[styles.typeBadge, { backgroundColor: getJobTypeColor(job.type) + '20' }]}>
                            <Text style={[styles.typeText, { color: getJobTypeColor(job.type) }]}>
                                {job.type.replace('-', ' ')}
                            </Text>
                        </View>
                    )}
                </View>
                {job.company && <Text style={styles.company}>{job.company}</Text>}
            </View>

            <View style={styles.jobMeta}>
                {job.location && (
                    <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.metaText}>{job.location}</Text>
                    </View>
                )}
                {job.salary && (
                    <View style={styles.metaItem}>
                        <Ionicons name="wallet-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.metaText}>{job.salary}</Text>
                    </View>
                )}
            </View>

            {job.description && (
                <Text style={styles.description} numberOfLines={2}>
                    {job.description}
                </Text>
            )}

            <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                    if (job.applyLink) {
                        Linking.openURL(job.applyLink);
                    }
                }}
            >
                <Text style={styles.applyButtonText}>Apply Now</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.white} />
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={jobs}
                renderItem={renderJobCard}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="briefcase-outline" size={64} color={colors.gray300} />
                        <Text style={styles.emptyTitle}>No Jobs Posted</Text>
                        <Text style={styles.emptyText}>Check back later for new opportunities.</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: spacing.lg,
        flexGrow: 1,
    },
    jobCard: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    jobHeader: {
        marginBottom: spacing.sm,
    },
    jobTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.xs,
    },
    jobTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.textPrimary,
        flex: 1,
        marginRight: spacing.sm,
    },
    typeBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    typeText: {
        fontSize: fontSize.xs,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    company: {
        fontSize: fontSize.md,
        color: colors.primary,
        fontWeight: '500',
    },
    jobMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: spacing.sm,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: spacing.lg,
        marginBottom: spacing.xs,
    },
    metaText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
    },
    description: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: spacing.md,
    },
    applyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    applyButtonText: {
        color: colors.white,
        fontSize: fontSize.sm,
        fontWeight: '600',
        marginRight: spacing.xs,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xxl,
    },
    emptyTitle: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});

export default JobsScreen;
