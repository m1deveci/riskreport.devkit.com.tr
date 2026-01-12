-- Migration: Add assigned user fields to near_miss_reports table
-- Date: 2026-01-12
-- Description: Adds assigned_user_id and assigned_user_name columns to support report assignment feature

-- Add image_path column if it doesn't exist
ALTER TABLE near_miss_reports ADD COLUMN IF NOT EXISTS image_path TEXT DEFAULT NULL;

-- Add assigned_user_id column if it doesn't exist
ALTER TABLE near_miss_reports ADD COLUMN IF NOT EXISTS assigned_user_id CHAR(36) DEFAULT NULL;

-- Add assigned_user_name column if it doesn't exist
ALTER TABLE near_miss_reports ADD COLUMN IF NOT EXISTS assigned_user_name VARCHAR(255) DEFAULT NULL;

-- Add index for assigned_user_id if it doesn't exist
ALTER TABLE near_miss_reports ADD INDEX IF NOT EXISTS idx_near_miss_reports_assigned_user_id (assigned_user_id);

-- Add foreign key constraint for assigned_user_id
-- Note: This will fail if the constraint already exists, which is fine
-- You can ignore the error if it says "Duplicate key name" or similar
ALTER TABLE near_miss_reports
  ADD CONSTRAINT fk_near_miss_reports_assigned_user_id
  FOREIGN KEY (assigned_user_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Verify the changes
SELECT
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'near_miss_reports'
  AND COLUMN_NAME IN ('image_path', 'assigned_user_id', 'assigned_user_name');
