const db = require('./src/config/database');

async function checkChats() {
    try {
        console.log("--- Chat Groups ---");
        const [groups] = await db.query("SELECT * FROM chat_groups");
        console.log(groups);

        console.log("\n--- Group Members ---");
        const [groupMembers] = await db.query("SELECT * FROM group_members");
        console.log(groupMembers);

        console.log("\n--- All Members Count ---");
        const [members] = await db.query("SELECT COUNT(*) as count FROM members");
        console.log(members);

        console.log("\n--- Messages ---");
        const [messages] = await db.query("SELECT id, group_id, sender_id, content FROM messages ORDER BY created_at DESC LIMIT 5");
        console.log(messages);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkChats();
