import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { pollsAPI, API_BASE_URL } from '../api/client';
import { useTheme } from '../theme/ThemeContext';


const PollVotesScreen = () => {
    const route = useRoute();
    const { colors, isDark } = useTheme();
    const { pollId } = route.params as { pollId: number };
    const [votes, setVotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadVotes();
    }, [pollId]);

    const loadVotes = async () => {
        try {
            setLoading(true);
            const response = await pollsAPI.getVotes(pollId);
            setVotes(response.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load votes');
        } finally {
            setLoading(false);
        }
    };

    const groupedVotes = useMemo(() => {
        const groups: { [key: string]: any[] } = {};
        votes.forEach(vote => {
            const key = vote.option_text || 'Custom Response';
            if (!groups[key]) groups[key] = [];
            groups[key].push(vote);
        });
        return groups;
    }, [votes]);

    const tabs = useMemo(() => Object.keys(groupedVotes), [groupedVotes]);
    const [activeTab, setActiveTab] = useState<string>('');

    useEffect(() => {
        if (tabs.length > 0 && (!activeTab || !tabs.includes(activeTab))) {
            setActiveTab(tabs[0]);
        }
    }, [tabs, activeTab]);

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>;
    if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

    const renderItem = ({ item }: { item: any }) => {
        const hasOptMedia = item.option_image && item.option_image.length > 0;
        const optHeroImage = hasOptMedia
            ? (item.option_image.startsWith('http')
                ? item.option_image
                : `${API_BASE_URL.replace('/api', '')}/${item.option_image}`)
            : null;

        const hasProfileMedia = item.profile_picture && item.profile_picture.length > 0;
        const profileImage = hasProfileMedia
            ? (item.profile_picture.startsWith('http')
                ? item.profile_picture
                : `${API_BASE_URL.replace('/api', '')}/${item.profile_picture}`)
            : null;

        return (
            <View style={[styles.card, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
                <View style={styles.userRow}>
                    {profileImage ? (
                        <Image source={{ uri: profileImage }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{item.user_name.charAt(0)}</Text>
                        </View>
                    )}
                    <View>
                        <Text style={[styles.userName, { color: colors.text }]}>{item.user_name}</Text>
                        <Text style={[styles.date, { color: colors.textTertiary }]}>{new Date(item.created_at).toLocaleString()}</Text>
                    </View>
                </View>
                {/* Only show response text if it's a custom text response, otherwise the tab name implies the option chosen */}
                {item.text_response && (
                    <View style={[styles.responseContainer, { backgroundColor: isDark ? '#2a2a2a' : '#F9F9F9' }]}>
                        <Text style={[styles.responseText, { color: isDark ? '#ddd' : '#555' }]}>"{item.text_response}"</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {tabs.length > 0 && (
                <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
                        {tabs.map(tab => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tab, activeTab === tab && { borderBottomColor: '#4CAF50' }]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[
                                    styles.tabText,
                                    { color: colors.textTertiary },
                                    activeTab === tab && { color: '#4CAF50', fontWeight: 'bold' }
                                ]}>
                                    {tab} ({groupedVotes[tab]?.length || 0})
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <FlatList
                data={activeTab ? groupedVotes[activeTab] : []}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: colors.textTertiary }}>No votes recorded yet.</Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        backgroundColor: 'transparent',
    },
    tab: {
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '500',
    },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2 },
    userRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: '#757575' },
    userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    date: { fontSize: 12, color: '#999', marginTop: 2 },
    responseContainer: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8, marginTop: 12 },
    responseText: { fontSize: 16, fontStyle: 'italic', color: '#555' },
    error: { color: 'red', fontSize: 16 }
});

export default PollVotesScreen;
