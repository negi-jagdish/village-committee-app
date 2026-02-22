const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function listTables() {
    console.log('Connecting to TiDB...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        ssl: { rejectUnauthorized: true }
    });

    const [rows] = await connection.query('SHOW TABLES');
    console.log('Tables in TiDB:', rows);
    await connection.end();
}

listTables().catch(console.error);
