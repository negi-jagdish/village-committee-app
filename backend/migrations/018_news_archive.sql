-- Add status column for archiving news
ALTER TABLE news ADD COLUMN status ENUM('active', 'archived') DEFAULT 'active';

-- Existing news should be active
UPDATE news SET status = 'active' WHERE status IS NULL;
