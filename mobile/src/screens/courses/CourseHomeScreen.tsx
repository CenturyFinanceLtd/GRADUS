/**
 * Course Home (LMS) Screen
 * Course learning interface with modules and lessons
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services';
import { CoursesStackScreenProps } from '../../navigation/types';
import { Course, CourseModule, Lesson } from '../../types';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type Props = CoursesStackScreenProps<'CourseHome'>;

const CourseHomeScreen: React.FC<Props> = ({ route, navigation }) => {
    const { courseId, programme, course: courseSlug } = route.params;
    const [loading, setLoading] = useState(true);
    const [courseData, setCourseData] = useState<Course | null>(null);
    const [expandedModules, setExpandedModules] = useState<string[]>([]);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const response = await apiClient.get(`/courses/${courseSlug || courseId}`);
                setCourseData(response.course || response);
                // Auto-expand first module
                if (response.course?.curriculum?.[0]?._id) {
                    setExpandedModules([response.course.curriculum[0]._id]);
                }
            } catch (error) {
                console.error('Error fetching course:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [courseId, courseSlug]);

    const toggleModule = (moduleId: string) => {
        setExpandedModules((prev) =>
            prev.includes(moduleId)
                ? prev.filter((id) => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    const getLessonIcon = (type: string): keyof typeof Ionicons.glyphMap => {
        switch (type) {
            case 'video':
                return 'play-circle';
            case 'article':
                return 'document-text';
            case 'quiz':
                return 'help-circle';
            case 'assignment':
                return 'create';
            default:
                return 'book';
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!courseData) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.gray400} />
                <Text style={styles.errorText}>Course not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Progress Header */}
            <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Your Progress</Text>
                <View style={styles.progressBarContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '25%' }]} />
                    </View>
                    <Text style={styles.progressText}>25%</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    <Text style={styles.courseTitle}>{courseData.title}</Text>

                    {/* Curriculum */}
                    {courseData.curriculum?.map((module, moduleIndex) => (
                        <View key={module._id} style={styles.moduleContainer}>
                            <TouchableOpacity
                                style={styles.moduleHeader}
                                onPress={() => toggleModule(module._id)}
                            >
                                <View style={styles.moduleInfo}>
                                    <Text style={styles.moduleNumber}>Module {moduleIndex + 1}</Text>
                                    <Text style={styles.moduleTitle}>{module.title}</Text>
                                    <Text style={styles.lessonCount}>
                                        {module.lessons?.length || 0} lessons
                                    </Text>
                                </View>
                                <Ionicons
                                    name={expandedModules.includes(module._id) ? 'chevron-up' : 'chevron-down'}
                                    size={20}
                                    color={colors.gray400}
                                />
                            </TouchableOpacity>

                            {expandedModules.includes(module._id) && (
                                <View style={styles.lessonsContainer}>
                                    {module.lessons?.map((lesson, lessonIndex) => (
                                        <TouchableOpacity
                                            key={lesson._id}
                                            style={styles.lessonCard}
                                            onPress={() => navigation.navigate('LessonDetail', {
                                                courseId: courseData._id,
                                                lessonId: lesson._id,
                                            })}
                                        >
                                            <View style={styles.lessonIconContainer}>
                                                <Ionicons
                                                    name={getLessonIcon(lesson.type)}
                                                    size={20}
                                                    color={colors.primary}
                                                />
                                            </View>
                                            <View style={styles.lessonInfo}>
                                                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                                                <View style={styles.lessonMeta}>
                                                    <Text style={styles.lessonType}>{lesson.type}</Text>
                                                    {lesson.duration && (
                                                        <Text style={styles.lessonDuration}>{lesson.duration}</Text>
                                                    )}
                                                </View>
                                            </View>
                                            {lesson.isPreview && (
                                                <View style={styles.previewBadge}>
                                                    <Text style={styles.previewText}>Preview</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))}
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
    },
    errorText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    progressHeader: {
        backgroundColor: colors.primary,
        padding: spacing.lg,
    },
    progressTitle: {
        fontSize: fontSize.sm,
        color: colors.white,
        opacity: 0.9,
        marginBottom: spacing.sm,
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: colors.white + '30',
        borderRadius: 4,
        marginRight: spacing.md,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.white,
        borderRadius: 4,
    },
    progressText: {
        fontSize: fontSize.md,
        color: colors.white,
        fontWeight: '600',
    },
    content: {
        padding: spacing.lg,
    },
    courseTitle: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: spacing.lg,
    },
    moduleContainer: {
        marginBottom: spacing.md,
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    moduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        backgroundColor: colors.gray50,
    },
    moduleInfo: {
        flex: 1,
    },
    moduleNumber: {
        fontSize: fontSize.xs,
        color: colors.primary,
        fontWeight: '600',
        marginBottom: 2,
    },
    moduleTitle: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    lessonCount: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
    },
    lessonsContainer: {
        padding: spacing.md,
    },
    lessonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    lessonIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight + '30',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    lessonInfo: {
        flex: 1,
    },
    lessonTitle: {
        fontSize: fontSize.md,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    lessonMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    lessonType: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        textTransform: 'capitalize',
    },
    lessonDuration: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
    },
    previewBadge: {
        backgroundColor: colors.secondary + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    previewText: {
        fontSize: fontSize.xs,
        color: colors.secondary,
        fontWeight: '500',
    },
});

export default CourseHomeScreen;
