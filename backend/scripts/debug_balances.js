require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true
        }
    });

    try {
        console.log('--- Cash Book ---');
        const [cashBook] = await connection.query('SELECT * FROM cash_book');
        console.table(cashBook);

        console.log('\n--- Transaction Counts ---');
        const [txCounts] = await connection.query('SELECT type, status, COUNT(*) as count, SUM(amount) as total FROM transactions GROUP BY type, status');
        console.table(txCounts);

        console.log('\n--- Recent Transactions ---');
        const [recentTx] = await connection.query('SELECT id, type, amount, status, created_at FROM transactions ORDER BY id DESC LIMIT 5');
        console.table(recentTx);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkDatabase();
