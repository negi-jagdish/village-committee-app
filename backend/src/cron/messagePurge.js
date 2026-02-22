const cron = require('node-cron');
const db = require('../config/database');

const startMessagePurgeCron = () => {
    // Run every day at 3:00 AM server time (0 3 * * *)
    cron.schedule('0 3 * * *', async () => {
        console.log('--- CRON: Running 3-Day Message Purge ---');
        try {
            // Hard delete messages older than 3 days
            // Note: Since message_deliveries and message_reads have ON CASCADE DELETE constraints,
            // deleting the message will automatically clean up those related tables.
            const query = `
                DELETE FROM messages
                WHERE created_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
            `;
            const [result] = await db.query(query);
            console.log(`[Message Purge] Successfully deleted ${result.affectedRows} old messages.`);
        } catch (error) {
            console.error('[CRON ERROR] Message Purge failed:', error);
        }
        console.log('--------------------------------------------');
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
};

module.exports = { startMessagePurgeCron };
