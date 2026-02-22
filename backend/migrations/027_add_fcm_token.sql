-- Add FCM Token column to members table
ALTER TABLE members ADD COLUMN fcm_token VARCHAR(255) DEFAULT NULL;
