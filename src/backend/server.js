import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.BACKEND_PORT || 6000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(dirname(dirname(__dirname)) + '/dist'));

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1');
    connection.release();
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Locations Endpoints
app.get('/api/locations', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM locations WHERE is_active = true');
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/locations', async (req, res) => {
  try {
    const { name, description, main_email } = req.body;
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO locations (id, name, description, main_email) VALUES (UUID(), ?, ?, ?)',
      [name, description || '', main_email]
    );
    connection.release();
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Regions Endpoints
app.get('/api/regions/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM regions WHERE location_id = ? AND is_active = true',
      [locationId]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/regions', async (req, res) => {
  try {
    const { location_id, name, description, qr_code_token, qr_code_url } = req.body;
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO regions (id, location_id, name, description, qr_code_token, qr_code_url) VALUES (UUID(), ?, ?, ?, ?, ?)',
      [location_id, name, description || '', qr_code_token, qr_code_url]
    );
    connection.release();
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Near-Miss Reports Endpoints
app.get('/api/reports', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM near_miss_reports ORDER BY created_at DESC LIMIT 100'
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM near_miss_reports WHERE location_id = ? ORDER BY created_at DESC',
      [locationId]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const { location_id, region_id, full_name, phone, category, description } = req.body;
    const connection = await pool.getConnection();

    // Call the stored procedure to get next incident number
    const [result] = await connection.query(
      'CALL get_next_incident_number(@next_number)'
    );

    const [incidentData] = await connection.query('SELECT @next_number as incident_number');
    const incident_number = incidentData[0].incident_number;

    const [insertResult] = await connection.query(
      `INSERT INTO near_miss_reports
       (id, incident_number, location_id, region_id, full_name, phone, category, description)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
      [incident_number, location_id, region_id, full_name, phone, category, description || '']
    );

    connection.release();
    res.json({ success: true, incident_number, id: insertResult.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ISG Experts Endpoints
app.get('/api/experts/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM isg_experts WHERE location_id = ? AND is_active = true',
      [locationId]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/experts', async (req, res) => {
  try {
    const { location_id, full_name, email, phone } = req.body;
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO isg_experts (id, location_id, full_name, email, phone) VALUES (UUID(), ?, ?, ?, ?)',
      [location_id, full_name, email, phone]
    );
    connection.release();
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Users Endpoints
app.get('/api/users', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, full_name, email, role, is_active FROM users WHERE is_active = true'
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { full_name, email, role } = req.body;
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO users (id, full_name, email, role) VALUES (UUID(), ?, ?, ?)',
      [full_name, email, role || 'viewer']
    );
    connection.release();
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System Logs Endpoints
app.get('/api/logs', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 500'
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const { user_id, action, details, ip_address } = req.body;
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO system_logs (id, user_id, action, details, ip_address) VALUES (UUID(), ?, ?, ?, ?)',
      [user_id, action, JSON.stringify(details || {}), ip_address || '']
    );
    connection.release();
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System Settings Endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM system_settings LIMIT 1');
    connection.release();
    res.json(rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const { site_title, smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email, backup_target_path } = req.body;
    const connection = await pool.getConnection();

    const [result] = await connection.query(
      `UPDATE system_settings SET
       site_title = ?, smtp_host = ?, smtp_port = ?,
       smtp_username = ?, smtp_password = ?, smtp_from_email = ?,
       backup_target_path = ? WHERE id = (SELECT id FROM system_settings LIMIT 1)`,
      [site_title, smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email, backup_target_path]
    );

    connection.release();
    res.json({ success: true, changes: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all for SPA routing (serve index.html)
app.get('*', (req, res) => {
  res.sendFile(dirname(dirname(__dirname)) + '/dist/index.html', (err) => {
    if (err) {
      res.status(500).send('Error loading application');
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  Ramak Kala Reporting System (MySQL)   ║`);
  console.log(`║  Server running on port ${port}              ║`);
  console.log(`║  Database: ${process.env.MYSQL_DATABASE}                      ║`);
  console.log(`║  User: ${process.env.MYSQL_USER}                         ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
});
