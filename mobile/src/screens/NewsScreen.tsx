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
    Platform,
    Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { newsAPI, pollsAPI, API_BASE_URL } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FilterDropdown from '../components/FilterDropdown';
import WeatherWidget from '../components/WeatherWidget';
import { useTheme } from '../theme/ThemeContext';
import { ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

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
    { id: 'all', label: 'All', icon: "🌐" },
    { id: 'general', label: 'Local', icon: "🏘️" },
    { id: 'health', label: 'Health', icon: "🏥" },
    { id: 'weather', label: 'Weather', icon: "⛅" },
    { id: 'polls', label: 'Polls', icon: "📊" },
    { id: 'event', label: 'Events', icon: "🎉" },
    { id: 'update', label: 'Gov Schemes', icon: "📋" },
    { id: 'sports', label: 'Sports', icon: "⚽" },
    { id: 'cultural', label: 'Cultural', icon: "🎭" },
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
    const [pastPolls, setPastPolls] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Manage Post Modal
    const [manageMenuVisible, setManageMenuVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<NewsItem | null>(null);

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
            if (categoryFilter !== 'all' && categoryFilter !== 'weather') params.category = categoryFilter;
            if (scopeFilter !== 'all') params.scope = scopeFilter;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            let newItems = [];
            if (categoryFilter !== 'weather' && categoryFilter !== 'polls') {
                const res = await newsAPI.getAll(params);
                newItems = res.data;
            }

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

    const fetchPolls = async (isInitial = false) => {
        try {
            const [pollsRes, historyRes] = await Promise.all([
                pollsAPI.getActive(),
                pollsAPI.getHistory()
            ]);

            // Do not filter out polls if the user has voted. Keep them visible!
            setPolls(pollsRes.data);
            setPastPolls(historyRes.data);

            if (isInitial) {
                const hasPendingVoting = pollsRes.data.some((p: any) => !p.has_voted);
                if (hasPendingVoting) {
                    setCategoryFilter('polls');
                }
            }
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

    useFocusEffect(
        useCallback(() => {
            fetchPolls(true);
        }, [])
    );

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

    const renderPollItem = ({ item }: { item: any }) => {
        const hasMedia = item.image_url && item.image_url.length > 0;
        const heroImage = hasMedia
            ? (item.image_url.startsWith('http')
                ? item.image_url
                : `${API_BASE_URL.replace('/api', '')}/${item.image_url}`)
            : null;

        return (
            <TouchableOpacity
                style={[styles.pollCard, { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }]}
                onPress={() => navigation.navigate('PollDetails', { pollId: item.id })}
            >
                {heroImage ? (
                    <Image source={{ uri: heroImage }} style={styles.pollImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.pollImage, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ fontSize: 32 }}>📊</Text>
                    </View>
                )}
                <View style={styles.pollContent}>
                    <Text style={[styles.pollTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                    <Text style={[styles.pollMeta, { color: colors.textTertiary }]}>Ends: {new Date(item.end_at).toLocaleDateString()}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderListHeader = () => (
        <View>
            {categoryFilter === 'weather' && (
                <WeatherWidget />
            )}

            {/* Polls Section */}
            {categoryFilter === 'polls' && (
                <View style={[styles.pollsSection, { backgroundColor: 'transparent', paddingVertical: 14 }]}>
                    {/* Active Polls */}
                    <View style={styles.pollsHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18, fontWeight: '800' }]}>📢 Active Polls</Text>
                        {canCreatePoll && (
                            <TouchableOpacity onPress={() => navigation.navigate('CreatePoll')}>
                                <Text style={styles.createPollBtn}>+ Create Poll</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {polls.length > 0 ? (
                        <FlatList
                            data={polls}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            renderItem={renderPollItem}
                            keyExtractor={item => item.id.toString() + "_active"}
                            contentContainerStyle={{ paddingHorizontal: 16, marginBottom: 20 }}
                        />
                    ) : (
                        <View style={[styles.noPollsBox, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingVertical: 20, marginBottom: 20 }]}>
                            <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: '600' }}>No active polls</Text>
                        </View>
                    )}

                    {/* Past Polls */}
                    <View style={styles.pollsHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18, fontWeight: '800' }]}>🕰️ Past Polls</Text>
                    </View>
                    {pastPolls.length > 0 ? (
                        <FlatList
                            data={pastPolls}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            renderItem={renderPollItem}
                            keyExtractor={item => item.id.toString() + "_past"}
                            contentContainerStyle={{ paddingHorizontal: 16 }}
                        />
                    ) : (
                        <View style={[styles.noPollsBox, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingVertical: 20 }]}>
                            <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: '600' }}>No past polls</Text>
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
        const displayContent = language === 'hi' && item.content_hi ? item.content_hi : item.content;

        // Pick a color for category
        const tagColors: any = {
            general: "#00A878", local: "#00A878", sports: "#FF6B00", health: "#FF4444", event: "#7C3AED", update: "#1D6FA4"
        };
        const catColor = tagColors[item.category] || "#4CAF50";

        if (heroImage) {
            return (
                <TouchableOpacity
                    style={[styles.newsCard, { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3, padding: 0 }]}
                    onPress={() => navigation.navigate('NewsDetails', { newsId: item.id, newsItem: item })}
                    activeOpacity={0.85}
                >
                    <View style={{ position: "relative", height: 200, width: '100%', overflow: "hidden", borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                        <Image
                            source={{ uri: heroImage }}
                            style={{ width: "100%", height: "100%", resizeMode: "cover" }}
                        />
                        {youtubeId && (
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 22, color: '#000', marginLeft: 4 }}>▶</Text>
                                </View>
                            </View>
                        )}
                        <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: catColor, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 }}>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                {getCategoryLabel(item.category)}
                            </Text>
                        </View>
                        {item.status === 'archived' && (
                            <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: '#333', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>ARCHIVED</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ padding: 16 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 22, marginBottom: 6 }} numberOfLines={2}>
                            {displayTitle}
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textTertiary, lineHeight: 18, marginBottom: 16 }} numberOfLines={2}>
                            {displayContent.replace(/<[^>]+>/g, '') || 'No additional details provided.'}
                        </Text>

                        {/* Meta Row */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: catColor, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 13, color: '#fff', fontWeight: 'bold' }}>{item.posted_by_name?.charAt(0) || 'U'}</Text>
                                </View>
                                <View>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{item.posted_by_name}</Text>
                                    <Text style={{ fontSize: 10, color: colors.textTertiary }}>{formatDate(item.created_at)}</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                                <TouchableOpacity onPress={() => handleReaction(item.id, 'like')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={{ fontSize: 13 }}>{item.user_reaction === 'like' ? '👍' : '🤍'}</Text>
                                    <Text style={{ fontSize: 12, color: colors.textTertiary }}>{item.likes || 0}</Text>
                                </TouchableOpacity>
                                {(canEdit || canDelete) && (
                                    <TouchableOpacity style={{ paddingHorizontal: 4 }} onPress={() => {
                                        setSelectedPost(item);
                                        setManageMenuVisible(true);
                                    }}>
                                        <Text style={{ fontSize: 16, color: colors.textTertiary, fontWeight: '700' }}>⋮</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        // Text Card implementation
        return (
            <TouchableOpacity
                style={[styles.newsCard, { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3, borderLeftWidth: 4, borderLeftColor: catColor, padding: 18 }]}
                onPress={() => navigation.navigate('NewsDetails', { newsId: item.id, newsItem: item })}
                activeOpacity={0.85}
            >
                <View style={{ alignSelf: 'flex-start', backgroundColor: catColor + '1A', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: catColor, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {getCategoryLabel(item.category)}
                    </Text>
                    {item.status === 'archived' && (
                        <Text style={{ color: '#666', fontSize: 10, fontWeight: '700' }}>• ARCHIVED</Text>
                    )}
                </View>

                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 22, marginBottom: 8 }} numberOfLines={2}>
                    {displayTitle}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textTertiary, lineHeight: 18, marginBottom: 16 }} numberOfLines={3}>
                    {displayContent.replace(/<[^>]+>/g, '') || 'No additional details provided.'}
                </Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: catColor, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 13, color: '#fff', fontWeight: 'bold' }}>{item.posted_by_name?.charAt(0) || 'U'}</Text>
                        </View>
                        <View>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{item.posted_by_name}</Text>
                            <Text style={{ fontSize: 10, color: colors.textTertiary }}>{formatDate(item.created_at)}</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => handleReaction(item.id, 'like')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ fontSize: 13 }}>{item.user_reaction === 'like' ? '👍' : '🤍'}</Text>
                            <Text style={{ fontSize: 12, color: colors.textTertiary }}>{item.likes || 0}</Text>
                        </TouchableOpacity>
                        {(canEdit || canDelete) && (
                            <TouchableOpacity style={{ paddingHorizontal: 4 }} onPress={() => {
                                setSelectedPost(item);
                                setManageMenuVisible(true);
                            }}>
                                <Text style={{ fontSize: 16, color: colors.textTertiary, fontWeight: '700' }}>⋮</Text>
                            </TouchableOpacity>
                        )}
                    </View>
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
            {/* Top Bar (Slimmed Down) */}
            <View style={{
                backgroundColor: '#1a6eb5',
                paddingTop: 12,
                paddingHorizontal: 16,
                paddingBottom: 16,
            }}>
                {/* Search */}
                <View style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                }}>
                    <Text style={{ fontSize: 16, opacity: 0.8, color: '#fff' }}>🔍</Text>
                    <TextInput
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                        placeholder="Search village news..."
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        style={{ flex: 1, color: '#fff', fontSize: 14, height: 44, marginLeft: 10, fontWeight: '500' }}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Text style={{ color: '#fff', fontSize: 16, padding: 4, opacity: 0.7 }}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Category Tabs */}
            <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 99 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 8 }}>
                    {CATEGORIES.map(cat => {
                        const isActive = cat.id === categoryFilter;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => setCategoryFilter(cat.id)}
                                activeOpacity={0.8}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: isActive ? '#1a6eb5' : colors.card,
                                    paddingHorizontal: 14,
                                    paddingVertical: 7,
                                    borderRadius: 40,
                                    gap: 5,
                                    borderWidth: isActive ? 0 : 1,
                                    borderColor: colors.border,
                                    elevation: isActive ? 4 : 0,
                                    shadowColor: '#1a6eb5',
                                    shadowOpacity: isActive ? 0.3 : 0,
                                    shadowRadius: 5,
                                    shadowOffset: { width: 0, height: 2 },
                                }}
                            >
                                <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#fff' : colors.text }}>{cat.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
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
                    !loading && categoryFilter !== 'weather' && categoryFilter !== 'polls' ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>📰</Text>
                            <Text style={styles.emptyText}>No news found</Text>
                            <Text style={styles.emptySubtext}>
                                {searchQuery ? 'Try a different search term' : 'Try changing your filters'}
                            </Text>
                        </View>
                    ) : (
                        (!loading && (categoryFilter === 'weather' || categoryFilter === 'polls')) ? null
                            : <View style={styles.emptyContainer}><ActivityIndicator size="large" color="#4caf50" /></View>
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

            {/* Manage Post Modal */}
            <Modal transparent={true} visible={manageMenuVisible} animationType="fade" onRequestClose={() => setManageMenuVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setManageMenuVisible(false)}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#2e2e2e' : '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Manage Post</Text>

                        {selectedPost && (selectedPost.posted_by === user?.id) && (
                            <TouchableOpacity style={[styles.modalOption, { borderBottomColor: colors.border }]} onPress={() => { setManageMenuVisible(false); handleEdit(selectedPost); }}>
                                <Text style={[styles.modalOptionText, { color: colors.text }]}>Edit</Text>
                            </TouchableOpacity>
                        )}

                        {selectedPost && ((selectedPost.posted_by === user?.id) || isPresident) && (
                            <TouchableOpacity style={[styles.modalOption, { borderBottomColor: colors.border }]} onPress={() => { setManageMenuVisible(false); handleArchive(selectedPost); }}>
                                <Text style={[styles.modalOptionText, { color: colors.text }]}>{selectedPost.status === 'archived' ? 'Restore' : 'Archive'}</Text>
                            </TouchableOpacity>
                        )}

                        {selectedPost && ((selectedPost.posted_by === user?.id) || isPresident) && (
                            <TouchableOpacity style={[styles.modalOption, { borderBottomColor: 'transparent' }]} onPress={() => { setManageMenuVisible(false); handleDelete(selectedPost); }}>
                                <Text style={[styles.modalOptionText, { color: '#ef4444' }]}>Delete</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        borderRadius: 12,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    modalOption: {
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    modalOptionText: {
        fontSize: 16,
        fontWeight: '500',
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
        marginBottom: 8,
    },
    pollsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    createPollBtn: {
        color: '#1a6eb5',
        fontWeight: '700',
        fontSize: 13,
    },
    noPollsBox: {
        alignItems: 'center',
        marginHorizontal: 16,
        borderRadius: 12,
    },
    pollCard: {
        width: 240,
        borderRadius: 12,
        marginRight: 12,
        overflow: 'hidden',
    },
    pollImage: {
        width: '100%',
        height: 100,
    },
    pollContent: {
        padding: 12,
    },
    pollTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
        lineHeight: 20,
    },
    pollMeta: {
        fontSize: 11,
        fontWeight: '600',
    },
});
