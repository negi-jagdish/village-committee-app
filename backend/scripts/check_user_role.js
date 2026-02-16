const db = require('../src/config/database');

async function checkUser() {
    try {
        const [rows] = await db.query('SELECT id, name, role FROM members WHERE name LIKE ?', ['%Rajinder%']);
        console.log('User Details:', rows);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUser();
