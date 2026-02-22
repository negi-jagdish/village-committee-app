const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/Users/jagdishnegi/.gemini/antigravity/scratch/village-committee-app/backend/.env' });

async function promoteAdmin() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME
        });

        console.log('Promoting Jagdish (ID 2) to Admin for Group 2...');

        await connection.query(`
            UPDATE group_members 
            SET role = 'admin' 
            WHERE group_id = 2 AND member_id = 2
        `);

        console.log('Done. Verifying...');

        const [rows] = await connection.query(`
            SELECT * FROM group_members WHERE group_id = 2 AND member_id = 2
        `);
        console.table(rows);

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

promoteAdmin();
