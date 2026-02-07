const db = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '007_add_legacy_due.sql'), 'utf8');
        console.log('Running migration:');
        console.log(sql);
        await db.query(sql);
        console.log('Migration executed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
