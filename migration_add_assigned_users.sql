-- Migration: Add assigned user fields to near_miss_reports table
-- Date: 2026-01-12
-- Description: Adds assigned_user_id and assigned_user_name columns to support report assignment feature
-- Compatible with: MySQL 5.7+, MySQL 8.0+, MariaDB 10.2+

-- Create a temporary procedure to safely add columns
DELIMITER //

DROP PROCEDURE IF EXISTS AddAssignedUserColumns//

CREATE PROCEDURE AddAssignedUserColumns()
BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;

    -- Add image_path column if it doesn't exist
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'near_miss_reports'
        AND COLUMN_NAME = 'image_path'
    ) THEN
        ALTER TABLE near_miss_reports ADD COLUMN image_path TEXT DEFAULT NULL;
        SELECT 'Column image_path added successfully' as status;
    ELSE
        SELECT 'Column image_path already exists' as status;
    END IF;

    -- Add assigned_user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'near_miss_reports'
        AND COLUMN_NAME = 'assigned_user_id'
    ) THEN
        ALTER TABLE near_miss_reports ADD COLUMN assigned_user_id CHAR(36) DEFAULT NULL;
        SELECT 'Column assigned_user_id added successfully' as status;
    ELSE
        SELECT 'Column assigned_user_id already exists' as status;
    END IF;

    -- Add assigned_user_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'near_miss_reports'
        AND COLUMN_NAME = 'assigned_user_name'
    ) THEN
        ALTER TABLE near_miss_reports ADD COLUMN assigned_user_name VARCHAR(255) DEFAULT NULL;
        SELECT 'Column assigned_user_name added successfully' as status;
    ELSE
        SELECT 'Column assigned_user_name already exists' as status;
    END IF;

    -- Add index for assigned_user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'near_miss_reports'
        AND INDEX_NAME = 'idx_near_miss_reports_assigned_user_id'
    ) THEN
        ALTER TABLE near_miss_reports ADD INDEX idx_near_miss_reports_assigned_user_id (assigned_user_id);
        SELECT 'Index idx_near_miss_reports_assigned_user_id added successfully' as status;
    ELSE
        SELECT 'Index idx_near_miss_reports_assigned_user_id already exists' as status;
    END IF;

    -- Add foreign key constraint for assigned_user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'near_miss_reports'
        AND CONSTRAINT_NAME = 'fk_near_miss_reports_assigned_user_id'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE near_miss_reports
            ADD CONSTRAINT fk_near_miss_reports_assigned_user_id
            FOREIGN KEY (assigned_user_id)
            REFERENCES users(id)
            ON DELETE SET NULL;
        SELECT 'Foreign key constraint fk_near_miss_reports_assigned_user_id added successfully' as status;
    ELSE
        SELECT 'Foreign key constraint fk_near_miss_reports_assigned_user_id already exists' as status;
    END IF;

END//

DELIMITER ;

-- Execute the procedure
CALL AddAssignedUserColumns();

-- Drop the procedure after execution
DROP PROCEDURE IF EXISTS AddAssignedUserColumns;

-- Verify the changes
SELECT
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'near_miss_reports'
  AND COLUMN_NAME IN ('image_path', 'assigned_user_id', 'assigned_user_name')
ORDER BY ORDINAL_POSITION;

-- Show indexes
SELECT
  INDEX_NAME,
  COLUMN_NAME,
  SEQ_IN_INDEX,
  NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'near_miss_reports'
  AND INDEX_NAME = 'idx_near_miss_reports_assigned_user_id';

-- Show foreign key constraint
SELECT
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'near_miss_reports'
  AND CONSTRAINT_NAME = 'fk_near_miss_reports_assigned_user_id';

-- Migration completed successfully
SELECT '✅ Migration completed successfully!' as result;
