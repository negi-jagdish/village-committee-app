-- Add description column to chat_groups
ALTER TABLE chat_groups ADD COLUMN description TEXT AFTER icon_url;
