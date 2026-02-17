-- Add 'views' column to 'news' table if it doesn't exist
-- Procedure to add column safely
DROP PROCEDURE IF EXISTS AddViewsColumn;
DELIMITER //
CREATE PROCEDURE AddViewsColumn()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'news' 
        AND COLUMN_NAME = 'views'
    ) THEN
        ALTER TABLE news ADD COLUMN views INT DEFAULT 0;
    END IF;
END //
DELIMITER ;

CALL AddViewsColumn();
DROP PROCEDURE AddViewsColumn;
