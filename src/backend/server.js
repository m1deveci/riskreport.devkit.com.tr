import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.BACKEND_PORT || 6000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

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

// ==================== JWT MIDDLEWARE ====================

// JWT Token Doğrulama Middleware'i
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Token gereklidir' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token geçersiz veya süresi dolmuş' });
    }
    req.user = user;
    next();
  });
};

// Admin Kontrolü Middleware'i
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Yönetici yetkisi gereklidir' });
  }
  next();
};

// ==================== AUTH ENDPOINTS ====================

// Login Endpoint - JWT Token Oluştur
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gereklidir' });
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, full_name, email, password_hash, role, is_active FROM users WHERE email = ? AND is_active = true',
      [email]
    );
    connection.release();

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    const user = rows[0];

    // Şifreyi bcrypt ile kontrol et
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    // JWT Token Oluştur
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Logout Endpoint
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  // JWT'de logout için backend'de cache kullanılabilir
  // Şimdilik client tarafında token sil yeterli
  res.json({ success: true, message: 'Başarıyla çıkış yapıldı' });
});

// Token Doğrula Endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// ==================== USER ENDPOINTS ====================

// Get All Users (Admin Only)
app.get('/api/users', authenticateToken, adminOnly, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, full_name, email, role, is_active FROM users'
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create User (Admin Only)
app.post('/api/users', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
    }

    // Şifreyi bcrypt ile hash'le
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO users (id, full_name, email, password_hash, role, is_active) VALUES (UUID(), ?, ?, ?, ?, true)',
      [full_name, email, password_hash, role || 'viewer']
    );
    connection.release();

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      id: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update User (Admin Only)
app.put('/api/users/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, is_active } = req.body;

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'UPDATE users SET full_name = ?, email = ?, role = ?, is_active = ? WHERE id = ?',
      [full_name, email, role, is_active, id]
    );
    connection.release();

    res.json({ success: true, changes: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete User (Admin Only)
app.delete('/api/users/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    const [result] = await connection.query('DELETE FROM users WHERE id = ?', [id]);
    connection.release();

    res.json({ success: true, message: 'Kullanıcı silindi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== LOCATIONS ENDPOINTS ====================

// Get All Locations
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

// Create Location (Admin Only)
app.post('/api/locations', authenticateToken, adminOnly, async (req, res) => {
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

// Update Location (Admin Only)
app.put('/api/locations/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, main_email, is_active } = req.body;

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'UPDATE locations SET name = ?, description = ?, main_email = ?, is_active = ? WHERE id = ?',
      [name, description, main_email, is_active, id]
    );
    connection.release();

    res.json({ success: true, changes: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Location (Admin Only)
app.delete('/api/locations/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    const [result] = await connection.query('DELETE FROM locations WHERE id = ?', [id]);
    connection.release();

    res.json({ success: true, message: 'Lokasyon silindi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REGIONS ENDPOINTS ====================

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

app.post('/api/regions', authenticateToken, adminOnly, async (req, res) => {
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

// Update Region (Admin Only)
app.put('/api/regions/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, qr_code_url, is_active } = req.body;

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'UPDATE regions SET name = ?, description = ?, qr_code_url = ?, is_active = ? WHERE id = ?',
      [name, description, qr_code_url, is_active, id]
    );
    connection.release();

    res.json({ success: true, changes: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Region (Admin Only)
app.delete('/api/regions/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    const [result] = await connection.query('DELETE FROM regions WHERE id = ?', [id]);
    connection.release();

    res.json({ success: true, message: 'Bölge silindi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== NEAR-MISS REPORTS ENDPOINTS ====================

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

    const [result] = await connection.query(
      `INSERT INTO near_miss_reports
       (id, incident_number, location_id, region_id, full_name, phone, category, description)
       VALUES (UUID(), CONCAT('RK-', YEAR(NOW()), '-', LPAD(FLOOR(RAND() * 1000000), 6, '0')), ?, ?, ?, ?, ?, ?)`,
      [location_id, region_id, full_name, phone, category, description || '']
    );

    connection.release();
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Report Status and Notes (Admin Only)
app.put('/api/reports/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, internal_notes } = req.body;

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'UPDATE near_miss_reports SET status = ?, internal_notes = ? WHERE id = ?',
      [status, internal_notes, id]
    );
    connection.release();

    res.json({ success: true, changes: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ISG EXPERTS ENDPOINTS ====================

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

app.post('/api/experts', authenticateToken, adminOnly, async (req, res) => {
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

// Update ISG Expert (Admin Only)
app.put('/api/experts/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, is_active } = req.body;

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'UPDATE isg_experts SET full_name = ?, email = ?, phone = ?, is_active = ? WHERE id = ?',
      [full_name, email, phone, is_active, id]
    );
    connection.release();

    res.json({ success: true, changes: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete ISG Expert (Admin Only)
app.delete('/api/experts/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    const [result] = await connection.query('DELETE FROM isg_experts WHERE id = ?', [id]);
    connection.release();

    res.json({ success: true, message: 'İSG uzmanı silindi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SYSTEM LOGS ENDPOINTS ====================

app.get('/api/logs', authenticateToken, adminOnly, async (req, res) => {
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

// ==================== SYSTEM SETTINGS ENDPOINTS ====================

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

app.put('/api/settings', authenticateToken, adminOnly, async (req, res) => {
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

// ==================== HEALTH CHECK ====================

app.get('/api/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ==================== SPA ROUTING ====================

app.get('*', (req, res) => {
  res.sendFile(dirname(dirname(__dirname)) + '/dist/index.html', (err) => {
    if (err) {
      res.status(500).send('Error loading application');
    }
  });
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ==================== START SERVER ====================

app.listen(port, '0.0.0.0', () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  Ramak Kala Reporting System (MySQL)   ║`);
  console.log(`║  Server running on port ${port}              ║`);
  console.log(`║  Database: ${process.env.MYSQL_DATABASE}                      ║`);
  console.log(`║  User: ${process.env.MYSQL_USER}                         ║`);
  console.log(`║  JWT Authentication: ✓ ENABLED         ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
});
