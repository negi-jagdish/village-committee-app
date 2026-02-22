const db = require('./src/config/database');

async function checkTables() {
    try {
        const [rows] = await db.query("SHOW COLUMNS FROM members");
        console.log("Members Columns:", rows.map(r => r.Field));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkTables();
