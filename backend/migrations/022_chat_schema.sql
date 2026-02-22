-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    type ENUM('private', 'group', 'broadcast') NOT NULL DEFAULT 'private',
    icon_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
    group_id INT,
    member_id INT,
    role ENUM('admin', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, member_id),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    sender_id INT, -- NULL for System/ChamBot messages
    type ENUM('text', 'image', 'video', 'document', 'system') DEFAULT 'text',
    content TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES members(id) ON DELETE SET NULL
);

-- Create message_reads table
CREATE TABLE IF NOT EXISTS message_reads (
    message_id INT,
    member_id INT,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, member_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Add columns to members table
DROP PROCEDURE IF EXISTS AddChatColumns;
DELIMITER //
CREATE PROCEDURE AddChatColumns()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'members' 
        AND COLUMN_NAME = 'is_blocked'
    ) THEN
        ALTER TABLE members ADD COLUMN is_blocked TINYINT(1) DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'members' 
        AND COLUMN_NAME = 'last_seen'
    ) THEN
        ALTER TABLE members ADD COLUMN last_seen TIMESTAMP NULL;
    END IF;
END //
DELIMITER ;

CALL AddChatColumns();
DROP PROCEDURE AddChatColumns;
