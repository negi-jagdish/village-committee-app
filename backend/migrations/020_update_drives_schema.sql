-- Add missing columns to 'contribution_drives' table to match TiDB schema
DROP PROCEDURE IF EXISTS AddDrivesColumns;
DELIMITER //
CREATE PROCEDURE AddDrivesColumns()
BEGIN
    -- Add target_amount
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'contribution_drives' 
        AND COLUMN_NAME = 'target_amount'
    ) THEN
        ALTER TABLE contribution_drives ADD COLUMN target_amount DECIMAL(12, 2) DEFAULT 0;
    END IF;

    -- Add status
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'contribution_drives' 
        AND COLUMN_NAME = 'status'
    ) THEN
        ALTER TABLE contribution_drives ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;
END //
DELIMITER ;

CALL AddDrivesColumns();
DROP PROCEDURE AddDrivesColumns;
