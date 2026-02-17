const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BACKUP_DIR = path.join(__dirname, '..', 'backup_data');

async function importData() {
    console.log('Connecting to VPS Database...');
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('Connected! Starting import...');

    // Helper to read JSON
    const readJSON = (table) => {
        const filePath = path.join(BACKUP_DIR, `${table}.json`);
        if (!fs.existsSync(filePath)) return [];
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    };

    // Helper to insert data
    const insertData = async (table, rows) => {
        if (rows.length === 0) return;

        console.log(`Importing ${rows.length} rows into ${table}...`);

        // Get columns from first row
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(',');

        const sql = `INSERT IGNORE INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;

        for (const row of rows) {
            const values = columns.map(col => {
                const val = row[col];
                // Handle dates
                if (typeof val === 'string' && val.endsWith('Z')) {
                    return new Date(val);
                }
                return val;
            });
            await connection.execute(sql, values);
        }
    };

    try {
        // 1. Disable Foreign Key Checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // 2. Truncate Tables (Clean Slate)
        // Only truncate tables we have data for, OR all relevant tables to be safe?
        // Let's truncate the main ones we are importing to avoid duplicates/conflicts.
        const tablesToImport = [
            'members',
            'transactions',
            'contribution_drives', // Added table
            'news',
            'news_media', // Added table
            'events', // Added table
            'cash_book', // Added table

            'polls',
            'poll_options',


            'poll_options',
            'poll_votes',
            'gallery_media' // And gallery_events if we successfully exported it
        ];

        for (const table of tablesToImport) {
            console.log(`Truncating ${table}...`);
            await connection.query(`TRUNCATE TABLE ${table}`);
        }

        // 3. Import Data in Order
        // Members first
        await insertData('members', readJSON('members'));

        // Drives
        await insertData('contribution_drives', readJSON('drives'));


        // News
        await insertData('news', readJSON('news'));
        await insertData('news_media', readJSON('news_media'));

        // Gallery / Events

        await insertData('events', readJSON('events'));
        await insertData('gallery_media', readJSON('gallery_media'));

        // Cash Book
        await insertData('cash_book', readJSON('cash_book'));

        // Polls
        await insertData('polls', readJSON('polls'));

        await insertData('polls', readJSON('polls'));
        await insertData('poll_options', readJSON('poll_options'));
        await insertData('poll_votes', readJSON('poll_votes'));

        // Transactions
        await insertData('transactions', readJSON('transactions'));

        // Gallery
        // Note: gallery_events was missing in export, so gallery_media might be orphaned if it refers to events.
        // But if gallery_media refers to NULL events or events that don't exist, we might have issues if we enforce FK.
        // We disabled FK checks, so it will insert, but data might be logically inconsistent.
        // Let's import what we have.
        // Check if gallery_events exists in backup (it failed, so no)
        // await insertData('gallery_events', readJSON('gallery_events')); 
        await insertData('gallery_media', readJSON('gallery_media'));

        console.log('Import completed successfully!');

    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        await connection.end();
    }
}

importData().catch(console.error);
