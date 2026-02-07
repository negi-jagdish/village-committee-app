const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function clearOpeningBalances() {
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
            "SELECT * FROM transactions WHERE description = 'Opening Balance'"
        );

        if (rows.length === 0) {
            console.log('No opening balances found.');
            return;
        }

        console.log(`Found ${rows.length} opening balances to clear.`);

        // 2. Revert Cashbook & Delete
        for (const tx of rows) {
            console.log(`Processing transaction ID ${tx.id} (${tx.payment_method}: ${tx.amount})`);

            const accountType = tx.payment_method === 'cash' ? 'cash' : 'bank';

            // Revert balance
            await connection.execute(
                'UPDATE cash_book SET balance = balance - ? WHERE account_type = ?',
                [tx.amount, accountType]
            );
            console.log(`  -> Reverted ${accountType} balance by -${tx.amount}`);

            // Delete transaction
            await connection.execute('DELETE FROM transactions WHERE id = ?', [tx.id]);
            console.log(`  -> Deleted transaction ${tx.id}`);
        }

        console.log('All opening balances cleared successfully.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

clearOpeningBalances();
