const db = require('./backend/src/config/database');
async function test() {
  const [cols] = await db.query('SHOW COLUMNS FROM polls');
  console.log("POLLS", cols);
  const [cols2] = await db.query('SHOW COLUMNS FROM poll_options');
  console.log("POLL OPTIONS", cols2);
  process.exit();
}
test();
