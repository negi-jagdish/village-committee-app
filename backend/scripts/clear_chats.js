#!/usr/bin/env node
require('dotenv').config();
const db = require('../src/config/database');

async function clearChats() {
    try {
        console.log('Clearing all chat data from MySQL...');

        // Disable FK checks temporarily
        await db.query('SET FOREIGN_KEY_CHECKS = 0');

        const tables = ['message_deliveries', 'message_reactions', 'messages', 'group_members', 'chat_groups'];
        for (const table of tables) {
            try {
                await db.query(`DELETE FROM ${table}`);
                console.log(`  ✓ Cleared ${table}`);
            } catch (e) {
                console.log(`  ⚠ Skipped ${table} (${e.message})`);
            }
        }

        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('\n✅ All server chat data cleared!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

clearChats();
