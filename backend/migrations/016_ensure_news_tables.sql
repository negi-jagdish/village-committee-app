-- Ensure News tables exist
-- Fixes potential 500 error if tables are missing

CREATE TABLE IF NOT EXISTS news (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  title_hi VARCHAR(255),
  content TEXT NOT NULL,
  content_hi TEXT,
  youtube_url VARCHAR(500),
  category ENUM('general', 'event', 'announcement', 'update') DEFAULT 'general',
  scope ENUM('village', 'regional', 'national', 'international') DEFAULT 'village',
  posted_by INT NOT NULL,
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (posted_by) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS news_media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  news_id INT NOT NULL,
  media_url VARCHAR(500) NOT NULL,
  media_type ENUM('image', 'video') DEFAULT 'image',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE
);

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
