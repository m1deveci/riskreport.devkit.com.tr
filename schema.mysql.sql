/*
  # Ramak Kala (Near-Miss) Reporting System - MySQL Database Schema

  ## Overview
  This is a MySQL version of the near-miss reporting system for occupational safety
  across multiple locations (factories/workplaces).

  Note: RLS (Row Level Security) is not native to MySQL.
  Security is enforced at the application level instead.
*/

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  description LONGTEXT DEFAULT '',
  main_email VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_locations_is_active (is_active)
);

-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  location_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description LONGTEXT DEFAULT '',
  qr_code_token VARCHAR(255) UNIQUE NOT NULL,
  qr_code_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_regions_location_id FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  INDEX idx_regions_location_id (location_id),
  INDEX idx_regions_qr_code_token (qr_code_token),
  INDEX idx_regions_is_active (is_active)
);

-- Create ISG experts table
CREATE TABLE IF NOT EXISTS isg_experts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  location_id CHAR(36) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_isg_experts_location_id FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  INDEX idx_isg_experts_location_id (location_id),
  INDEX idx_isg_experts_is_active (is_active)
);

-- Create sequence table for incident numbers (MySQL doesn't have sequences like PostgreSQL)
CREATE TABLE IF NOT EXISTS incident_number_seq (
  id INT AUTO_INCREMENT PRIMARY KEY,
  next_val INT DEFAULT 1
);

-- Initialize sequence if empty
INSERT INTO incident_number_seq (next_val) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM incident_number_seq);

-- Create near-miss reports table
CREATE TABLE IF NOT EXISTS near_miss_reports (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  incident_number VARCHAR(50) UNIQUE NOT NULL,
  location_id CHAR(36) NOT NULL,
  region_id CHAR(36) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description LONGTEXT DEFAULT '',
  status VARCHAR(50) DEFAULT 'Yeni',
  internal_notes LONGTEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_near_miss_reports_location_id FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  CONSTRAINT fk_near_miss_reports_region_id FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE,
  INDEX idx_near_miss_reports_location_id (location_id),
  INDEX idx_near_miss_reports_region_id (region_id),
  INDEX idx_near_miss_reports_incident_number (incident_number),
  INDEX idx_near_miss_reports_created_at (created_at DESC),
  INDEX idx_near_miss_reports_status (status)
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_is_active (is_active)
);

-- Create system logs table
CREATE TABLE IF NOT EXISTS system_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  action VARCHAR(255) NOT NULL,
  details JSON,
  ip_address VARCHAR(45),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_system_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_system_logs_user_id (user_id),
  INDEX idx_system_logs_created_at (created_at DESC),
  INDEX idx_system_logs_action (action)
);

-- Create system settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  site_title VARCHAR(255) DEFAULT 'Ramak Kala Raporlama Sistemi',
  smtp_host VARCHAR(255) DEFAULT '',
  smtp_port INT DEFAULT 587,
  smtp_username VARCHAR(255) DEFAULT '',
  smtp_password VARCHAR(255) DEFAULT '',
  smtp_from_email VARCHAR(255) DEFAULT '',
  backup_target_path TEXT DEFAULT '',
  logo_path VARCHAR(500) DEFAULT '',
  background_path VARCHAR(500) DEFAULT '',
  favicon_path VARCHAR(500) DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT INTO system_settings (id, site_title)
SELECT UUID(), 'Ramak Kala Raporlama Sistemi'
WHERE NOT EXISTS (SELECT 1 FROM system_settings LIMIT 1);

-- Add new columns to existing system_settings table if they don't exist
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS logo_path VARCHAR(500) DEFAULT '';
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS background_path VARCHAR(500) DEFAULT '';
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS favicon_path VARCHAR(500) DEFAULT '';

-- Create trigger to generate incident number before insert on near_miss_reports
DELIMITER //
CREATE TRIGGER generate_incident_number_trigger
BEFORE INSERT ON near_miss_reports
FOR EACH ROW
BEGIN
  DECLARE next_num INT;
  DECLARE year_str VARCHAR(4);

  IF NEW.incident_number IS NULL OR NEW.incident_number = '' THEN
    UPDATE incident_number_seq SET next_val = next_val + 1;
    SELECT next_val INTO next_num FROM incident_number_seq LIMIT 1;
    SET year_str = DATE_FORMAT(NOW(), '%Y');
    SET NEW.incident_number = CONCAT('RK-', year_str, '-', LPAD(next_num - 1, 6, '0'));
  END IF;
END //
DELIMITER ;

-- Create trigger to check ISG experts limit before insert on isg_experts
DELIMITER //
CREATE TRIGGER check_isg_experts_limit_insert
BEFORE INSERT ON isg_experts
FOR EACH ROW
BEGIN
  DECLARE active_count INT;

  IF NEW.is_active = true THEN
    SELECT COUNT(*) INTO active_count
    FROM isg_experts
    WHERE location_id = NEW.location_id AND is_active = true;

    IF active_count >= 5 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Bir lokasyonda maksimum 5 aktif İSG uzmanı olabilir';
    END IF;
  END IF;
END //
DELIMITER ;

-- Create trigger to check ISG experts limit before update on isg_experts
DELIMITER //
CREATE TRIGGER check_isg_experts_limit_update
BEFORE UPDATE ON isg_experts
FOR EACH ROW
BEGIN
  DECLARE active_count INT;

  IF NEW.is_active = true AND OLD.is_active = false THEN
    SELECT COUNT(*) INTO active_count
    FROM isg_experts
    WHERE location_id = NEW.location_id AND is_active = true;

    IF active_count >= 5 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Bir lokasyonda maksimum 5 aktif İSG uzmanı olabilir';
    END IF;
  END IF;
END //
DELIMITER ;

-- Create stored procedure to get next incident number
DELIMITER //
CREATE PROCEDURE get_next_incident_number(OUT next_number VARCHAR(50))
BEGIN
  DECLARE next_num INT;
  DECLARE year_str VARCHAR(4);

  UPDATE incident_number_seq SET next_val = next_val + 1 WHERE id = 1;
  SELECT next_val INTO next_num FROM incident_number_seq WHERE id = 1;
  SET year_str = DATE_FORMAT(NOW(), '%Y');
  SET next_number = CONCAT('RK-', year_str, '-', LPAD(next_num - 1, 6, '0'));
END //
DELIMITER ;
