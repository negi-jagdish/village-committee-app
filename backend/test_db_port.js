require('dotenv').config();
const mysql = require('mysql2/promise');
(async function test() {
    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            port: 3306,
            user: 'village_user',
            password: 'VillageAdmin@2024',
            database: 'village_committee'
        });
        console.log("Connected to 3306!");
    } catch (e) {
        console.log("Failed 3306", e.message);
    }
    process.exit();
})();
