const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/.env' });

async function fixPassword() {
    console.log('Connecting to DB...');
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [rows] = await connection.execute('SELECT * FROM members WHERE contact_1 = ?', ['9000000001']);

    if (rows.length === 0) {
        console.log('User 9000000001 not found!');
        process.exit(1);
    }

    const user = rows[0];
    console.log('Found user:', user.name);
    console.log('Stored Hash:', user.password_hash);

    const isMatch = await bcrypt.compare('123456', user.password_hash);
    console.log('Does "123456" match?', isMatch);

    if (!isMatch) {
        console.log('Password mismatch! Generating new hash for "123456"...');
        const newHash = await bcrypt.hash('123456', 10);
        console.log('New Hash:', newHash);

        await connection.execute('UPDATE members SET password_hash = ? WHERE id = ?', [newHash, user.id]);
        console.log('Password updated successfully!');
    } else {
        console.log('Password is already correct.');
    }

    await connection.end();
}

fixPassword().catch(console.error);
