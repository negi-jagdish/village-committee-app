-- Members table
CREATE TABLE IF NOT EXISTS members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  father_name VARCHAR(255) NOT NULL,
  mother_name VARCHAR(255),
  date_of_birth DATE,
  village_landmark VARCHAR(255) NOT NULL,
  current_address TEXT NOT NULL,
  contact_1 VARCHAR(20) NOT NULL UNIQUE,
  contact_2 VARCHAR(20),
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('member', 'cashier', 'secretary', 'reporter', 'president') DEFAULT 'member',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contribution drives table
CREATE TABLE IF NOT EXISTS contribution_drives (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  title_hi VARCHAR(255),
  description TEXT,
  description_hi TEXT,
  amount_per_member DECIMAL(10, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES members(id)
);

-- Payments table (for bulk payments covering multiple drives)
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('cash', 'bank_transfer', 'upi', 'cheque') NOT NULL,
  screenshot_url VARCHAR(500),
  remarks VARCHAR(500),
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (created_by) REFERENCES members(id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('income', 'expense') NOT NULL,
  member_id INT,
  drive_id INT,
  payment_id INT,
  amount DECIMAL(10, 2) NOT NULL,
  description VARCHAR(500),
  description_hi VARCHAR(500),
  payment_method ENUM('cash', 'bank_transfer', 'upi', 'cheque'),
  screenshot_url VARCHAR(500),
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  edit_allowed BOOLEAN DEFAULT FALSE,
  created_by INT NOT NULL,
  approved_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (drive_id) REFERENCES contribution_drives(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  FOREIGN KEY (created_by) REFERENCES members(id),
  FOREIGN KEY (approved_by) REFERENCES members(id)
);

-- News table
CREATE TABLE IF NOT EXISTS news (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  title_hi VARCHAR(255),
  content TEXT NOT NULL,
  content_hi TEXT,
  youtube_url VARCHAR(500),
  posted_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (posted_by) REFERENCES members(id)
);

-- News media (images) table
CREATE TABLE IF NOT EXISTS news_media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  news_id INT NOT NULL,
  media_url VARCHAR(500) NOT NULL,
  media_type ENUM('image') DEFAULT 'image',
  FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE
);

-- News reactions table
CREATE TABLE IF NOT EXISTS news_reactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  news_id INT NOT NULL,
  member_id INT NOT NULL,
  reaction ENUM('like', 'love', 'celebrate') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id),
  UNIQUE KEY unique_reaction (news_id, member_id)
);

-- Cash book table (tracks bank and cash balances)
CREATE TABLE IF NOT EXISTS cash_book (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_type ENUM('bank', 'cash') NOT NULL UNIQUE,
  balance DECIMAL(12, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default cash book entries
INSERT IGNORE INTO cash_book (account_type, balance) VALUES ('bank', 0), ('cash', 0);

-- Create a default president account (password: admin123)
INSERT IGNORE INTO members (name, father_name, village_landmark, current_address, contact_1, password_hash, role)
VALUES ('Admin President', 'N/A', 'Village Center', 'Village Center', '9999999999', '$2a$10$rQnM1k.T3KxPpK9kT3cVxOvmTzTT0F8fJY0FV3.YxZkFZmZKZJK.2', 'president');
