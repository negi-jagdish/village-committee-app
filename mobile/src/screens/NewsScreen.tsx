import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Image,
    Linking,
    Alert,
    Dimensions,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { newsAPI, pollsAPI, API_BASE_URL } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FilterDropdown from '../components/FilterDropdown';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_SIZE = 10;

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

const STATUS_OPTIONS = [
    { id: 'active', label: '📰 Active News' },
    { id: 'archived', label: '📥 Archived' },
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
    const { colors, isDark } = useTheme();
    const [news, setNews] = useState<NewsItem[]>([]);
    const [polls, setPolls] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Filters
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [scopeFilter, setScopeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('latest');
    const [statusFilter, setStatusFilter] = useState('active');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Search debounce
    const searchTimerRef = useRef<any>(null);

    const canPostNews = ['reporter', 'cashier', 'secretary', 'president'].includes(user?.role || '');
    const isPresident = user?.role === 'president';
    const canCreatePoll = user?.role === 'president' || user?.role === 'secretary';

    const fetchNews = async (pageNum: number, append: boolean = false) => {
        try {
            if (pageNum === 0) setLoading(true);
            else setLoadingMore(true);

            const params: any = {
                limit: PAGE_SIZE,
                offset: pageNum * PAGE_SIZE,
                sortBy,
                status: statusFilter,
            };
            if (categoryFilter !== 'all') params.category = categoryFilter;
            if (scopeFilter !== 'all') params.scope = scopeFilter;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const res = await newsAPI.getAll(params);
            const newItems = res.data;

            if (append) {
                setNews(prev => [...prev, ...newItems]);
            } else {
                setNews(newItems);
            }
            setHasMore(newItems.length === PAGE_SIZE);

            if (pageNum === 0 && statusFilter === 'active') {
                await AsyncStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(newItems));
            }
        } catch (error) {
            console.error('Fetch news error:', error);
            if (page === 0) {
                const cached = await AsyncStorage.getItem(NEWS_CACHE_KEY);
                if (cached) setNews(JSON.parse(cached));
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const fetchPolls = async () => {
        try {
            const pollsRes = await pollsAPI.getActive();
            const visiblePolls = pollsRes.data.filter((p: any) => canCreatePoll || !p.has_voted);
            setPolls(visiblePolls);
        } catch (error) {
            console.error('Fetch polls error:', error);
        }
    };

    // Initial load + filter changes => reset to page 0
    useEffect(() => {
        setPage(0);
        setHasMore(true);
        fetchNews(0, false);
    }, [categoryFilter, scopeFilter, sortBy, statusFilter, searchQuery]);

    useEffect(() => {
        fetchPolls();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        setPage(0);
        setHasMore(true);
        await Promise.all([fetchNews(0, false), fetchPolls()]);
        setRefreshing(false);
    };

    const loadMore = () => {
        if (!hasMore || loadingMore || loading) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchNews(nextPage, true);
    };

    // Debounced search
    const handleSearchChange = (text: string) => {
        setSearchQuery(text);
    };

    const handleReaction = async (newsId: number, reaction: 'like' | 'love' | 'celebrate') => {
        try {
            await newsAPI.react(newsId, reaction);
            // Re-fetch current page
            fetchNews(0, false);
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
                            fetchNews(0, false);
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
                : 'This news will be hidden from the feed.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: isArchived ? 'Restore' : 'Archive',
                    onPress: async () => {
                        try {
                            await newsAPI.archive(item.id);
                            fetchNews(0, false);
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

    const renderPollItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.pollCard}
            onPress={() => navigation.navigate('PollDetails', { pollId: item.id })}
        >
            {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.pollImage} resizeMode="cover" />
            ) : (
                <View style={[styles.pollImage, { backgroundColor: '#252525', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 32 }}>📊</Text>
                </View>
            )}
            <View style={styles.pollContent}>
                <Text style={styles.pollTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.pollMeta}>Ends: {new Date(item.end_at).toLocaleDateString()}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderListHeader = () => (
        <View>
            {/* Polls Section */}
            {(polls.length > 0 || canCreatePoll) && (
                <View style={styles.pollsSection}>
                    <View style={styles.pollsHeader}>
                        <Text style={styles.sectionTitle}>📢 Active Polls</Text>
                        {canCreatePoll && (
                            <TouchableOpacity onPress={() => navigation.navigate('CreatePoll')}>
                                <Text style={styles.createPollBtn}>+ Create</Text>
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
                            contentContainerStyle={{ paddingHorizontal: 12 }}
                        />
                    ) : (
                        <View style={styles.noPollsBox}>
                            <Text style={{ color: '#888', fontSize: 13 }}>No active polls</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );

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
                style={[styles.newsCard, { backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('NewsDetails', { newsId: item.id, newsItem: item })}
                activeOpacity={0.85}
            >
                <View style={styles.cardRow}>
                    {/* Left: Thumbnail */}
                    <View style={styles.thumbnailWrap}>
                        {heroImage ? (
                            <Image source={{ uri: heroImage }} style={styles.thumbnail} resizeMode="cover" />
                        ) : (
                            <View style={[styles.thumbnail, styles.thumbnailPlaceholder, { backgroundColor: colors.border }]}>
                                <Text style={{ fontSize: 28 }}>📰</Text>
                            </View>
                        )}
                        {youtubeId && (
                            <View style={styles.playBtnWrap}>
                                <View style={styles.playBtn}>
                                    <Text style={{ fontSize: 12, color: '#000', marginLeft: 1 }}>▶</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Right: Title + Meta */}
                    <View style={styles.cardTextArea}>
                        <Text style={[styles.newsTitle, { color: colors.text }]} numberOfLines={3}>
                            {displayTitle}
                        </Text>
                        <View style={styles.metaRow}>
                            <View style={[styles.categoryPill, { backgroundColor: colors.badge }]}>
                                <Text style={[styles.categoryPillText, { color: colors.badgeText }]}>{getCategoryLabel(item.category)}</Text>
                            </View>
                            <Text style={styles.metaDot}>•</Text>
                            <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
                        </View>
                        <Text style={styles.authorText}>{item.posted_by_name}</Text>
                    </View>
                </View>

                {/* Bottom: Reactions + Actions */}
                <View style={[styles.cardBottom, { borderTopColor: colors.border }]}>
                    <View style={styles.reactionsRow}>
                        <TouchableOpacity
                            style={[styles.rxnBtn, { backgroundColor: colors.inputBg }, item.user_reaction === 'like' && styles.rxnActive]}
                            onPress={(e) => { e.stopPropagation(); handleReaction(item.id, 'like'); }}
                        >
                            <Text style={styles.rxnEmoji}>👍</Text>
                            <Text style={styles.rxnCount}>{item.likes || 0}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.rxnBtn, item.user_reaction === 'love' && styles.rxnActive]}
                            onPress={(e) => { e.stopPropagation(); handleReaction(item.id, 'love'); }}
                        >
                            <Text style={styles.rxnEmoji}>❤️</Text>
                            <Text style={styles.rxnCount}>{item.loves || 0}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.rxnBtn, item.user_reaction === 'celebrate' && styles.rxnActive]}
                            onPress={(e) => { e.stopPropagation(); handleReaction(item.id, 'celebrate'); }}
                        >
                            <Text style={styles.rxnEmoji}>🎉</Text>
                            <Text style={styles.rxnCount}>{item.celebrates || 0}</Text>
                        </TouchableOpacity>
                    </View>
                    {(canEdit || canDelete) && (
                        <View style={styles.actionBtns}>
                            {canEdit && (
                                <TouchableOpacity style={styles.actBtn}
                                    onPress={(e) => { e.stopPropagation(); handleEdit(item); }}>
                                    <Text style={styles.actBtnText}>✏️</Text>
                                </TouchableOpacity>
                            )}
                            {canDelete && (
                                <TouchableOpacity style={styles.actBtn}
                                    onPress={(e) => { e.stopPropagation(); handleArchive(item); }}>
                                    <Text style={styles.actBtnText}>{item.status === 'archived' ? '📤' : '📥'}</Text>
                                </TouchableOpacity>
                            )}
                            {canDelete && (
                                <TouchableOpacity style={[styles.actBtn, { backgroundColor: '#3a1a1a' }]}
                                    onPress={(e) => { e.stopPropagation(); handleDelete(item); }}>
                                    <Text style={styles.actBtnText}>🗑️</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#4caf50" />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Top Bar: Search + Filters */}
            <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                {/* Search Input */}
                <View style={styles.searchRow}>
                    <View style={[styles.searchBox, { backgroundColor: colors.inputBg }]}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={[styles.searchInput, { color: colors.inputText }]}
                            placeholder="Search news..."
                            placeholderTextColor={colors.inputPlaceholder}
                            value={searchQuery}
                            onChangeText={handleSearchChange}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Text style={[styles.clearBtn, { color: colors.textTertiary }]}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Compact Filter Row */}
                <View style={styles.filterRow}>
                    <View style={styles.filterChip}>
                        <FilterDropdown
                            options={CATEGORIES}
                            selectedValue={categoryFilter}
                            onValueChange={setCategoryFilter}
                        />
                    </View>
                    <View style={styles.filterChip}>
                        <FilterDropdown
                            options={SCOPES}
                            selectedValue={scopeFilter}
                            onValueChange={setScopeFilter}
                        />
                    </View>
                    <View style={styles.filterChip}>
                        <FilterDropdown
                            options={SORT_OPTIONS}
                            selectedValue={sortBy}
                            onValueChange={setSortBy}
                        />
                    </View>
                    {canPostNews && (
                        <View style={styles.filterChipSmall}>
                            <FilterDropdown
                                options={STATUS_OPTIONS}
                                selectedValue={statusFilter}
                                onValueChange={setStatusFilter}
                            />
                        </View>
                    )}
                </View>
            </View>

            {/* News List */}
            <FlatList
                ListHeaderComponent={renderListHeader}
                data={news}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderNewsItem}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4caf50" />
                }
                contentContainerStyle={styles.listContent}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>📰</Text>
                            <Text style={styles.emptyText}>No news found</Text>
                            <Text style={styles.emptySubtext}>
                                {searchQuery ? 'Try a different search term' : 'Try changing your filters'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <ActivityIndicator size="large" color="#4caf50" />
                        </View>
                    )
                }
            />

            {/* FAB - Post News */}
            {canPostNews && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('PostNews')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const THUMB_SIZE = Math.round(SCREEN_WIDTH * 0.32);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    // Top bar
    topBar: {
        backgroundColor: '#1a1a1a',
        paddingTop: 4,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
    },
    searchRow: {
        paddingHorizontal: 12,
        marginBottom: 6,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 38,
    },
    searchIcon: {
        fontSize: 14,
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#eee',
        padding: 0,
    },
    clearBtn: {
        color: '#888',
        fontSize: 16,
        paddingHorizontal: 4,
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        gap: 6,
    },
    filterChip: {
        flex: 1,
    },
    filterChipSmall: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 80,
    },
    // News card
    newsCard: {
        backgroundColor: '#1c1c1e',
        marginHorizontal: 12,
        marginTop: 10,
        borderRadius: 12,
        overflow: 'hidden',
    },
    cardRow: {
        flexDirection: 'row',
        height: THUMB_SIZE,
    },
    thumbnailWrap: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
    },
    thumbnail: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderTopLeftRadius: 12,
    },
    thumbnailPlaceholder: {
        backgroundColor: '#2c2c2e',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playBtnWrap: {
        position: 'absolute',
        bottom: 8,
        left: 8,
    },
    playBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTextArea: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        justifyContent: 'center',
    },
    newsTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#f5f5f5',
        lineHeight: 21,
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryPill: {
        backgroundColor: '#2a5a32',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    categoryPillText: {
        color: '#a5d6a7',
        fontSize: 10,
        fontWeight: '600',
    },
    metaText: {
        fontSize: 11,
        color: '#888',
    },
    metaDot: {
        fontSize: 10,
        color: '#555',
        marginHorizontal: 5,
    },
    authorText: {
        fontSize: 11,
        color: '#666',
    },
    // Bottom bar
    cardBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderTopWidth: 1,
        borderTopColor: '#2a2a2a',
    },
    reactionsRow: {
        flexDirection: 'row',
        gap: 4,
    },
    rxnBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
        paddingHorizontal: 7,
        borderRadius: 12,
        backgroundColor: '#2a2a2a',
    },
    rxnActive: {
        backgroundColor: '#1b3a20',
    },
    rxnEmoji: {
        fontSize: 12,
        marginRight: 2,
    },
    rxnCount: {
        fontSize: 10,
        color: '#999',
        fontWeight: '500',
    },
    actionBtns: {
        flexDirection: 'row',
        gap: 4,
    },
    actBtn: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
        backgroundColor: '#2a2a2a',
    },
    actBtnText: {
        fontSize: 11,
    },
    // Loading more
    loadingMore: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    loadingMoreText: {
        color: '#888',
        fontSize: 13,
    },
    // Empty
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
    // FAB
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1a5f2a',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    fabText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '300',
        lineHeight: 30,
    },
    // Polls section
    pollsSection: {
        backgroundColor: '#1a1a1a',
        paddingVertical: 10,
        marginBottom: 4,
    },
    pollsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#4caf50',
    },
    createPollBtn: {
        color: '#4caf50',
        fontWeight: 'bold',
        fontSize: 13,
    },
    noPollsBox: {
        padding: 12,
        alignItems: 'center',
        backgroundColor: '#252525',
        marginHorizontal: 16,
        borderRadius: 8,
    },
    pollCard: {
        width: 220,
        backgroundColor: '#252525',
        borderRadius: 10,
        marginRight: 10,
        overflow: 'hidden',
    },
    pollImage: {
        width: '100%',
        height: 90,
    },
    pollContent: {
        padding: 10,
    },
    pollTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#eee',
        marginBottom: 4,
    },
    pollMeta: {
        fontSize: 11,
        color: '#888',
    },
});
