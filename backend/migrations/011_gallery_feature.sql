-- Events table
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  title_hi VARCHAR(255),
  description TEXT,
  event_date DATE NOT NULL,
  cover_image VARCHAR(500),
  location VARCHAR(255),
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES members(id)
);

-- Gallery Media table
CREATE TABLE IF NOT EXISTS gallery_media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  type ENUM('image', 'video') DEFAULT 'image',
  url VARCHAR(500) NOT NULL,
  thumbnail VARCHAR(500),
  caption VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
