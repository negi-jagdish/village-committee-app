import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Modal, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { getDB } from '../db/database';
import { chatAPI } from '../api/client';

export default function ChatListScreen() {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<any>();
    const { socket } = useSocket();
    const token = useSelector((state: RootState) => state.auth.token);

    const refreshTrigger = useSelector((state: RootState) => state.chat.refreshTrigger);

    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchChats = async (forceSync = false) => {
        try {
            const db = await getDB();

            if (forceSync) {
                // Sync with server to get updated names and icon_urls
                try {
                    const response = await chatAPI.getList();
                    const serverChats = response.data;

                    db.transaction((tx: any) => {
                        serverChats.forEach((chat: any) => {
                            tx.executeSql(
                                `INSERT OR IGNORE INTO local_chats (id, name, type, icon_url, last_message, last_message_type, last_message_time, unread_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                [chat.id, chat.name, chat.type, chat.icon_url, chat.last_message, chat.last_message_type, chat.last_message_time, chat.unread_count || 0]
                            );
                            tx.executeSql(
                                `UPDATE local_chats SET name = ?, type = ?, icon_url = ?, last_message = ?, last_message_type = ?, last_message_time = ? WHERE id = ?`,
                                [chat.name, chat.type, chat.icon_url, chat.last_message, chat.last_message_type, chat.last_message_time, chat.id]
                            );
                        });
                    });
                } catch (syncError) {
                    console.error('Failed to sync chat list from server:', syncError);
                }
            }

            // Load from SQLite
            db.transaction((tx: any) => {
                tx.executeSql(
                    'SELECT * FROM local_chats ORDER BY is_pinned DESC, last_message_time DESC',
                    [],
                    (_: any, result: any) => {
                        const loadedChats = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            loadedChats.push(result.rows.item(i));
                        }
                        setChats(loadedChats);
                    }
                );
            });
        } catch (error) {
            console.error('Fetch local chats error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchChats(true); // Fetch networks occasionally
        }, [])
    );

    // Auto-refresh when sync service pulls new messages
    useEffect(() => {
        if (refreshTrigger > 0) {
            fetchChats(false);
        }
    }, [refreshTrigger]);

    const [selectedChat, setSelectedChat] = useState<any>(null);

    const handlePinChat = async (chat: any) => {
        const db = await getDB();
        const isPinned = chat.is_pinned === 1;

        // Count currently pinned
        const pinnedCount = chats.filter(c => c.is_pinned === 1).length;
        if (!isPinned && pinnedCount >= 4) {
            Alert.alert('Limit Reached', 'You can only pin up to 4 chats.');
            return;
        }

        db.transaction((tx: any) => {
            tx.executeSql('UPDATE local_chats SET is_pinned = ? WHERE id = ?', [isPinned ? 0 : 1, chat.id]);
        }, (err: any) => console.error(err), () => fetchChats(false));
        setSelectedChat(null);
    };

    const handleMuteChat = async (chat: any, durationHours: number | 'always') => {
        const db = await getDB();
        let muteUntil: string | null = null;
        if (durationHours === 'always') {
            muteUntil = 'always';
        } else if (typeof durationHours === 'number' && durationHours > 0) {
            const date = new Date();
            date.setHours(date.getHours() + durationHours);
            muteUntil = date.toISOString();
        }

        db.transaction((tx: any) => {
            tx.executeSql('UPDATE local_chats SET mute_until = ? WHERE id = ?', [muteUntil, chat.id]);
        }, (err: any) => console.error(err), () => fetchChats(false));
        setSelectedChat(null);
    };

    const handleMarkAsReadUnread = async (chat: any) => {
        const db = await getDB();
        const newUnreadCount = chat.unread_count > 0 ? 0 : 1;
        db.transaction((tx: any) => {
            tx.executeSql('UPDATE local_chats SET unread_count = ? WHERE id = ?', [newUnreadCount, chat.id]);
        }, (err: any) => console.error(err), () => fetchChats(false));
        setSelectedChat(null);
    };

    const handleDeleteChat = (chat: any) => {
        Alert.alert('Delete Chat', `Are you sure you want to delete the chat with ${chat.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const db = await getDB();
                    db.transaction((tx: any) => {
                        tx.executeSql('DELETE FROM local_chats WHERE id = ?', [chat.id]);
                        tx.executeSql('DELETE FROM local_messages WHERE group_id = ?', [chat.id]);
                    }, (err: any) => console.error(err), () => fetchChats(false));
                }
            }
        ]);
        setSelectedChat(null);
    };

    const isMuted = (chat: any) => {
        if (!chat || !chat.mute_until) return false;
        if (chat.mute_until === 'always') return true;
        return new Date(chat.mute_until) > new Date();
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchChats(true);
    };

    const renderItem = ({ item }: { item: any }) => {
        const isChamBot = item.name === 'ChamBot';
        const muted = isMuted(item);

        return (
            <TouchableOpacity
                style={[styles.chatItem, { borderBottomColor: colors.borderLight }]}
                onPress={() => navigation.navigate('ChatScreen', {
                    groupId: item.id,
                    name: item.name,
                    icon: item.icon_url
                })}
                onLongPress={() => setSelectedChat(item)}
                activeOpacity={0.7}
            >
                <Avatar
                    uri={item.icon_url}
                    name={item.name}
                    size={50}
                    style={styles.avatar}
                />

                <View style={styles.chatContent}>
                    <View style={styles.headerRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                                {item.name} {isChamBot && '🤖'}
                            </Text>
                            {item.is_pinned === 1 && <Icon name="push-pin" size={14} color={colors.textSecondary} style={{ marginLeft: 5, transform: [{ rotate: '45deg' }] }} />}
                            {muted && <Icon name="notifications-off" size={14} color={colors.textSecondary} style={{ marginLeft: 5 }} />}
                        </View>
                        {item.last_message_time && (
                            <Text style={[styles.time, { color: item.unread_count > 0 ? colors.success : colors.textSecondary }]}>
                                {formatDistanceToNow(new Date(item.last_message_time), { addSuffix: true }).replace('about ', '')}
                            </Text>
                        )}
                    </View>

                    <View style={styles.messageRow}>
                        <Text
                            style={[
                                styles.lastMessage,
                                { color: item.unread_count > 0 ? colors.text : colors.textSecondary },
                                item.unread_count > 0 && styles.unreadMessage
                            ]}
                            numberOfLines={1}
                        >
                            {item.last_message_type === 'image' ? '📷 Image' :
                                item.last_message_type === 'video' ? '🎥 Video' :
                                    item.last_message || 'No messages yet'}
                        </Text>

                        {item.unread_count > 0 && (
                            <View style={[styles.badge, { backgroundColor: colors.success }]}>
                                <Text style={styles.badgeText}>{item.unread_count}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={chats}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <Text style={{ color: colors.textSecondary, marginTop: 50 }}>No chats yet</Text>
                    </View>
                }
            />

            {/* Selection Modal */}
            <Modal
                visible={!!selectedChat}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedChat(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSelectedChat(null)}
                >
                    <View style={[styles.menuContainer, { backgroundColor: colors.surface }]}>
                        <View style={styles.menuHeader}>
                            <Avatar uri={selectedChat?.icon_url} name={selectedChat?.name || ''} size={40} />
                            <Text style={[styles.menuTitle, { color: colors.text }]}>{selectedChat?.name}</Text>
                        </View>

                        <TouchableOpacity style={styles.menuItem} onPress={() => handlePinChat(selectedChat)}>
                            <Icon name={selectedChat?.is_pinned === 1 ? 'push-pin' : 'push-pin'} size={24} color={colors.textSecondary} style={selectedChat?.is_pinned === 1 && { transform: [{ rotate: '45deg' }] }} />
                            <Text style={[styles.menuItemText, { color: colors.text }]}>{selectedChat?.is_pinned === 1 ? 'Unpin Chat' : 'Pin Chat'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => {
                            if (isMuted(selectedChat)) {
                                handleMuteChat(selectedChat, 0);
                            } else {
                                Alert.alert('Mute Chat', 'How long would you like to mute?', [
                                    { text: '1 Hour', onPress: () => handleMuteChat(selectedChat, 1) },
                                    { text: '12 Hours', onPress: () => handleMuteChat(selectedChat, 12) },
                                    { text: '1 Day', onPress: () => handleMuteChat(selectedChat, 24) },
                                    { text: 'Always', onPress: () => handleMuteChat(selectedChat, 'always') },
                                    { text: 'Cancel', style: 'cancel' }
                                ]);
                            }
                        }}>
                            <Icon name={isMuted(selectedChat) ? 'notifications-active' : 'notifications-off'} size={24} color={colors.textSecondary} />
                            <Text style={[styles.menuItemText, { color: colors.text }]}>{isMuted(selectedChat) ? 'Unmute' : 'Mute Notifications'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => handleMarkAsReadUnread(selectedChat)}>
                            <Icon name={selectedChat?.unread_count > 0 ? 'mark-chat-read' : 'mark-chat-unread'} size={24} color={colors.textSecondary} />
                            <Text style={[styles.menuItemText, { color: colors.text }]}>{selectedChat?.unread_count > 0 ? 'Mark as Read' : 'Mark as Unread'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => handleDeleteChat(selectedChat)}>
                            <Icon name="delete" size={24} color="#E53935" />
                            <Text style={[styles.menuItemText, { color: '#E53935' }]}>Delete Chat</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('NewChat')}
            >
                <Icon name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

import Icon from 'react-native-vector-icons/MaterialIcons';

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatItem: {
        flexDirection: 'row',
        padding: 15,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        backgroundColor: '#eee',
    },
    chatContent: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    time: {
        fontSize: 12,
    },
    messageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        fontSize: 14,
        flex: 1,
        marginRight: 10,
    },
    unreadMessage: {
        fontWeight: 'bold',
    },
    badge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 999,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    menuContainer: {
        width: '80%',
        borderRadius: 12,
        padding: 10,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.34,
        shadowRadius: 6.27,
    },
    menuHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
        marginBottom: 10
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 15
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    menuItemText: {
        fontSize: 16,
        marginLeft: 15
    }
});
