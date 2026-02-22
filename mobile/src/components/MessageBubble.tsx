import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { API_BASE_URL } from '../api/client';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface MessageBubbleProps {
    item: any;
    isMe: boolean;
    colors: any;
    onLongPress: (item: any) => void;
    onPress?: (item: any) => void;
    onImagePress?: (imageUrl: string) => void;
    isSelected: boolean;
    onReactionPress?: (reaction: string) => void;
    onReactionDetails?: () => void;
}

const MessageBubble = ({ item, isMe, colors, onLongPress, onPress, onImagePress, isSelected, onReactionPress, onReactionDetails }: MessageBubbleProps) => {
    let metadata = {};
    try {
        metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
    } catch (e) { }

    let reactions = item.reactions;
    if (typeof reactions === 'string') {
        try {
            reactions = JSON.parse(reactions);
        } catch (e) { reactions = {}; }
    }

    const caption = (metadata as any)?.caption;
    const isDeleted = item.is_deleted === 1;

    // ... (rest of code)

    // ... (rest of code)

    if (item.type === 'system') {
        return (
            <View style={styles.systemMessageContainer}>
                <Text style={styles.systemMessageText}>{item.content}</Text>
            </View>
        );
    }

    return (
        <TouchableOpacity
            onLongPress={() => {
                if (onLongPress) onLongPress(item);
            }}
            onPress={() => {
                if (onPress) onPress(item);
            }}
            activeOpacity={0.8}
            style={[
                styles.container,
                isSelected && { backgroundColor: 'rgba(0, 122, 255, 0.1)' }
            ]}
        >
            <View style={[
                styles.bubble,
                isMe ? styles.bubbleRight : styles.bubbleLeft,
                { backgroundColor: isMe ? colors.primary : (colors.isDark ? '#333' : '#fff') }
            ]}>
                {!isMe && <Text style={[styles.senderName, { color: colors.primary }]}>{item.sender_name}</Text>}

                {item.reply_to_sender && (
                    <View style={[styles.replyContainer, { borderLeftColor: colors.primary }]}>
                        <Text style={[styles.replySender, { color: colors.primary }]}>{item.reply_to_sender}</Text>
                        <Text numberOfLines={1} style={{ color: colors.textSecondary }}>
                            {item.reply_to_type === 'image' ? '📷 Photo' : item.reply_to_content}
                        </Text>
                    </View>
                )}

                {item.is_forwarded === 1 && (
                    <Text style={[styles.forwardedText, { color: colors.textSecondary }]}>
                        ↩ Forwarded
                    </Text>
                )}

                {item.type === 'image' && !isDeleted && (
                    <View>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => {
                                const url = item.content.startsWith('http') ? item.content : `${API_BASE_URL.replace('/api', '')}${item.content}`;
                                if (onImagePress) onImagePress(url);
                            }}
                            onLongPress={() => {
                                if (onLongPress) onLongPress(item);
                            }}
                        >
                            <Image
                                source={{ uri: item.content.startsWith('http') ? item.content : `${API_BASE_URL.replace('/api', '')}${item.content}` }}
                                style={styles.mediaImage}
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                        {/* Caption for Image */}
                        {caption && (
                            <Text style={[styles.messageText, { color: isMe ? '#fff' : colors.text, marginTop: 5 }]}>
                                {caption}
                            </Text>
                        )}
                    </View>
                )}

                {(item.type === 'text' || isDeleted) && (
                    <Text style={[
                        styles.messageText,
                        { color: isMe ? '#fff' : colors.text },
                        isDeleted && { fontStyle: 'italic', color: colors.textSecondary }
                    ]}>
                        {item.content}
                    </Text>
                )}

                {/* Reactions */}
                {reactions && Object.keys(reactions).length > 0 && (() => {
                    const reactionKeys = Object.keys(reactions);
                    const totalCount = reactionKeys.reduce((acc, key) => acc + reactions[key].length, 0);
                    // Show up to 3 unique emojis. WhatsApp style: [👍 ❤️ 😆 5]
                    const displayEmojis = reactionKeys.slice(0, 3).join(' ');

                    return (
                        <TouchableOpacity
                            style={styles.reactionPill}
                            activeOpacity={0.7}
                            onPress={() => {
                                if (onReactionDetails) onReactionDetails();
                            }}
                        >
                            <Text style={styles.reactionText}>{displayEmojis} {totalCount > 1 && totalCount}</Text>
                        </TouchableOpacity>
                    );
                })()}

                <View style={styles.timeContainer}>
                    <Text style={[styles.timeText, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                        {format(new Date(item.created_at), 'HH:mm')}
                    </Text>
                    {isMe && (
                        <View style={{ marginLeft: 4 }}>
                            {item.status === 'pending' && <Icon name="clock-outline" size={12} color="rgba(255,255,255,0.7)" />}
                            {item.status === 'sent' && <Icon name="check" size={12} color="rgba(255,255,255,0.7)" />}
                            {item.status === 'delivered' && <Icon name="check-all" size={12} color="rgba(255,255,255,0.7)" />}
                            {item.status === 'read' && <Icon name="check-all" size={12} color="#34B7F1" />}
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 10,
        paddingVertical: 4, // Increased slightly
    },
    bubble: {
        maxWidth: '80%',
        padding: 10,
        borderRadius: 15,
        marginBottom: 10, // Ensure space for overlapping reaction
        elevation: 1,
        position: 'relative' // For absolute positioning of reaction
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
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        marginTop: 4
    },
    timeText: { fontSize: 10 },
    mediaImage: { width: 200, height: 200, borderRadius: 10 },
    replyContainer: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderLeftWidth: 4,
        padding: 5,
        borderRadius: 4,
        marginBottom: 5
    },
    replySender: { fontWeight: 'bold', fontSize: 12 },
    forwardedText: {
        fontStyle: 'italic',
        fontSize: 12,
        marginBottom: 5
    },
    // New Styles for WhatsApp-like Reactions
    reactionPill: {
        position: 'absolute',
        bottom: -10, // Overlap bottom
        left: 10, // Default left
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 6,
        paddingVertical: 2,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
        zIndex: 10,
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    reactionText: { fontSize: 11, color: '#333' },
    systemMessageContainer: {
        alignItems: 'center',
        marginVertical: 10,
        paddingHorizontal: 20
    },
    systemMessageText: {
        backgroundColor: 'rgba(0,0,0,0.1)', // Light gray background bubble
        color: '#555',
        fontSize: 12,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10,
        textAlign: 'center',
        overflow: 'hidden'
    }
});

export default MessageBubble;
