import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, FlatList, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { chatAPI, API_BASE_URL } from '../api/client';

interface ReactionDetailsSheetProps {
    visible: boolean;
    onClose: () => void;
    messageId: number | null;
    currentUserId: number;
    onReactionChange: () => void; // Refresh chat after removal
}

interface User {
    id: number;
    name: string;
    profile_picture: string | null;
}

const ReactionDetailsSheet = ({ visible, onClose, messageId, currentUserId, onReactionChange }: ReactionDetailsSheetProps) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const [reactionData, setReactionData] = useState<{ reactions: any, all: User[] } | null>(null);

    useEffect(() => {
        if (visible && messageId) {
            fetchDetails();
        }
    }, [visible, messageId]);

    const fetchDetails = async () => {
        if (!messageId) return;
        setLoading(true);
        try {
            const res = await chatAPI.getReactions(messageId);
            setReactionData(res.data);
            setActiveTab('All'); // Reset to All on open
        } catch (error) {
            console.error('Fetch reactions error:', error);
            Alert.alert('Error', 'Failed to load reactions');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveReaction = async (reactionEmoji: string) => {
        if (!messageId) return;
        try {
            // "Remove" is technically just reacting again with the same emoji (toggle off)
            // But we need to be sure which emoji *I* gave to trigger the correct toggle.
            // If I tap "Tap to remove" on the "Like" tab, it means I gave a "Like".
            // So calling reactToMessage with "Like" will toggle it off.
            await chatAPI.reactToMessage(messageId, reactionEmoji);
            onReactionChange();
            fetchDetails(); // Refresh list to remove myself
        } catch (error) {
            Alert.alert('Error', 'Failed to remove reaction');
        }
    };

    if (!visible) return null;

    // Filter users based on active tab
    let displayUsers: User[] = [];
    if (reactionData) {
        if (activeTab === 'All') {
            displayUsers = reactionData.all || [];
        } else {
            // activeTab will be something like "👍" or "❤️"
            displayUsers = reactionData.reactions[activeTab] || [];
        }
    }

    // Get counts for tabs
    const tabs = ['All'];
    if (reactionData?.reactions) {
        Object.keys(reactionData.reactions).forEach(key => tabs.push(key));
    }

    const renderUserItem = ({ item }: { item: User }) => {
        const isMe = item.id === currentUserId;
        // Determine which reaction this user gave (if in 'All' tab, we might want to show the emoji?)
        // In WhatsApp 'All' tab, it shows the emoji next to the user.
        // In specific tab, it doesn't need to.

        let reactionEmoji = '';
        if (activeTab === 'All' && reactionData?.reactions) {
            // Find which reaction this user is in
            Object.keys(reactionData.reactions).forEach(key => {
                const users = reactionData.reactions[key];
                if (users.find((u: User) => u.id === item.id)) reactionEmoji = key;
            });
        } else {
            reactionEmoji = activeTab; // In specific tab, strictly that emoji
        }

        return (
            <TouchableOpacity
                style={styles.userRow}
                onPress={() => {
                    if (isMe) {
                        handleRemoveReaction(reactionEmoji);
                    }
                }}
                activeOpacity={isMe ? 0.7 : 1}
            >
                <Image
                    source={{
                        uri: item.profile_picture
                            ? (item.profile_picture.startsWith('http') ? item.profile_picture : `${API_BASE_URL.replace('/api', '')}${item.profile_picture}`)
                            : `https://ui-avatars.com/api/?name=${item.name}&background=random`
                    }}
                    style={styles.avatar}
                />
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{isMe ? 'You' : item.name}</Text>
                    {isMe && <Text style={styles.tapToRemove}>Tap to remove</Text>}
                </View>
                <Text style={styles.emojiDisplay}>{reactionEmoji}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={styles.container}>
                    {/* Handle bar */}
                    <View style={styles.handleBarContainer}>
                        <View style={styles.handleBar} />
                    </View>

                    <Text style={styles.headerTitle}>
                        {reactionData?.all?.length || 0} Reactions
                    </Text>

                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#007AFF" />
                    ) : (
                        <>
                            {/* Tabs */}
                            <View style={styles.tabsContainer}>
                                {tabs.map(tab => {
                                    const count = tab === 'All'
                                        ? reactionData?.all?.length
                                        : reactionData?.reactions[tab]?.length;

                                    return (
                                        <TouchableOpacity
                                            key={tab}
                                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                                            onPress={() => setActiveTab(tab)}
                                        >
                                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                                {tab} {count}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* List */}
                            <FlatList
                                data={displayUsers}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={renderUserItem}
                                contentContainerStyle={styles.listContent}
                                ListEmptyComponent={<Text style={styles.emptyText}>No reactions</Text>}
                            />
                        </>
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '50%',
        paddingBottom: 20
    },
    handleBarContainer: {
        alignItems: 'center',
        paddingVertical: 10
    },
    handleBar: {
        width: 40,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 3
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10
    },
    tab: {
        marginRight: 20,
        paddingBottom: 5
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#007AFF'
    },
    tabText: {
        fontSize: 16,
        color: '#666'
    },
    activeTabText: {
        color: '#007AFF',
        fontWeight: 'bold'
    },
    listContent: {
        padding: 15
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 15
    },
    userInfo: {
        flex: 1
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333'
    },
    tapToRemove: {
        fontSize: 12,
        color: '#999',
        marginTop: 2
    },
    emojiDisplay: {
        fontSize: 20
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#999'
    }
});

export default ReactionDetailsSheet;
