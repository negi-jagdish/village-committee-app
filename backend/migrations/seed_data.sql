-- Database Schema & Seed Data for Village Committee App

-- 1. Create Tables
-- Users/Members Table
CREATE TABLE IF NOT EXISTS members (
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

-- Contribution Drives (Events like "Temple Renovation")
CREATE TABLE IF NOT EXISTS contribution_drives (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES members(id)
);

-- Transactions (Income & Expenses)
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    description_hi TEXT,
    member_id INT, -- Nullable for general expenses
    drive_id INT, -- Nullable for general funds
    payment_method ENUM('cash', 'upi', 'bank_transfer') DEFAULT 'cash',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_by INT, -- Cashier/User who entered it
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (drive_id) REFERENCES contribution_drives(id),
    FOREIGN KEY (created_by) REFERENCES members(id)
);

-- Waivers (For members who can't pay)
CREATE TABLE IF NOT EXISTS waivers (
    member_id INT NOT NULL,
    drive_id INT NOT NULL,
    reason TEXT,
    granted_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_id, drive_id),
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (drive_id) REFERENCES contribution_drives(id),
    FOREIGN KEY (granted_by) REFERENCES members(id)
);

-- News/Announcements
CREATE TABLE IF NOT EXISTS news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_hi VARCHAR(255),
    content TEXT,
    content_hi TEXT,
    youtube_url VARCHAR(255),
    posted_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (posted_by) REFERENCES members(id)
);

-- Gallery Events
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_hi VARCHAR(255),
    event_date DATE,
    cover_image VARCHAR(255),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES members(id)
);

-- Gallery Media (Images/Videos)
CREATE TABLE IF NOT EXISTS gallery_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    type ENUM('image', 'video') DEFAULT 'image',
    url VARCHAR(255) NOT NULL,
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Cash Book (Summary Table)
CREATE TABLE IF NOT EXISTS cash_book (
    id INT PRIMARY KEY,
    cash_balance DECIMAL(15, 2) DEFAULT 0.00,
    bank_balance DECIMAL(15, 2) DEFAULT 0.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- 2. Seed Data
-- Initialize Cash Book
INSERT INTO cash_book (id, cash_balance, bank_balance) VALUES (1, 0, 0)
ON DUPLICATE KEY UPDATE id = id;

-- Add Members
-- Password is 'password123' (hashed)
INSERT INTO members (name, father_name, village_landmark, current_address, contact_1, password_hash, role) VALUES
('Ramesh Kumar', 'Shyam Kumar', 'Near Temple', 'House 101, Main Road', '9876543211', '$2a$10$EJxDLFd1NN9dDx4nQkU0vuY9K/TUYTwbHvP.n7Uqjygdat6QPKJXC', 'member'),
('Suresh Singh', 'Mohan Singh', 'Market Area', 'House 202, Bazar Road', '9876543212', '$2a$10$EJxDLFd1NN9dDx4nQkU0vuY9K/TUYTwbHvP.n7Uqjygdat6QPKJXC', 'member'),
('Mukesh Sharma', 'Ratan Sharma', 'School Road', 'House 303, School Lane', '9876543213', '$2a$10$EJxDLFd1NN9dDx4nQkU0vuY9K/TUYTwbHvP.n7Uqjygdat6QPKJXC', 'member'),
('Dinesh Verma', 'Kishan Verma', 'Pond Side', 'House 404, Talab Road', '9876543214', '$2a$10$EJxDLFd1NN9dDx4nQkU0vuY9K/TUYTwbHvP.n7Uqjygdat6QPKJXC', 'member'),
('Rajesh Yadav', 'Lakhan Yadav', 'Village End', 'House 505, Gali 5', '9876543215', '$2a$10$EJxDLFd1NN9dDx4nQkU0vuY9K/TUYTwbHvP.n7Uqjygdat6QPKJXC', 'member'),
('Praveen Gupta', 'Hari Gupta', 'Panchayat Road', 'House 606, Panchayat Area', '9876543216', '$2a$10$EJxDLFd1NN9dDx4nQkU0vuY9K/TUYTwbHvP.n7Uqjygdat6QPKJXC', 'member'),
('Anil Tiwari', 'Ram Tiwari', 'Well Area', 'House 707, Kuan Wali Gali', '9876543217', '$2a$10$EJxDLFd1NN9dDx4nQkU0vuY9K/TUYTwbHvP.n7Uqjygdat6QPKJXC', 'member'),
('Vijay Chauhan', 'Gopal Chauhan', 'Bus Stop', 'House 808, Bus Stand Road', '9876543218', '$2a$10$EJxDLFd1NN9dDx4nQkU0vuY9K/TUYTwbHvP.n7Uqjygdat6QPKJXC', 'member');

-- Create Contribution Drives
INSERT INTO contribution_drives (title, title_hi, description, description_hi, target_amount, amount_per_member, start_date, end_date, status, created_by)
VALUES 
('Temple Renovation Fund', 'मंदिर जीर्णोद्धार कोष', 'Collection for temple restoration work', 'मंदिर पुनर्स्थापना कार्य के लिए संग्रह', 50000, 500, '2026-01-01', '2026-03-31', 'active', 1),
('Road Repair Drive', 'सड़क मरम्मत अभियान', 'Fund for repairing village roads', 'गाँव की सड़कों की मरम्मत के लिए कोष', 75000, 750, '2026-01-15', '2026-04-15', 'active', 1),
('Community Hall Construction', 'सामुदायिक भवन निर्माण', 'Building a new community hall for the village', 'गाँव के लिए नया सामुदायिक भवन बनाना', 200000, 2000, '2026-02-01', '2026-08-01', 'active', 1);

-- Add Income Transactions (Contributions)
INSERT INTO transactions (type, amount, description, description_hi, member_id, drive_id, payment_method, status, created_by)
VALUES 
-- Temple Fund Contributions
('income', 500, 'Contribution', 'योगदान', 1, 1, 'cash', 'approved', 2),
('income', 500, 'Contribution', 'योगदान', 2, 1, 'upi', 'approved', 2),
('income', 500, 'Contribution', 'योगदान', 5, 1, 'bank_transfer', 'approved', 2),
('income', 1000, 'Contribution', 'योगदान', 6, 1, 'cash', 'approved', 2),
('income', 500, 'Contribution', 'योगदान', 7, 1, 'upi', 'approved', 2),
-- Road Repair Contributions
('income', 750, 'Contribution', 'योगदान', 1, 2, 'cash', 'approved', 2),
('income', 750, 'Contribution', 'योगदान', 3, 2, 'bank_transfer', 'approved', 2),
('income', 1500, 'Contribution', 'योगदान', 8, 2, 'upi', 'approved', 2),
('income', 750, 'Contribution', 'योगदान', 9, 2, 'cash', 'approved', 2),
-- Community Hall Contributions
('income', 2000, 'Contribution', 'योगदान', 1, 3, 'bank_transfer', 'approved', 2),
('income', 2000, 'Contribution', 'योगदान', 4, 3, 'upi', 'approved', 2),
('income', 4000, 'Contribution', 'योगदान', 10, 3, 'cash', 'approved', 2),
('income', 2000, 'Contribution', 'योगदान', 11, 3, 'bank_transfer', 'approved', 2);

-- Add Expense Transactions
INSERT INTO transactions (type, amount, description, description_hi, payment_method, status, created_by)
VALUES 
('expense', 5000, 'Paint and materials for temple', 'मंदिर के लिए पेंट और सामग्री', 'cash', 'approved', 2),
('expense', 15000, 'Road gravel and sand', 'सड़क के लिए बजरी और रेत', 'bank_transfer', 'approved', 2),
('expense', 8000, 'Mason labor payment', 'मिस्त्री मजदूरी भुगतान', 'cash', 'approved', 2),
('expense', 3000, 'Electrical work', 'बिजली का काम', 'upi', 'pending', 2),
('expense', 12000, 'Cement purchase', 'सीमेंट खरीद', 'bank_transfer', 'pending', 2);

-- Update cash book balances
UPDATE cash_book SET 
  cash_balance = (
    SELECT COALESCE(SUM(CASE WHEN type = 'income' AND payment_method = 'cash' THEN amount ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN type = 'expense' AND payment_method = 'cash' AND status = 'approved' THEN amount ELSE 0 END), 0)
    FROM transactions WHERE status = 'approved'
  ),
  bank_balance = (
    SELECT COALESCE(SUM(CASE WHEN type = 'income' AND payment_method IN ('bank_transfer', 'upi') THEN amount ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN type = 'expense' AND payment_method IN ('bank_transfer', 'upi') AND status = 'approved' THEN amount ELSE 0 END), 0)
    FROM transactions WHERE status = 'approved'
  )
WHERE id = 1;

-- Add News Articles
INSERT INTO news (title, title_hi, content, content_hi, youtube_url, posted_by, created_at)
VALUES 
('Temple Renovation Started!', 'मंदिर जीर्णोद्धार शुरू!', 'We are happy to announce that the temple renovation work has officially begun. Thanks to everyone\'s generous contributions, we have collected enough funds to start the first phase.', 'हमें यह बताते हुए खुशी हो रही है कि मंदिर जीर्णोद्धार का काम आधिकारिक रूप से शुरू हो गया है। सभी के उदार योगदान की बदौलत, हमने पहले चरण शुरू करने के लिए पर्याप्त धन एकत्र कर लिया है।', NULL, 3, NOW() - INTERVAL 5 DAY),
('Road Work Update', 'सड़क कार्य अपडेट', 'The main village road repair work is progressing well. The contractor has completed 40% of the work. Expected completion in 2 weeks.', 'मुख्य गाँव की सड़क मरम्मत का काम अच्छी तरह से चल रहा है। ठेकेदार ने 40% काम पूरा कर लिया है। 2 सप्ताह में पूरा होने की उम्मीद है।', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1, NOW() - INTERVAL 3 DAY),
('Community Meeting Announcement', 'सामुदायिक बैठक की घोषणा', 'All villagers are requested to attend the monthly meeting on Sunday at 10 AM at the Panchayat office. Important decisions regarding the community hall will be discussed.', 'सभी ग्रामीणों से अनुरोध है कि रविवार को सुबह 10 बजे पंचायत कार्यालय में मासिक बैठक में उपस्थित हों। सामुदायिक भवन के संबंध में महत्वपूर्ण निर्णय लिए जाएंगे।', NULL, 1, NOW() - INTERVAL 1 DAY),
('Successful Donation Drive!', 'सफल दान अभियान!', 'Thanks to our generous donors, we have exceeded our initial target for the temple renovation fund! Special thanks to Praveen Gupta ji for his contribution of ₹5,000.', 'हमारे उदार दानदाताओं की बदौलत, हमने मंदिर जीर्णोद्धार कोष के लिए अपने प्रारंभिक लक्ष्य को पार कर लिया है! प्रवीण गुप्ता जी को उनके ₹5,000 के योगदान के लिए विशेष धन्यवाद।', NULL, 3, NOW());

SELECT 'Schema and seed data inserted successfully!' as status;
