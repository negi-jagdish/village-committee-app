import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { pollsAPI } from '../api/client';
import { useTheme } from '../theme/ThemeContext';


const PollVotesScreen = () => {
    const route = useRoute();
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

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>;
    if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.userRow}>
                {item.profile_picture ? (
                    <Image source={{ uri: item.profile_picture }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{item.user_name.charAt(0)}</Text>
                    </View>
                )}
                <View>
                    <Text style={styles.userName}>{item.user_name}</Text>
                    <View>
                        <Text style={styles.userName}>{item.user_name}</Text>
                        <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.responseContainer}>
                {item.text_response ? (
                    <Text style={styles.responseText}>"{item.text_response}"</Text>
                ) : (
                    <View style={styles.optionRow}>
                        {item.option_image && <Image source={{ uri: item.option_image }} style={styles.optionImage} />}
                        <Text style={styles.optionText}>{item.option_text}</Text>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={votes}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2 },
    userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: '#757575' },
    userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    date: { fontSize: 12, color: '#999' },
    responseContainer: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8 },
    responseText: { fontSize: 16, fontStyle: 'italic', color: '#555' },
    optionRow: { flexDirection: 'row', alignItems: 'center' },
    optionImage: { width: 30, height: 30, borderRadius: 4, marginRight: 8 },
    optionText: { fontSize: 16, color: '#333', fontWeight: '500' },
    error: { color: 'red', fontSize: 16 }
});

export default PollVotesScreen;
