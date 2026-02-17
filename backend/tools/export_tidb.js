const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const OUTPUT_DIR = path.join(__dirname, '..', 'backup_data');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

const TABLES = [
    'members',
    'contribution_drives', // Maps to 'drives' in local schema
    'transactions',
    'news',
    'gallery_events',
    'gallery_media',
    'polls',
    'poll_options',
    'poll_votes'
];


async function exportData() {
    console.log('Connecting to TiDB...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        ssl: { rejectUnauthorized: true }
    });

    console.log('Connected! Exporting tables...');

    for (const table of TABLES) {
        try {
            console.log(`Exporting ${table}...`);
            const [rows] = await connection.query(`SELECT * FROM ${table}`);

            // Map table names if needed
            let filename = table;
            if (table === 'contribution_drives') filename = 'drives'; // Rename to match local schema

            fs.writeFileSync(
                path.join(OUTPUT_DIR, `${filename}.json`),
                JSON.stringify(rows, null, 2)
            );
            console.log(`  Saved ${rows.length} rows to ${filename}.json`);
        } catch (error) {
            console.error(`  Failed to export ${table}:`, error.message);
        }
    }

    await connection.end();
    console.log('Export completed!');
}

exportData().catch(console.error);
