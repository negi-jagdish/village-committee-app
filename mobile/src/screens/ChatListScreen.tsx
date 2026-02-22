import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
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
                    'SELECT * FROM local_chats ORDER BY id DESC',
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

    const onRefresh = () => {
        setRefreshing(true);
        fetchChats(true);
    };

    const renderItem = ({ item }: { item: any }) => {
        const isChamBot = item.name === 'ChamBot';

        return (
            <TouchableOpacity
                style={[styles.chatItem, { borderBottomColor: colors.borderLight }]}
                onPress={() => navigation.navigate('ChatScreen', {
                    groupId: item.id,
                    name: item.name,
                    icon: item.icon_url
                })}
            >
                <Avatar
                    uri={item.icon_url}
                    name={item.name}
                    size={50}
                    style={styles.avatar}
                />

                <View style={styles.chatContent}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.name, { color: colors.text }]}>
                            {item.name} {isChamBot && '🤖'}
                        </Text>
                        {item.last_message_time && (
                            <Text style={[styles.time, { color: colors.textSecondary }]}>
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
});
