import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Image,
    Linking,
    Modal,
    Alert,
    Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { newsAPI } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FilterDropdown from '../components/FilterDropdown';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NewsItem {
    id: number;
    title: string;
    title_hi: string;
    content: string;
    content_hi: string;
    youtube_url: string | null;
    category: string;
    scope: string;
    posted_by: number;
    posted_by_name: string;
    posted_by_role: string;
    created_at: string;
    likes: number;
    loves: number;
    celebrates: number;
    media: { id: number; media_url: string }[];
    user_reaction: 'like' | 'love' | 'celebrate' | null;
}

const NEWS_CACHE_KEY = 'cached_news';

const CATEGORIES = [
    { id: 'all', label: 'All Category' },
    { id: 'general', label: 'General' },
    { id: 'sports', label: 'Sports' },
    { id: 'political', label: 'Political' },
    { id: 'cultural', label: 'Cultural' },
    { id: 'entertainment', label: 'Entertainment' },
    { id: 'talent', label: 'Talent' },
    { id: 'education', label: 'Education' },
    { id: 'health', label: 'Health' },
    { id: 'science', label: 'Science' },
];

const SCOPES = [
    { id: 'all', label: 'All Region' },
    { id: 'village', label: 'Village' },
    { id: 'district', label: 'District' },
    { id: 'state', label: 'State' },
    { id: 'country', label: 'Country' },
    { id: 'international', label: 'World' },
];

const SORT_OPTIONS = [
    { id: 'latest', label: 'Latest' },
    { id: 'likes', label: 'Most Liked' },
    { id: 'views', label: 'Most Viewed' },
];

// Extract YouTube video ID from URL
const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
};

export default function NewsScreen({ navigation }: any) {
    const { t } = useTranslation();
    const language = useSelector((state: RootState) => state.app.language);
    const user = useSelector((state: RootState) => state.auth.user);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Filters
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [scopeFilter, setScopeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('latest');

    const canPostNews = ['reporter', 'cashier', 'secretary', 'president'].includes(user?.role || '');
    const isPresident = user?.role === 'president';

    const fetchNews = async () => {
        try {
            const params: any = { limit: 50, sortBy };
            if (categoryFilter !== 'all') params.category = categoryFilter;
            if (scopeFilter !== 'all') params.scope = scopeFilter;

            const response = await newsAPI.getAll(params);
            setNews(response.data);
            await AsyncStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(response.data));
        } catch (error) {
            console.error('Fetch news error:', error);
            const cached = await AsyncStorage.getItem(NEWS_CACHE_KEY);
            if (cached) {
                setNews(JSON.parse(cached));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [categoryFilter, scopeFilter, sortBy]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchNews();
        setRefreshing(false);
    };

    const handleReaction = async (newsId: number, reaction: 'like' | 'love' | 'celebrate') => {
        try {
            await newsAPI.react(newsId, reaction);
            fetchNews();
        } catch (error) {
            console.error('Reaction error:', error);
        }
    };

    const handleDelete = (item: NewsItem) => {
        const canDelete = item.posted_by === user?.id || isPresident;
        if (!canDelete) return;

        Alert.alert(
            'Delete Post',
            'Are you sure you want to delete this news post?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await newsAPI.delete(item.id);
                            fetchNews();
                            Alert.alert('Success', 'News deleted successfully');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete news');
                        }
                    },
                },
            ]
        );
    };

    const handleEdit = (item: NewsItem) => {
        if (item.posted_by !== user?.id) return;
        navigation.navigate('PostNews', { editMode: true, newsItem: item });
    };

    const openYouTube = (url: string) => {
        Linking.openURL(url);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const getCategoryLabel = (cat: string) => {
        return CATEGORIES.find(c => c.id === cat)?.label || cat;
    };

    const getScopeLabel = (scope: string) => {
        return SCOPES.find(s => s.id === scope)?.label || scope;
    };

    const renderNewsItem = ({ item }: { item: NewsItem }) => {
        const youtubeId = getYouTubeVideoId(item.youtube_url || '');
        const thumbnailUrl = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null;
        const hasMedia = item.media && item.media.length > 0;
        const heroImage = hasMedia
            ? `http://10.0.2.2:3000${item.media[0].media_url}`
            : thumbnailUrl;

        const canEdit = item.posted_by === user?.id;
        const canDelete = item.posted_by === user?.id || isPresident;

        return (
            <View style={styles.newsCard}>
                {/* Hero Image */}
                {heroImage && (
                    <TouchableOpacity
                        style={styles.heroContainer}
                        onPress={() => item.youtube_url && openYouTube(item.youtube_url)}
                        disabled={!item.youtube_url}
                    >
                        <Image
                            source={{ uri: heroImage }}
                            style={styles.heroImage}
                            resizeMode="cover"
                        />
                        {thumbnailUrl && !hasMedia && (
                            <View style={styles.playOverlay}>
                                <Text style={styles.playIcon}>▶</Text>
                            </View>
                        )}
                        {/* Category Badge on Image */}
                        <View style={styles.categoryBadgeOnImage}>
                            <Text style={styles.categoryBadgeText}>
                                {getCategoryLabel(item.category)}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Content */}
                <View style={styles.cardContent}>
                    {/* Badges Row */}
                    <View style={styles.badgesRow}>
                        {!heroImage && (
                            <View style={[styles.badge, styles.categoryBadge]}>
                                <Text style={styles.badgeText}>{getCategoryLabel(item.category)}</Text>
                            </View>
                        )}
                        <View style={[styles.badge, styles.scopeBadge]}>
                            <Text style={styles.badgeText}>{getScopeLabel(item.scope)}</Text>
                        </View>
                        <Text style={styles.timeText}>{formatDate(item.created_at)}</Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.newsTitle}>
                        {language === 'hi' && item.title_hi ? item.title_hi : item.title}
                    </Text>

                    {/* Content Preview */}
                    <Text style={styles.newsContent} numberOfLines={3}>
                        {language === 'hi' && item.content_hi ? item.content_hi : item.content}
                    </Text>

                    {/* Author + Actions Row */}
                    <View style={styles.authorActionsRow}>
                        <View style={styles.authorRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {item.posted_by_name?.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text style={styles.authorName}>{item.posted_by_name}</Text>
                        </View>

                        {/* Edit/Delete Actions */}
                        {(canEdit || canDelete) && (
                            <View style={styles.actionButtons}>
                                {canEdit && (
                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={() => handleEdit(item)}
                                    >
                                        <Text style={styles.editBtnText}>✏️ Edit</Text>
                                    </TouchableOpacity>
                                )}
                                {canDelete && (
                                    <TouchableOpacity
                                        style={[styles.actionBtn, styles.deleteBtn]}
                                        onPress={() => handleDelete(item)}
                                    >
                                        <Text style={styles.deleteBtnText}>🗑️</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Reactions */}
                    <View style={styles.reactionsRow}>
                        <TouchableOpacity
                            style={[styles.reactionButton, item.user_reaction === 'like' && styles.activeReaction]}
                            onPress={() => handleReaction(item.id, 'like')}
                        >
                            <Text style={styles.reactionEmoji}>👍</Text>
                            <Text style={styles.reactionCount}>{item.likes}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.reactionButton, item.user_reaction === 'love' && styles.activeReaction]}
                            onPress={() => handleReaction(item.id, 'love')}
                        >
                            <Text style={styles.reactionEmoji}>❤️</Text>
                            <Text style={styles.reactionCount}>{item.loves}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.reactionButton, item.user_reaction === 'celebrate' && styles.activeReaction]}
                            onPress={() => handleReaction(item.id, 'celebrate')}
                        >
                            <Text style={styles.reactionEmoji}>🎉</Text>
                            <Text style={styles.reactionCount}>{item.celebrates}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={news}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderNewsItem}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>📰</Text>
                            <Text style={styles.emptyText}>No news found</Text>
                            <Text style={styles.emptySubtext}>Try changing your filters</Text>
                        </View>
                    ) : null
                }
            />

            {/* Bottom Filter Bar */}
            <View style={styles.bottomSection}>
                {/* Filters Row */}
                <View style={styles.filterBar}>
                    <View style={styles.filterItem}>
                        <FilterDropdown
                            options={CATEGORIES}
                            selectedValue={categoryFilter}
                            onValueChange={setCategoryFilter}
                        />
                    </View>

                    <View style={styles.filterItem}>
                        <FilterDropdown
                            options={SCOPES}
                            selectedValue={scopeFilter}
                            onValueChange={setScopeFilter}
                        />
                    </View>

                    <View style={styles.filterItem}>
                        <FilterDropdown
                            options={SORT_OPTIONS}
                            selectedValue={sortBy}
                            onValueChange={setSortBy}
                        />
                    </View>
                </View>

                {/* Post News Button */}
                {canPostNews && (
                    <TouchableOpacity
                        style={styles.postButton}
                        onPress={() => navigation.navigate('PostNews')}
                    >
                        <Text style={styles.postButtonText}>+ Post News</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f5',
    },
    bottomSection: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingBottom: 8,
    },
    filterBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 8,
        gap: 8,
    },
    filterItem: {
        flex: 1,
    },
    listContent: {
        padding: 12,
        paddingBottom: 20,
    },
    newsCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    heroContainer: {
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: 200,
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        fontSize: 48,
        color: '#fff',
    },
    categoryBadgeOnImage: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(26, 95, 42, 0.9)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    cardContent: {
        padding: 16,
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        flexWrap: 'wrap',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryBadge: {
        backgroundColor: '#e8f5e9',
    },
    scopeBadge: {
        backgroundColor: '#e3f2fd',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#333',
    },
    timeText: {
        fontSize: 12,
        color: '#999',
        marginLeft: 'auto',
    },
    newsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
        lineHeight: 24,
    },
    newsContent: {
        fontSize: 14,
        color: '#666',
        lineHeight: 21,
        marginBottom: 12,
    },
    authorActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1a5f2a',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    authorName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
    },
    deleteBtn: {
        backgroundColor: '#ffebee',
    },
    editBtnText: {
        fontSize: 12,
        color: '#1976d2',
    },
    deleteBtnText: {
        fontSize: 12,
    },
    reactionsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    reactionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
    },
    activeReaction: {
        backgroundColor: '#e8f5e9',
    },
    reactionEmoji: {
        fontSize: 16,
        marginRight: 4,
    },
    reactionCount: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 4,
    },
    postButton: {
        marginHorizontal: 12,
        marginTop: 4,
        marginBottom: 8,
        backgroundColor: '#1a5f2a',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        shadowColor: '#1a5f2a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    postButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
