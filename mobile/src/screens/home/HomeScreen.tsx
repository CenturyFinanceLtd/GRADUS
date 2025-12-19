/**
 * Home Screen
 * Main app landing screen with courses, blogs, and events
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context';
import { apiClient } from '../../services';
import { HomeStackScreenProps } from '../../navigation/types';
import { Course, Blog, Event } from '../../types';
import { colors, spacing, fontSize, borderRadius, gradients } from '../../theme';

type Props = HomeStackScreenProps<'Home'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [events, setEvents] = useState<Event[]>([]);

    const fetchData = async () => {
        try {
            const [coursesRes, blogsRes, eventsRes] = await Promise.all([
                apiClient.get('/courses/featured').catch(() => ({ courses: [] })),
                apiClient.get('/blogs?limit=5').catch(() => ({ blogs: [] })),
                apiClient.get('/events?limit=5').catch(() => ({ events: [] })),
            ]);

            setCourses(coursesRes.courses || coursesRes || []);
            setBlogs(blogsRes.blogs || blogsRes || []);
            setEvents(eventsRes.events || eventsRes || []);
        } catch (error) {
            console.error('Error fetching home data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Student'}!</Text>
                        <Text style={styles.subtitle}>What would you like to learn today?</Text>
                    </View>
                    <TouchableOpacity style={styles.notificationButton}>
                        <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Hero Banner */}
                <LinearGradient
                    colors={gradients.hero as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroBanner}
                >
                    <View style={styles.heroContent}>
                        <Text style={styles.heroTitle}>Start Your Learning Journey</Text>
                        <Text style={styles.heroSubtitle}>
                            Explore 100+ courses from industry experts
                        </Text>
                        <TouchableOpacity style={styles.heroButton}>
                            <Text style={styles.heroButtonText}>Explore Courses</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* Quick Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Ionicons name="book" size={24} color={colors.primary} />
                        <Text style={styles.statNumber}>100+</Text>
                        <Text style={styles.statLabel}>Courses</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="people" size={24} color={colors.secondary} />
                        <Text style={styles.statNumber}>5000+</Text>
                        <Text style={styles.statLabel}>Students</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="trophy" size={24} color={colors.warning} />
                        <Text style={styles.statNumber}>50+</Text>
                        <Text style={styles.statLabel}>Experts</Text>
                    </View>
                </View>

                {/* Featured Courses */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Featured Courses</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalScroll}
                    >
                        {courses.length > 0 ? (
                            courses.map((course) => (
                                <TouchableOpacity
                                    key={course._id}
                                    style={styles.courseCard}
                                    onPress={() => navigation.navigate('CourseDetail', { courseId: course._id, slug: course.slug })}
                                >
                                    <Image
                                        source={{ uri: course.thumbnail || 'https://via.placeholder.com/300x200' }}
                                        style={styles.courseImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.courseContent}>
                                        <Text style={styles.courseCategory}>{course.category || 'Course'}</Text>
                                        <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                                        <View style={styles.courseFooter}>
                                            <View style={styles.ratingContainer}>
                                                <Ionicons name="star" size={14} color={colors.warning} />
                                                <Text style={styles.rating}>{course.rating || '4.5'}</Text>
                                            </View>
                                            <Text style={styles.price}>
                                                {course.discountedPrice ? `₹${course.discountedPrice}` : course.price ? `₹${course.price}` : 'Free'}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No courses available</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* Latest Blogs */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Latest from Blog</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    {blogs.length > 0 ? (
                        blogs.slice(0, 3).map((blog) => (
                            <TouchableOpacity
                                key={blog._id}
                                style={styles.blogCard}
                                onPress={() => navigation.navigate('BlogDetail', { blogId: blog._id, slug: blog.slug })}
                            >
                                <Image
                                    source={{ uri: blog.featuredImage || 'https://via.placeholder.com/100x100' }}
                                    style={styles.blogImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.blogContent}>
                                    <Text style={styles.blogCategory}>{blog.category || 'Article'}</Text>
                                    <Text style={styles.blogTitle} numberOfLines={2}>{blog.title}</Text>
                                    <View style={styles.blogMeta}>
                                        <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                                        <Text style={styles.blogMetaText}>{blog.readTime || 5} min read</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No blogs available</Text>
                        </View>
                    )}
                </View>

                {/* Upcoming Events */}
                <View style={[styles.section, { marginBottom: spacing.xxl }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Upcoming Events</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalScroll}
                    >
                        {events.length > 0 ? (
                            events.map((event) => (
                                <TouchableOpacity
                                    key={event._id}
                                    style={styles.eventCard}
                                    onPress={() => navigation.navigate('EventDetail', { eventId: event._id, slug: event.slug })}
                                >
                                    <Image
                                        source={{ uri: event.image || 'https://via.placeholder.com/200x120' }}
                                        style={styles.eventImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.eventContent}>
                                        <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                                        <View style={styles.eventMeta}>
                                            <Ionicons name="calendar-outline" size={12} color={colors.primary} />
                                            <Text style={styles.eventDate}>
                                                {new Date(event.startDate).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                })}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No events scheduled</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </ScrollView>
        </SafeAreaView>
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
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    greeting: {
        fontSize: fontSize.xxl,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroBanner: {
        marginHorizontal: spacing.lg,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    heroContent: {
        paddingVertical: spacing.md,
    },
    heroTitle: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.white,
        marginBottom: spacing.xs,
    },
    heroSubtitle: {
        fontSize: fontSize.sm,
        color: colors.white,
        opacity: 0.9,
        marginBottom: spacing.md,
    },
    heroButton: {
        backgroundColor: colors.white,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        alignSelf: 'flex-start',
    },
    heroButtonText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: fontSize.sm,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.gray50,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginHorizontal: spacing.xs,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: fontSize.lg,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginTop: spacing.xs,
    },
    statLabel: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    seeAllText: {
        fontSize: fontSize.sm,
        color: colors.primary,
        fontWeight: '500',
    },
    horizontalScroll: {
        paddingHorizontal: spacing.lg,
    },
    courseCard: {
        width: CARD_WIDTH,
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        marginRight: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    courseImage: {
        width: '100%',
        height: 140,
        borderTopLeftRadius: borderRadius.lg,
        borderTopRightRadius: borderRadius.lg,
    },
    courseContent: {
        padding: spacing.md,
    },
    courseCategory: {
        fontSize: fontSize.xs,
        color: colors.primary,
        fontWeight: '500',
        marginBottom: spacing.xs,
    },
    courseTitle: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    courseFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rating: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
    },
    price: {
        fontSize: fontSize.md,
        fontWeight: 'bold',
        color: colors.secondary,
    },
    blogCard: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
        padding: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    blogImage: {
        width: 80,
        height: 80,
        borderRadius: borderRadius.md,
    },
    blogContent: {
        flex: 1,
        marginLeft: spacing.md,
        justifyContent: 'center',
    },
    blogCategory: {
        fontSize: fontSize.xs,
        color: colors.primary,
        fontWeight: '500',
        marginBottom: spacing.xs,
    },
    blogTitle: {
        fontSize: fontSize.md,
        fontWeight: '500',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    blogMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    blogMetaText: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
    },
    eventCard: {
        width: 180,
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        marginRight: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    eventImage: {
        width: '100%',
        height: 100,
        borderTopLeftRadius: borderRadius.lg,
        borderTopRightRadius: borderRadius.lg,
    },
    eventContent: {
        padding: spacing.sm,
    },
    eventTitle: {
        fontSize: fontSize.sm,
        fontWeight: '500',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    eventMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eventDate: {
        fontSize: fontSize.xs,
        color: colors.primary,
        fontWeight: '500',
        marginLeft: spacing.xs,
    },
    emptyState: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
});

export default HomeScreen;
