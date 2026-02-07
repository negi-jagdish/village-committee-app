import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    Alert,
    Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { galleryAPI } from '../api/client';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - 48) / COLUMN_COUNT; // 48 = padding (16*2) + gap (16)

interface MediaItem {
    id: number;
    type: 'image' | 'video';
    url: string;
    caption: string | null;
}

interface EventDetails {
    id: number;
    title: string;
    description: string;
    media: MediaItem[];
}

export default function EventDetailsScreen({ route, navigation }: any) {
    const { eventId, title } = route.params;
    const user = useSelector((state: RootState) => state.auth.user);
    const [event, setEvent] = useState<EventDetails | null>(null);
    const [loading, setLoading] = useState(true);

    const canEdit = ['president', 'secretary', 'reporter'].includes(user?.role || '');

    useEffect(() => {
        navigation.setOptions({ title });
    }, [title]);

    const fetchDetails = async () => {
        try {
            const response = await galleryAPI.getEventDetails(eventId);
            setEvent(response.data);
        } catch (error) {
            console.error('Fetch event details error:', error);
            Alert.alert('Error', 'Failed to load event details');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchDetails();
        }, [eventId])
    );

    const handleDeleteMedia = (mediaId: number) => {
        Alert.alert('Delete', 'Are you sure you want to delete this item?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await galleryAPI.deleteMedia(mediaId);
                        fetchDetails(); // Refresh
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete item');
                    }
                }
            }
        ]);
    };

    const openMedia = (item: MediaItem) => {
        if (item.type === 'video') {
            Linking.openURL(item.url);
        } else {
            // For now, just open in browser or show simple Alert. 
            // In a real app we'd use a Lightbox.
            Linking.openURL(item.url).catch(() => {
                Alert.alert('Image', 'Cannot open image URL');
            });
        }
    };

    const renderMediaItem = ({ item }: { item: MediaItem }) => {
        const isVideo = item.type === 'video';

        // Simple YouTube Thumbnail Logic
        let imageUrl = item.url;
        if (isVideo && item.url.includes('youtube')) {
            const videoId = item.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1];
            if (videoId) {
                imageUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
        }

        return (
            <TouchableOpacity
                style={styles.mediaItem}
                onPress={() => openMedia(item)}
                onLongPress={() => canEdit && handleDeleteMedia(item.id)}
                delayLongPress={500}
            >
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                />
                {isVideo && (
                    <View style={styles.videoOverlay}>
                        <Text style={styles.playIcon}>▶</Text>
                    </View>
                )}
                {canEdit && (
                    <View style={styles.deleteBadge}>
                        <Text style={styles.deleteIcon}>🗑️</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{event?.title}</Text>
                {event?.description && (
                    <Text style={styles.description}>{event.description}</Text>
                )}
            </View>

            <FlatList
                data={event?.media || []}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderMediaItem}
                numColumns={COLUMN_COUNT}
                contentContainerStyle={styles.gridContent}
                columnWrapperStyle={styles.rowWrapper}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No photos or videos yet.</Text>
                    </View>
                }
            />

            {canEdit && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('AddMedia', { eventId })}
                >
                    <Text style={styles.fabIcon}>📷+</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 16,
        backgroundColor: '#f9f9f9',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    description: {
        marginTop: 4,
        color: '#666',
        fontSize: 14,
    },
    gridContent: {
        padding: 16,
        paddingBottom: 100,
    },
    rowWrapper: {
        gap: 16,
        marginBottom: 16,
    },
    mediaItem: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH, // Square
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#eee',
        position: 'relative',
    },
    mediaImage: {
        width: '100%',
        height: '100%',
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        fontSize: 32,
        color: '#fff',
    },
    deleteBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteIcon: {
        fontSize: 10,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        backgroundColor: '#1a5f2a',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 28,
        elevation: 6,
        flexDirection: 'row',
        alignItems: 'center',
    },
    fabIcon: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
