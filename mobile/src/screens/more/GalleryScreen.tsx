/**
 * Gallery Screen
 * Displays photo gallery in a grid layout
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Modal,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services';
import { MoreStackScreenProps } from '../../navigation/types';
import { GalleryItem } from '../../types';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type Props = MoreStackScreenProps<'Gallery'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GAP = spacing.xs;
const IMAGE_SIZE = (SCREEN_WIDTH - spacing.lg * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

const GalleryScreen: React.FC<Props> = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);

    const fetchGallery = async () => {
        try {
            const response = await apiClient.get('/gallery');
            setItems(response.gallery || response.items || response || []);
        } catch (error) {
            console.error('Error fetching gallery:', error);
            // Mock data for demo
            setItems([
                { _id: '1', image: 'https://picsum.photos/400/400?random=1', title: 'Event 1', category: 'Events' },
                { _id: '2', image: 'https://picsum.photos/400/400?random=2', title: 'Workshop', category: 'Workshops' },
                { _id: '3', image: 'https://picsum.photos/400/400?random=3', title: 'Graduation', category: 'Graduation' },
                { _id: '4', image: 'https://picsum.photos/400/400?random=4', title: 'Seminar', category: 'Events' },
                { _id: '5', image: 'https://picsum.photos/400/400?random=5', title: 'Team Outing', category: 'Team' },
                { _id: '6', image: 'https://picsum.photos/400/400?random=6', title: 'Award Ceremony', category: 'Awards' },
                { _id: '7', image: 'https://picsum.photos/400/400?random=7', title: 'Hackathon', category: 'Events' },
                { _id: '8', image: 'https://picsum.photos/400/400?random=8', title: 'Campus', category: 'Campus' },
                { _id: '9', image: 'https://picsum.photos/400/400?random=9', title: 'Classroom', category: 'Campus' },
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchGallery();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchGallery();
    };

    const renderItem = ({ item }: { item: GalleryItem }) => (
        <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => setSelectedImage(item)}
        >
            <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
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
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item._id}
                numColumns={NUM_COLUMNS}
                contentContainerStyle={styles.grid}
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
                        <Ionicons name="images-outline" size={64} color={colors.gray300} />
                        <Text style={styles.emptyTitle}>No Photos</Text>
                        <Text style={styles.emptyText}>Gallery is empty.</Text>
                    </View>
                }
            />

            {/* Image Modal */}
            <Modal
                visible={!!selectedImage}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setSelectedImage(null)}
                    >
                        <Ionicons name="close" size={28} color={colors.white} />
                    </TouchableOpacity>
                    {selectedImage && (
                        <View style={styles.modalContent}>
                            <Image
                                source={{ uri: selectedImage.image }}
                                style={styles.modalImage}
                                resizeMode="contain"
                            />
                            {selectedImage.title && (
                                <Text style={styles.modalTitle}>{selectedImage.title}</Text>
                            )}
                        </View>
                    )}
                </View>
            </Modal>
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
    grid: {
        padding: spacing.lg,
    },
    imageContainer: {
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        marginRight: GAP,
        marginBottom: GAP,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
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
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 1,
        padding: spacing.sm,
    },
    modalContent: {
        width: '100%',
        alignItems: 'center',
    },
    modalImage: {
        width: SCREEN_WIDTH - spacing.lg * 2,
        height: SCREEN_WIDTH - spacing.lg * 2,
    },
    modalTitle: {
        color: colors.white,
        fontSize: fontSize.lg,
        fontWeight: '500',
        marginTop: spacing.lg,
    },
});

export default GalleryScreen;
