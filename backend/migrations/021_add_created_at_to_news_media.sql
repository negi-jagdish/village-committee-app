-- Add 'created_at' column to 'news_media' table if it doesn't exist
DROP PROCEDURE IF EXISTS AddNewsMediaCreatedAt;
DELIMITER //
CREATE PROCEDURE AddNewsMediaCreatedAt()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'news_media' 
        AND COLUMN_NAME = 'created_at'
    ) THEN
        ALTER TABLE news_media ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END //
DELIMITER ;

CALL AddNewsMediaCreatedAt();
DROP PROCEDURE AddNewsMediaCreatedAt;
