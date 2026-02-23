const socketIo = require('socket.io');
const authSocket = require('../middleware/authSocket');
const db = require('../config/database');

let io;

const init = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*", // Allow all origins for now (adjust for production)
            methods: ["GET", "POST"]
        }
    });

    io.use(authSocket);

    io.on('connection', async (socket) => {
        console.log(`User connected: ${socket.user.id} (${socket.user.name})`);

        // Join user's personal room for direct messages/notifications
        socket.join(`user_${socket.user.id}`);

        // --- DECENTRALIZED SYNC: Send last 3 days of messages on connect ---
        try {
            const query = `
                SELECT m.*, cg.type as group_type, cg.name as group_name,
                COALESCE(u.name, 'ChamBot') as sender_name,
                COALESCE(u.profile_picture, 'http://178.16.138.41/uploads/chambot.png') as sender_avatar
                FROM messages m
                LEFT JOIN members u ON m.sender_id = u.id
                LEFT JOIN chat_groups cg ON m.group_id = cg.id
                LEFT JOIN group_members gm ON cg.id = gm.group_id
                WHERE 
                    (gm.member_id = ? OR cg.type = 'broadcast') -- User is in group OR it's a broadcast
                    AND m.created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)
                ORDER BY m.created_at ASC
            `;
            const [recentMessages] = await db.query(query, [socket.user.id]);

            if (recentMessages.length > 0) {
                socket.emit('sync_messages', recentMessages);
            }
        } catch (err) {
            console.error("Error syncing recent messages:", err);
        }

        // --- DELIVERY RECEIPTS (Double Ticks) ---
        socket.on('messages_delivered', async (messageIds) => {
            if (!Array.isArray(messageIds) || messageIds.length === 0) return;

            try {
                // Bulk insert into message_deliveries
                const values = messageIds.map(id => [id, socket.user.id]);
                await db.query('INSERT IGNORE INTO message_deliveries (message_id, member_id) VALUES ?', [values]);

                // Notify original senders that their message was delivered to THIS user
                // We need to know who sent these messages to notify them
                const [senders] = await db.query('SELECT id, sender_id FROM messages WHERE id IN (?)', [messageIds]);

                // Group by sender to send batched receipts
                const receiptsBySender = {};
                senders.forEach(msg => {
                    if (msg.sender_id && msg.sender_id !== socket.user.id) { // Don't notify self
                        if (!receiptsBySender[msg.sender_id]) receiptsBySender[msg.sender_id] = [];
                        receiptsBySender[msg.sender_id].push({ messageId: msg.id, deliveredTo: socket.user.id });
                    }
                });

                // Emit receipt to each sender's personal room
                for (const senderId in receiptsBySender) {
                    io.to(`user_${senderId}`).emit('message_status_update', {
                        status: 'delivered',
                        details: receiptsBySender[senderId]
                    });
                }

            } catch (err) {
                console.error("Error processing delivery receipts:", err);
            }
        });

        socket.on('join_room', (room) => {
            console.log(`[Socket] User ${socket.user.id} (${socket.user.name}) joining room: ${room}`);
            socket.join(room);
        });

        socket.on('leave_room', (room) => {
            console.log(`[Socket] User ${socket.user.id} (${socket.user.name}) leaving room: ${room}`);
            socket.leave(room);
        });

        socket.on('typing', (data) => {
            console.log(`[Socket] Typing event from ${socket.user.name} in ${data.room}: ${data.isTyping}`);
            // Broadcast to room excluding sender
            socket.to(data.room).emit('display_typing', {
                userId: socket.user.id,
                name: socket.user.name,
                isTyping: data.isTyping
            });
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.id}`);
            // Update last_seen in DB?
            db.query('UPDATE members SET last_seen = NOW() WHERE id = ?', [socket.user.id]);
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

// Helper to emit events from controllers
const emitToRoom = (room, event, data) => {
    if (io) {
        io.to(room).emit(event, data);
    }
};

const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user_${userId}`).emit(event, data);
    }
};

module.exports = { init, getIo, emitToRoom, emitToUser };
