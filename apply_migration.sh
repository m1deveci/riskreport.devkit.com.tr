#!/bin/bash

# Migration Script for Ramak Kala ve Tehlike Raporlama Sistemi
# This script applies the database migration to add assigned user fields

echo "=================================================="
echo "  Ramak Kala ve Tehlike Raporlama Sistemi"
echo "  Database Migration Tool"
echo "=================================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with database credentials."
    exit 1
fi

# Load environment variables
source .env

# Check if required variables are set
if [ -z "$MYSQL_HOST" ] || [ -z "$MYSQL_USER" ] || [ -z "$MYSQL_DATABASE" ]; then
    echo "❌ Error: Missing required environment variables!"
    echo "Please ensure MYSQL_HOST, MYSQL_USER, and MYSQL_DATABASE are set in .env"
    exit 1
fi

echo "📋 Database Configuration:"
echo "   Host: $MYSQL_HOST"
echo "   Database: $MYSQL_DATABASE"
echo "   User: $MYSQL_USER"
echo ""

# Prompt for password if not set in env
if [ -z "$MYSQL_PASSWORD" ]; then
    echo "Please enter MySQL password:"
    read -s MYSQL_PASSWORD
    echo ""
fi

# Backup database first
echo "🔄 Creating backup..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
mysqldump -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" > "$BACKUP_FILE" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Backup created: $BACKUP_FILE"
else
    echo "❌ Backup failed! Please check your credentials."
    exit 1
fi

echo ""
echo "🚀 Applying migration..."
echo ""

# Apply migration
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" < migration_add_assigned_users.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "🔍 Verifying changes..."

    # Verify the migration
    mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "
    SELECT
      COLUMN_NAME,
      DATA_TYPE,
      IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '$MYSQL_DATABASE'
      AND TABLE_NAME = 'near_miss_reports'
      AND COLUMN_NAME IN ('image_path', 'assigned_user_id', 'assigned_user_name');" 2>/dev/null

    echo ""
    echo "=================================================="
    echo "  ✅ Migration completed successfully!"
    echo "=================================================="
    echo ""
    echo "Backup file: $BACKUP_FILE"
    echo "Keep this backup in case you need to rollback."
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo "Your database has not been modified."
    echo "Backup is available at: $BACKUP_FILE"
    exit 1
fi
