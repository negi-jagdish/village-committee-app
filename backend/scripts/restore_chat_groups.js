#!/usr/bin/env node
require('dotenv').config();
const db = require('../src/config/database');

async function restoreChatGroups() {
    try {
        console.log('Restoring chat groups...');

        // 1. Get all members
        const [members] = await db.query('SELECT id, name FROM members WHERE id < 60000 ORDER BY id');
        console.log('Members found:', members.map(m => `${m.id}:${m.name}`).join(', '));

        // 2. Create the main group chat (Chamdoli Yuva Samiti) with id=1
        await db.query(`
            INSERT INTO chat_groups (id, name, type, created_by)
            VALUES (1, 'Chamdoli Yuva Samiti', 'group', 1)
            ON DUPLICATE KEY UPDATE name = VALUES(name)
        `);
        console.log('Created main group: Chamdoli Yuva Samiti (id=1)');

        // 3. Add all members to the group (member 1 = admin)
        for (const member of members) {
            const role = member.id === 1 ? 'admin' : 'member';
            await db.query(`
                INSERT IGNORE INTO group_members (group_id, member_id, role, joined_at)
                VALUES (1, ?, ?, NOW())
            `, [member.id, role]);
        }
        console.log('Added all members to main group');

        // 4. Create private chats between all pairs of members
        let nextGroupId = 2;
        const memberIds = members.map(m => m.id);
        for (let i = 0; i < memberIds.length; i++) {
            for (let j = i + 1; j < memberIds.length; j++) {
                const a = memberIds[i];
                const b = memberIds[j];
                // Check if private chat already exists
                const [existing] = await db.query(`
                    SELECT cg.id FROM chat_groups cg
                    JOIN group_members gm1 ON cg.id = gm1.group_id AND gm1.member_id = ?
                    JOIN group_members gm2 ON cg.id = gm2.group_id AND gm2.member_id = ?
                    WHERE cg.type = 'private'
                `, [a, b]);
                if (existing.length === 0) {
                    await db.query(`
                        INSERT INTO chat_groups (name, type, created_by)
                        VALUES ('private', 'private', ?)
                    `, [a]);
                    const [result] = await db.query('SELECT LAST_INSERT_ID() as id');
                    const newId = result[0].id;
                    await db.query(`INSERT IGNORE INTO group_members (group_id, member_id, role) VALUES (?, ?, 'member'), (?, ?, 'member')`, [newId, a, newId, b]);
                    console.log(`Created private chat id=${newId} between member ${a} and ${b}`);
                }
            }
        }

        console.log('\n✅ Chat groups restored!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

restoreChatGroups();
