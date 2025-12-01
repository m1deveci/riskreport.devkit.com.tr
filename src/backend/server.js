import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { sendPasswordResetEmail, sendNearMissReportEmail, verifyEmailConnection, initializeEmailService } from './emailService.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.BACKEND_PORT || 6000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Ensure uploads directory exists
const uploadsDir = dirname(dirname(__dirname)) + '/uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const regionId = req.body.region_id || 'unknown';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const ext = file.originalname.split('.').pop();
    cb(null, `${regionId}-${timestamp}-${random}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Sadece görsel dosyaları yüklenebilir'));
    } else {
      cb(null, true);
    }
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(dirname(dirname(__dirname)) + '/dist'));
app.use('/uploads', express.static(uploadsDir));

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

// Admin veya ISG Expert Kontrolü Middleware'i
const adminOrExpert = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'isg_expert') {
    return res.status(403).json({ error: 'Bu işlem için yetki gereklidir' });
  }
  next();
};

// ==================== LOGGING HELPER ====================

// Sistem loglarına kayıt yapmak için yardımcı fonksiyon
async function logAction(userId, action, details = {}) {
  try {
    const connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO system_logs (id, user_id, action, details, ip_address) VALUES (UUID(), ?, ?, ?, ?)',
      [userId || null, action, JSON.stringify(details), '']
    );
    connection.release();
  } catch (error) {
    console.error('Logging hatası:', error);
    // Loglamanın başarısız olması işlemi durdurmamalı
  }
}

// Rapor değişiklik geçmişini kayıt etmek için yardımcı fonksiyon
async function recordReportHistory(reportId, userId, userName, action, fieldName, oldValue, newValue, description = null) {
  try {
    const connection = await pool.getConnection();
    await connection.query(
      `INSERT INTO report_history
       (id, report_id, changed_by_user_id, changed_by_user_name, action, field_name, old_value, new_value, change_description)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [reportId, userId, userName, action, fieldName, oldValue, newValue, description]
    );
    connection.release();
  } catch (error) {
    console.error('Rapor geçmiş kayıt hatası:', error);
    // Geçmiş kaydının başarısız olması işlemi durdurmamalı
  }
}

// ==================== TURNSTILE VERIFICATION ====================

// Cloudflare Turnstile token doğrulama
async function verifyTurnstile(token) {
  try {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      console.warn('TURNSTILE_SECRET_KEY ortam değişkeni ayarlanmamış');
      return false;
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    });

    if (!response.ok) {
      console.error('Turnstile doğrulama hatası:', response.status);
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Turnstile doğrulama hatası:', error);
    return false;
  }
}

// ==================== AUTH ENDPOINTS ====================

// Login Endpoint - JWT Token Oluştur
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, turnstileToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gereklidir' });
    }

    // Turnstile doğrulaması
    if (turnstileToken) {
      const isTurnstileValid = await verifyTurnstile(turnstileToken);
      if (!isTurnstileValid) {
        return res.status(400).json({ error: 'Turnstile doğrulaması başarısız oldu. Lütfen tekrar deneyin.' });
      }
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, full_name, email, password_hash, role, is_active, location_ids FROM users WHERE email = ? AND is_active = true',
      [email]
    );
    connection.release();

    if (rows.length === 0) {
      // Başarısız giriş denemesini logla
      await logAction(null, 'LOGIN_FAILED', { email, reason: 'Email bulunamadı' });
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    const user = rows[0];

    // Şifreyi bcrypt ile kontrol et
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      // Başarısız giriş denemesini logla
      await logAction(null, 'LOGIN_FAILED', { email, reason: 'Şifre hatalı' });
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    // Update last_login
    const updateConnection = await pool.getConnection();
    await updateConnection.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );
    updateConnection.release();

    // Parse location_ids from JSON
    let locationIds = [];
    try {
      locationIds = typeof user.location_ids === 'string'
        ? JSON.parse(user.location_ids)
        : (user.location_ids || []);
    } catch (e) {
      locationIds = [];
    }

    // JWT Token Oluştur
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        location_ids: locationIds
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Başarılı girişi logla
    await logAction(user.id, 'LOGIN_SUCCESS', { email: user.email, full_name: user.full_name });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        location_ids: locationIds
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Logout Endpoint
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    // Logout'ı logla
    await logAction(req.user.id, 'LOGOUT', { email: req.user.email, full_name: req.user.full_name });
    res.json({ success: true, message: 'Başarıyla çıkış yapıldı' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
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
      'SELECT id, full_name, email, role, is_active, location_ids, created_at, last_login FROM users'
    );
    connection.release();

    // Parse location_ids JSON for each user
    const usersWithParsedLocations = rows.map((user) => {
      let locationIds = [];
      try {
        locationIds = typeof user.location_ids === 'string'
          ? JSON.parse(user.location_ids)
          : (user.location_ids || []);
      } catch (e) {
        locationIds = [];
      }
      return { ...user, location_ids: locationIds };
    });

    res.json(usersWithParsedLocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create User (Admin Only)
app.post('/api/users', authenticateToken, adminOrExpert, async (req, res) => {
  try {
    const { full_name, email, password, role, location_ids } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
    }

    // ISG Expert permission checks
    if (req.user.role === 'isg_expert') {
      // ISG Expert cannot create admin users
      if (role === 'admin') {
        await logAction(req.user.id, 'CREATE_USER_FAILED', { email, reason: 'isg_expert cannot create admin users' });
        return res.status(403).json({ error: 'İSG Uzmanları admin kullanıcı oluşturamazlar' });
      }

      // ISG Expert can only assign users to their own locations
      if (!location_ids || location_ids.length === 0) {
        await logAction(req.user.id, 'CREATE_USER_FAILED', { email, reason: 'no locations specified' });
        return res.status(400).json({ error: 'En az bir lokasyon seçiniz' });
      }

      // Verify all locations belong to isg_expert
      const userLocations = req.user.location_ids || [];
      const invalidLocations = location_ids.filter(locId => !userLocations.includes(locId));
      if (invalidLocations.length > 0) {
        await logAction(req.user.id, 'CREATE_USER_FAILED', { email, reason: 'unauthorized locations' });
        return res.status(403).json({ error: 'Sadece kendi lokasyonlarınıza kullanıcı atayabilirsiniz' });
      }
    }

    // Şifreyi bcrypt ile hash'le
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const id = randomUUID();

    // Prepare location_ids as JSON
    const locationIdsJson = JSON.stringify(location_ids || []);

    const connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO users (id, full_name, email, password_hash, role, is_active, location_ids) VALUES (?, ?, ?, ?, ?, true, ?)',
      [id, full_name, email, password_hash, role || 'viewer', locationIdsJson]
    );
    connection.release();

    // Log successful user creation
    await logAction(req.user.id, 'CREATE_USER', { email, full_name, role });

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      id
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
    const { full_name, email, role, is_active, location_ids } = req.body;

    // Prepare location_ids as JSON if provided
    const locationIdsJson = location_ids ? JSON.stringify(location_ids) : undefined;

    const connection = await pool.getConnection();

    const updates = [];
    const values = [];

    if (full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(full_name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }
    if (locationIdsJson !== undefined) {
      updates.push('location_ids = ?');
      values.push(locationIdsJson);
    }

    values.push(id);

    if (updates.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'Güncellenecek alan yok' });
    }

    const [result] = await connection.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
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

    // Log successful deletion
    await logAction(req.user.id, 'DELETE_USER', { user_id: id });

    res.json({ success: true, message: 'Kullanıcı silindi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset User Password Manually (Admin or ISG Expert)
app.put('/api/users/:id/password', authenticateToken, adminOrExpert, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
    }

    // ISG Expert permission check - can only reset password for users in their assigned locations
    if (req.user.role === 'isg_expert') {
      const connection = await pool.getConnection();
      const [userRows] = await connection.query(
        'SELECT location_ids FROM users WHERE id = ?',
        [id]
      );
      connection.release();

      if (userRows.length === 0) {
        await logAction(req.user.id, 'RESET_PASSWORD_FAILED', { user_id: id, reason: 'user not found' });
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }

      const targetUserLocations = userRows[0].location_ids
        ? (typeof userRows[0].location_ids === 'string' ? JSON.parse(userRows[0].location_ids) : userRows[0].location_ids)
        : [];

      const requestUserLocations = req.user.location_ids || [];

      // Check if target user has at least one location in common with request user
      const hasCommonLocation = targetUserLocations.some(locId => requestUserLocations.includes(locId));
      if (!hasCommonLocation) {
        await logAction(req.user.id, 'RESET_PASSWORD_FAILED', { user_id: id, reason: 'unauthorized location' });
        return res.status(403).json({ error: 'Bu kullanıcının şifresini sıfırlama yetkisi yoktur' });
      }
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [password_hash, id]
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Log successful password reset
    await logAction(req.user.id, 'RESET_PASSWORD', { user_id: id });

    res.json({ success: true, message: 'Parola başarıyla değiştirildi' });
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
    const id = randomUUID();
    const connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO locations (id, name, description, main_email) VALUES (?, ?, ?, ?)',
      [id, name, description || '', main_email]
    );
    connection.release();
    res.json({ success: true, id });
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

// Get All Regions
app.get('/api/regions', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM regions WHERE is_active = true');
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Regions by Location ID
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
    const id = randomUUID();
    const connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO regions (id, location_id, name, description, qr_code_token, qr_code_url) VALUES (?, ?, ?, ?, ?, ?)',
      [id, location_id, name, description || '', qr_code_token, qr_code_url]
    );
    connection.release();
    res.json({ success: true, id });
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

    // Build dynamic UPDATE query based on provided fields
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (qr_code_url !== undefined) {
      updates.push('qr_code_url = ?');
      values.push(qr_code_url);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }

    if (updates.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'Güncellenecek alan yok' });
    }

    values.push(id); // Add id for WHERE clause

    const [result] = await connection.query(
      `UPDATE regions SET ${updates.join(', ')} WHERE id = ?`,
      values
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

app.get('/api/reports', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Build query based on user role
    let query = `SELECT
      nmr.*,
      l.name as location_name,
      r.name as region_name
    FROM near_miss_reports nmr
    LEFT JOIN locations l ON nmr.location_id = l.id
    LEFT JOIN regions r ON nmr.region_id = r.id`;

    const params = [];

    // If user is not admin, filter by their assigned locations
    if (req.user.role !== 'admin') {
      // Parse location_ids from token
      const locationIds = req.user.location_ids || [];

      // If user has no assigned locations, return empty
      if (locationIds.length === 0) {
        connection.release();
        return res.json([]);
      }

      // Filter by location_ids
      const placeholders = locationIds.map(() => '?').join(',');
      query += ` WHERE nmr.location_id IN (${placeholders})`;
      params.push(...locationIds);
    }

    query += ` ORDER BY nmr.created_at DESC LIMIT 100`;

    const [rows] = await connection.query(query, params);
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
      `SELECT
        nmr.*,
        l.name as location_name,
        r.name as region_name
      FROM near_miss_reports nmr
      LEFT JOIN locations l ON nmr.location_id = l.id
      LEFT JOIN regions r ON nmr.region_id = r.id
      WHERE nmr.location_id = ? ORDER BY nmr.created_at DESC`,
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
    const { location_id, region_id, full_name, phone, category, description, image_path, turnstileToken } = req.body;

    if (!location_id || !region_id || !full_name || !category) {
      return res.status(400).json({ error: 'Gerekli alanlar eksik' });
    }

    // Turnstile doğrulaması
    if (turnstileToken) {
      const isTurnstileValid = await verifyTurnstile(turnstileToken);
      if (!isTurnstileValid) {
        return res.status(400).json({ error: 'Turnstile doğrulaması başarısız oldu. Lütfen tekrar deneyin.' });
      }
    }

    const connection = await pool.getConnection();

    // Check rate limiting - 1 report per 5 minutes per region
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [recentReports] = await connection.query(
      'SELECT id FROM near_miss_reports WHERE region_id = ? AND created_at >= ? LIMIT 1',
      [region_id, fiveMinutesAgo.toISOString().slice(0, 19).replace('T', ' ')]
    );

    if (recentReports.length > 0) {
      connection.release();
      return res.status(429).json({ error: 'Bu bölge için son 5 dakika içinde zaten bir rapor gönderilmiş. Lütfen daha sonra tekrar deneyin.' });
    }

    const id = randomUUID();
    const incidentNumber = `RK-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

    await connection.query(
      `INSERT INTO near_miss_reports
       (id, incident_number, location_id, region_id, full_name, phone, category, description, image_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, incidentNumber, location_id, region_id, full_name, phone || null, category, description || '', image_path || null]
    );

    // Get location information
    const [locationRows] = await connection.query(
      'SELECT name FROM locations WHERE id = ?',
      [location_id]
    );

    const locationName = locationRows.length > 0 ? locationRows[0].name : 'Bilinmeyen Lokasyon';

    // Get all isg_expert users assigned to this location
    const [experts] = await connection.query(
      `SELECT id, email, full_name FROM users
       WHERE role = 'isg_expert' AND is_active = true
       AND JSON_CONTAINS(COALESCE(location_ids, '[]'), JSON_QUOTE(?))`,
      [location_id]
    );

    const recipientEmails = experts.map(user => user.email);
    const recipientNames = experts.map(user => user.full_name);

    // Send emails to isg_expert users
    let emailSentCount = 0;
    if (recipientEmails.length > 0) {
      try {
        await sendNearMissReportEmail(recipientEmails, {
          incident_number: incidentNumber,
          full_name,
          phone,
          category,
          description
        }, locationName);
        emailSentCount = recipientEmails.length;
      } catch (emailError) {
        console.error('Failed to send near-miss report emails:', emailError);
        // Continue execution even if email sending fails
      }
    }

    // Rapor oluşturmayı logla (e-posta alıcıları hakkında bilgi ekle)
    await logAction(null, 'CREATE_NEARMISS', {
      incident_number: incidentNumber,
      location_id,
      location_name: locationName,
      region_id,
      reporter_name: full_name,
      category,
      phone: phone || 'Belirtilmemiş',
      email_recipients_count: emailSentCount,
      email_recipients: recipientNames.length > 0 ? recipientNames.join(', ') : 'Yok'
    });

    // Rapor oluşturma geçmişini kaydet (sistem tarafından oluşturuldu)
    await recordReportHistory(id, null, 'Sistem', 'CREATE', null, null, null,
      `Rapor oluşturuldu - Başlayan: ${full_name}, Kategori: ${category}`);

    connection.release();
    res.json({
      success: true,
      id,
      incident_number: incidentNumber,
      email_sent_to: emailSentCount
    });
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

    // Rapor güncellemeden önce eski değerleri al
    const [oldReportRows] = await connection.query(
      'SELECT status, internal_notes FROM near_miss_reports WHERE id = ?',
      [id]
    );

    if (oldReportRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Rapor bulunamadı' });
    }

    const oldReport = oldReportRows[0];
    const changes = [];

    // Durum değişikliğini takip et
    if (status !== undefined && status !== oldReport.status) {
      changes.push({
        field: 'status',
        old: oldReport.status,
        new: status,
        description: `Durum değiştirildi: ${oldReport.status} → ${status}`
      });
    }

    // Notlar değişikliğini takip et
    if (internal_notes !== undefined && internal_notes !== oldReport.internal_notes) {
      changes.push({
        field: 'internal_notes',
        old: oldReport.internal_notes || '',
        new: internal_notes || '',
        description: `Not eklendi/değiştirildi`
      });
    }

    // Rapor güncelle
    const [result] = await connection.query(
      'UPDATE near_miss_reports SET status = ?, internal_notes = ? WHERE id = ?',
      [status, internal_notes, id]
    );

    // Her değişiklik için geçmiş kaydı oluştur
    for (const change of changes) {
      await recordReportHistory(
        id,
        req.user.id,
        req.user.full_name,
        'UPDATE',
        change.field,
        change.old,
        change.new,
        change.description
      );
    }

    // Sistem loglarına kaydet
    if (changes.length > 0) {
      await logAction(req.user.id, 'UPDATE_REPORT', {
        report_id: id,
        user_name: req.user.full_name,
        changes: changes.map(c => c.description)
      });
    }

    connection.release();

    res.json({
      success: true,
      changes: result.affectedRows,
      changeCount: changes.length,
      changeDetails: changes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Report (Admin Only)
app.delete('/api/reports/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Get the report first to check for image
    const [reports] = await connection.query(
      'SELECT image_path FROM near_miss_reports WHERE id = ?',
      [id]
    );

    if (reports.length > 0 && reports[0].image_path) {
      try {
        const imagePath = dirname(dirname(__dirname)) + reports[0].image_path;
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (error) {
        console.error('Görsel silinirken hata oluştu:', error);
        // Continue with report deletion even if image deletion fails
      }
    }

    const [result] = await connection.query(
      'DELETE FROM near_miss_reports WHERE id = ?',
      [id]
    );
    connection.release();

    res.json({ success: true, message: 'Rapor başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Report History
app.get('/api/reports/:id/history', async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    const [history] = await connection.query(
      `SELECT id, report_id, changed_by_user_id, changed_by_user_name, action,
              field_name, old_value, new_value, change_description, created_at
       FROM report_history
       WHERE report_id = ?
       ORDER BY created_at DESC`,
      [id]
    );
    connection.release();

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ISG EXPERTS ENDPOINTS ====================

// Get All Experts (isg_expert role users)
app.get('/api/experts', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM users WHERE role = ? AND is_active = true', ['isg_expert']);
    connection.release();

    // Parse location_ids for each expert
    const expertsWithParsedLocations = rows.map((expert) => {
      let locationIds = [];
      try {
        locationIds = typeof expert.location_ids === 'string'
          ? JSON.parse(expert.location_ids)
          : (expert.location_ids || []);
      } catch (e) {
        locationIds = [];
      }
      return { ...expert, location_ids: locationIds };
    });

    res.json(expertsWithParsedLocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Experts by Location ID (returns isg_expert role users who have access to this location)
app.get('/api/experts/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM users WHERE role = ? AND is_active = true',
      ['isg_expert']
    );
    connection.release();

    // Filter experts who have access to this location
    const filteredExperts = rows.filter((expert) => {
      let locationIds = [];
      try {
        locationIds = typeof expert.location_ids === 'string'
          ? JSON.parse(expert.location_ids)
          : (expert.location_ids || []);
      } catch (e) {
        locationIds = [];
      }
      return locationIds.includes(locationId);
    }).map((expert) => {
      let locationIds = [];
      try {
        locationIds = typeof expert.location_ids === 'string'
          ? JSON.parse(expert.location_ids)
          : (expert.location_ids || []);
      } catch (e) {
        locationIds = [];
      }
      return { ...expert, location_ids: locationIds };
    });

    res.json(filteredExperts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/experts', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { location_ids, full_name, email, phone, password } = req.body;

    // Validate location_ids is an array
    if (!Array.isArray(location_ids) || location_ids.length === 0) {
      return res.status(400).json({ error: 'En az bir lokasyon seçilmelidir' });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
    }

    const id = randomUUID();
    const connection = await pool.getConnection();
    const locationIdsJson = JSON.stringify(location_ids);

    // Create isg_expert user directly in users table
    let password_hash = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      password_hash = await bcrypt.hash(password, salt);
    }

    await connection.query(
      'INSERT INTO users (id, full_name, email, password_hash, role, is_active, location_ids) VALUES (?, ?, ?, ?, ?, true, ?)',
      [id, full_name, email, password_hash, 'isg_expert', locationIdsJson]
    );

    connection.release();
    res.json({ success: true, id, message: 'İSG uzmanı başarıyla oluşturuldu' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update ISG Expert (Admin Only)
app.put('/api/experts/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, is_active, location_ids } = req.body;

    const connection = await pool.getConnection();

    const updates = [];
    const values = [];

    if (full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(full_name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }
    if (location_ids !== undefined) {
      if (!Array.isArray(location_ids) || location_ids.length === 0) {
        connection.release();
        return res.status(400).json({ error: 'En az bir lokasyon seçilmelidir' });
      }
      updates.push('location_ids = ?');
      values.push(JSON.stringify(location_ids));
    }

    values.push(id);

    if (updates.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'Güncellenecek alan yok' });
    }

    const [result] = await connection.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND role = ?`,
      [...values, 'isg_expert']
    );
    connection.release();

    res.json({ success: true, changes: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset ISG Expert Password Manually (Admin or Location Manager)
app.put('/api/isg-experts/:id/password', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const currentUser = req.user;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
    }

    const connection = await pool.getConnection();

    // Check if expert (isg_expert role user) exists and get their location_ids
    const [experts] = await connection.query('SELECT * FROM users WHERE id = ? AND role = ?', [id, 'isg_expert']);

    if (!experts || experts.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'İSG Uzmanı bulunamadı' });
    }

    const expert = experts[0];
    let expertLocations = [];
    try {
      expertLocations = typeof expert.location_ids === 'string'
        ? JSON.parse(expert.location_ids)
        : (expert.location_ids || []);
    } catch (e) {
      expertLocations = [];
    }

    // Check authorization: admin or location manager with access to expert's locations
    const isAdmin = currentUser.role === 'admin';
    const isLocationManager = expertLocations.some(locId =>
      (currentUser.location_ids || []).includes(locId)
    );

    if (!isAdmin && !isLocationManager) {
      connection.release();
      return res.status(403).json({ error: 'Bu uzmanın parolasını değiştirme yetkiniz yok' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Update password in users table
    await connection.query(
      'UPDATE users SET password_hash = ? WHERE id = ? AND role = ?',
      [password_hash, id, 'isg_expert']
    );

    connection.release();

    res.json({ success: true, message: 'Parola başarıyla değiştirildi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete ISG Expert (Admin Only)
app.delete('/api/experts/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    const [result] = await connection.query('DELETE FROM users WHERE id = ? AND role = ?', [id, 'isg_expert']);
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
    const { site_title, smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email, backup_target_path, logo_path, background_path, favicon_path } = req.body;
    const connection = await pool.getConnection();

    const [result] = await connection.query(
      `UPDATE system_settings SET
       site_title = ?, smtp_host = ?, smtp_port = ?,
       smtp_username = ?, smtp_password = ?, smtp_from_email = ?,
       backup_target_path = ?, logo_path = ?, background_path = ?, favicon_path = ?
       WHERE id = (SELECT id FROM system_settings LIMIT 1)`,
      [site_title, smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email, backup_target_path, logo_path, background_path, favicon_path]
    );

    connection.release();
    res.json({ success: true, changes: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== FILE UPLOAD ENDPOINTS ====================

// Upload Image Endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya bulunamadı' });
    }

    const filePath = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      path: filePath,
      filename: req.file.filename,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Asset Endpoint
app.delete('/api/settings/asset/:assetType', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { assetType } = req.params;

    // Validate asset type
    if (!['logo', 'background', 'favicon'].includes(assetType)) {
      return res.status(400).json({ error: 'Geçersiz dosya türü' });
    }

    const connection = await pool.getConnection();

    // Get current file path
    const [rows] = await connection.query(
      `SELECT ${assetType}_path FROM system_settings LIMIT 1`
    );

    if (rows.length > 0 && rows[0][`${assetType}_path`]) {
      const filePath = rows[0][`${assetType}_path`];
      const fullPath = dirname(dirname(__dirname)) + filePath;

      // Delete file from disk
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Update database
    const columnName = `${assetType}_path`;
    await connection.query(
      `UPDATE system_settings SET ${columnName} = '' WHERE id = (SELECT id FROM system_settings LIMIT 1)`
    );

    connection.release();
    res.json({ success: true, message: `${assetType} dosyası silindi` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BACKUP ENDPOINTS ====================

// Download Database Backup
app.get('/api/backup/download', authenticateToken, adminOnly, async (req, res) => {
  try {
    const execPromise = promisify(exec);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFileName = `riskreport_backup_${timestamp}.sql`;
    const backupFilePath = `/tmp/${backupFileName}`;

    // Build mysqldump command
    const mysqldumpCmd = `mysqldump -h ${process.env.MYSQL_HOST} -u ${process.env.MYSQL_USER} -p'${process.env.MYSQL_PASSWORD}' --single-transaction --quick --lock-tables=false ${process.env.MYSQL_DATABASE} > "${backupFilePath}"`;

    // Execute mysqldump
    await execPromise(mysqldumpCmd);

    // Check if file exists
    if (!fs.existsSync(backupFilePath)) {
      return res.status(500).json({ error: 'Yedek dosyası oluşturulamadı' });
    }

    // Log the action
    try {
      const logConnection = await pool.getConnection();
      await logConnection.query(
        'INSERT INTO system_logs (id, user_id, action, details, ip_address) VALUES (UUID(), ?, ?, ?, ?)',
        [req.user?.id || null, 'DOWNLOAD_BACKUP', JSON.stringify({ filename: backupFileName }), req.ip || null]
      );
      logConnection.release();
    } catch (logErr) {
      console.error('Failed to log backup action:', logErr);
    }

    // Send file to client
    res.download(backupFilePath, backupFileName, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      // Delete temp file after sending
      try {
        fs.unlinkSync(backupFilePath);
      } catch (unlinkErr) {
        console.error('Error deleting temp backup file:', unlinkErr);
      }
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: error.message || 'Yedek oluşturulurken bir hata oluştu' });
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

// ==================== PASSWORD RESET ENDPOINTS ====================

// Request Password Reset - Send reset link to email
app.post('/api/password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'E-posta adresi gereklidir' });
    }

    const connection = await pool.getConnection();

    // Check if user exists
    const [rows] = await connection.query(
      'SELECT id, full_name FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      connection.release();
      // Don't reveal if email exists for security reasons
      return res.json({ success: true, message: 'Eğer bu e-posta hesapla ilişkili bir hesap varsa, parola sıfırlama bağlantısı gönderildi' });
    }

    const user = rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + (parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY || 3600) * 1000));

    // Save token to database
    const tokenId = randomUUID();
    await connection.query(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, user.id, resetToken, expiresAt]
    );

    connection.release();

    // Send email
    try {
      await sendPasswordResetEmail(email, resetToken, user.full_name);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      return res.status(500).json({ error: 'E-posta gönderme başarısız oldu' });
    }

    res.json({
      success: true,
      message: 'Parola sıfırlama bağlantısı e-posta adresinize gönderildi'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Verify Reset Token and Reset Password
app.post('/api/password-reset/verify', async (req, res) => {
  try {
    console.log('[PASSWORD-RESET] Verify request received');
    const { token, newPassword } = req.body;
    console.log('[PASSWORD-RESET] Token length:', token?.length || 0);

    if (!token || !newPassword) {
      console.log('[PASSWORD-RESET] Missing token or password');
      return res.status(400).json({ error: 'Token ve yeni şifre gereklidir' });
    }

    if (newPassword.length < 6) {
      console.log('[PASSWORD-RESET] Password too short');
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
    }

    console.log('[PASSWORD-RESET] Getting database connection');
    const connection = await pool.getConnection();
    console.log('[PASSWORD-RESET] Connection established');

    // Check if token is valid and not expired
    console.log('[PASSWORD-RESET] Querying password_reset_tokens table');
    const [tokenRows] = await connection.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW() AND used_at IS NULL',
      [token]
    );
    console.log('[PASSWORD-RESET] Token query result:', tokenRows.length, 'rows found');

    if (tokenRows.length === 0) {
      console.log('[PASSWORD-RESET] Token not found or expired');
      connection.release();
      return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş token' });
    }

    const resetTokenRecord = tokenRows[0];
    console.log('[PASSWORD-RESET] Token found for user_id:', resetTokenRecord.user_id);

    // Hash new password
    console.log('[PASSWORD-RESET] Hashing new password');
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    console.log('[PASSWORD-RESET] Password hashed');

    // Update user password
    console.log('[PASSWORD-RESET] Updating user password');
    await connection.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [password_hash, resetTokenRecord.user_id]
    );
    console.log('[PASSWORD-RESET] User password updated');

    // Mark token as used
    console.log('[PASSWORD-RESET] Marking token as used');
    await connection.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',
      [resetTokenRecord.id]
    );
    console.log('[PASSWORD-RESET] Token marked as used');

    connection.release();
    console.log('[PASSWORD-RESET] Connection released');

    res.json({
      success: true,
      message: 'Parolanız başarıyla sıfırlandı. Lütfen yeni parolanızla giriş yapın.'
    });
    console.log('[PASSWORD-RESET] Success response sent');
  } catch (error) {
    console.error('[PASSWORD-RESET] Error:', error.message || error);
    console.error('[PASSWORD-RESET] Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Reset User Password (send reset email)
app.post('/api/password-reset/admin/:id', authenticateToken, adminOrExpert, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Check if user exists
    const [rows] = await connection.query(
      'SELECT id, email, full_name, location_ids FROM users WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      connection.release();
      await logAction(req.user.id, 'PASSWORD_RESET_FAILED', { user_id: id, reason: 'user not found' });
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const user = rows[0];

    // ISG Expert permission check - can only reset password for users in their assigned locations
    if (req.user.role === 'isg_expert') {
      const targetUserLocations = user.location_ids
        ? (typeof user.location_ids === 'string' ? JSON.parse(user.location_ids) : user.location_ids)
        : [];

      const requestUserLocations = req.user.location_ids || [];

      // Check if target user has at least one location in common with request user
      const hasCommonLocation = targetUserLocations.some(locId => requestUserLocations.includes(locId));
      if (!hasCommonLocation) {
        connection.release();
        await logAction(req.user.id, 'PASSWORD_RESET_FAILED', { user_id: id, reason: 'unauthorized location' });
        return res.status(403).json({ error: 'Bu kullanıcının şifresini sıfırlama yetkisi yoktur' });
      }
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + (parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY || 3600) * 1000));

    // Save token to database
    const tokenId = randomUUID();
    await connection.query(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, user.id, resetToken, expiresAt]
    );

    connection.release();

    // Send email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.full_name);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      return res.status(500).json({ error: 'E-posta gönderme başarısız oldu' });
    }

    // Log successful password reset request
    await logAction(req.user.id, 'PASSWORD_RESET_REQUEST', { user_id: id });

    res.json({
      success: true,
      message: 'Parola sıfırlama bağlantısı kullanıcının e-posta adresine gönderildi'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
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

// Initialize email service
await initializeEmailService(pool);

app.listen(port, '0.0.0.0', () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  Ramak Kala Reporting System (MySQL)   ║`);
  console.log(`║  Server running on port ${port}              ║`);
  console.log(`║  Database: ${process.env.MYSQL_DATABASE}                      ║`);
  console.log(`║  User: ${process.env.MYSQL_USER}                         ║`);
  console.log(`║  JWT Authentication: ✓ ENABLED         ║`);
  console.log(`║  Email Service: ✓ INITIALIZED          ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
});
