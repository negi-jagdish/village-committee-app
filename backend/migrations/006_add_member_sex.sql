ALTER TABLE members
ADD COLUMN sex ENUM('male', 'female') NOT NULL DEFAULT 'male' AFTER name;
