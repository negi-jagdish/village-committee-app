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
import { newsAPI, pollsAPI, API_BASE_URL } from '../api/client';
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
    status: string;
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
    const [polls, setPolls] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Filters
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [scopeFilter, setScopeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('latest');
    const [showArchived, setShowArchived] = useState(false);

    const canPostNews = ['reporter', 'cashier', 'secretary', 'president'].includes(user?.role || '');
    const isPresident = user?.role === 'president';
    const canCreatePoll = user?.role === 'president' || user?.role === 'secretary';

    const fetchData = async () => {
        try {
            const params: any = { limit: 50, sortBy, status: showArchived ? 'archived' : 'active' };
            if (categoryFilter !== 'all') params.category = categoryFilter;
            if (scopeFilter !== 'all') params.scope = scopeFilter;

            const [newsRes, pollsRes] = await Promise.all([
                newsAPI.getAll(params),
                pollsAPI.getActive()
            ]);

            setNews(newsRes.data);

            // Filter polls: Members see only unvoted polls. Admins see all.
            const visiblePolls = pollsRes.data.filter((p: any) => canCreatePoll || !p.has_voted);
            setPolls(visiblePolls);

            await AsyncStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(newsRes.data));
        } catch (error) {
            console.error('Fetch error:', error);
            const cached = await AsyncStorage.getItem(NEWS_CACHE_KEY);
            if (cached) {
                setNews(JSON.parse(cached));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [categoryFilter, scopeFilter, sortBy, showArchived]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleReaction = async (newsId: number, reaction: 'like' | 'love' | 'celebrate') => {
        try {
            await newsAPI.react(newsId, reaction);
            fetchData();
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
                            fetchData();
                            Alert.alert('Success', 'News deleted successfully');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete news');
                        }
                    },
                },
            ]
        );
    };

    const handleArchive = async (item: NewsItem) => {
        const isArchived = item.status === 'archived';
        Alert.alert(
            isArchived ? 'Restore News' : 'Archive News',
            isArchived
                ? 'This news will be visible in the feed again.'
                : 'This news will be hidden from the feed but can be found in Archived.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: isArchived ? 'Restore' : 'Archive',
                    onPress: async () => {
                        try {
                            await newsAPI.archive(item.id);
                            fetchData();
                            Alert.alert('Success', `News ${isArchived ? 'restored' : 'archived'} successfully`);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to update news status');
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

    const renderPollItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.pollCard}
            onPress={() => navigation.navigate('PollDetails', { pollId: item.id })}
        >
            {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.pollImage} resizeMode="cover" />
            ) : (
                <View style={[styles.pollImage, { backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 40 }}>📊</Text>
                </View>
            )}
            <View style={styles.pollContent}>
                <View style={styles.pollBadge}>
                    <Text style={styles.pollBadgeText}>Active Poll</Text>
                </View>
                {item.has_voted && (
                    <View style={[styles.pollBadge, { backgroundColor: '#e8f5e9', marginLeft: 8 }]}>
                        <Text style={[styles.pollBadgeText, { color: '#1a5f2a' }]}>✓ Voted</Text>
                    </View>
                )}
                <Text style={styles.pollTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.pollMeta}>Ends: {new Date(item.end_at).toLocaleDateString()}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderHeader = () => {
        if (polls.length === 0 && !canCreatePoll) return null;

        return (
            <View style={styles.carouselContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 16 }}>
                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>📢 Active Polls</Text>
                    {canCreatePoll && (
                        <TouchableOpacity onPress={() => navigation.navigate('CreatePoll')}>
                            <Text style={{ color: '#4caf50', fontWeight: 'bold' }}>+ Create Poll</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {polls.length > 0 ? (
                    <FlatList
                        data={polls}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        renderItem={renderPollItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                    />
                ) : (
                    <View style={{ padding: 16, alignItems: 'center', backgroundColor: '#252525', marginHorizontal: 16, borderRadius: 8 }}>
                        <Text style={{ color: '#888' }}>No active polls.</Text>
                    </View>
                )}
            </View>
        );
    };

    const renderNewsItem = ({ item }: { item: NewsItem }) => {
        const youtubeId = getYouTubeVideoId(item.youtube_url || '');
        const thumbnailUrl = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null;
        const hasMedia = item.media && item.media.length > 0;
        const heroImage = hasMedia
            ? (item.media[0].media_url.startsWith('http')
                ? item.media[0].media_url
                : `${API_BASE_URL.replace('/api', '')}${item.media[0].media_url}`)
            : thumbnailUrl;

        const canEdit = item.posted_by === user?.id;
        const canDelete = item.posted_by === user?.id || isPresident;
        const displayTitle = language === 'hi' && item.title_hi ? item.title_hi : item.title;

        return (
            <TouchableOpacity
                style={styles.newsCard}
                onPress={() => navigation.navigate('NewsDetails', { newsId: item.id, newsItem: item })}
                activeOpacity={0.85}
            >
                {/* Horizontal Layout: Image Left + Title Right */}
                <View style={styles.cardRow}>
                    {/* Thumbnail */}
                    <View style={styles.thumbnailContainer}>
                        {heroImage ? (
                            <Image source={{ uri: heroImage }} style={styles.thumbnail} resizeMode="cover" />
                        ) : (
                            <View style={styles.thumbnailPlaceholder}>
                                <Text style={{ fontSize: 32, color: '#555' }}>📰</Text>
                            </View>
                        )}
                        {/* Play button overlay for YouTube */}
                        {youtubeId && (
                            <View style={styles.playOverlay}>
                                <View style={styles.playButton}>
                                    <Text style={styles.playIcon}>▶</Text>
                                </View>
                            </View>
                        )}
                        {/* Category chip on image */}
                        <View style={styles.categoryChip}>
                            <Text style={styles.categoryChipText}>
                                {getCategoryLabel(item.category)}
                            </Text>
                        </View>
                    </View>

                    {/* Right side: Title + Meta */}
                    <View style={styles.cardTextContent}>
                        <Text style={styles.newsTitle} numberOfLines={4}>
                            {displayTitle}
                        </Text>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaText}>{item.posted_by_name}</Text>
                            <Text style={styles.metaDot}>•</Text>
                            <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
                        </View>
                    </View>
                </View>

                {/* Bottom bar: Reactions + Actions */}
                <View style={styles.cardBottomBar}>
                    <View style={styles.reactionsRow}>
                        <TouchableOpacity
                            style={[styles.reactionButton, item.user_reaction === 'like' && styles.activeReaction]}
                            onPress={(e) => { e.stopPropagation(); handleReaction(item.id, 'like'); }}
                        >
                            <Text style={styles.reactionEmoji}>👍</Text>
                            <Text style={styles.reactionCount}>{item.likes || 0}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.reactionButton, item.user_reaction === 'love' && styles.activeReaction]}
                            onPress={(e) => { e.stopPropagation(); handleReaction(item.id, 'love'); }}
                        >
                            <Text style={styles.reactionEmoji}>❤️</Text>
                            <Text style={styles.reactionCount}>{item.loves || 0}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.reactionButton, item.user_reaction === 'celebrate' && styles.activeReaction]}
                            onPress={(e) => { e.stopPropagation(); handleReaction(item.id, 'celebrate'); }}
                        >
                            <Text style={styles.reactionEmoji}>🎉</Text>
                            <Text style={styles.reactionCount}>{item.celebrates || 0}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Actions */}
                    {(canEdit || canDelete) && (
                        <View style={styles.actionButtons}>
                            {canEdit && (
                                <TouchableOpacity style={styles.actionBtn}
                                    onPress={(e) => { e.stopPropagation(); handleEdit(item); }}>
                                    <Text style={styles.actionBtnText}>✏️</Text>
                                </TouchableOpacity>
                            )}
                            {canDelete && (
                                <TouchableOpacity style={styles.actionBtn}
                                    onPress={(e) => { e.stopPropagation(); handleArchive(item); }}>
                                    <Text style={styles.actionBtnText}>{item.status === 'archived' ? '📤' : '📥'}</Text>
                                </TouchableOpacity>
                            )}
                            {canDelete && (
                                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]}
                                    onPress={(e) => { e.stopPropagation(); handleDelete(item); }}>
                                    <Text style={styles.actionBtnText}>🗑️</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                ListHeaderComponent={renderHeader}
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

                {/* Archive Toggle */}
                {canPostNews && (
                    <TouchableOpacity
                        style={[styles.archiveToggle, showArchived && styles.archiveToggleActive]}
                        onPress={() => setShowArchived(!showArchived)}
                    >
                        <Text style={[styles.archiveToggleText, showArchived && styles.archiveToggleTextActive]}>
                            {showArchived ? '📤 Show Active' : '📥 Archived'}
                        </Text>
                    </TouchableOpacity>
                )}

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
        backgroundColor: '#111',
    },
    bottomSection: {
        backgroundColor: '#1a1a1a',
        borderTopWidth: 1,
        borderTopColor: '#333',
        paddingBottom: 8,
    },
    filterBar: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        paddingVertical: 8,
        paddingHorizontal: 8,
        gap: 8,
    },
    filterItem: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 0,
        paddingBottom: 20,
    },
    // === Horizontal Card Layout ===
    newsCard: {
        backgroundColor: '#1e1e1e',
        marginBottom: 2,
        overflow: 'hidden',
    },
    cardRow: {
        flexDirection: 'row',
        minHeight: 130,
    },
    thumbnailContainer: {
        width: '40%',
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        minHeight: 130,
    },
    thumbnailPlaceholder: {
        width: '100%',
        height: '100%',
        minHeight: 130,
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playOverlay: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    playButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        fontSize: 14,
        color: '#111',
        marginLeft: 2,
    },
    categoryChip: {
        position: 'absolute',
        bottom: 10,
        left: 50,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    categoryChipText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    cardTextContent: {
        flex: 1,
        padding: 14,
        justifyContent: 'center',
    },
    newsTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
        lineHeight: 24,
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 11,
        color: '#888',
    },
    metaDot: {
        fontSize: 11,
        color: '#555',
        marginHorizontal: 6,
    },
    // === Bottom bar: reactions + actions ===
    cardBottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#2a2a2a',
    },
    reactionsRow: {
        flexDirection: 'row',
        gap: 6,
    },
    reactionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 14,
        backgroundColor: '#2a2a2a',
    },
    activeReaction: {
        backgroundColor: '#1a3a1e',
    },
    reactionEmoji: {
        fontSize: 13,
        marginRight: 3,
    },
    reactionCount: {
        fontSize: 11,
        color: '#aaa',
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 6,
    },
    actionBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: '#2a2a2a',
    },
    deleteBtn: {
        backgroundColor: '#3a1a1a',
    },
    actionBtnText: {
        fontSize: 12,
    },
    // === Empty state ===
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
        color: '#ccc',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    // === Post button ===
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
    // === Polls section ===
    carouselContainer: {
        marginBottom: 8,
        backgroundColor: '#1a1a1a',
        paddingVertical: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a5f2a',
        marginLeft: 16,
        marginBottom: 12,
        marginTop: 8,
    },
    pollCard: {
        width: 260,
        backgroundColor: '#252525',
        borderRadius: 12,
        marginRight: 12,
        overflow: 'hidden',
    },
    pollImage: {
        width: '100%',
        height: 110,
    },
    pollContent: {
        padding: 12,
    },
    pollBadge: {
        position: 'absolute',
        top: -100,
        right: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    pollBadgeText: {
        color: '#1a5f2a',
        fontSize: 10,
        fontWeight: 'bold',
    },
    pollTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#eee',
        marginBottom: 4,
        height: 40,
    },
    pollMeta: {
        fontSize: 12,
        color: '#888',
    },
    // === Archive toggle ===
    archiveToggle: {
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#2a2a2a',
        marginTop: 6,
    },
    archiveToggleActive: {
        backgroundColor: '#3a2a0a',
    },
    archiveToggleText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#888',
    },
    archiveToggleTextActive: {
        color: '#ffb74d',
    },
});
