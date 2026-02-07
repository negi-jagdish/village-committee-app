ALTER TABLE members
ADD COLUMN status ENUM('active', 'inactive', 'deceased') DEFAULT 'active';
