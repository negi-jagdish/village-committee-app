const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const OUTPUT_DIR = path.join(__dirname, '..', 'backup_data');

async function exportCashBook() {
    console.log('Connecting to TiDB...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        ssl: { rejectUnauthorized: true }
    });

    try {
        console.log('Exporting cash_book...');
        const [rows] = await connection.query('SELECT * FROM cash_book');
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'cash_book.json'),
            JSON.stringify(rows, null, 2)
        );
        console.log(`Saved ${rows.length} rows to cash_book.json`);
    } catch (error) {
        console.error('Failed to export cash_book:', error.message);
    }

    await connection.end();
}

exportCashBook().catch(console.error);
