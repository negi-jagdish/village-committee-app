-- Support for decentralized chat delivery tracking
-- Allows us to track which devices have successfully received a message (Double Ticks)

CREATE TABLE IF NOT EXISTS message_deliveries (
    message_id INT NOT NULL,
    member_id INT NOT NULL,
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, member_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- We explicitly do NOT add session_token or strictly enforce single-device at the DB level
-- Instead, we will rely on a 3-day server retention rule to support multi-device syncing.
