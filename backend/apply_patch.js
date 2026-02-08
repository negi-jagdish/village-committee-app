require('dotenv').config();
const mysql = require('mysql2/promise');

async function applyPatch() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : (process.env.DB_SSL ? JSON.parse(process.env.DB_SSL) : undefined)
    });

    try {
        console.log('Adding missing columns...');
        await connection.query(`
            ALTER TABLE polls
            ADD COLUMN allow_custom_answer BOOLEAN DEFAULT FALSE,
            ADD COLUMN show_results BOOLEAN DEFAULT TRUE
        `);
        console.log('Columns added successfully.');
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns already exist.');
        } else {
            console.error('Error applying patch:', error);
        }
    } finally {
        await connection.end();
    }
}

applyPatch();
