-- Seed Test Users for Quick Login (Password: 123456)
-- Hash: $2a$10$UDUDiSKLvL5z/lj.JF39k.2kZu8Djy2YSgXOf/IpRKQ3.D9kIwO/G

INSERT INTO members (name, father_name, village_landmark, current_address, contact_1, password_hash, role)
VALUES 
('Test President', 'Father', 'Center', 'Office', '9000000001', '$2a$10$UDUDiSKLvL5z/lj.JF39k.2kZu8Djy2YSgXOf/IpRKQ3.D9kIwO/G', 'president'),
('Test Cashier', 'Father', 'Bank', 'Bank St', '9000000002', '$2a$10$UDUDiSKLvL5z/lj.JF39k.2kZu8Djy2YSgXOf/IpRKQ3.D9kIwO/G', 'cashier'),
('Test Secretary', 'Father', 'Office', 'Sec Lane', '9000000003', '$2a$10$UDUDiSKLvL5z/lj.JF39k.2kZu8Djy2YSgXOf/IpRKQ3.D9kIwO/G', 'secretary'),
('Test Reporter', 'Father', 'Press', 'Media House', '9000000004', '$2a$10$UDUDiSKLvL5z/lj.JF39k.2kZu8Djy2YSgXOf/IpRKQ3.D9kIwO/G', 'reporter'),
('Test Member 1', 'Father', 'Home 1', 'Street 1', '9000000011', '$2a$10$UDUDiSKLvL5z/lj.JF39k.2kZu8Djy2YSgXOf/IpRKQ3.D9kIwO/G', 'member'),
('Test Member 2', 'Father', 'Home 2', 'Street 2', '9000000012', '$2a$10$UDUDiSKLvL5z/lj.JF39k.2kZu8Djy2YSgXOf/IpRKQ3.D9kIwO/G', 'member'),
('Test Member 3', 'Father', 'Home 3', 'Street 3', '9000000013', '$2a$10$UDUDiSKLvL5z/lj.JF39k.2kZu8Djy2YSgXOf/IpRKQ3.D9kIwO/G', 'member'),
('Test Member 4', 'Father', 'Home 4', 'Street 4', '9000000014', '$2a$10$UDUDiSKLvL5z/lj.JF39k.2kZu8Djy2YSgXOf/IpRKQ3.D9kIwO/G', 'member'),
('Test Member 5', 'Father', 'Home 5', 'Street 5', '9000000015', '$2a$10$UDUDiSKLvL5z/lj.JF39k.2kZu8Djy2YSgXOf/IpRKQ3.D9kIwO/G', 'member'),
('Test Member 6', 'Father', 'Home 6', 'Street 6', '9000000016', '$2a$10$UDUDiSKLvL5z/lj.JF39k.2kZu8Djy2YSgXOf/IpRKQ3.D9kIwO/G', 'member')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role);
