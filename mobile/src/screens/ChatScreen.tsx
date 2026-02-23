import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator, StatusBar, Modal } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { chatAPI, API_BASE_URL } from '../api/client';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setMessages as setReduxMessages, setActiveGroup, ChatMessage, appendMessage, prependMessages } from '../store/slices/chatSlice';
import { getDB } from '../db/database';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ImagePreviewModal from '../components/ImagePreviewModal';
import ImageViewModal from '../components/ImageViewModal';
import ReactionPicker from '../components/ReactionPicker';
import MessageBubble from '../components/MessageBubble';
import ReactionDetailsSheet from '../components/ReactionDetailsSheet';
import Clipboard from '@react-native-clipboard/clipboard';
import { Alert, Share } from 'react-native';
import Avatar from '../components/Avatar';

// Helper for Unread Divider
const UnreadDivider = ({ colors }: { colors: any }) => (
    <View style={styles.dividerContainer}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <View style={[styles.dividerLabelContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.dividerLabel, { color: colors.primary }]}>Unread Messages</Text>
        </View>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
    </View>
);


const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatScreen() {
    const { colors, isDark } = useTheme();
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { groupId, name, icon } = route.params;
    const { socket } = useSocket();
    const token = useSelector((state: RootState) => state.auth.token);
    const userId = useSelector((state: RootState) => state.auth.user?.id);
    const dispatch = useDispatch();

    // Pull local messages from Redux
    const messages = useSelector((state: RootState) => state.chat.messages);
    const refreshTrigger = useSelector((state: RootState) => state.chat.refreshTrigger);

    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);
    const hasScrolledToUnread = useRef(false);
    const [isGroupAdmin, setIsGroupAdmin] = useState(false);
    const [chatType, setChatType] = useState<'group' | 'private'>('group');
    const [otherMemberId, setOtherMemberId] = useState<number | null>(null);

    // Pagination state
    const [page, setPage] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const fetchMessages = async (silent = false, pageNum = 0) => {
        if (!silent && pageNum === 0) setLoading(true);
        if (pageNum > 0) setLoadingMore(true);

        try {
            const db = await getDB();
            console.log(`[ChatScreen] fetchMessages for groupId=${groupId}, page=${pageNum}`);
            db.transaction((tx: any) => {
                // Clear unread count for this group only on initial load
                if (pageNum === 0) {
                    tx.executeSql('UPDATE local_chats SET unread_count = 0 WHERE id = ?', [groupId]);
                }

                const PAGE_SIZE = 50;
                // Fetch messages FIRST with their real status (so divider shows correctly)
                tx.executeSql(
                    `SELECT * FROM local_messages WHERE group_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
                    [groupId, PAGE_SIZE, pageNum * PAGE_SIZE],
                    (_: any, result: any) => {
                        console.log(`[ChatScreen] Fetched ${result.rows.length} messages for group ${groupId}`);
                        const msgs: any[] = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            const raw = result.rows.item(i);
                            msgs.push({
                                ...raw,
                                is_forwarded: raw.is_forwarded === 1,
                                is_deleted: raw.is_deleted === 1,
                                metadata: raw.metadata ? JSON.parse(raw.metadata) : {},
                                reactions: raw.reactions ? JSON.parse(raw.reactions) : null,
                            });
                        }

                        if (msgs.length < PAGE_SIZE) setHasMore(false);

                        if (pageNum === 0) {
                            dispatch(setReduxMessages(msgs));
                        } else {
                            dispatch(prependMessages(msgs));
                        }

                        // Scroll to the first unread message (WhatsApp-like)
                        if (!hasScrolledToUnread.current && msgs.length > 0 && pageNum === 0) {
                            const unreadIndex = msgs.findIndex((msg, idx) => {
                                if (msg.sender_id === userId || msg.status === 'read') return false;
                                const nextMsg = msgs[idx + 1]; // older message in DESC order
                                return !nextMsg || nextMsg.sender_id === userId || nextMsg.status === 'read';
                            });
                            if (unreadIndex > 0) {
                                hasScrolledToUnread.current = true;
                                setTimeout(() => {
                                    flatListRef.current?.scrollToIndex({
                                        index: unreadIndex,
                                        animated: false,
                                        viewPosition: 0.3, // Position divider ~30% from top
                                    });
                                }, 300);
                            }
                        }
                    }
                );
            });

            // Mark messages as read AFTER fetching, so divider shows on first render
            // Then on next visit/refresh, they'll be read and divider won't show
            setTimeout(async () => {
                const db2 = await getDB();
                db2.transaction((tx: any) => {
                    tx.executeSql(
                        `UPDATE local_messages SET status = 'read' WHERE group_id = ? AND sender_id != ? AND status != 'read'`,
                        [groupId, userId]
                    );
                });
            }, 1000);
        } catch (error) {
            console.error('Fetch local messages error:', error);
        } finally {
            if (pageNum === 0) setLoading(false);
            setLoadingMore(false);
        }
    };

    // Initial fetch, focus tracking, and DB re-syncs
    useEffect(() => {
        dispatch(setActiveGroup(groupId));
        fetchMessages();

        // Fetch user's role in this group and detect chat type
        chatAPI.getGroupDetails(groupId).then((res: any) => {
            const members = res.data?.members || [];
            const me = members.find((m: any) => m.member_id === userId || m.id === userId);
            setIsGroupAdmin(me?.role === 'admin');

            // Detect private chat type
            const groupType = res.data?.type || 'group';
            setChatType(groupType);
            if (groupType === 'private') {
                const other = members.find((m: any) => (m.member_id || m.id) !== userId);
                if (other) setOtherMemberId(other.member_id || other.id);
            }
        }).catch(() => { });

        // Join the socket room for real-time message delivery
        if (socket) {
            const room = `group_${groupId}`;
            socket.emit('join_room', room);
            console.log('Joined socket room:', room);
        }

        return () => {
            dispatch(setActiveGroup(null));
            // Leave the socket room when navigating away
            if (socket) {
                const room = `group_${groupId}`;
                socket.emit('leave_room', room);
                console.log('Left socket room:', room);
            }
        };
    }, [groupId, socket]);

    // Re-fetch when ChatSyncService signals a change
    useEffect(() => {
        if (refreshTrigger > 0) {
            // Re-fetch only page 0 to catch new messages quickly, preserving the existing state otherwise
            fetchMessages(true, 0);
        }
    }, [refreshTrigger]);



    const [selectedImages, setSelectedImages] = useState<any[]>([]);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
    const [reactionDetailsVisible, setReactionDetailsVisible] = useState(false);
    const [reactionDetailsMessageId, setReactionDetailsMessageId] = useState<number | null>(null);
    // Advanced Features State
    const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
    const [replyingTo, setReplyingTo] = useState<any | null>(null);

    const handleLongPress = (message: any) => {
        // Dismiss keyboard if open
        import('react-native').then(({ Keyboard }) => Keyboard.dismiss());

        // Toggle selection
        if (selectedMessages.includes(message.id)) {
            // Deselect
            const newSelection = selectedMessages.filter(id => id !== message.id);
            setSelectedMessages(newSelection);
            if (newSelection.length === 0) setReactionPickerVisible(false);
        } else {
            // Select (Add to list)
            const newSelection = [...selectedMessages, message.id];
            setSelectedMessages(newSelection);

            // Show reaction picker only if 1 item is selected, or update it
            // User requested: "When I long press a message, reaction pallette is getting focus and other submenu is not having focus at the same time."
            // We now use absolute view for picker, so it won't block header.
            // We'll show picker if at least one item is selected? Or just the latest?
            // Let's show it.
            setReactionPickerVisible(true);
        }
    };

    const handleSelect = (message: any) => {
        if (selectedMessages.length > 0) {
            handleLongPress(message);
        } else {
            // If checking reaction picker closes when tapping elsewhere?
            // With absolute view, tapping outside won't close it automatically unless we handle it.
            // But we only show it when selectedMessages > 0.
        }
    };

    const clearSelection = () => {
        setSelectedMessages([]);
    };

    const handleCopy = () => {
        const content = messages.filter(m => selectedMessages.includes(m.id)).map(m => m.content).join('\n');
        Clipboard.setString(content);
        clearSelection();
    };

    const handleDelete = async () => {
        // Determine if user can "Delete for Everyone"
        const allOwnMessages = selectedMessages.every(id => {
            const msg = messages.find(m => m.id === id);
            return msg && msg.sender_id === userId;
        });

        // "Delete for Everyone" is available if:
        // - All selected messages are own messages, OR
        // - User is admin in this group
        const canDeleteForEveryone = allOwnMessages || isGroupAdmin;

        const buttons: any[] = [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete for Self',
                onPress: async () => {
                    try {
                        // Local-only delete: remove from SQLite
                        const db = await getDB();
                        db.transaction((tx: any) => {
                            selectedMessages.forEach(id => {
                                tx.executeSql('DELETE FROM local_messages WHERE id = ?', [id]);
                            });
                        });
                        clearSelection();
                        fetchMessages(true);
                    } catch (error) {
                        console.error('Delete for self failed:', error);
                        Alert.alert('Error', 'Failed to delete messages');
                    }
                }
            },
        ];

        if (canDeleteForEveryone) {
            buttons.push({
                text: 'Delete for Everyone',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const deletePromises = selectedMessages.map(async (id) => {
                            try {
                                await chatAPI.deleteMessage(id);
                            } catch (err: any) {
                                // If already deleted/not found on server, just delete locally so it doesn't get stuck
                                if (err?.response?.status === 404) {
                                    const db = await getDB();
                                    return new Promise<void>((resolve) => {
                                        db.transaction((tx: any) => {
                                            tx.executeSql('DELETE FROM local_messages WHERE id = ?', [id]);
                                        }, () => resolve(), () => resolve());
                                    });
                                }
                                throw err;
                            }
                        });
                        await Promise.all(deletePromises);
                        clearSelection();
                        fetchMessages(true);
                    } catch (error: any) {
                        console.error('Delete for everyone failed:', error);
                        const msg = error?.response?.data?.message || 'Failed to delete messages';
                        Alert.alert('Error', msg);
                    }
                }
            });
        }

        Alert.alert('Delete Messages', 'How would you like to delete?', buttons);
    };

    const handleReply = () => {
        if (selectedMessages.length === 1) {
            const message = messages.find(m => m.id === selectedMessages[0]);
            setReplyingTo(message);
            clearSelection();
        }
    };

    const handleForward = () => {
        if (selectedMessages.length > 0) {
            // Get selected message objects
            const messagesToForward = messages.filter(m => selectedMessages.includes(m.id));

            // We'll pass the first message for preview, but logic in ForwardMessageScreen needs to handle multiple
            // For now, let's just pass the first one to keep it simple, or pass all IDs
            // The user requirement implies sending multiple items.
            // Let's modify ForwardScreen to handle a list.

            const message = messagesToForward[0]; // Primary message for now

            // Parse metadata if needed
            let metadata = {};
            try {
                metadata = typeof message.metadata === 'string' ? JSON.parse(message.metadata) : message.metadata;
            } catch (e) { }

            (navigation as any).navigate('ForwardMessage', {
                messageId: message.id, // Keep for backward compat
                content: message.content,
                type: message.type,
                metadata,
                // Pass all selected messages for bulk forwarding
                forwardList: messagesToForward.map(m => ({
                    content: m.content,
                    type: m.type,
                    metadata: typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata
                }))
            });

            clearSelection();
        }
    };



    const handleShare = async () => {
        if (selectedMessages.length > 0) {
            const selectedMsgs = messages.filter(m => selectedMessages.includes(m.id));
            const shareContent = selectedMsgs.map(m => `[${m.sender_name}]: ${m.content}`).join('\n\n');
            try {
                await Share.share({
                    message: shareContent,
                });
                clearSelection();
            } catch (error) {
                console.error('Share error:', error);
            }
        }
    };

    const handleReactionPress = () => {
        if (selectedMessages.length === 1) {
            setReactionPickerVisible(true);
        }
    };

    const handleReactionSelect = async (reaction: string, specificMessageId?: number) => {
        try {
            const targets = specificMessageId ? [specificMessageId] : selectedMessages;
            if (targets.length === 0) return;

            await Promise.all(targets.map(msgId =>
                chatAPI.reactToMessage(msgId, reaction)
            ));

            setReactionPickerVisible(false);
            setSelectedMessages([]);
            // Refresh to pick up reaction changes from socket/SQLite
            fetchMessages(true);
        } catch (error) {
            console.error('Reaction failed:', error);
            Alert.alert('Error', 'Failed to add reaction');
        }
    };

    const handleAttachment = async () => {
        console.log('handleAttachment called');
        const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
            selectionLimit: 0, // 0 means unlimited
        });
        console.log('ImagePicker Result:', JSON.stringify(result));

        if (result.assets && result.assets.length > 0) {
            console.log('Setting selected images:', result.assets.length);
            setSelectedImages(result.assets);
            setPreviewVisible(true);
        } else {
            console.log('No assets found or cancelled');
        }
    };

    const handleSendImages = async (captions: { [key: number]: string }) => {
        setPreviewVisible(false);
        setLoading(true);

        try {
            console.log('Sending images with captions:', JSON.stringify(captions));
            // Sequential upload to maintain order (can be parallelized too)
            for (let i = 0; i < selectedImages.length; i++) {
                const asset = selectedImages[i];
                const formData = new FormData();
                formData.append('file', {
                    uri: asset.uri,
                    type: asset.type,
                    name: asset.fileName || `image_${i}.jpg`,
                });

                const response = await chatAPI.uploadMedia(formData);
                const { url, type } = response.data;

                // Attach specific caption for this image
                const caption = captions[i];
                const metadata = caption ? { caption } : {};

                await chatAPI.sendMessage(groupId, url, type, metadata);
            }
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setLoading(false);
            setSelectedImages([]);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        if (socket) {
            try {
                let sentMsgData;
                if (replyingTo) {
                    const response = await chatAPI.replyToMessage(groupId, inputText, replyingTo.id);
                    sentMsgData = response.data;
                    setReplyingTo(null);
                } else {
                    const response = await chatAPI.sendMessage(groupId, inputText);
                    sentMsgData = response.data;
                }
                setInputText('');

                // Optimistically insert locally so it appears instantly
                const db = await getDB();
                db.transaction((tx: any) => {
                    tx.executeSql(
                        `INSERT OR IGNORE INTO local_messages 
                        (id, group_id, sender_id, sender_name, sender_avatar, type, content, metadata, 
                        reply_to_id, reply_to_content, reply_to_type, reply_to_sender, is_forwarded, created_at, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
                        [
                            sentMsgData.id, sentMsgData.group_id, sentMsgData.sender_id, sentMsgData.sender_name, sentMsgData.sender_avatar, sentMsgData.type, sentMsgData.content,
                            JSON.stringify(sentMsgData.metadata || {}), sentMsgData.reply_to_id || null, sentMsgData.reply_to_content || null, sentMsgData.reply_to_type || null,
                            sentMsgData.reply_to_sender || null, sentMsgData.is_forwarded ? 1 : 0, sentMsgData.created_at || new Date().toISOString()
                        ],
                        () => {
                            // Update Redux immediately
                            dispatch(appendMessage({ ...sentMsgData, status: 'sent' }));
                        }
                    );

                    // Update Chat List snippet
                    tx.executeSql(
                        `UPDATE local_chats SET last_message = ?, last_message_type = ?, last_message_time = ? WHERE id = ?`,
                        [sentMsgData.content, sentMsgData.type, sentMsgData.created_at || new Date().toISOString(), sentMsgData.group_id]
                    );
                });

            } catch (err: any) {
                const errorData = err?.response?.data;
                const errorMessage = errorData?.message || err?.message || 'Failed';

                if (err?.response?.status === 403) {
                    Alert.alert(
                        "Chat Unavailable",
                        "This chat session has been deleted on the server or you are no longer a member. Do you want to remove it locally?",
                        [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Remove", style: "destructive", onPress: async () => {
                                    try {
                                        const db = await getDB();
                                        db.transaction((tx: any) => {
                                            tx.executeSql('DELETE FROM local_messages WHERE group_id = ?', [groupId]);
                                            tx.executeSql('DELETE FROM local_chats WHERE id = ?', [groupId]);
                                        });
                                        navigation.goBack();
                                    } catch (e) {
                                        console.error("Cleanup error", e);
                                    }
                                }
                            }
                        ]
                    );
                } else {
                    console.error('Send error:', errorData || err?.message || err);
                    Alert.alert('Send Error', errorMessage);
                }
            }
        }
    };

    const handleReactionDetails = (messageId: number) => {
        setReactionDetailsMessageId(messageId);
        setReactionDetailsVisible(true);
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => {
        const isMe = item.sender_id === userId;

        // Logic for Unread Divider
        // In inverted list, "Next" item is older.
        // We want to show divider visually ABOVE the oldest unread message.
        // In code (item structure), that means checking if CURRENT item is the oldest unread.
        let showDivider = false;
        if (!isMe && item.status !== 'read') {
            const nextItem = messages[index + 1]; // Older message
            // If next (older) message is Read, or Me, or doesn't exist, this is the boundary
            if (!nextItem || nextItem.sender_id === userId || nextItem.status === 'read') {
                showDivider = true;
            }
        }

        return (
            <View>
                {showDivider && <UnreadDivider colors={colors} />}
                <MessageBubble
                    item={item}
                    isMe={isMe}
                    colors={colors}
                    onLongPress={handleLongPress}
                    onPress={handleSelect}
                    onImagePress={(url) => setViewingImage(url)}
                    isSelected={selectedMessages.includes(Number(item.id))}
                    onReactionPress={(reaction) => handleReactionSelect(reaction, item.id)} // Pass specific item ID
                    onReactionDetails={() => handleReactionDetails(item.id)}
                />
            </View>
        );
    };

    if (loading) {
        return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;
    }



    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaView edges={['top']} style={{ backgroundColor: selectedMessages.length > 0 ? colors.primary : colors.surface }}>
                {selectedMessages.length > 0 ? (
                    <View style={[styles.header, { backgroundColor: colors.primary }]}>
                        <TouchableOpacity onPress={clearSelection} style={styles.backButton}>
                            <Icon name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: '#fff' }]}>{selectedMessages.length} Selected</Text>
                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <TouchableOpacity onPress={handleReply} disabled={selectedMessages.length !== 1}>
                                <Icon name="reply" size={24} color={selectedMessages.length === 1 ? "#fff" : "rgba(255,255,255,0.5)"} />
                            </TouchableOpacity>
                            {/* Reaction moved to on-screen palette */}
                            <TouchableOpacity onPress={handleDelete}>
                                <Icon name="delete" size={24} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCopy}>
                                <Icon name="content-copy" size={24} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleShare}>
                                <Icon name="share-variant" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.header, { borderBottomColor: colors.borderLight, backgroundColor: colors.surface }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="arrow-left" size={24} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => {
                                if (chatType === 'private' && otherMemberId) {
                                    // @ts-ignore
                                    navigation.navigate('ContactInfo', { memberId: otherMemberId });
                                } else {
                                    // @ts-ignore
                                    navigation.navigate('GroupInfo', { groupId, name, icon });
                                }
                            }}
                        >
                            <Avatar uri={icon} name={name} size={40} style={styles.headerAvatar} />
                            <Text style={[styles.headerTitle, { color: colors.text }]}>{name}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                inverted
                contentContainerStyle={styles.listContent}
                onScrollToIndexFailed={(info) => {
                    // Fallback: scroll to approximate offset
                    flatListRef.current?.scrollToOffset({
                        offset: info.averageItemLength * info.index,
                        animated: false,
                    });
                }}
                onEndReached={() => {
                    if (!loadingMore && hasMore) {
                        const nextPage = page + 1;
                        setPage(nextPage);
                        fetchMessages(true, nextPage);
                    }
                }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} /> : null}
            />

            {name === 'ChamBot' ? (
                <View style={[styles.readOnlyContainer, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>
                        READ ONLY: ChamBot is for one-way announcements.
                    </Text>
                </View>
            ) : (
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "padding"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
                    style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}
                >
                    {replyingTo && (
                        <View style={[styles.replyPreview, { backgroundColor: colors.background, borderLeftColor: colors.primary }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.replySender, { color: colors.primary }]}>{replyingTo.sender_name}</Text>
                                <Text numberOfLines={1} style={{ color: colors.textSecondary }}>{replyingTo.content}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                <Icon name="close" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity style={styles.attachButton} onPress={handleAttachment}>
                            <Icon name="plus" size={24} color={colors.primary} />
                        </TouchableOpacity>

                        <TextInput
                            style={[styles.input, { backgroundColor: isDark ? '#333' : '#f0f0f0', color: colors.text }]}
                            placeholder="Message..."
                            placeholderTextColor={colors.textSecondary}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />

                        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                            <Icon name="send" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            )}

            <ImagePreviewModal
                visible={previewVisible}
                images={selectedImages}
                onClose={() => setPreviewVisible(false)}
                onSend={handleSendImages}
            />

            <ImageViewModal
                visible={!!viewingImage}
                imageUrl={viewingImage}
                onClose={() => setViewingImage(null)}
            />

            {/* Reaction Picker Modal */}
            <Modal
                transparent={true}
                visible={reactionPickerVisible}
                onRequestClose={() => setReactionPickerVisible(false)}
                animationType="fade"
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setReactionPickerVisible(false)}
                >
                    <View style={styles.reactionPickerContainer}>
                        {REACTIONS.map(reaction => (
                            <TouchableOpacity
                                key={reaction}
                                style={styles.reactionOption}
                                onPress={() => handleReactionSelect(reaction)}
                            >
                                <Text style={styles.reactionOptionText}>{reaction}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Reaction Details Sheet */}
            <ReactionDetailsSheet
                visible={reactionDetailsVisible}
                onClose={() => setReactionDetailsVisible(false)}
                messageId={reactionDetailsMessageId}
                currentUserId={userId || 0}
                onReactionChange={() => {
                    fetchMessages(true); // Refresh messages to update counts
                    setReactionDetailsVisible(false); // Close sheet after removing
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        // paddingTop handled by SafeAreaView
        borderBottomWidth: 1,
        elevation: 2
    },
    backButton: { padding: 5 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20, marginHorizontal: 10 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
    listContent: { padding: 10, paddingBottom: 20 },
    bubble: {
        maxWidth: '80%',
        padding: 10,
        borderRadius: 15,
        marginBottom: 10,
        elevation: 1
    },
    bubbleLeft: {
        alignSelf: 'flex-start',
        borderTopLeftRadius: 0
    },
    bubbleRight: {
        alignSelf: 'flex-end',
        borderTopRightRadius: 0
    },
    senderName: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
    messageText: { fontSize: 16 },
    timeText: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
    mediaImage: { width: 200, height: 200, borderRadius: 10 },
    inputContainer: {
        padding: 10,
        borderTopWidth: 1
    },
    replyPreview: {
        padding: 8,
        marginBottom: 5,
        borderRadius: 8,
        borderLeftWidth: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    replySender: { fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        maxHeight: 100,
        marginHorizontal: 10
    },
    attachButton: { padding: 5 },
    sendButton: {
        backgroundColor: '#007AFF', // Or theme primary
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 15,
        marginBottom: 20
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerLabelContainer: {
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#eee', // or use colors.border
        marginHorizontal: 10
    },
    dividerLabel: {
        fontSize: 12,
        fontWeight: 'bold'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactionPickerContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 15,
        elevation: 5,
        gap: 15
    },
    reactionOption: {
        padding: 5
    },
    reactionOptionText: {
        fontSize: 24
    },
    readOnlyContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    readOnlyText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        opacity: 0.8
    }
});
