-- Migration: Add category and scope to news table
ALTER TABLE news 
ADD COLUMN category ENUM('general', 'sports', 'political', 'cultural', 'science', 'entertainment', 'talent', 'education', 'health') DEFAULT 'general',
ADD COLUMN scope ENUM('village', 'district', 'state', 'country', 'international') DEFAULT 'village';

-- Update existing news to have default values
UPDATE news SET category = 'general', scope = 'village' WHERE category IS NULL;
