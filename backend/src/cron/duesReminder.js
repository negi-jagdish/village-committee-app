const cron = require('node-cron');
const db = require('../config/database');
const ChamBot = require('../services/chamBot');

const startDuesReminderCron = () => {
    // Run every Monday at 10:00 AM
    cron.schedule('0 10 * * 1', async () => {
        console.log('Running Dues Reminder Cron...');
        try {
            // 1. Get Active Drives
            const [drives] = await db.query(
                "SELECT * FROM contribution_drives WHERE status = 'active'"
            );

            if (drives.length === 0) return;

            // 2. For each drive, check members who haven't paid enough
            for (const drive of drives) {
                // Get all members
                const [members] = await db.query("SELECT id, name FROM members WHERE is_active = 1");

                for (const member of members) {
                    // Check contribution
                    const [contribution] = await db.query(
                        `SELECT SUM(amount) as total_paid FROM transactions 
                         WHERE member_id = ? AND drive_id = ? AND status = 'approved'`,
                        [member.id, drive.id]
                    );

                    const paid = parseFloat(contribution[0].total_paid || 0);
                    const target = parseFloat(drive.amount_per_member);

                    if (paid < target) {
                        const due = target - paid;
                        const message = `🔔 *Payment Reminder*\n\nHello ${member.name},\nThis is a gentle reminder that you have a pending contribution of *₹${due}* for "${drive.title}".\n\nPlease pay at your earliest convenience to support the village.\n\nIgnore if already paid.`;

                        await ChamBot.sendMessage(member.id, message);
                        // Add small delay to avoid overwhelming DB/Socket?
                        await new Promise(r => setTimeout(r, 100));
                    }
                }
            }
            console.log('Dues Reminder Cron Completed.');
        } catch (error) {
            console.error('Dues Reminder Cron Error:', error);
        }
    });

    console.log('Dues Reminder Cron Job Scheduled (Every Mon 10 AM)');
};

module.exports = startDuesReminderCron;
