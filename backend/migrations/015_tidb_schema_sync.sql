-- Schema Sync Migration for TiDB
-- Aligns the fresh_start.sql schema with what the backend code expects

-- =====================================================
-- FIX: transactions table - add missing columns
-- =====================================================
ALTER TABLE transactions ADD COLUMN screenshot_url VARCHAR(500);
ALTER TABLE transactions ADD COLUMN payment_id INT;
ALTER TABLE transactions ADD COLUMN edit_allowed BOOLEAN DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN approved_by INT;
ALTER TABLE transactions ADD COLUMN approved_at TIMESTAMP NULL;

-- =====================================================
-- FIX: payments table - create if not exists
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('cash', 'bank_transfer', 'upi', 'cheque') NOT NULL,
  screenshot_url VARCHAR(500),
  remarks VARCHAR(500),
  payment_date DATE,
  reference_id VARCHAR(100),
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FIX: cash_book table - recreate with correct schema
-- The fresh_start.sql has cash_balance/bank_balance columns
-- but the code expects account_type/balance structure
-- =====================================================
DROP TABLE IF EXISTS cash_book;

CREATE TABLE cash_book (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_type ENUM('bank', 'cash') NOT NULL UNIQUE,
  balance DECIMAL(12, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO cash_book (account_type, balance) VALUES ('bank', 0), ('cash', 0);

-- =====================================================
-- FIX: polls tables - create if not exists
-- =====================================================
CREATE TABLE IF NOT EXISTS polls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question TEXT NOT NULL,
  question_hi TEXT,
  created_by INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  allow_custom_answer BOOLEAN DEFAULT FALSE,
  show_results BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS poll_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poll_id INT NOT NULL,
  option_text VARCHAR(255) NOT NULL,
  option_text_hi VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poll_id INT NOT NULL,
  option_id INT,
  member_id INT NOT NULL,
  text_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_vote (poll_id, member_id)
);
