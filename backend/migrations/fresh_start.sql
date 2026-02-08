-- FRESH START: Complete Database Reset for Chamdoli Yuva Samiti
-- Run this in TiDB Chat2Query

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Drop all existing tables
DROP TABLE IF EXISTS gallery_media;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS news_reactions;
DROP TABLE IF EXISTS news_media;
DROP TABLE IF EXISTS news;
DROP TABLE IF EXISTS waivers;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS contribution_drives;
DROP TABLE IF EXISTS cash_book;
DROP TABLE IF EXISTS members;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- CREATE TABLES
-- =====================================================

CREATE TABLE members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    father_name VARCHAR(100) NOT NULL,
    mother_name VARCHAR(100),
    date_of_birth DATE,
    village_landmark VARCHAR(255) NOT NULL,
    current_address VARCHAR(255) NOT NULL,
    contact_1 VARCHAR(20) NOT NULL UNIQUE,
    contact_2 VARCHAR(20),
    email VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('president', 'secretary', 'cashier', 'reporter', 'member') DEFAULT 'member',
    status ENUM('active', 'inactive') DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,
    sex ENUM('male', 'female', 'other') DEFAULT 'male',
    legacy_due DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contribution_drives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_hi VARCHAR(255),
    description TEXT,
    description_hi TEXT,
    target_amount DECIMAL(15, 2) DEFAULT 0.00,
    amount_per_member DECIMAL(10, 2) DEFAULT 0.00,
    start_date DATE,
    end_date DATE,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    description_hi TEXT,
    member_id INT,
    drive_id INT,
    payment_method ENUM('cash', 'upi', 'bank_transfer') DEFAULT 'cash',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE waivers (
    member_id INT NOT NULL,
    drive_id INT NOT NULL,
    reason TEXT,
    granted_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_id, drive_id)
);

CREATE TABLE news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_hi VARCHAR(255),
    content TEXT,
    content_hi TEXT,
    youtube_url VARCHAR(255),
    category ENUM('general', 'event', 'announcement', 'update') DEFAULT 'general',
    scope ENUM('village', 'regional', 'national') DEFAULT 'village',
    views INT DEFAULT 0,
    posted_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE news_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    news_id INT NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    media_type ENUM('image', 'video') DEFAULT 'image',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE news_reactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    news_id INT NOT NULL,
    member_id INT NOT NULL,
    reaction ENUM('like', 'love', 'celebrate') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_reaction (news_id, member_id)
);

CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_hi VARCHAR(255),
    event_date DATE,
    cover_image VARCHAR(500),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gallery_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    type ENUM('image', 'video') DEFAULT 'image',
    url VARCHAR(500) NOT NULL,
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cash_book (
    id INT PRIMARY KEY,
    cash_balance DECIMAL(15, 2) DEFAULT 0.00,
    bank_balance DECIMAL(15, 2) DEFAULT 0.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- INSERT SEED DATA
-- =====================================================

-- Initialize Cash Book
INSERT INTO cash_book (id, cash_balance, bank_balance) VALUES (1, 0.00, 0.00);

-- Insert Members (Default password: password123)
-- Password hash: $2a$10$ofMyFqK8iHiTzDYjyLhebupqPZFKZcP4abiKn3InteOCpFJ25NIJu

INSERT INTO members (name, father_name, village_landmark, current_address, contact_1, password_hash, role) VALUES
('JAGDISH SINGH NEGI', 'SHER SINGH NEGI', 'Dubaat', 'PUNE', '9582945578', '$2a$10$ofMyFqK8iHiTzDYjyLhebupqPZFKZcP4abiKn3InteOCpFJ25NIJu', 'president'),
('UMESH SINGH NEGI', 'BACCHE SINGH NEGI', 'Dubaat', 'CHAMOLI', '9811422624', '$2a$10$ofMyFqK8iHiTzDYjyLhebupqPZFKZcP4abiKn3InteOCpFJ25NIJu', 'president'),
('BACCHE SINGH NEGI', 'DOL SINGH NEGI', 'Dubaat', 'CHAMDOLI', '9810490391', '$2a$10$ofMyFqK8iHiTzDYjyLhebupqPZFKZcP4abiKn3InteOCpFJ25NIJu', 'secretary'),
('RAJINDER SINGH NEGI', 'JODHA SINGH NEGI', 'MALBAKHAI', 'FARIDABAD', '9650200177', '$2a$10$ofMyFqK8iHiTzDYjyLhebupqPZFKZcP4abiKn3InteOCpFJ25NIJu', 'cashier'),
('NARENDER SINGH NEGI', 'PAN SINGH NEGI', 'MALBAKHAI', 'DELHI', '9811620581', '$2a$10$ofMyFqK8iHiTzDYjyLhebupqPZFKZcP4abiKn3InteOCpFJ25NIJu', 'member'),
('SHANKAR SINGH NEGI', 'KHUSHAL SINGH NEGI', 'Dubaat', 'DELHI', '8447435863', '$2a$10$ofMyFqK8iHiTzDYjyLhebupqPZFKZcP4abiKn3InteOCpFJ25NIJu', 'member'),
('SURENDER SINGH NEGI', 'KHUSHAL SINGH NEGI', 'Dubaat', 'DELHI', '9718952367', '$2a$10$ofMyFqK8iHiTzDYjyLhebupqPZFKZcP4abiKn3InteOCpFJ25NIJu', 'reporter'),
('VIRENDER SINGH NEGI', 'AMAN SINGH NEGI', 'BAMAN CHAMDOLI', 'MEERUT', '9318385586', '$2a$10$ofMyFqK8iHiTzDYjyLhebupqPZFKZcP4abiKn3InteOCpFJ25NIJu', 'member'),
('SURENDER SINGH NEGI', 'AMAN SINGH NEGI', 'BAMAN CHAMDOLI', 'MEERUT', '9868458427', '$2a$10$ofMyFqK8iHiTzDYjyLhebupqPZFKZcP4abiKn3InteOCpFJ25NIJu', 'member');

-- Welcome News
INSERT INTO news (title, title_hi, content, content_hi, category, scope, posted_by) VALUES
('Welcome to Chamdoli Yuva Samiti App!', 'चमडोली युवा समिति ऐप में आपका स्वागत है!', 
 'This app is now live for all members. You can now view news, contribute to drives, and stay connected with the community.',
 'यह ऐप अब सभी सदस्यों के लिए उपलब्ध है। अब आप समाचार देख सकते हैं, अभियानों में योगदान कर सकते हैं और समुदाय से जुड़े रह सकते हैं।',
 'announcement', 'village', 1);

-- Verification
SELECT 'SUCCESS! Fresh database created with 9 members.' as status;
SELECT CONCAT('Members: ', COUNT(*)) as count FROM members;
