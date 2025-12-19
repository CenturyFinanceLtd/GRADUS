/**
 * Blog Detail Screen
 * Shows full blog post content
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services';
import { MoreStackScreenProps } from '../../navigation/types';
import { Blog } from '../../types';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type Props = MoreStackScreenProps<'BlogDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BlogDetailScreen: React.FC<Props> = ({ route }) => {
    const { blogId, slug } = route.params;
    const [loading, setLoading] = useState(true);
    const [blog, setBlog] = useState<Blog | null>(null);

    useEffect(() => {
        const fetchBlog = async () => {
            try {
                const response = await apiClient.get(`/blogs/${slug || blogId}`);
                setBlog(response.blog || response);
            } catch (error) {
                console.error('Error fetching blog:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBlog();
    }, [blogId, slug]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!blog) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.gray400} />
                <Text style={styles.errorText}>Blog not found</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {blog.featuredImage && (
                <Image
                    source={{ uri: blog.featuredImage }}
                    style={styles.featuredImage}
                    resizeMode="cover"
                />
            )}

            <View style={styles.content}>
                <Text style={styles.category}>{blog.category || 'Article'}</Text>
                <Text style={styles.title}>{blog.title}</Text>

                <View style={styles.metaRow}>
                    {blog.author && (
                        <View style={styles.authorInfo}>
                            <Image
                                source={{ uri: blog.author.image || 'https://via.placeholder.com/40' }}
                                style={styles.authorImage}
                            />
                            <Text style={styles.authorName}>{blog.author.name}</Text>
                        </View>
                    )}
                    <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.metaText}>{blog.readTime || 5} min read</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.bodyText}>
                    {blog.content || blog.excerpt || 'No content available.'}
                </Text>

                {blog.tags && blog.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                        {blog.tags.map((tag, index) => (
                            <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>#{tag}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </ScrollView>
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
    featuredImage: {
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
        marginBottom: spacing.sm,
    },
    title: {
        fontSize: fontSize.xxl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        lineHeight: 32,
        marginBottom: spacing.md,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    authorImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: spacing.sm,
    },
    authorName: {
        fontSize: fontSize.sm,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginBottom: spacing.lg,
    },
    bodyText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        lineHeight: 26,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: spacing.lg,
    },
    tag: {
        backgroundColor: colors.gray100,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
    },
    tagText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
});

export default BlogDetailScreen;
