-- Fix scope ENUM to match mobile app values
-- fresh_start.sql used ('village', 'regional', 'national') but app expects ('village', 'district', 'state', 'country', 'international')

ALTER TABLE news MODIFY COLUMN scope ENUM('village', 'regional', 'national', 'district', 'state', 'country', 'international') DEFAULT 'village';

-- Also fix fresh_start.sql category ENUM if it's missing values
ALTER TABLE news MODIFY COLUMN category ENUM('general', 'sports', 'political', 'cultural', 'science', 'entertainment', 'talent', 'education', 'health', 'event', 'announcement', 'update') DEFAULT 'general';
