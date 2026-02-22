const db = require('../config/database');
const { emitToRoom, emitToUser } = require('../services/socketService');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
    try {
        const serviceAccount = require('../config/firebase-admin.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error('Firebase Admin Init Error:', e);
    }
}

// Get list of chats for the user (Groups + DM)
exports.getChatList = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch groups the user is a member of
        // Also fetch ChamBot (which we can treat as a special group or DM)
        // For simplicity, let's assume 'groups' table has all chats.
        // We need to join with 'messages' to get last message and unread count.

        // Complex query to get groups + last message + unread count
        const query = `
            SELECT 
                g.id, 
                CASE 
                    WHEN g.name LIKE 'ChamBot-DM-%' THEN 'ChamBot'
                    WHEN g.type = 'private' THEN (
                        SELECT m.name FROM group_members gm2 
                        JOIN members m ON gm2.member_id = m.id 
                        WHERE gm2.group_id = g.id AND gm2.member_id != ? LIMIT 1
                    )
                    ELSE g.name 
                END as name, 
                g.type, 
                CASE 
                    WHEN g.name LIKE 'ChamBot-DM-%' THEN ? 
                    WHEN g.type = 'private' THEN (
                        SELECT m.profile_picture FROM group_members gm2 
                        JOIN members m ON gm2.member_id = m.id 
                        WHERE gm2.group_id = g.id AND gm2.member_id != ? LIMIT 1
                    )
                    ELSE g.icon_url 
                END as icon_url,
                (SELECT content FROM messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT type FROM messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message_type,
                (SELECT created_at FROM messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                (SELECT COUNT(*) FROM messages m 
                 WHERE m.group_id = g.id 
                 AND (m.sender_id IS NULL OR m.sender_id != ?) 
                 AND m.created_at > COALESCE((SELECT read_at FROM message_reads mr WHERE mr.message_id = m.id AND mr.member_id = ? ORDER BY read_at DESC LIMIT 1), '1970-01-01')) as unread_count
            FROM chat_groups g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.member_id = ?
            ORDER BY last_message_time DESC
        `;

        const chamBotIcon = 'http://178.16.138.41/uploads/chambot.png';
        const [chats] = await db.query(query, [userId, chamBotIcon, userId, userId, userId, userId]);
        res.json(chats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get messages for a specific group
exports.getMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const userId = req.user.id;

        // Check membership
        const [membership] = await db.query('SELECT * FROM group_members WHERE group_id = ? AND member_id = ?', [groupId, userId]);
        if (membership.length === 0) {
            return res.status(403).json({ message: 'Not a member of this chat' });
        }

        // Fetch messages with sender info and read status
        const query = `
            SELECT m.*, 
            COALESCE(u.name, 'ChamBot') as sender_name, 
            COALESCE(u.profile_picture, 'http://178.16.138.41/uploads/chambot.png') as sender_avatar,
            rm.content as reply_to_content, rm.type as reply_to_type, ru.name as reply_to_sender,
            CASE WHEN EXISTS (SELECT 1 FROM message_reads mr WHERE mr.message_id = m.id AND mr.member_id = ?) THEN 1 ELSE 0 END as is_read
            FROM messages m
            LEFT JOIN members u ON m.sender_id = u.id
            LEFT JOIN messages rm ON m.reply_to_id = rm.id
            LEFT JOIN members ru ON rm.sender_id = ru.id
            WHERE m.group_id = ?
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [messages] = await db.query(query, [userId, groupId, parseInt(limit), parseInt(offset)]);
        res.json(messages);

        // Mark unread messages as read (Async)
        // Only mark messages NOT sent by me
        const unreadMessageIds = messages
            .filter(m => m.sender_id !== userId && m.is_read === 0)
            .map(m => m.id);

        if (unreadMessageIds.length > 0) {
            const values = unreadMessageIds.map(mid => [mid, userId]);
            await db.query('INSERT IGNORE INTO message_reads (message_id, member_id) VALUES ?', [values]);
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update FCM Token
exports.updateToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        const userId = req.user.id;

        if (!fcmToken) return res.status(400).json({ message: 'Token required' });

        await db.query('UPDATE members SET fcm_token = ? WHERE id = ?', [fcmToken, userId]);
        res.json({ message: 'Token updated' });
    } catch (error) {
        console.error('Update Token Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Send a message
exports.sendMessage = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { content, type = 'text', metadata, replyToId, isForwarded } = req.body;
        const senderId = req.user.id;

        // Check membership and if group exists
        const [membership] = await db.query('SELECT * FROM group_members WHERE group_id = ? AND member_id = ?', [groupId, senderId]);
        if (membership.length === 0) {
            return res.status(403).json({ message: 'You are not a member of this chat or the group has been deleted' });
        }

        // Insert message
        const [result] = await db.query(
            'INSERT INTO messages (group_id, sender_id, type, content, metadata, reply_to_id, is_forwarded) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [groupId, senderId, type, content, JSON.stringify(metadata || {}), replyToId || null, isForwarded ? 1 : 0]
        );

        const messageId = result.insertId;

        // Fetch the created message to broadcast
        // Join with parent message if it's a reply
        const [newMessage] = await db.query(
            `SELECT m.*, u.name as sender_name, u.profile_picture as sender_avatar,
                    rm.content as reply_to_content, rm.type as reply_to_type, ru.name as reply_to_sender
             FROM messages m
             LEFT JOIN members u ON m.sender_id = u.id
             LEFT JOIN messages rm ON m.reply_to_id = rm.id
             LEFT JOIN members ru ON rm.sender_id = ru.id
             WHERE m.id = ?`,
            [messageId]
        );

        // Emit through socket to the group room (for active chat screens)
        emitToRoom(`group_${groupId}`, 'receive_message', newMessage[0]);

        // --- SINGLE TICK (Sent to Server) ---
        // Emit receipt back to the sender
        emitToUser(senderId, 'message_status_update', {
            status: 'sent',
            details: [{ messageId: newMessage[0].id }]
        });

        // Notify all group members to update their chat list
        // For private chats, each member should see the OTHER person's name
        const [groupInfo] = await db.query('SELECT type, name as group_name, icon_url FROM chat_groups WHERE id = ?', [groupId]);
        const [members] = await db.query(
            'SELECT gm.member_id, m.name, m.profile_picture FROM group_members gm LEFT JOIN members m ON gm.member_id = m.id WHERE gm.group_id = ?',
            [groupId]
        );

        const isPrivate = groupInfo[0] && groupInfo[0].type === 'private';

        members.forEach(member => {
            const payload = { ...newMessage[0] };

            if (isPrivate) {
                // For private chats, show the OTHER person's name/avatar
                const otherMember = members.find(m => m.member_id !== member.member_id);
                if (otherMember) {
                    payload.display_name = otherMember.name;
                    payload.display_avatar = otherMember.profile_picture;
                }
            } else {
                // For group chats, use the group name
                payload.display_name = groupInfo[0]?.group_name || `Group ${groupId}`;
                payload.display_avatar = groupInfo[0]?.icon_url || null;
            }

            emitToUser(member.member_id, 'chat_list_update', payload);
        });

        // --- FCM PUSH NOTIFICATIONS ---
        // Find members with FCM tokens who are NOT the sender
        const recipientTokens = members
            .filter(m => m.member_id !== senderId)
            .map(async (m) => {
                const [user] = await db.query('SELECT fcm_token FROM members WHERE id = ?', [m.member_id]);
                return user[0]?.fcm_token;
            });

        const tokens = (await Promise.all(recipientTokens)).filter(t => t);

        if (tokens.length > 0) {
            const chatName = isPrivate ?
                (members.find(m => m.member_id === senderId)?.name || 'Village Member') :
                (groupInfo[0]?.group_name || 'Village Group');

            const message = {
                notification: {
                    title: chatName,
                    body: content.startsWith('/uploads/') ? 'Sent an attachment' : content,
                },
                data: {
                    groupId: groupId.toString(),
                    type: isPrivate ? 'private' : 'group',
                },
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'jai_chamdoli',
                        channelId: 'chamdoli_chat_v5',
                        priority: 'max',
                        visibility: 'public',
                        defaultSound: false,
                        defaultVibrateTimings: true,
                        defaultLightSettings: true
                    }
                },
                tokens: tokens,
            };

            admin.messaging().sendEachForMulticast(message)
                .then((response) => {
                    console.log(`FCM: Successfully sent to ${response.successCount} devices`);
                })
                .catch((error) => {
                    console.error('FCM Error:', error);
                });
        }

        res.status(201).json(newMessage[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a message for everyone (Soft Delete)
exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        const [msg] = await db.query('SELECT * FROM messages WHERE id = ?', [messageId]);
        if (msg.length === 0) return res.status(404).json({ message: 'Message not found' });

        // Check if user is the sender or is admin in this group
        const [membership] = await db.query(
            'SELECT role FROM group_members WHERE group_id = ? AND member_id = ?',
            [msg[0].group_id, userId]
        );
        const isAdmin = membership.length > 0 && membership[0].role === 'admin';
        const isOwner = msg[0].sender_id == userId;

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'You can only delete your own messages' });
        }

        await db.query('UPDATE messages SET is_deleted = TRUE, content = "This message was deleted", type = "system" WHERE id = ?', [messageId]);

        // Notify group
        emitToRoom(`group_${msg[0].group_id}`, 'message_deleted', { messageId, groupId: msg[0].group_id });

        res.json({ message: 'Message deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// React to a message
exports.reactToMessage = async (req, res) => {
    console.log('--- REACT ENDPOINT HIT ---');
    try {
        const { messageId } = req.params;
        const { reaction } = req.body;
        const userId = req.user.id;

        console.log(`[REACT] Request: Msg=${messageId}, User=${userId}, Reaction=${reaction}`);

        // Fetch current reactions
        const [msg] = await db.query('SELECT reactions, group_id FROM messages WHERE id = ?', [messageId]);
        if (msg.length === 0) return res.status(404).json({ message: 'Message not found' });

        let reactions = msg[0].reactions;

        // Ensure reactions is an object
        if (typeof reactions === 'string') {
            try { reactions = JSON.parse(reactions); } catch (e) { reactions = {}; }
        }
        if (!reactions) reactions = {};

        console.log(`[REACT] Previous Reactions:`, JSON.stringify(reactions));

        // 1. Check if user is ALREADY reacting with the requested emoji
        // Use loose equality (==) for robust ID comparison against potential string IDs in JSON
        let userWasReactingWithTarget = false;
        if (reactions[reaction] && Array.isArray(reactions[reaction])) {
            userWasReactingWithTarget = reactions[reaction].some(id => id == userId);
        }
        console.log(`[REACT] User was reacting with target? ${userWasReactingWithTarget}`);

        // 2. Remove user from ALL reactions (Enforce single reaction per user)
        Object.keys(reactions).forEach(key => {
            if (Array.isArray(reactions[key])) {
                reactions[key] = reactions[key].filter(id => id != userId);
                if (reactions[key].length === 0) delete reactions[key];
            }
        });

        // 3. Toggle Logic:
        // If they were NOT reacting with target, Add them (Toggle ON)
        // If they WERE reacting with target, leave them removed (Toggle OFF)
        if (!userWasReactingWithTarget) {
            if (!reactions[reaction]) reactions[reaction] = [];
            reactions[reaction].push(userId);
            console.log(`[REACT] Added user to '${reaction}'`);
        } else {
            console.log(`[REACT] Removed user from '${reaction}' (Withdraw)`);
        }

        console.log(`[REACT] New Reactions:`, JSON.stringify(reactions));

        await db.query('UPDATE messages SET reactions = ? WHERE id = ?', [JSON.stringify(reactions), messageId]);

        // Notify group
        emitToRoom(`group_${msg[0].group_id}`, 'message_reaction', { messageId, reactions });

        res.json({ message: 'Reaction updated', reactions });
    } catch (error) {
        console.error('[REACT] Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new group (or private chat)
exports.createGroup = async (req, res) => {
    try {
        const { name, type, memberIds } = req.body; // memberIds includes other members (creator is req.user.id)
        const creatorId = req.user.id;

        if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ message: 'Select at least one member' });
        }

        const allMemberIds = [creatorId, ...memberIds];

        // 1. Private Chat Logic (DM)
        if (type === 'private') {
            if (memberIds.length !== 1) {
                return res.status(400).json({ message: 'Private chat must have exactly one other member' });
            }
            const otherMemberId = memberIds[0];

            if (parseInt(otherMemberId) === creatorId) {
                return res.status(400).json({ message: 'You cannot start a chat with yourself' });
            }

            // Check if DM already exists
            const [existing] = await db.query(`
                SELECT g.id, g.name, g.type, g.icon_url 
                FROM chat_groups g
                JOIN group_members gm1 ON g.id = gm1.group_id
                JOIN group_members gm2 ON g.id = gm2.group_id
                WHERE g.type = 'private' 
                AND ((gm1.member_id = ? AND gm2.member_id = ?) OR (gm1.member_id = ? AND gm2.member_id = ?))
                LIMIT 1
            `, [creatorId, otherMemberId, otherMemberId, creatorId]);

            if (existing.length > 0) {
                return res.json(existing[0]);
            }

            // Create new Private Chat
            // Note: client side "New Chat" issue is because we send 'New Chat' as name here.
            // Ideally we should look up the other member's name.
            // But efficient fix: Mobile should ignore 'New Chat' name for private chats and use the other member's name.
            // Let's just update this to be generic.
            const [resGroup] = await db.query('INSERT INTO chat_groups (name, type) VALUES (?, ?)', [`DM-${creatorId}-${otherMemberId}`, 'private']);
            const groupId = resGroup.insertId;

            // Add members
            await db.query('INSERT INTO group_members (group_id, member_id) VALUES (?, ?), (?, ?)', [groupId, creatorId, groupId, otherMemberId]);

            // Fetch created group details to return correct structure
            const [newGroup] = await db.query(`
                SELECT g.id, g.name, g.type, g.icon_url,
                (SELECT name FROM members WHERE id = ?) as other_name,
                (SELECT profile_picture FROM members WHERE id = ?) as other_icon
                FROM chat_groups g
                WHERE g.id = ?
            `, [otherMemberId, otherMemberId, groupId]);

            const responseGroup = newGroup[0];
            responseGroup.name = responseGroup.other_name;
            responseGroup.icon_url = responseGroup.other_icon;
            delete responseGroup.other_name;
            delete responseGroup.other_icon;

            return res.status(201).json(responseGroup);
        }

        // 2. Group Chat Logic
        if (!name) return res.status(400).json({ message: 'Group name is required' });

        const [resGroup] = await db.query('INSERT INTO chat_groups (name, type) VALUES (?, ?)', [name, 'group']);
        const groupId = resGroup.insertId;

        // Add creator as admin
        await db.query('INSERT INTO group_members (group_id, member_id, role) VALUES (?, ?, ?)', [groupId, creatorId, 'admin']);

        // Add other members as regular members
        const otherMemberIds = [...new Set(memberIds)].filter(id => parseInt(id) !== creatorId);
        if (otherMemberIds.length > 0) {
            const values = otherMemberIds.map(mid => [groupId, mid, 'member']);
            await db.query('INSERT INTO group_members (group_id, member_id, role) VALUES ?', [values]);
        }

        res.status(201).json({ id: groupId, name, type: 'group' });

    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ message: error.message || 'Server error', sqlMessage: error.sqlMessage });
    }
};

// Upload media
exports.uploadMedia = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    // Assuming upload middleware puts file in req.file and we serve it statically
    const url = `/uploads/${req.file.filename}`;
    // If using Cloudinary, it would be req.file.path

    res.json({ url, type: req.file.mimetype.startsWith('image') ? 'image' : 'video' });
};

// Broadcast (Admin Only)
exports.broadcast = async (req, res) => {
    try {
        const { content } = req.body;

        // Security check: Only President or Secretary can broadcast
        const userRole = req.user.role; // Assuming auth middleware populates this
        if (!['president', 'secretary'].includes(userRole)) {
            return res.status(403).json({ message: 'Access denied: President/Secretary only' });
        }

        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }

        // Import ChamBot service locally to avoid circular dependency issues if any
        const ChamBot = require('../services/chamBot');

        // Run broadcast in background so we don't block the response
        ChamBot.broadcast(content).catch(err => console.error('Broadcast failed:', err));

        res.json({ message: 'Broadcast initiated successfully' });
    } catch (error) {
        console.error('Broadcast Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get reaction details (who reacted)
exports.getMessageReactions = async (req, res) => {
    try {
        const { messageId } = req.params;

        // Fetch message reactions
        const [msg] = await db.query('SELECT reactions FROM messages WHERE id = ?', [messageId]);
        if (msg.length === 0) return res.status(404).json({ message: 'Message not found' });

        let reactions = msg[0].reactions;
        if (typeof reactions === 'string') {
            try { reactions = JSON.parse(reactions); } catch (e) { reactions = {}; }
        }
        if (!reactions) reactions = {};

        // Collect all unique user IDs
        const userIds = new Set();
        Object.values(reactions).forEach(ids => {
            if (Array.isArray(ids)) ids.forEach(id => userIds.add(id));
        });

        if (userIds.size === 0) {
            return res.json({ reactions: {} });
        }

        // Fetch user details
        const [users] = await db.query('SELECT id, name, profile_picture FROM members WHERE id IN (?)', [[...userIds]]);

        // Map users for easy lookup
        const userMap = {};
        users.forEach(u => userMap[u.id] = u);

        // Build response structure: { "👍": [{id, name, avatar}, ...], ... }
        const detailedReactions = {};
        Object.keys(reactions).forEach(emoji => {
            if (Array.isArray(reactions[emoji])) {
                detailedReactions[emoji] = reactions[emoji].map(id => userMap[id]).filter(u => u);
            }
        });

        res.json({
            reactions: detailedReactions,
            all: users // List of all unique reactors for "All" tab
        });

    } catch (error) {
        console.error('Get Reactions Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Group Details extended
exports.getGroupDetails = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.id;

        // Check membership
        const [membership] = await db.query('SELECT role FROM group_members WHERE group_id = ? AND member_id = ?', [groupId, userId]);
        if (membership.length === 0) return res.status(403).json({ message: 'Not a member' });

        const [group] = await db.query('SELECT * FROM chat_groups WHERE id = ?', [groupId]);
        if (group.length === 0) return res.status(404).json({ message: 'Group not found' });

        // Get members
        const [members] = await db.query(`
            SELECT m.id, m.name, m.profile_picture, gm.role, gm.joined_at
            FROM group_members gm
            JOIN members m ON gm.member_id = m.id
            WHERE gm.group_id = ?
            ORDER BY gm.role = 'admin' DESC, m.name ASC
        `, [groupId]);

        res.json({
            ...group[0],
            members,
            currentUserRole: membership[0].role
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update Group Info (Name, Description, Icon)
exports.updateGroupDetails = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description, icon_url } = req.body; // icon_url can be updated separately after upload
        const userId = req.user.id;

        // Verify Admin
        const [membership] = await db.query('SELECT role FROM group_members WHERE group_id = ? AND member_id = ?', [groupId, userId]);
        if (!membership[0] || membership[0].role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description); }
        if (icon_url !== undefined) { updates.push('icon_url = ?'); params.push(icon_url); }

        if (updates.length > 0) {
            params.push(groupId);
            await db.query(`UPDATE chat_groups SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        res.json({ message: 'Group updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Helper to broadcast system message and update chat lists
const broadcastSystemMessage = async (groupId, content) => {
    try {
        // Insert system message
        const [result] = await db.query(
            'INSERT INTO messages (group_id, type, content) VALUES (?, "system", ?)',
            [groupId, content]
        );
        const messageId = result.insertId;

        // Fetch full message details
        const [newMessage] = await db.query(
            `SELECT m.*, u.name as sender_name, u.profile_picture as sender_avatar
             FROM messages m
             LEFT JOIN members u ON m.sender_id = u.id
             WHERE m.id = ?`,
            [messageId]
        );

        // Emit to active chat room
        emitToRoom(`group_${groupId}`, 'receive_message', newMessage[0]);

        // Notify all current members to update their chat list
        const [members] = await db.query('SELECT member_id FROM group_members WHERE group_id = ?', [groupId]);
        members.forEach(member => {
            emitToUser(member.member_id, 'chat_list_update', newMessage[0]);
        });

        return newMessage[0];
    } catch (error) {
        console.error('Broadcast system message error:', error);
    }
};

// Add Members to Group
exports.addGroupMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { memberIds } = req.body; // Array of IDs
        const userId = req.user.id;

        // Verify Admin
        const [membership] = await db.query('SELECT role FROM group_members WHERE group_id = ? AND member_id = ?', [groupId, userId]);
        if (!membership[0] || membership[0].role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        if (!memberIds || memberIds.length === 0) return res.status(400).json({ message: 'No members selected' });

        // Fetch names of adder and added members
        const [adder] = await db.query('SELECT name FROM members WHERE id = ?', [userId]);
        const [addedMembers] = await db.query('SELECT name FROM members WHERE id IN (?)', [memberIds]);

        const addedNames = addedMembers.map(m => m.name).join(', ');
        const messageContent = `${addedNames} added by ${adder[0].name}`;

        // Insert new members
        const values = memberIds.map(mid => [groupId, mid, 'member']);
        await db.query('INSERT IGNORE INTO group_members (group_id, member_id, role) VALUES ?', [values]);

        // Broadcast detailed system message
        await broadcastSystemMessage(groupId, messageContent);

        res.json({ message: 'Members added' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Remove Member
exports.removeGroupMember = async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        const userId = req.user.id; // Requestor

        // Verify Admin
        const [membership] = await db.query('SELECT role FROM group_members WHERE group_id = ? AND member_id = ?', [groupId, userId]);
        if (!membership[0] || membership[0].role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Prevent removing self via this route (use leave instead)
        if (parseInt(memberId) === userId) return res.status(400).json({ message: 'Use leave group endpoint' });

        // Fetch names
        const [remover] = await db.query('SELECT name FROM members WHERE id = ?', [userId]);
        const [removed] = await db.query('SELECT name FROM members WHERE id = ?', [memberId]);

        const messageContent = `${removed[0]?.name || 'Member'} removed by ${remover[0].name}`;

        await db.query('DELETE FROM group_members WHERE group_id = ? AND member_id = ?', [groupId, memberId]);

        // Broadcast to remaining members
        await broadcastSystemMessage(groupId, messageContent);

        // Explicitly notify the removed member so their list updates (group disappears)
        emitToUser(memberId, 'chat_list_update', { groupId, type: 'removed' });

        res.json({ message: 'Member removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update Member Role
exports.updateMemberRole = async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        const { role } = req.body; // 'admin' or 'member'
        const userId = req.user.id;

        // Verify Admin
        const [membership] = await db.query('SELECT role FROM group_members WHERE group_id = ? AND member_id = ?', [groupId, userId]);
        if (!membership[0] || membership[0].role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        if (!['admin', 'member'].includes(role)) return res.status(400).json({ message: 'Invalid role' });

        await db.query('UPDATE group_members SET role = ? WHERE group_id = ? AND member_id = ?', [role, groupId, memberId]);

        // Optional: Broadcast role change? "Alice is now an admin"
        // Not requested, but good polish.

        res.json({ message: 'Role updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Leave Group
exports.leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.id;

        // Fetch name
        const [leaver] = await db.query('SELECT name FROM members WHERE id = ?', [userId]);
        const messageContent = `${leaver[0].name} left the group`;

        await db.query('DELETE FROM group_members WHERE group_id = ? AND member_id = ?', [groupId, userId]);

        // Broadcast to remaining members
        await broadcastSystemMessage(groupId, messageContent);

        res.json({ message: 'Left group' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
