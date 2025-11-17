/*
  # Ramak Kala (Near-Miss) Reporting System - Complete Database Schema

  ## Overview
  This migration creates a complete near-miss reporting system for occupational safety
  across multiple locations (factories/workplaces).

  ## New Tables Created

  ### 1. locations
  Stores information about different factories/workplaces
  - `id` (uuid, primary key)
  - `name` (text) - Location name
  - `description` (text) - Location description
  - `main_email` (text) - ISG/HSE email for notifications
  - `is_active` (boolean) - Active status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. regions
  Regions/areas within each location, each with unique QR code
  - `id` (uuid, primary key)
  - `location_id` (uuid, FK to locations)
  - `name` (text) - Region name
  - `description` (text)
  - `qr_code_token` (text, unique) - Unique token for QR code URL
  - `qr_code_url` (text) - Full public URL for QR code
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. isg_experts
  Safety officers/experts assigned to locations (max 5 per location)
  - `id` (uuid, primary key)
  - `location_id` (uuid, FK to locations)
  - `full_name` (text)
  - `email` (text)
  - `phone` (text)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. near_miss_reports
  Near-miss incident reports submitted via QR codes
  - `id` (uuid, primary key)
  - `incident_number` (text, unique) - Auto-generated code like "RK-2025-000123"
  - `location_id` (uuid, FK to locations)
  - `region_id` (uuid, FK to regions)
  - `full_name` (text) - Reporter name
  - `phone` (text) - Reporter phone
  - `category` (text) - Incident category
  - `description` (text) - Incident description
  - `status` (text) - Yeni/İnceleniyor/Kapatıldı
  - `internal_notes` (text) - Admin notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. users
  Admin panel users with role-based access
  - `id` (uuid, primary key, FK to auth.users)
  - `full_name` (text)
  - `email` (text, unique)
  - `role` (text) - admin/isg_expert/viewer
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. system_logs
  Audit trail for all system actions
  - `id` (uuid, primary key)
  - `user_id` (uuid, nullable, FK to users)
  - `action` (text) - Action type
  - `details` (jsonb) - Action details
  - `ip_address` (text)
  - `created_at` (timestamptz)

  ### 7. system_settings
  System-wide configuration (single row)
  - `id` (uuid, primary key)
  - `site_title` (text)
  - `smtp_host` (text)
  - `smtp_port` (integer)
  - `smtp_username` (text)
  - `smtp_password` (text)
  - `smtp_from_email` (text)
  - `backup_target_path` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Public access allowed for near_miss_reports insert (for QR code submissions)
  - Authenticated access required for all other operations
  - Role-based policies for admin operations

  ## Important Notes
  1. Each location's near-miss reports are kept in a single table with location_id filtering
  2. QR codes generate unique tokens for secure public submissions
  3. Incident numbers are auto-generated using sequence
  4. Max 5 active ISG experts per location (enforced via trigger)
  5. All timestamps use timestamptz for timezone awareness
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text DEFAULT '',
  main_email text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  qr_code_token text UNIQUE NOT NULL,
  qr_code_url text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ISG experts table
CREATE TABLE IF NOT EXISTS isg_experts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sequence for incident numbers
CREATE SEQUENCE IF NOT EXISTS incident_number_seq START 1;

-- Create near-miss reports table
CREATE TABLE IF NOT EXISTS near_miss_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_number text UNIQUE NOT NULL,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  region_id uuid NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  category text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'Yeni',
  internal_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create system logs table
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Create system settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_title text DEFAULT 'Ramak Kala Raporlama Sistemi',
  smtp_host text DEFAULT '',
  smtp_port integer DEFAULT 587,
  smtp_username text DEFAULT '',
  smtp_password text DEFAULT '',
  smtp_from_email text DEFAULT '',
  backup_target_path text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default system settings
INSERT INTO system_settings (id, site_title)
VALUES (uuid_generate_v4(), 'Ramak Kala Raporlama Sistemi')
ON CONFLICT DO NOTHING;

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_regions_updated_at ON regions;
CREATE TRIGGER update_regions_updated_at
  BEFORE UPDATE ON regions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_isg_experts_updated_at ON isg_experts;
CREATE TRIGGER update_isg_experts_updated_at
  BEFORE UPDATE ON isg_experts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_near_miss_reports_updated_at ON near_miss_reports;
CREATE TRIGGER update_near_miss_reports_updated_at
  BEFORE UPDATE ON near_miss_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to enforce max 5 active ISG experts per location
CREATE OR REPLACE FUNCTION check_isg_experts_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.is_active = true THEN
    SELECT COUNT(*)
    INTO active_count
    FROM isg_experts
    WHERE location_id = NEW.location_id
      AND is_active = true
      AND id != COALESCE(NEW.id, uuid_generate_v4());
    
    IF active_count >= 5 THEN
      RAISE EXCEPTION 'Bir lokasyonda maksimum 5 aktif İSG uzmanı olabilir';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ISG experts limit
DROP TRIGGER IF EXISTS enforce_isg_experts_limit ON isg_experts;
CREATE TRIGGER enforce_isg_experts_limit
  BEFORE INSERT OR UPDATE ON isg_experts
  FOR EACH ROW
  EXECUTE FUNCTION check_isg_experts_limit();

-- Create function to generate incident number
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num integer;
  year_str text;
BEGIN
  IF NEW.incident_number IS NULL OR NEW.incident_number = '' THEN
    next_num := nextval('incident_number_seq');
    year_str := to_char(now(), 'YYYY');
    NEW.incident_number := 'RK-' || year_str || '-' || lpad(next_num::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for incident number generation
DROP TRIGGER IF EXISTS generate_incident_number_trigger ON near_miss_reports;
CREATE TRIGGER generate_incident_number_trigger
  BEFORE INSERT ON near_miss_reports
  FOR EACH ROW
  EXECUTE FUNCTION generate_incident_number();

-- Enable Row Level Security
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE isg_experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE near_miss_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for locations
CREATE POLICY "Authenticated users can view locations"
  ON locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert locations"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin users can update locations"
  ON locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin users can delete locations"
  ON locations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- RLS Policies for regions
CREATE POLICY "Public can view active regions for QR code validation"
  ON regions FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all regions"
  ON regions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert regions"
  ON regions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'isg_expert')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin users can update regions"
  ON regions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'isg_expert')
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'isg_expert')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin users can delete regions"
  ON regions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- RLS Policies for ISG experts
CREATE POLICY "Authenticated users can view ISG experts"
  ON isg_experts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert ISG experts"
  ON isg_experts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'isg_expert')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin users can update ISG experts"
  ON isg_experts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'isg_expert')
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'isg_expert')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin users can delete ISG experts"
  ON isg_experts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- RLS Policies for near-miss reports
CREATE POLICY "Public can insert near-miss reports via QR code"
  ON near_miss_reports FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view near-miss reports"
  ON near_miss_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can update near-miss reports"
  ON near_miss_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'isg_expert')
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'isg_expert')
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin users can delete near-miss reports"
  ON near_miss_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- RLS Policies for users
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
    )
  );

CREATE POLICY "Admin users can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin users can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin users can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- RLS Policies for system logs
CREATE POLICY "Authenticated users can view system logs"
  ON system_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'isg_expert')
      AND users.is_active = true
    )
  );

CREATE POLICY "Authenticated users can insert system logs"
  ON system_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for system settings
CREATE POLICY "Authenticated users can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can update system settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_regions_location_id ON regions(location_id);
CREATE INDEX IF NOT EXISTS idx_regions_qr_code_token ON regions(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_isg_experts_location_id ON isg_experts(location_id);
CREATE INDEX IF NOT EXISTS idx_near_miss_reports_location_id ON near_miss_reports(location_id);
CREATE INDEX IF NOT EXISTS idx_near_miss_reports_region_id ON near_miss_reports(region_id);
CREATE INDEX IF NOT EXISTS idx_near_miss_reports_incident_number ON near_miss_reports(incident_number);
CREATE INDEX IF NOT EXISTS idx_near_miss_reports_created_at ON near_miss_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_near_miss_reports_status ON near_miss_reports(status);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);
