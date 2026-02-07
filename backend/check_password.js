const db = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function checkPassword() {
    try {
        console.log('Checking admin user...');
        const [rows] = await db.query('SELECT * FROM members WHERE role = "president"');

        if (rows.length === 0) {
            console.log('No president found!');
            return;
        }

        const user = rows[0];
        console.log('Found user:', user.name, user.contact_1);
        console.log('Hash:', user.password_hash);

        const isMatch = await bcrypt.compare('admin123', user.password_hash);
        console.log('Is password "admin123" correct?', isMatch);

        // Also test hashing "admin123" again to see what it looks like
        const newHash = await bcrypt.hash('admin123', 10);
        console.log('New hash for "admin123":', newHash);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPassword();
