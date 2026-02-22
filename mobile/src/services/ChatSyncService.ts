import { getDB } from '../db/database';
import { store } from '../store';
import { appendMessage, updateMessageStatus } from '../store/slices/chatSlice';
import { NotificationService } from './NotificationService';

class ChatSyncService {
    private isInitialized = false;

    init(socket: any) {
        if (this.isInitialized) return;

        if (!socket) {
            console.warn("ChatSyncService: Socket not available yet.");
            return;
        }

        this.setupListeners(socket);
        this.isInitialized = true;
        console.log("ChatSyncService initialized");

        // Temporary cleanup for testing environments that got ID collisions
        getDB().then(db => {
            db.transaction((tx: any) => {
                tx.executeSql('DELETE FROM local_messages WHERE id < 10000');
            });
        }).catch(err => console.error("Cleanup error:", err));
    }

    private setupListeners(socket: any) {
        // 1. Initial Sync (Last 3 days of messages on connect)
        socket.on('sync_messages', async (messages: any[]) => {
            console.log(`[ChatSync] Received ${messages.length} messages for sync`);
            if (messages.length === 0) return;

            const db = await getDB();
            const messageIdsToAck: number[] = [];

            db.transaction((tx: any) => {
                messages.forEach(msg => {
                    // Update local chat overview if needed
                    if (msg.group_id) {
                        tx.executeSql(
                            `INSERT OR IGNORE INTO local_chats (id, name, type) VALUES (?, ?, ?)`,
                            [msg.group_id, msg.group_name || `Group ${msg.group_id}`, msg.group_type || 'group']
                        );

                        // Update last message info (the last message in the batch wins since they're ordered ASC)
                        tx.executeSql(
                            `UPDATE local_chats SET last_message = ?, last_message_type = ?, last_message_time = ? WHERE id = ?`,
                            [msg.content, msg.type, msg.created_at || new Date().toISOString(), msg.group_id]
                        );
                    }

                    tx.executeSql(
                        `INSERT OR IGNORE INTO local_messages 
                        (id, group_id, sender_id, sender_name, sender_avatar, type, content, metadata, 
                        reply_to_id, reply_to_content, reply_to_type, reply_to_sender, is_forwarded, created_at, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'delivered')`,
                        [
                            msg.id, msg.group_id, msg.sender_id || null, msg.sender_name || null, msg.sender_avatar || null, msg.type, msg.content,
                            JSON.stringify(msg.metadata || {}), msg.reply_to_id || null, msg.reply_to_content || null, msg.reply_to_type || null,
                            msg.reply_to_sender || null, msg.is_forwarded ? 1 : 0, msg.created_at || new Date().toISOString()
                        ],
                        (_: any, result: any) => {
                            console.log(`[ChatSync] sync INSERT msg ${msg.id} group ${msg.group_id}: rows=${result.rowsAffected}`);
                        },
                        (_: any, error: any) => {
                            console.error(`[ChatSync] sync INSERT FAILED msg ${msg.id}:`, error);
                            return false;
                        }
                    );

                    // If it's not sent by ME, I need to tell the server I got it
                    const currentUserId = store.getState().auth.user?.id;
                    if (msg.sender_id !== currentUserId && msg.type !== 'system') {
                        messageIdsToAck.push(msg.id);
                    }
                });
            }, (error: any) => {
                console.error("[ChatSync] Error syncing batch:", error);
            }, () => {
                // Success: Ack delivery to server (Double Tick)
                if (messageIdsToAck.length > 0) {
                    socket.emit('messages_delivered', messageIdsToAck);
                }

                // Dispatch event to Redux to trigger UI refresh (simplified approach)
                store.dispatch({ type: 'chat/triggerRefresh' });
            });
        });

        // 2. Receiving a real-time message
        socket.on('receive_message', async (msg: any) => {
            console.log(`[ChatSync] Received real-time message: ${msg.id}`);
            const db = await getDB();
            const currentUserId = store.getState().auth.user?.id;

            db.transaction((tx: any) => {
                // Ensure the chat exists in local_chats (INSERT OR IGNORE preserves existing data like unread_count)
                const chatName = msg.display_name || msg.group_name || msg.sender_name || `Chat ${msg.group_id}`;
                tx.executeSql(
                    `INSERT OR IGNORE INTO local_chats (id, name, type) VALUES (?, ?, ?)`,
                    [msg.group_id, chatName, msg.group_type || 'private']
                );
                // Update the display name (in case it changed)
                tx.executeSql(
                    `UPDATE local_chats SET name = ? WHERE id = ?`,
                    [chatName, msg.group_id]
                );

                // Update chat's last message info
                tx.executeSql(
                    `UPDATE local_chats SET last_message = ?, last_message_type = ?, last_message_time = ? WHERE id = ?`,
                    [msg.content, msg.type, msg.created_at || new Date().toISOString(), msg.group_id]
                );

                // Insert the message
                tx.executeSql(
                    `INSERT OR IGNORE INTO local_messages 
                    (id, group_id, sender_id, sender_name, sender_avatar, type, content, metadata, 
                    reply_to_id, reply_to_content, reply_to_type, reply_to_sender, is_forwarded, created_at, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'delivered')`,
                    [
                        msg.id, msg.group_id, msg.sender_id, msg.sender_name, msg.sender_avatar, msg.type, msg.content,
                        JSON.stringify(msg.metadata || {}), msg.reply_to_id || null, msg.reply_to_content || null, msg.reply_to_type || null,
                        msg.reply_to_sender || null, msg.is_forwarded ? 1 : 0, msg.created_at || new Date().toISOString()
                    ],
                    (_: any, result: any) => {
                        console.log(`[ChatSync] receive_message INSERT for msg ${msg.id} group ${msg.group_id}: rowsAffected=${result.rowsAffected}`);
                        if (result.rowsAffected > 0) {

                            const activeGroupId = store.getState().chat.activeGroupId;
                            const isMe = msg.sender_id === currentUserId;
                            const isSystem = msg.type === 'system';

                            // Update Redux state directly if we are looking at this chat
                            store.dispatch(appendMessage(msg));

                            // Sound and Status Acknowledgment
                            if (!isMe && !isSystem) {
                                socket.emit('messages_delivered', [msg.id]);

                                // Play Custom Sound/Vibrate/Foreground Notification
                                const isCurrentlyInChat = activeGroupId === msg.group_id;
                                const chatName = msg.display_name || msg.group_name || msg.sender_name || 'Village Member';
                                NotificationService.displayChatNotification(chatName, msg.content, isCurrentlyInChat);
                            }
                        }
                    }
                );
            }, (error: any) => {
                console.error("[ChatSync] Error inserting real-time message:", error);
            }, () => {
                // Trigger chat list refresh
                store.dispatch({ type: 'chat/triggerRefresh' });
            });
        });

        // 2b. Chat list update (sent after every message to all group members)
        socket.on('chat_list_update', async (msg: any) => {
            console.log(`[ChatSync] chat_list_update for group ${msg.group_id}`);
            const db = await getDB();
            const currentUserId = store.getState().auth.user?.id;

            db.transaction((tx: any) => {
                // Ensure the chat exists (INSERT OR IGNORE preserves existing data like unread_count)
                const chatName = msg.display_name || msg.group_name || msg.sender_name || `Chat ${msg.group_id}`;
                tx.executeSql(
                    `INSERT OR IGNORE INTO local_chats (id, name, type) VALUES (?, ?, ?)`,
                    [msg.group_id, chatName, msg.group_type || 'private']
                );
                // Update the display name (in case it changed)
                tx.executeSql(
                    `UPDATE local_chats SET name = ? WHERE id = ?`,
                    [chatName, msg.group_id]
                );

                // Update last message snippet
                tx.executeSql(
                    `UPDATE local_chats SET last_message = ?, last_message_type = ?, last_message_time = ? WHERE id = ?`,
                    [msg.content, msg.type, msg.created_at || new Date().toISOString(), msg.group_id]
                );

                // Also store the actual message so it's available when opening the chat
                tx.executeSql(
                    `INSERT OR IGNORE INTO local_messages 
                    (id, group_id, sender_id, sender_name, sender_avatar, type, content, metadata, 
                    reply_to_id, reply_to_content, reply_to_type, reply_to_sender, is_forwarded, created_at, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'delivered')`,
                    [
                        msg.id, msg.group_id, msg.sender_id || null, msg.sender_name || null, msg.sender_avatar || null, msg.type, msg.content,
                        JSON.stringify(msg.metadata || {}), msg.reply_to_id || null, msg.reply_to_content || null, msg.reply_to_type || null,
                        msg.reply_to_sender || null, msg.is_forwarded ? 1 : 0, msg.created_at || new Date().toISOString()
                    ]
                );

                // Increment unread count if not looking at this chat
                const activeGroupId = store.getState().chat.activeGroupId;
                if (activeGroupId !== msg.group_id && msg.sender_id !== currentUserId && msg.type !== 'system') {
                    tx.executeSql(
                        `UPDATE local_chats SET unread_count = unread_count + 1 WHERE id = ?`,
                        [msg.group_id]
                    );

                    // We also show a notification here since the user is not actively seeing the group chat!
                    const chatName = msg.display_name || msg.group_name || msg.sender_name || 'Village Member';
                    NotificationService.displayChatNotification(chatName, msg.content, false);
                }
            }, (error: any) => {
                console.error("[ChatSync] Error updating chat list:", error);
            }, () => {
                store.dispatch({ type: 'chat/triggerRefresh' });
            });
        });

        // 3. Status updates (My messages got sent or delivered to SOMEONE)
        socket.on('message_status_update', async (data: { status: 'sent' | 'delivered', details: any[] }) => {
            console.log(`[ChatSync] Status Update: ${data.status} for ${data.details.length} msgs`);
            const db = await getDB();

            db.transaction((tx: any) => {
                data.details.forEach(detail => {
                    const msgId = detail.messageId; // Structure from backend
                    tx.executeSql(
                        `UPDATE local_messages SET status = ? WHERE id = ? AND status != 'read'`,
                        [data.status, msgId],
                        (_: any, result: any) => {
                            if (result.rowsAffected > 0) {
                                // Inform Redux about status change for UI updates
                                store.dispatch(updateMessageStatus({ id: msgId, status: data.status }));
                            }
                        }
                    );
                });
            });
        });

        // 4. Reaction updates (someone reacted to a message)
        socket.on('message_reaction', async (data: { messageId: number, reactions: any }) => {
            console.log(`[ChatSync] message_reaction for msg ${data.messageId}`);
            const db = await getDB();
            db.transaction((tx: any) => {
                tx.executeSql(
                    `UPDATE local_messages SET reactions = ? WHERE id = ?`,
                    [JSON.stringify(data.reactions), data.messageId]
                );
            }, (error: any) => {
                console.error("[ChatSync] Error updating reactions:", error);
            }, () => {
                store.dispatch({ type: 'chat/triggerRefresh' });
            });
        });

        // 5. Message deleted (someone deleted a message)
        socket.on('message_deleted', async (data: { messageId: number, groupId: number }) => {
            console.log(`[ChatSync] message_deleted for msg ${data.messageId}`);
            const db = await getDB();
            db.transaction((tx: any) => {
                tx.executeSql(
                    `UPDATE local_messages SET is_deleted = 1, content = 'This message was deleted', type = 'system' WHERE id = ?`,
                    [data.messageId]
                );
            }, (error: any) => {
                console.error("[ChatSync] Error updating deleted message:", error);
            }, () => {
                store.dispatch({ type: 'chat/triggerRefresh' });
            });
        });
    }
}

export default new ChatSyncService();
