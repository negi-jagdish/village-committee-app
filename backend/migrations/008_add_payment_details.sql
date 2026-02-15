-- Safely add payment_date and reference_id columns
-- TiDB compatible version (no PREPARE/EXECUTE)

ALTER TABLE transactions ADD COLUMN payment_date DATE;
ALTER TABLE transactions ADD COLUMN reference_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN payment_date DATE;
ALTER TABLE payments ADD COLUMN reference_id VARCHAR(100);
