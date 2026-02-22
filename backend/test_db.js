require('dotenv').config();
const db = require('./src/config/database');
(async function test() {
    const [cols] = await db.query('SHOW COLUMNS FROM polls');
    console.log("POLLS", cols.map(c => c.Field));
    const [cols2] = await db.query('SHOW COLUMNS FROM poll_options');
    console.log("POLL OPTIONS", cols2.map(c => c.Field));
    process.exit();
})();
