/**
 * Course Detail Screen
 * Shows course information and enrollment option
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services';
import { HomeStackScreenProps } from '../../navigation/types';
import { Course } from '../../types';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type Props = HomeStackScreenProps<'CourseDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CourseDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const { courseId, slug } = route.params;
    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<Course | null>(null);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const response = await apiClient.get(`/courses/${slug || courseId}`);
                setCourse(response.course || response);
            } catch (error) {
                console.error('Error fetching course:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [courseId, slug]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!course) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.gray400} />
                <Text style={styles.errorText}>Course not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Course Image */}
                <Image
                    source={{ uri: course.thumbnail || 'https://via.placeholder.com/400x200' }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                />

                {/* Course Info */}
                <View style={styles.content}>
                    <Text style={styles.category}>{course.category || 'Course'}</Text>
                    <Text style={styles.title}>{course.title}</Text>

                    {/* Meta Info */}
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="star" size={16} color={colors.warning} />
                            <Text style={styles.metaText}>{course.rating || '4.5'} Rating</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="people" size={16} color={colors.primary} />
                            <Text style={styles.metaText}>{course.enrolledCount || 0} Students</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="time" size={16} color={colors.secondary} />
                            <Text style={styles.metaText}>{course.duration || 'Self-paced'}</Text>
                        </View>
                    </View>

                    {/* Instructor */}
                    {course.instructor && (
                        <View style={styles.instructorCard}>
                            <Image
                                source={{ uri: course.instructor.image || 'https://via.placeholder.com/50' }}
                                style={styles.instructorImage}
                            />
                            <View>
                                <Text style={styles.instructorLabel}>Instructor</Text>
                                <Text style={styles.instructorName}>{course.instructor.name}</Text>
                            </View>
                        </View>
                    )}

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About This Course</Text>
                        <Text style={styles.description}>
                            {course.description || course.shortDescription || 'No description available.'}
                        </Text>
                    </View>

                    {/* Curriculum */}
                    {course.curriculum && course.curriculum.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Curriculum</Text>
                            {course.curriculum.map((module, index) => (
                                <View key={module._id} style={styles.moduleCard}>
                                    <View style={styles.moduleHeader}>
                                        <Text style={styles.moduleNumber}>Module {index + 1}</Text>
                                        <Text style={styles.moduleLessons}>
                                            {module.lessons?.length || 0} lessons
                                        </Text>
                                    </View>
                                    <Text style={styles.moduleTitle}>{module.title}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.bottomBar}>
                <View style={styles.priceContainer}>
                    {course.discountedPrice ? (
                        <>
                            <Text style={styles.originalPrice}>₹{course.price}</Text>
                            <Text style={styles.price}>₹{course.discountedPrice}</Text>
                        </>
                    ) : (
                        <Text style={styles.price}>
                            {course.price ? `₹${course.price}` : 'Free'}
                        </Text>
                    )}
                </View>
                <TouchableOpacity style={styles.enrollButton}>
                    <Text style={styles.enrollButtonText}>Enroll Now</Text>
                </TouchableOpacity>
            </View>
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    thumbnail: {
        width: SCREEN_WIDTH,
        height: 220,
    },
    content: {
        padding: spacing.lg,
    },
    category: {
        fontSize: fontSize.sm,
        color: colors.primary,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    title: {
        fontSize: fontSize.xxl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: spacing.lg,
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
    instructorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray50,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.lg,
    },
    instructorImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: spacing.md,
    },
    instructorLabel: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
    },
    instructorName: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    description: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    moduleCard: {
        backgroundColor: colors.gray50,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    moduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    moduleNumber: {
        fontSize: fontSize.xs,
        color: colors.primary,
        fontWeight: '600',
    },
    moduleLessons: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
    },
    moduleTitle: {
        fontSize: fontSize.md,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    originalPrice: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        textDecorationLine: 'line-through',
        marginRight: spacing.sm,
    },
    price: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.primary,
    },
    enrollButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.lg,
    },
    enrollButtonText: {
        color: colors.white,
        fontSize: fontSize.md,
        fontWeight: '600',
    },
});

export default CourseDetailScreen;
