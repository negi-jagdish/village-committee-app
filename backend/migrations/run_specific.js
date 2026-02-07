require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const runSpecific = async () => {
    const file = process.argv[2];
    if (!file) {
        console.error('Please provide a sql file name');
        process.exit(1);
    }

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    console.log(`Running migration: ${file}`);
    try {
        const migrationFile = path.join(__dirname, file);
        const sql = fs.readFileSync(migrationFile, 'utf8');
        await connection.query(sql);
        console.log('Migration success!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
};

runSpecific();
