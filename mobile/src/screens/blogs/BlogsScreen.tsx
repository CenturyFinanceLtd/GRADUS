/**
 * Blogs Screen
 * Shows list of blog posts
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
import { MoreStackScreenProps } from '../../navigation/types';
import { Blog } from '../../types';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type Props = MoreStackScreenProps<'Blogs'>;

const BlogsScreen: React.FC<Props> = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [blogs, setBlogs] = useState<Blog[]>([]);

    const fetchBlogs = async () => {
        try {
            const response = await apiClient.get('/blogs');
            setBlogs(response.blogs || response || []);
        } catch (error) {
            console.error('Error fetching blogs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBlogs();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBlogs();
    };

    const renderBlogCard = ({ item: blog }: { item: Blog }) => (
        <TouchableOpacity
            style={styles.blogCard}
            onPress={() => navigation.navigate('BlogDetail', { blogId: blog._id, slug: blog.slug })}
        >
            <Image
                source={{ uri: blog.featuredImage || 'https://via.placeholder.com/400x200' }}
                style={styles.blogImage}
                resizeMode="cover"
            />
            <View style={styles.blogContent}>
                <Text style={styles.blogCategory}>{blog.category || 'Article'}</Text>
                <Text style={styles.blogTitle} numberOfLines={2}>{blog.title}</Text>
                {blog.excerpt && (
                    <Text style={styles.blogExcerpt} numberOfLines={2}>{blog.excerpt}</Text>
                )}
                <View style={styles.blogMeta}>
                    <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.metaText}>{blog.readTime || 5} min read</Text>
                    </View>
                    {blog.publishedAt && (
                        <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                            <Text style={styles.metaText}>
                                {new Date(blog.publishedAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                })}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
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
                data={blogs}
                renderItem={renderBlogCard}
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
                        <Ionicons name="document-text-outline" size={64} color={colors.gray300} />
                        <Text style={styles.emptyTitle}>No Blogs Yet</Text>
                        <Text style={styles.emptyText}>Check back later for new articles.</Text>
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
    blogCard: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        overflow: 'hidden',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    blogImage: {
        width: '100%',
        height: 180,
    },
    blogContent: {
        padding: spacing.md,
    },
    blogCategory: {
        fontSize: fontSize.xs,
        color: colors.primary,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    blogTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    blogExcerpt: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: spacing.sm,
    },
    blogMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    metaText: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
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

export default BlogsScreen;
