import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { RootState } from '../store';
import { galleryAPI } from '../api/client';

interface EventItem {
    id: number;
    title: string;
    title_hi: string;
    event_date: string;
    cover_image: string | null;
    media_count: number;
    created_by_name: string;
}

export default function GalleryScreen({ navigation }: any) {
    const { t } = useTranslation();
    const language = useSelector((state: RootState) => state.app.language);
    const user = useSelector((state: RootState) => state.auth.user);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const canAddEvent = ['president', 'secretary', 'reporter'].includes(user?.role || '');

    const fetchEvents = async () => {
        try {
            const response = await galleryAPI.getAlbums();
            setEvents(response.data);
        } catch (error) {
            console.error('Fetch events error:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchEvents();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchEvents();
        setRefreshing(false);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const renderEventItem = ({ item }: { item: EventItem }) => {
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('EventDetails', { eventId: item.id, title: item.title })}
            >
                {/* Cover Image */}
                <View style={styles.imageContainer}>
                    {item.cover_image ? (
                        <Image
                            source={{ uri: item.cover_image }}
                            style={styles.coverImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.coverImage, styles.placeholderImage]}>
                            <Text style={styles.placeholderIcon}>🖼️</Text>
                        </View>
                    )}
                    <View style={styles.mediaCountBadge}>
                        <Text style={styles.mediaCountText}>
                            📷 {item.media_count}
                        </Text>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                    <Text style={styles.dateText}>{formatDate(item.event_date)}</Text>
                    <Text style={styles.titleText}>
                        {language === 'hi' && item.title_hi ? item.title_hi : item.title}
                    </Text>
                    <Text style={styles.authorText}>
                        Posted by {item.created_by_name}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1a5f2a" />
                </View>
            ) : (
                <FlatList
                    data={events}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderEventItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📷</Text>
                            <Text style={styles.emptyText}>No events yet</Text>
                        </View>
                    }
                />
            )}

            {/* Floating Action Button for Admins */}
            {canAddEvent && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('AddEvent')}
                >
                    <Text style={styles.fabIcon}>+</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 80, // Space for FAB
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    imageContainer: {
        position: 'relative',
        height: 180,
    },
    coverImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#eee',
    },
    placeholderImage: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
    },
    placeholderIcon: {
        fontSize: 48,
    },
    mediaCountBadge: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    mediaCountText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardContent: {
        padding: 12,
    },
    dateText: {
        fontSize: 12,
        color: '#1a5f2a',
        fontWeight: '600',
        marginBottom: 4,
    },
    titleText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    authorText: {
        fontSize: 12,
        color: '#999',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 10,
        color: '#ccc',
    },
    emptyText: {
        fontSize: 16,
        color: '#888',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1a5f2a',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
    },
    fabIcon: {
        fontSize: 32,
        color: '#fff',
        marginTop: -3,
    },
});
