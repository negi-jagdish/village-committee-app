const db = require('../config/database');
const { getIo, emitToRoom, emitToUser } = require('./socketService');

const BOT_ID = null; // Ensure database allows NULL sender_id or set to a specific Robot User ID

const ChamBot = {
    // Get or Create Private Chat between Member and Bot
    getBotChat: async (memberId) => {
        try {
            // Find existing private chat with ChamBot convention
            const groupName = `ChamBot-DM-${memberId}`;

            // Check if group exists
            const [existing] = await db.query(
                "SELECT id FROM chat_groups WHERE name = ? AND type = 'private'",
                [groupName]
            );

            if (existing.length > 0) {
                return existing[0].id;
            }

            // Create new group
            const [result] = await db.query(
                "INSERT INTO chat_groups (name, type, icon_url) VALUES (?, 'private', 'http://178.16.138.41/uploads/chambot.png')",
                [groupName]
            );
            const groupId = result.insertId;

            // Add member to group
            await db.query(
                "INSERT INTO group_members (group_id, member_id, role) VALUES (?, ?, 'member')",
                [groupId, memberId]
            );

            return groupId;
        } catch (error) {
            console.error('Get Bot Chat Error:', error);
            throw error;
        }
    },

    // Send a message as ChamBot
    sendMessage: async (memberId, content, type = 'text', metadata = null) => {
        try {
            const groupId = await ChamBot.getBotChat(memberId);

            // Insert Message
            // IMPORTANT: If sender_id cannot be NULL, we need a dedicated ID. 
            // For now assuming NULL is allowed for System/Bot messages.
            const [result] = await db.query(
                "INSERT INTO messages (group_id, sender_id, type, content, metadata) VALUES (?, ?, ?, ?, ?)",
                [groupId, BOT_ID, type, content, metadata ? JSON.stringify(metadata) : null]
            );
            console.log(`[ChamBot] Message inserted ID: ${result.insertId} into Group: ${groupId}`);

            // Emit via Socket
            // Use emitToRoom helper
            const messageData = {
                id: result.insertId,
                group_id: groupId,
                sender_id: BOT_ID, // Frontend should handle NULL as "ChamBot"
                sender_name: "ChamBot",
                sender_avatar: "http://178.16.138.41/uploads/chambot.png",
                type,
                content,
                metadata,
                created_at: new Date()
            };

            emitToRoom(`group_${groupId}`, 'receive_message', messageData);

            // Also update the chat list for the user via their personal room
            emitToUser(memberId, 'receive_message', messageData);

            // Emit chat_list_update so unread counter is incremented on the client
            const chatListData = {
                ...messageData,
                group_name: 'ChamBot',
                display_name: 'ChamBot',
                group_type: 'private',
            };
            emitToUser(memberId, 'chat_list_update', chatListData);

            return result.insertId;

        } catch (error) {
            console.error('ChamBot Send Error:', error);
        }
    },

    // Automated Receipt
    sendReceipt: async (memberId, amount, driveTitle, transactionId) => {
        const message = `✅ *Payment Received*
Your contribution of *₹${amount}* for "${driveTitle}" has been successfully recorded.
Reference ID: #${transactionId}
Thank you for supporting the village! 🙏

---

✅ *भुगतान प्राप्त*
"${driveTitle}" के लिए आपका *₹${amount}* का योगदान सफलतापूर्वक दर्ज कर लिया गया है।
संदर्भ संख्या: #${transactionId}
गाँव का समर्थन करने के लिए धन्यवाद! 🙏`;
        await ChamBot.sendMessage(memberId, message);
    },

    // Welcome Message
    sendWelcome: async (memberId, memberName) => {
        const message = `👋 *Namaste ${memberName}!*

I am **ChamBot**, your village assistant.
I will keep you updated on:
1️⃣ New Contribution Drives
2️⃣ Payment Receipts
3️⃣ Important Notices

Feel free to check here for updates!

---

👋 *नमस्ते ${memberName}!*

मैं **ChamBot** हूँ, आपका ग्राम सहायक।
मैं आपको निम्नलिखित जानकारी दूँगा:
1️⃣ नई योगदान मुहीम
2️⃣ भुगतान रसीदें
3️⃣ महत्त्वपूर्ण सूचनाएँ

अपडेट के लिए यहाँ देखते रहें!`;
        await ChamBot.sendMessage(memberId, message);
    },

    // Broadcast to All Members
    broadcast: async (content) => {
        // Logic: Iterate all members and send message? Or create a "Broadcast" group?
        // WhatsApp style broadcast lists are individual messages.
        // For simplicity efficiently:
        try {
            const [members] = await db.query("SELECT id FROM members WHERE is_blocked = 0");
            for (const member of members) {
                await ChamBot.sendMessage(member.id, `📢 *Broadcast*\n\n${content}\n\n---\n\n📢 *प्रसारण*\n\n${content}`);
            }
        } catch (error) {
            console.error("Broadcast Error:", error);
        }
    },

    // Detailed Bulk Receipt with per-drive breakdown and pending dues
    sendBulkReceipt: async (memberId, totalAmount, paymentMethod, allocations, paymentId) => {
        try {
            // Build per-drive breakdown
            let breakdown = '';
            for (const alloc of allocations) {
                let driveTitle = 'General';
                if (alloc.drive_id) {
                    const [drive] = await db.query('SELECT title FROM contribution_drives WHERE id = ?', [alloc.drive_id]);
                    if (drive.length > 0) driveTitle = drive[0].title;
                }
                breakdown += `  • ${driveTitle}: *₹${alloc.amount}*\n`;
            }

            // Fetch pending dues
            const [drives] = await db.query(
                `SELECT d.id, d.title, d.amount_per_member,
                 COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.member_id = ? AND t.drive_id = d.id AND t.type = 'income' AND t.status = 'approved'), 0) as paid_amount
                 FROM contribution_drives d
                 WHERE d.is_active = TRUE
                 ORDER BY d.created_at DESC`,
                [memberId]
            );

            let pendingSection = '';
            let totalPending = 0;
            for (const d of drives) {
                // Check waiver
                const [waiver] = await db.query('SELECT 1 FROM waivers WHERE member_id = ? AND drive_id = ?', [memberId, d.id]);
                if (waiver.length > 0) continue;

                const pending = Math.max(0, parseFloat(d.amount_per_member) - parseFloat(d.paid_amount));
                if (pending > 0) {
                    pendingSection += `  • ${d.title}: ₹${pending}\n`;
                    totalPending += pending;
                }
            }

            let message = `✅ *Payment Received*
Total Amount: *₹${totalAmount}*
Method: ${paymentMethod === 'cash' ? 'Cash' : 'Bank'}
Ref: #${paymentId}

📋 *Breakdown:*\n${breakdown}`;

            if (pendingSection) {
                message += `\n⏳ *Pending Dues:*\n${pendingSection}Total Pending: *₹${totalPending}*`;
            } else {
                message += `\n🎉 *All dues cleared! No pending payments.*`;
            }

            message += `\n\nThank you for supporting the village! 🙏

---

✅ *भुगतान प्राप्त*
कुल राशि: *₹${totalAmount}*
माध्यम: ${paymentMethod === 'cash' ? 'नकद' : 'बैंक'}
संदर्भ संख्या: #${paymentId}

📋 *विवरण:*\n${breakdown}`;

            if (pendingSection) {
                message += `\n⏳ *शेष राशि:*\n${pendingSection.replace(/•/g, '•')}कुल शेष: *₹${totalPending}*`;
            } else {
                message += `\n🎉 *सभी बकाया चुकता! कोई शेष भुगतान नहीं।*`;
            }

            message += `\n\nगाँव का समर्थन करने के लिए धन्यवाद! 🙏`;

            await ChamBot.sendMessage(memberId, message);
        } catch (error) {
            console.error('ChamBot Bulk Receipt Error:', error);
        }
    }
};

module.exports = ChamBot;
