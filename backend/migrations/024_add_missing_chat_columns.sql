-- Fix for missing columns from 022 that failed to apply
-- Adding is_blocked and last_seen to members table directly

ALTER TABLE members ADD COLUMN IF NOT EXISTS is_blocked TINYINT(1) DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP NULL;
