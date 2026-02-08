require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : (process.env.DB_SSL ? JSON.parse(process.env.DB_SSL) : undefined)
    });

    try {
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'polls'
        `, [process.env.DB_NAME]);

        console.log('Columns in polls table:');
        columns.forEach(col => console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE})`));

        const [rows] = await connection.query('SELECT * FROM polls ORDER BY id DESC LIMIT 1');
        console.log('\nLatest poll data:', rows[0]);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkSchema();
