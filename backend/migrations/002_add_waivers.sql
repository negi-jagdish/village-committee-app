-- Waivers table (tracks exemptions from specific drives)
CREATE TABLE IF NOT EXISTS waivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  drive_id INT NOT NULL,
  reason VARCHAR(500),
  granted_by INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (drive_id) REFERENCES contribution_drives(id),
  FOREIGN KEY (granted_by) REFERENCES members(id),
  UNIQUE KEY unique_waiver (member_id, drive_id)
);
