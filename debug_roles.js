const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/Users/jagdishnegi/.gemini/antigravity/scratch/village-committee-app/backend/.env' });

async function checkRoles() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME
        });

        console.log('Connected. Fetching group members...');

        const [rows] = await connection.query(`
            SELECT gm.*, m.name 
            FROM group_members gm 
            JOIN members m ON gm.member_id = m.id 
            ORDER BY gm.group_id, gm.member_id
        `);

        console.table(rows);

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkRoles();
