-- Migration: Add mpin_hash to members table
-- Description: Adds a column to store the hashed 4-digit MPIN for simplified login.

ALTER TABLE members
ADD COLUMN mpin_hash VARCHAR(255) NULL DEFAULT NULL AFTER password_hash;
