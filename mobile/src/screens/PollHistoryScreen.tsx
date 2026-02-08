import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { pollsAPI } from '../api/client';
import PollCard from '../components/PollCard';

const PollHistoryScreen = () => {
    const [polls, setPolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const response = await pollsAPI.getHistory();
            setPolls(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={polls}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <PollCard poll={item} />}
                ListEmptyComponent={<Text style={styles.emptyText}>No past polls found.</Text>}
                contentContainerStyle={{ paddingVertical: 16 }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { textAlign: 'center', marginTop: 20, color: '#666' },
});

export default PollHistoryScreen;
