const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // Adjust path to .env

async function fixOpeningBalances() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Connected to database.');

        // 1. Get all Opening Balance transactions
        const [rows] = await connection.execute(
            "SELECT * FROM transactions WHERE description = 'Opening Balance' ORDER BY id ASC"
        );

        const keep = { cash: null, bank: null };
        const toDelete = [];

        // Identify duplicates
        for (const tx of rows) {
            const type = tx.payment_method === 'cash' ? 'cash' : 'bank';
            if (!keep[type]) {
                keep[type] = tx;
            } else {
                toDelete.push(tx);
            }
        }

        console.log(`Found ${rows.length} opening balances.`);
        console.log(`Keeping: Cash ID ${keep.cash?.id}, Bank ID ${keep.bank?.id}`);
        console.log(`Deleting: ${toDelete.length} duplicates.`);

        // 2. Delete duplicates and adjust cashbook
        for (const tx of toDelete) {
            console.log(`Deleting transaction ID ${tx.id} (${tx.payment_method}: ${tx.amount})`);

            // Delete
            await connection.execute('DELETE FROM transactions WHERE id = ?', [tx.id]);

            // Adjust Cashbook
            const accountType = tx.payment_method === 'cash' ? 'cash' : 'bank';
            await connection.execute(
                'UPDATE cash_book SET balance = balance - ? WHERE account_type = ?',
                [tx.amount, accountType]
            );
            console.log(`Adjusted ${accountType} balance by -${tx.amount}`);
        }

        console.log('Cleanup complete.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

fixOpeningBalances();
