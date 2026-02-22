const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function describeTable() {
    console.log('Connecting to TiDB...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        ssl: { rejectUnauthorized: true }
    });

    console.log('--- Structure of events ---');
    const [events] = await connection.query('DESCRIBE events');
    console.table(events);

    console.log('--- Structure of gallery_media ---');
    const [media] = await connection.query('DESCRIBE gallery_media');
    console.table(media);

    await connection.end();
}

describeTable().catch(console.error);
