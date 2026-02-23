import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db: SQLiteDatabase | null = null;

export const getDB = async (): Promise<SQLiteDatabase> => {
    if (db) return db;

    try {
        db = await SQLite.openDatabase({
            name: 'villageapp.db',
            location: 'default',
        });
        await initSchema(db);
        return db;
    } catch (error) {
        console.error("Failed to open SQLite Database", error);
        throw error;
    }
};

const initSchema = async (database: SQLiteDatabase) => {
    try {
        await database.transaction(
            (tx: any) => {
                // Disable FK enforcement so INSERT OR IGNORE works correctly
                // (FK violations were silently dropping message inserts)
                tx.executeSql('PRAGMA foreign_keys = OFF');

                // Table for Chats/Groups overview (Powers ChatListScreen)
                tx.executeSql(`
                    CREATE TABLE IF NOT EXISTS local_chats (
                        id INTEGER PRIMARY KEY,
                        name TEXT,
                        type TEXT,
                        icon_url TEXT,
                        last_message TEXT,
                        last_message_type TEXT,
                        last_message_time TEXT,
                        unread_count INTEGER DEFAULT 0,
                        is_pinned INTEGER DEFAULT 0,
                        mute_until TEXT,
                        notification_tone TEXT,
                        vibration_enabled INTEGER DEFAULT 1
                    )
                `);

                // Migration for existing local_chats table
                tx.executeSql(
                    "PRAGMA table_info(local_chats)",
                    [],
                    (_: any, result: any) => {
                        const columns = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            columns.push(result.rows.item(i).name);
                        }

                        if (!columns.includes('is_pinned')) {
                            tx.executeSql('ALTER TABLE local_chats ADD COLUMN is_pinned INTEGER DEFAULT 0');
                        }
                        if (!columns.includes('mute_until')) {
                            tx.executeSql('ALTER TABLE local_chats ADD COLUMN mute_until TEXT');
                        }
                        if (!columns.includes('notification_tone')) {
                            tx.executeSql('ALTER TABLE local_chats ADD COLUMN notification_tone TEXT');
                        }
                        if (!columns.includes('vibration_enabled')) {
                            tx.executeSql('ALTER TABLE local_chats ADD COLUMN vibration_enabled INTEGER DEFAULT 1');
                        }
                        if (!columns.includes('vibration_intensity')) {
                            tx.executeSql('ALTER TABLE local_chats ADD COLUMN vibration_intensity INTEGER DEFAULT 100');
                        }
                    }
                );

                // Table for actual Messages (Powers ChatScreen) — NO FK constraint
                // FK constraint caused silent INSERT OR IGNORE failures when local_chats wasn't populated yet
                tx.executeSql(`
                    CREATE TABLE IF NOT EXISTS local_messages (
                        id INTEGER PRIMARY KEY,
                        group_id INTEGER,
                        sender_id INTEGER,
                        sender_name TEXT,
                        sender_avatar TEXT,
                        type TEXT,
                        content TEXT,
                        metadata TEXT,
                        reply_to_id INTEGER,
                        reply_to_content TEXT,
                        reply_to_type TEXT,
                        reply_to_sender TEXT,
                        is_forwarded INTEGER DEFAULT 0,
                        is_deleted INTEGER DEFAULT 0,
                        reactions TEXT,
                        created_at TEXT,
                        status TEXT DEFAULT 'sent'
                    )
                `);

                // Migration: recreate local_messages without old FK constraint if it exists
                // We check by attempting to insert a test row that would fail FK but pass without it
                tx.executeSql(
                    `SELECT sql FROM sqlite_master WHERE type='table' AND name='local_messages'`,
                    [],
                    (_: any, result: any) => {
                        if (result.rows.length > 0) {
                            const tableSql: string = result.rows.item(0).sql || '';
                            if (tableSql.toUpperCase().includes('FOREIGN KEY')) {
                                // Old schema with FK — recreate without it
                                tx.executeSql('ALTER TABLE local_messages RENAME TO local_messages_old');
                                tx.executeSql(`
                                    CREATE TABLE local_messages (
                                        id INTEGER PRIMARY KEY,
                                        group_id INTEGER,
                                        sender_id INTEGER,
                                        sender_name TEXT,
                                        sender_avatar TEXT,
                                        type TEXT,
                                        content TEXT,
                                        metadata TEXT,
                                        reply_to_id INTEGER,
                                        reply_to_content TEXT,
                                        reply_to_type TEXT,
                                        reply_to_sender TEXT,
                                        is_forwarded INTEGER DEFAULT 0,
                                        is_deleted INTEGER DEFAULT 0,
                                        reactions TEXT,
                                        created_at TEXT,
                                        status TEXT DEFAULT 'sent'
                                    )
                                `);
                                tx.executeSql(`
                                    INSERT OR IGNORE INTO local_messages
                                    SELECT id, group_id, sender_id, sender_name, sender_avatar, type, content,
                                           metadata, reply_to_id, reply_to_content, reply_to_type, reply_to_sender,
                                           is_forwarded, is_deleted, reactions, created_at, status
                                    FROM local_messages_old
                                `);
                                tx.executeSql('DROP TABLE local_messages_old');
                            }
                        }
                    }
                );

                // Index for faster queries in ChatScreen
                tx.executeSql('CREATE INDEX IF NOT EXISTS idx_group_id ON local_messages(group_id)');
            }
        );
        console.log("Local SQLite Schema Initialized");
    } catch (error) {
        console.error("Failed to initialize SQLite schema", error);
        throw error;
    }
};

export const clearDatabase = async (): Promise<void> => {
    try {
        if (!db) {
            console.warn("Cannot clear database: db is not initialized.");
            return;
        }
        await db.transaction(
            (tx: any) => {
                tx.executeSql('DELETE FROM local_messages');
                tx.executeSql('DELETE FROM local_chats');
            }
        );
        console.log("Local Database Cleared (e.g., on Logout/Device Conflict)");
    } catch (e) {
        console.error("Error setting up clear transaction", e);
    }
};
