import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Share,
    Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { newsAPI, API_BASE_URL } from '../api/client';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

export default function NewsDetailsScreen({ route, navigation }: any) {
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const { newsId } = route.params;
    const user = useSelector((state: RootState) => state.auth.user);
    const language = useSelector((state: RootState) => state.app.language);

    const [newsItem, setNewsItem] = useState<any>(route.params.newsItem || null);
    const [loading, setLoading] = useState(!route.params.newsItem);

    // If we only have ID, fetch details
    React.useEffect(() => {
        if (!newsItem && newsId) {
            fetchNewsDetails();
        }
    }, [newsId]);

    const fetchNewsDetails = async () => {
        try {
            const response = await newsAPI.getById(newsId);
            setNewsItem(response.data);
        } catch (error) {
            Alert.alert('Error', 'Failed to load news details');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleReaction = async (reaction: 'like' | 'love' | 'celebrate') => {
        try {
            // Optimistically update UI
            const updatedItem = { ...newsItem };
            if (updatedItem.user_reaction === reaction) {
                // Removing reaction
                updatedItem.user_reaction = null;
                if (reaction === 'like') updatedItem.likes--;
                if (reaction === 'love') updatedItem.loves--;
                if (reaction === 'celebrate') updatedItem.celebrates--;
            } else {
                // Changing/Adding reaction
                if (updatedItem.user_reaction === 'like') updatedItem.likes--;
                if (updatedItem.user_reaction === 'love') updatedItem.loves--;
                if (updatedItem.user_reaction === 'celebrate') updatedItem.celebrates--;

                updatedItem.user_reaction = reaction;
                if (reaction === 'like') updatedItem.likes++;
                if (reaction === 'love') updatedItem.loves++;
                if (reaction === 'celebrate') updatedItem.celebrates++;
            }
            setNewsItem(updatedItem);

            await newsAPI.react(newsItem.id, reaction);
        } catch (error) {
            console.error('Reaction error:', error);
            // Revert on error would be better but keeping simple for now
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${newsItem.title}\n\n${newsItem.content}\n\nRead more on Village App.`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    if (!newsItem) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading...</Text>
            </View>
        );
    }

    const hasMedia = newsItem.media && newsItem.media.length > 0;
    const heroImage = hasMedia
        ? (newsItem.media[0].media_url.startsWith('http')
            ? newsItem.media[0].media_url
            : `${API_BASE_URL.replace('/api', '')}${newsItem.media[0].media_url}`)
        : null;

    const displayTitle = language === 'hi' && newsItem.title_hi ? newsItem.title_hi : newsItem.title;
    const displayContent = language === 'hi' && newsItem.content_hi ? newsItem.content_hi : newsItem.content;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Hero Image */}
                {heroImage ? (
                    <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.placeholderHero, { backgroundColor: isDark ? colors.border : '#f0f0f0' }]}>
                        <Icon name="article" size={60} color={colors.textTertiary} />
                    </View>
                )}

                <View style={styles.contentContainer}>
                    {/* Meta Row */}
                    <View style={styles.metaRow}>
                        <View style={[styles.categoryBadge, { backgroundColor: isDark ? '#1b3a20' : '#e8f5e9' }]}>
                            <Text style={[styles.categoryText, { color: isDark ? '#a5d6a7' : '#1a5f2a' }]}>{newsItem.category?.toUpperCase() || 'GENERAL'}</Text>
                        </View>
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{new Date(newsItem.created_at).toDateString()}</Text>
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: colors.text }]}>{displayTitle}</Text>

                    {/* Author */}
                    <View style={[styles.authorRow, { borderBottomColor: colors.borderLight }]}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{newsItem.posted_by_name?.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View>
                            <Text style={[styles.authorName, { color: colors.text }]}>{newsItem.posted_by_name}</Text>
                            <Text style={[styles.authorRole, { color: colors.textSecondary }]}>{newsItem.posted_by_role}</Text>
                        </View>
                    </View>

                    {/* Content */}
                    <Text style={[styles.content, { color: colors.text }]}>{displayContent}</Text>

                    {newsItem.youtube_url && (
                        <TouchableOpacity style={styles.youtubeLink} onPress={() => {/* Handle Open URL */ }}>
                            <Text style={styles.youtubeText}>Watch Video: {newsItem.youtube_url}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* Bottom Bar for Reactions */}
            <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.borderLight }]}>
                <View style={styles.reactionContainer}>
                    <TouchableOpacity
                        style={[
                            styles.reactionBtn,
                            { backgroundColor: isDark ? colors.border : colors.background },
                            newsItem.user_reaction === 'like' && { backgroundColor: isDark ? '#1b3a20' : '#e8f5e9' }
                        ]}
                        onPress={() => handleReaction('like')}
                    >
                        <Text style={styles.emoji}>👍</Text>
                        <Text style={[styles.count, { color: colors.text }]}>{newsItem.likes || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.reactionBtn,
                            { backgroundColor: isDark ? colors.border : colors.background },
                            newsItem.user_reaction === 'love' && { backgroundColor: isDark ? '#1b3a20' : '#e8f5e9' }
                        ]}
                        onPress={() => handleReaction('love')}
                    >
                        <Text style={styles.emoji}>❤️</Text>
                        <Text style={[styles.count, { color: colors.text }]}>{newsItem.loves || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.reactionBtn,
                            { backgroundColor: isDark ? colors.border : colors.background },
                            newsItem.user_reaction === 'celebrate' && { backgroundColor: isDark ? '#1b3a20' : '#e8f5e9' }
                        ]}
                        onPress={() => handleReaction('celebrate')}
                    >
                        <Text style={styles.emoji}>🎉</Text>
                        <Text style={[styles.count, { color: colors.text }]}>{newsItem.celebrates || 0}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                    <Icon name="share" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 80, // Space for bottom bar
    },
    heroImage: {
        width: '100%',
        height: 250,
    },
    placeholderHero: {
        width: '100%',
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        padding: 20,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryBadge: {
        backgroundColor: '#e8f5e9',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
    },
    categoryText: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    dateText: {
        fontSize: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        lineHeight: 32,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1a5f2a',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    authorName: {
        fontSize: 14,
        fontWeight: '600',
    },
    authorRole: {
        fontSize: 12,
    },
    content: {
        fontSize: 16,
        lineHeight: 26,
    },
    youtubeLink: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#ffebee',
        borderRadius: 8,
    },
    youtubeText: {
        color: '#c62828',
        fontWeight: '500',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderTopWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    reactionContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    reactionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    emoji: {
        fontSize: 18,
        marginRight: 6,
    },
    count: {
        fontSize: 14,
        fontWeight: '600',
    },
    shareBtn: {
        padding: 8,
    },
});
