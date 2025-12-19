/**
 * My Courses Screen
 * Shows user's enrolled courses
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services';
import { CoursesStackScreenProps } from '../../navigation/types';
import { Course } from '../../types';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type Props = CoursesStackScreenProps<'MyCourses'>;

interface EnrolledCourse extends Course {
    progress?: number;
    lastAccessed?: string;
}

const MyCoursesScreen: React.FC<Props> = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [courses, setCourses] = useState<EnrolledCourse[]>([]);

    const fetchCourses = async () => {
        try {
            const response = await apiClient.get('/users/enrolled-courses');
            setCourses(response.courses || response || []);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchCourses();
    };

    const renderCourseCard = ({ item: course }: { item: EnrolledCourse }) => (
        <TouchableOpacity
            style={styles.courseCard}
            onPress={() => navigation.navigate('CourseHome', {
                courseId: course._id,
                programme: 'gradus-x',
                course: course.slug,
            })}
        >
            <Image
                source={{ uri: course.thumbnail || 'https://via.placeholder.com/120x80' }}
                style={styles.courseThumbnail}
                resizeMode="cover"
            />
            <View style={styles.courseContent}>
                <Text style={styles.courseCategory}>{course.category || 'Course'}</Text>
                <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[styles.progressFill, { width: `${course.progress || 0}%` }]}
                        />
                    </View>
                    <Text style={styles.progressText}>{course.progress || 0}%</Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
        </TouchableOpacity>
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
                data={courses}
                renderItem={renderCourseCard}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="book-outline" size={64} color={colors.gray300} />
                        <Text style={styles.emptyTitle}>No Courses Yet</Text>
                        <Text style={styles.emptyText}>
                            You haven't enrolled in any courses yet.{'\n'}
                            Start exploring and find your perfect course!
                        </Text>
                        <TouchableOpacity style={styles.exploreButton}>
                            <Text style={styles.exploreButtonText}>Explore Courses</Text>
                        </TouchableOpacity>
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
    courseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    courseThumbnail: {
        width: 90,
        height: 70,
        borderRadius: borderRadius.md,
    },
    courseContent: {
        flex: 1,
        marginLeft: spacing.md,
    },
    courseCategory: {
        fontSize: fontSize.xs,
        color: colors.primary,
        fontWeight: '500',
        marginBottom: 2,
    },
    courseTitle: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: colors.gray200,
        borderRadius: 2,
        marginRight: spacing.sm,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.secondary,
        borderRadius: 2,
    },
    progressText: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        fontWeight: '500',
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
        lineHeight: 22,
        marginBottom: spacing.lg,
    },
    exploreButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.lg,
    },
    exploreButtonText: {
        color: colors.white,
        fontSize: fontSize.md,
        fontWeight: '600',
    },
});

export default MyCoursesScreen;
