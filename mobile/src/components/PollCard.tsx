import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface PollCardProps {
    poll: any;
}

const PollCard = ({ poll }: PollCardProps) => {
    const navigation = useNavigation<any>();
    const isExpired = new Date() > new Date(poll.end_at);
    const isActive = poll.status === 'active' && !isExpired;

    const handlePress = () => {
        navigation.navigate('PollDetails', { pollId: poll.id });
    };

    return (
        <TouchableOpacity style={styles.card} onPress={handlePress}>
            {poll.image_url && (
                <Image source={{ uri: poll.image_url }} style={styles.image} resizeMode="cover" />
            )}
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title} numberOfLines={2}>{poll.title}</Text>
                    <View style={[styles.badge, { backgroundColor: isActive ? '#4CAF50' : '#999' }]}>
                        <Text style={styles.badgeText}>{isActive ? 'Active' : 'Closed'}</Text>
                    </View>
                </View>

                <Text style={styles.meta}>
                    Ends: {new Date(poll.end_at).toLocaleDateString()} {new Date(poll.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>

                <View style={styles.footer}>
                    <Text style={styles.type}>
                        {poll.poll_type === 'single' ? 'Single Choice' :
                            poll.poll_type === 'multiple' ? 'Multiple Choice' : 'Text Response'}
                    </Text>
                    <Text style={styles.actionText}>
                        {isActive ? 'Vote Now >' : 'View Results >'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 8, marginHorizontal: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, overflow: 'hidden' },
    image: { width: '100%', height: 120 },
    content: { padding: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    meta: { fontSize: 12, color: '#888', marginBottom: 8 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    type: { fontSize: 12, color: '#2196F3', fontWeight: '500' },
    actionText: { color: '#2196F3', fontWeight: 'bold', fontSize: 14 },
});

export default PollCard;
