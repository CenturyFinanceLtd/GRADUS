/**
 * Events Screen
 * Displays upcoming and past events
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
import { Event } from '../../types';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type Props = MoreStackScreenProps<'Events'>;

const EventsScreen: React.FC<Props> = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [events, setEvents] = useState<Event[]>([]);

    const fetchEvents = async () => {
        try {
            const response = await apiClient.get('/events');
            setEvents(response.events || response || []);
        } catch (error) {
            console.error('Error fetching events:', error);
            // Mock data for demo
            setEvents([
                {
                    _id: '1',
                    title: 'Stock Market Masterclass',
                    slug: 'stock-market-masterclass',
                    description: 'Learn the fundamentals of stock market investing from industry experts.',
                    image: 'https://picsum.photos/400/200?random=10',
                    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    location: 'Online',
                    isOnline: true,
                },
                {
                    _id: '2',
                    title: 'Career Workshop 2024',
                    slug: 'career-workshop-2024',
                    description: 'Interactive workshop on resume building and interview skills.',
                    image: 'https://picsum.photos/400/200?random=11',
                    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                    location: 'Mumbai, India',
                    isOnline: false,
                },
                {
                    _id: '3',
                    title: 'Alumni Meetup',
                    slug: 'alumni-meetup',
                    description: 'Connect with fellow GRADUS alumni and expand your network.',
                    image: 'https://picsum.photos/400/200?random=12',
                    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    location: 'Delhi, India',
                    isOnline: false,
                },
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchEvents();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
            day: date.getDate(),
            month: date.toLocaleDateString('en-IN', { month: 'short' }),
            full: date.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }),
        };
    };

    const renderEventCard = ({ item: event }: { item: Event }) => {
        const date = formatDate(event.startDate);

        return (
            <TouchableOpacity
                style={styles.eventCard}
                onPress={() => navigation.navigate('EventDetail', { eventId: event._id, slug: event.slug })}
            >
                <Image
                    source={{ uri: event.image || 'https://via.placeholder.com/400x200' }}
                    style={styles.eventImage}
                    resizeMode="cover"
                />

                {/* Date Badge */}
                <View style={styles.dateBadge}>
                    <Text style={styles.dateDay}>{date.day}</Text>
                    <Text style={styles.dateMonth}>{date.month}</Text>
                </View>

                <View style={styles.eventContent}>
                    <View style={styles.eventMeta}>
                        <View style={[styles.statusBadge, event.isOnline && styles.onlineBadge]}>
                            <Ionicons
                                name={event.isOnline ? 'videocam' : 'location'}
                                size={12}
                                color={event.isOnline ? colors.secondary : colors.primary}
                            />
                            <Text style={[styles.statusText, event.isOnline && styles.onlineText]}>
                                {event.isOnline ? 'Online' : 'In Person'}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>

                    {event.location && (
                        <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                            <Text style={styles.locationText}>{event.location}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

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
                data={events}
                renderItem={renderEventCard}
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
                        <Ionicons name="calendar-outline" size={64} color={colors.gray300} />
                        <Text style={styles.emptyTitle}>No Events</Text>
                        <Text style={styles.emptyText}>No upcoming events at the moment.</Text>
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
    eventCard: {
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
    eventImage: {
        width: '100%',
        height: 150,
    },
    dateBadge: {
        position: 'absolute',
        top: spacing.md,
        left: spacing.md,
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        alignItems: 'center',
        minWidth: 50,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dateDay: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.primary,
    },
    dateMonth: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        textTransform: 'uppercase',
    },
    eventContent: {
        padding: spacing.md,
    },
    eventMeta: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primaryLight + '30',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    onlineBadge: {
        backgroundColor: colors.secondaryLight + '30',
    },
    statusText: {
        fontSize: fontSize.xs,
        color: colors.primary,
        fontWeight: '500',
        marginLeft: spacing.xs,
    },
    onlineText: {
        color: colors.secondary,
    },
    eventTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        fontSize: fontSize.sm,
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

export default EventsScreen;
