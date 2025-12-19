/**
 * Lesson Detail Screen
 * Shows lesson content with video player
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CoursesStackScreenProps } from '../../navigation/types';
import { VideoPlayer } from '../../components';
import { apiClient } from '../../services';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type Props = CoursesStackScreenProps<'LessonDetail'>;

interface LessonData {
    _id: string;
    title: string;
    type: 'video' | 'article' | 'quiz' | 'assignment';
    content?: string;
    videoUrl?: string;
    duration?: string;
    description?: string;
}

const LessonDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const { courseId, lessonId } = route.params;
    const [loading, setLoading] = useState(true);
    const [lesson, setLesson] = useState<LessonData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLesson = async () => {
            try {
                // Using a mock endpoint - adjust to your actual API
                const response = await apiClient.get(`/courses/${courseId}/lessons/${lessonId}`);
                setLesson(response.lesson || response);
            } catch (err: any) {
                console.error('Error fetching lesson:', err);
                // Create mock lesson data for demo
                setLesson({
                    _id: lessonId,
                    title: 'Sample Video Lesson',
                    type: 'video',
                    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                    description: 'This is a sample video lesson demonstrating the video player functionality.',
                    duration: '10:34',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchLesson();
    }, [courseId, lessonId]);

    const handleVideoComplete = () => {
        console.log('Video completed');
        // TODO: Mark lesson as complete in API
    };

    const handleVideoProgress = (progress: number) => {
        // console.log('Progress:', progress);
        // TODO: Save progress to API
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (error || !lesson) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.gray400} />
                <Text style={styles.errorText}>{error || 'Lesson not found'}</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Video Player */}
            {lesson.type === 'video' && lesson.videoUrl && (
                <VideoPlayer
                    uri={lesson.videoUrl}
                    title={lesson.title}
                    onComplete={handleVideoComplete}
                    onProgress={handleVideoProgress}
                />
            )}

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Lesson Info */}
                <View style={styles.lessonInfo}>
                    <View style={styles.typeTag}>
                        <Ionicons
                            name={lesson.type === 'video' ? 'play-circle' : 'document-text'}
                            size={16}
                            color={colors.primary}
                        />
                        <Text style={styles.typeText}>{lesson.type}</Text>
                    </View>
                    <Text style={styles.title}>{lesson.title}</Text>
                    {lesson.duration && (
                        <View style={styles.durationRow}>
                            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                            <Text style={styles.durationText}>{lesson.duration}</Text>
                        </View>
                    )}
                </View>

                {/* Description */}
                {lesson.description && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About this lesson</Text>
                        <Text style={styles.description}>{lesson.description}</Text>
                    </View>
                )}

                {/* Article Content */}
                {lesson.type === 'article' && lesson.content && (
                    <View style={styles.section}>
                        <Text style={styles.articleContent}>{lesson.content}</Text>
                    </View>
                )}

                {/* Navigation Buttons */}
                <View style={styles.navigationButtons}>
                    <TouchableOpacity style={styles.navButton}>
                        <Ionicons name="chevron-back" size={20} color={colors.primary} />
                        <Text style={styles.navButtonText}>Previous</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.navButton, styles.navButtonPrimary]}>
                        <Text style={styles.navButtonTextPrimary}>Next Lesson</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.white} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
        padding: spacing.lg,
    },
    errorText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        marginTop: spacing.md,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    backButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.lg,
    },
    backButtonText: {
        color: colors.white,
        fontSize: fontSize.md,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    lessonInfo: {
        marginBottom: spacing.lg,
    },
    typeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primaryLight + '30',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
        marginBottom: spacing.sm,
    },
    typeText: {
        fontSize: fontSize.xs,
        color: colors.primary,
        fontWeight: '600',
        textTransform: 'capitalize',
        marginLeft: spacing.xs,
    },
    title: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    durationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    durationText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
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
    articleContent: {
        fontSize: fontSize.md,
        color: colors.textPrimary,
        lineHeight: 26,
    },
    navigationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.lg,
        marginBottom: spacing.xxl,
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    navButtonPrimary: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    navButtonText: {
        fontSize: fontSize.sm,
        color: colors.primary,
        fontWeight: '500',
        marginLeft: spacing.xs,
    },
    navButtonTextPrimary: {
        fontSize: fontSize.sm,
        color: colors.white,
        fontWeight: '500',
        marginRight: spacing.xs,
    },
});

export default LessonDetailScreen;
