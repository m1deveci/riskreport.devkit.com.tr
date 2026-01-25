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
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { sendPasswordResetEmail, sendNearMissReportEmail, sendWelcomeEmail, verifyEmailConnection, initializeEmailService, sendPasswordResetNotificationEmail, sendReportAssignmentEmail, sendReportUpdateNotification } from './emailService.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(uploadsDir));
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

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/riskreport';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✓ MongoDB connected'))
  .catch((err) => {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  });

// ==================== MONGOOSE SCHEMAS ====================

// Message Schema for Direct Messaging
const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: String,
    required: true,
    index: true
  },
  receiverId: {
    type: String,
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true
  },
  is_read: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Create indexes for efficient querying
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, is_read: 1, createdAt: -1 });

// Register the Message model
const Message = mongoose.model('Message', messageSchema);

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

// ==================== LOGIN RATE LIMITING ====================

// In-memory store for login attempts
// Format: { ip: { attempts: number, lastAttempt: timestamp, blockedUntil: timestamp } }
const loginAttempts = new Map();

const MAX_LOGIN_ATTEMPTS = 3;
const BLOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const ATTEMPT_RESET_MS = 60 * 60 * 1000; // 1 hour

// Get client IP address (works with proxies)
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

// Check if IP is rate limited
function isIpRateLimited(ip) {
  const attempt = loginAttempts.get(ip);

  if (!attempt) {
    return false;
  }

  // Check if IP is currently blocked
  if (attempt.blockedUntil && Date.now() < attempt.blockedUntil) {
    return true;
  }

  // Reset attempts if block duration has expired
  if (attempt.blockedUntil && Date.now() >= attempt.blockedUntil) {
    loginAttempts.delete(ip);
    return false;
  }

  // Reset attempts if more than 1 hour has passed
  if (Date.now() - attempt.lastAttempt > ATTEMPT_RESET_MS) {
    loginAttempts.delete(ip);
    return false;
  }

  return false;
}

// Record failed login attempt
function recordFailedAttempt(ip) {
  const attempt = loginAttempts.get(ip) || { attempts: 0, lastAttempt: Date.now() };

  attempt.attempts += 1;
  attempt.lastAttempt = Date.now();

  // Block IP if max attempts exceeded
  if (attempt.attempts >= MAX_LOGIN_ATTEMPTS) {
    attempt.blockedUntil = Date.now() + BLOCK_DURATION_MS;
    console.log('[RATE_LIMIT] IP blocked after 3 failed attempts:', {
      ip,
      blockedUntil: new Date(attempt.blockedUntil).toISOString()
    });
  }

  loginAttempts.set(ip, attempt);
}

// Clear failed attempts for IP on successful login
function clearFailedAttempts(ip) {
  if (loginAttempts.has(ip)) {
    loginAttempts.delete(ip);
    console.log('[RATE_LIMIT] Failed attempts cleared for IP:', ip);
  }
}

// Helper function to determine if user is online
function isUserOnline(lastActivity) {
  if (!lastActivity) return false;
  const lastActivityTime = new Date(lastActivity).getTime();
  const currentTime = new Date().getTime();
  const fiveMinutesInMs = 5 * 60 * 1000;
  return (currentTime - lastActivityTime) < fiveMinutesInMs;
}

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
    const clientIp = getClientIp(req);

    // Check if IP is rate limited
    if (isIpRateLimited(clientIp)) {
      const attempt = loginAttempts.get(clientIp);
      const remainingMs = attempt.blockedUntil - Date.now();
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      console.warn('[RATE_LIMIT] Login attempt from blocked IP:', { clientIp, remainingSeconds });

      return res.status(429).json({
        error: `Çok fazla başarısız giriş denemesi. Lütfen ${Math.ceil(remainingSeconds / 60)} dakika sonra tekrar deneyin.`,
        attemptsBlocked: true,
        retryAfter: remainingSeconds
      });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gereklidir' });
    }

    // Turnstile doğrulaması
    if (turnstileToken) {
      const isTurnstileValid = await verifyTurnstile(turnstileToken);
      if (!isTurnstileValid) {
        recordFailedAttempt(clientIp);
        const attempt = loginAttempts.get(clientIp);
        return res.status(400).json({
          error: 'Turnstile doğrulaması başarısız oldu. Lütfen tekrar deneyin.',
          failedAttempts: attempt.attempts,
          maxAttempts: MAX_LOGIN_ATTEMPTS
        });
      }
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, full_name, email, password_hash, role, is_active, location_ids FROM users WHERE email = ? AND is_active = true',
      [email]
    );
    connection.release();

    if (rows.length === 0) {
      // Record failed attempt
      recordFailedAttempt(clientIp);
      const attempt = loginAttempts.get(clientIp);

      console.log('[LOGIN] Failed attempt - email not found:', { email, ip: clientIp, attempts: attempt.attempts });
      await logAction(null, 'LOGIN_FAILED', { email, reason: 'Email bulunamadı', ip: clientIp, attempts: attempt.attempts });

      return res.status(401).json({
        error: 'Email veya şifre hatalı',
        failedAttempts: attempt.attempts,
        maxAttempts: MAX_LOGIN_ATTEMPTS
      });
    }

    const user = rows[0];

    // Şifreyi bcrypt ile kontrol et
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      // Record failed attempt
      recordFailedAttempt(clientIp);
      const attempt = loginAttempts.get(clientIp);

      console.log('[LOGIN] Failed attempt - wrong password:', { email, ip: clientIp, attempts: attempt.attempts });
      await logAction(null, 'LOGIN_FAILED', { email, reason: 'Şifre hatalı', ip: clientIp, attempts: attempt.attempts });

      return res.status(401).json({
        error: 'Email veya şifre hatalı',
        failedAttempts: attempt.attempts,
        maxAttempts: MAX_LOGIN_ATTEMPTS
      });
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(clientIp);

    // Update last_login and create/update user session
    const updateConnection = await pool.getConnection();
    await updateConnection.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Create or update user session for online status tracking
    await updateConnection.query(
      `INSERT INTO user_sessions (user_id, is_online, last_activity, login_time)
       VALUES (?, true, NOW(), NOW())
       ON DUPLICATE KEY UPDATE is_online = true, last_activity = NOW()`,
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
    console.log('[LOGIN] Successful login:', { email, ip: clientIp });
    await logAction(user.id, 'LOGIN_SUCCESS', { email: user.email, full_name: user.full_name, ip: clientIp });

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
    console.error('[LOGIN] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout Endpoint
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    // Delete user session to mark as offline
    const connection = await pool.getConnection();
    await connection.query(
      'DELETE FROM user_sessions WHERE user_id = ?',
      [req.user.id]
    );
    connection.release();

    // Logout'ı logla
    await logAction(req.user.id, 'LOGOUT', { email: req.user.email, full_name: req.user.full_name });
    res.json({ success: true, message: 'Başarıyla çıkış yapıldı' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update User Activity Endpoint - Keeps user online status current
app.put('/api/auth/activity', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query(
      `UPDATE user_sessions
       SET last_activity = NOW(), is_online = true
       WHERE user_id = ?`,
      [req.user.id]
    );
    connection.release();

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating activity:', error);
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

// Get Users for Messaging (All authenticated users can see all active users)
// MUST be before /api/users (order matters in Express!)
app.get('/api/users/for-messaging', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.profile_picture,
        u.is_active,
        u.last_login,
        u.created_at,
        COALESCE(us.is_online, 0) as is_online,
        us.last_activity
      FROM users u
      LEFT JOIN user_sessions us ON u.id = us.user_id
      ORDER BY u.full_name ASC`
    );
    connection.release();

    // Format response for messaging
    const users = rows
      .filter((user) => user.id !== req.user.id) // Exclude current user
      .map((user) => {
        // Check if user is online: must have session AND last_activity within 5 minutes
        const lastActivity = user.last_activity || user.last_login;
        const isOnline = Boolean(user.is_online) && lastActivity &&
          (new Date() - new Date(lastActivity)) < 5 * 60 * 1000; // 5 minutes

        return {
          id: user.id,
          full_name: user.full_name,
          name: user.full_name,
          email: user.email,
          role: user.role,
          profile_picture: user.profile_picture,
          is_online: isOnline,
          last_activity: lastActivity,
          created_at: user.created_at
        };
      });

    res.json(users);
  } catch (error) {
    console.error('Error fetching messaging users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Users (Admin Only)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, full_name, email, role, is_active, location_ids, created_at, last_login FROM users'
    );
    connection.release();

    // Parse location_ids JSON for each user
    let usersWithParsedLocations = rows.map((user) => {
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

    // If user is ISG Expert, filter to show only users from their assigned locations
    if (req.user.role === 'isg_expert') {
      const expertLocationIds = req.user.location_ids || [];
      usersWithParsedLocations = usersWithParsedLocations.filter((user) => {
        // Always show users that have at least one location in common with expert's locations
        return user.location_ids.some((locId) => expertLocationIds.includes(locId));
      });
    }

    res.json(usersWithParsedLocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create User (Admin Only)
app.post('/api/users', authenticateToken, adminOrExpert, async (req, res) => {
  try {
    const { full_name, email, password, role, location_ids } = req.body;
    console.log('[CREATE_USER] User creation request received:', { email, full_name, role, locationCount: location_ids?.length || 0 });

    if (!full_name || !email || !password) {
      console.warn('[CREATE_USER] Missing required fields:', { full_name: !!full_name, email: !!email, password: !!password });
      return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
    }

    // ISG Expert permission checks
    if (req.user.role === 'isg_expert') {
      // ISG Expert can only create isg_expert users, not admin or viewer
      if (role !== 'isg_expert') {
        console.warn('[CREATE_USER] ISG Expert attempted to create non-expert user:', { email, role });
        await logAction(req.user.id, 'CREATE_USER_FAILED', { email, role, reason: 'isg_expert can only create isg_expert users' });
        return res.status(403).json({ error: 'Yalnızca İSG Uzmanı rolünde kullanıcı oluşturabilirsiniz' });
      }

      // ISG Expert can only assign users to their own locations
      if (!location_ids || location_ids.length === 0) {
        console.warn('[CREATE_USER] No locations specified for isg_expert user:', email);
        await logAction(req.user.id, 'CREATE_USER_FAILED', { email, reason: 'no locations specified' });
        return res.status(400).json({ error: 'En az bir lokasyon seçiniz' });
      }

      // Verify all locations belong to isg_expert
      const userLocations = req.user.location_ids || [];
      const invalidLocations = location_ids.filter(locId => !userLocations.includes(locId));
      if (invalidLocations.length > 0) {
        console.warn('[CREATE_USER] ISG Expert attempted unauthorized location assignment:', { email, invalidLocations });
        await logAction(req.user.id, 'CREATE_USER_FAILED', { email, reason: 'unauthorized locations' });
        return res.status(403).json({ error: 'Sadece kendi lokasyonlarınıza kullanıcı atayabilirsiniz' });
      }
    }

    // Şifreyi bcrypt ile hash'le
    console.log('[CREATE_USER] Hashing password for:', email);
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const id = randomUUID();

    // Prepare location_ids as JSON
    const locationIdsJson = JSON.stringify(location_ids || []);

    // Fetch location names for email
    let locationNames = [];
    if (location_ids && location_ids.length > 0) {
      const connection = await pool.getConnection();
      try {
        const [locations] = await connection.query(
          'SELECT id, name FROM locations WHERE id IN (?) AND is_active = true',
          [location_ids]
        );
        locationNames = locations.map(loc => loc.name);
        console.log('[CREATE_USER] Fetched location names:', locationNames);
      } finally {
        connection.release();
      }
    }

    // Insert user into database
    const dbConnection = await pool.getConnection();
    try {
      await dbConnection.query(
        'INSERT INTO users (id, full_name, email, password_hash, role, is_active, location_ids) VALUES (?, ?, ?, ?, ?, true, ?)',
        [id, full_name, email, password_hash, role || 'viewer', locationIdsJson]
      );
      console.log('[CREATE_USER] User inserted into database:', { id, email, role });
    } finally {
      dbConnection.release();
    }

    // Send welcome email with login credentials
    try {
      console.log('[CREATE_USER] Sending welcome email to:', email);
      await sendWelcomeEmail(email, full_name, password, location_ids || [], locationNames, role || 'viewer');
      console.log('[CREATE_USER] Welcome email sent successfully to:', email);

      // Log successful user creation with email sent
      await logAction(req.user.id, 'CREATE_USER', {
        email,
        full_name,
        role,
        locations: locationNames,
        email_sent: true
      });
    } catch (emailError) {
      console.error('[CREATE_USER] Failed to send welcome email:', emailError.message);

      // Log user creation but note email failure
      await logAction(req.user.id, 'CREATE_USER', {
        email,
        full_name,
        role,
        locations: locationNames,
        email_sent: false,
        email_error: emailError.message
      });

      // Still return success since user was created, but warn about email
      return res.json({
        success: true,
        message: 'Kullanıcı oluşturuldu ancak hoş geldiniz e-postası gönderilemedi',
        id,
        warning: 'E-posta gönderme başarısız oldu'
      });
    }

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu ve hoş geldiniz e-postası gönderildi',
      id
    });
  } catch (error) {
    console.error('[CREATE_USER] Error creating user:', error);
    await logAction(req.user?.id || 'system', 'CREATE_USER_ERROR', { error: error.message });
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

    // Fetch user details for email
    const connection = await pool.getConnection();
    const [userRows] = await connection.query(
      'SELECT email, full_name FROM users WHERE id = ?',
      [id]
    );

    if (userRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const user = userRows[0];

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [result] = await connection.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [password_hash, id]
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Send password reset notification email
    try {
      await sendPasswordResetNotificationEmail(user.email, user.full_name, password);
    } catch (emailError) {
      console.error('Failed to send password reset notification email:', emailError);
      // Don't fail the password reset if email fails to send
    }

    // Log successful password reset
    await logAction(req.user.id, 'RESET_PASSWORD', { user_id: id });

    res.json({ success: true, message: 'Parola başarıyla değiştirildi ve kullanıcıya e-posta gönderildi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== LOCATIONS ENDPOINTS ====================

// Get All Locations (Public - for QR code validation, authenticated users get filtered results)
app.get('/api/locations', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    let query = 'SELECT * FROM locations WHERE is_active = true';
    let params = [];

    // Check if request has authentication token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // If authenticated, verify token and filter by user role
      try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // ISG Expert: sadece kendi location_ids'lerine göre filtrele
        if (decoded.role === 'isg_expert') {
          const locationIds = decoded.location_ids || [];
          if (locationIds.length === 0) {
            connection.release();
            return res.json([]); // ISG Expert'in yetki alanında location yok
          }
          const placeholders = locationIds.map(() => '?').join(',');
          query += ` AND id IN (${placeholders})`;
          params = locationIds;
        }
      } catch (err) {
        // Token verification failed, but continue with public access
        console.warn('Token verification failed, using public access:', err.message);
      }
    }

    const [rows] = await connection.query(query, params);
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

// Get All Regions (Public - for QR code validation, authenticated users get filtered results)
app.get('/api/regions', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    let query = 'SELECT * FROM regions WHERE is_active = true';
    let params = [];

    // Check if request has authentication token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // If authenticated, verify token and filter by user role
      try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // ISG Expert: sadece kendi location_ids'lerine ait regions'ları göster
        if (decoded.role === 'isg_expert') {
          const locationIds = decoded.location_ids || [];
          if (locationIds.length === 0) {
            connection.release();
            return res.json([]);
          }
          const placeholders = locationIds.map(() => '?').join(',');
          query += ` AND location_id IN (${placeholders})`;
          params = locationIds;
        }
      } catch (err) {
        // Token verification failed, but continue with public access
        console.warn('Token verification failed, using public access:', err.message);
      }
    }

    const [rows] = await connection.query(query, params);
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Regions by Location ID
app.get('/api/regions/:locationId', authenticateToken, async (req, res) => {
  try {
    const { locationId } = req.params;

    // ISG Expert: sadece kendi location'larına erişebilir
    if (req.user.role === 'isg_expert') {
      const locationIds = req.user.location_ids || [];
      if (!locationIds.includes(locationId)) {
        return res.status(403).json({ error: 'Bu bölgeye erişme yetkisi yoktur' });
      }
    }

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

app.post('/api/regions', authenticateToken, adminOrExpert, async (req, res) => {
  try {
    const { location_id, name, description, qr_code_token, qr_code_url } = req.body;
    const id = randomUUID();

    // ISG Expert permission check - can only create regions for their assigned locations
    if (req.user.role === 'isg_expert') {
      const locationIds = req.user.location_ids || [];
      if (!locationIds.includes(location_id)) {
        return res.status(403).json({ error: 'Sadece kendi lokasyonlarınıza bölge ekleyebilirsiniz' });
      }
    }

    const connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO regions (id, location_id, name, description, qr_code_token, qr_code_url) VALUES (?, ?, ?, ?, ?, ?)',
      [id, location_id, name, description || '', qr_code_token, qr_code_url]
    );
    connection.release();

    // Log action
    await logAction(req.user.id, 'CREATE_REGION', { region_id: id, name, location_id });

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Region (Admin or ISG Expert)
app.put('/api/regions/:id', authenticateToken, adminOrExpert, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, qr_code_url, is_active } = req.body;

    const connection = await pool.getConnection();

    // Get region information for permission check
    const [regionRows] = await connection.query(
      'SELECT location_id FROM regions WHERE id = ?',
      [id]
    );

    if (regionRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Bölge bulunamadı' });
    }

    // ISG Expert permission check - can only update regions in their assigned locations
    if (req.user.role === 'isg_expert') {
      const locationIds = req.user.location_ids || [];
      if (!locationIds.includes(regionRows[0].location_id)) {
        connection.release();
        return res.status(403).json({ error: 'Bu bölgeyi düzenleme yetkisi yoktur' });
      }
    }

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

    // Log action
    await logAction(req.user.id, 'UPDATE_REGION', { region_id: id });

    connection.release();

    res.json({ success: true, changes: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Region (Admin or ISG Expert)
app.delete('/api/regions/:id', authenticateToken, adminOrExpert, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Get region information for permission check
    const [regionRows] = await connection.query(
      'SELECT location_id FROM regions WHERE id = ?',
      [id]
    );

    if (regionRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Bölge bulunamadı' });
    }

    // ISG Expert permission check - can only delete regions in their assigned locations
    if (req.user.role === 'isg_expert') {
      const locationIds = req.user.location_ids || [];
      if (!locationIds.includes(regionRows[0].location_id)) {
        connection.release();
        return res.status(403).json({ error: 'Bu bölgeyi silme yetkisi yoktur' });
      }
    }

    const [result] = await connection.query('DELETE FROM regions WHERE id = ?', [id]);

    // Log action
    await logAction(req.user.id, 'DELETE_REGION', { region_id: id });

    connection.release();

    res.json({ success: true, message: 'Bölge silindi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Increment region scan count (public endpoint - no auth required)
app.post('/api/regions/:id/increment-scan', async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Check if region exists and is active
    const [regionRows] = await connection.query(
      'SELECT id, is_active FROM regions WHERE id = ?',
      [id]
    );

    if (regionRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Bölge bulunamadı' });
    }

    if (!regionRows[0].is_active) {
      connection.release();
      return res.status(400).json({ error: 'Bu bölge aktif değil' });
    }

    // Increment scan count
    await connection.query(
      'UPDATE regions SET scan_count = scan_count + 1 WHERE id = ?',
      [id]
    );

    connection.release();

    res.json({ success: true, message: 'QR kod tarama sayısı güncellendi' });
  } catch (error) {
    console.error('Error incrementing scan count:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROFILE ENDPOINTS ====================

// Get current user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, full_name, email, role, location_ids FROM users WHERE id = ?',
      [req.user.id]
    );
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { full_name } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Ad Soyad zorunludur' });
    }

    const connection = await pool.getConnection();
    await connection.query(
      'UPDATE users SET full_name = ? WHERE id = ?',
      [full_name.trim(), req.user.id]
    );
    connection.release();

    // Log action
    await logAction(req.user.id, 'UPDATE_PROFILE', {
      action: 'profile_update',
      field: 'full_name',
    });

    res.json({ success: true, message: 'Profil güncellendi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
app.post('/api/profile/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Yeni parola en az 6 karakter olmalıdır' });
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!passwordMatch) {
      connection.release();
      await logAction(req.user.id, 'CHANGE_PASSWORD_FAILED', { reason: 'invalid current password' });
      return res.status(401).json({ error: 'Mevcut parola yanlış' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(new_password, salt);

    // Update password
    await connection.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, req.user.id]
    );
    connection.release();

    // Log action
    await logAction(req.user.id, 'CHANGE_PASSWORD', {
      success: true,
    });

    res.json({ success: true, message: 'Parola başarıyla değiştirildi' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload profile picture
app.post('/api/profile/upload-picture', authenticateToken, async (req, res) => {
  try {
    if (!req.body.imageData) {
      return res.status(400).json({ error: 'Resim verisi gerekli' });
    }

    // Convert base64 to buffer
    const imageData = req.body.imageData;
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return res.status(400).json({ error: 'Dosya boyutu 5 MB\'den küçük olmalıdır' });
    }

    const connection = await pool.getConnection();
    await connection.query(
      'UPDATE users SET profile_picture = ? WHERE id = ?',
      [buffer, req.user.id]
    );
    connection.release();

    // Log action
    await logAction(req.user.id, 'UPDATE_PROFILE', {
      action: 'profile_picture_upload',
    });

    res.json({ success: true, message: 'Profil fotoğrafı başarıyla yüklendi' });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get profile picture
app.get('/api/profile/picture/:userId', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT profile_picture FROM users WHERE id = ?',
      [req.params.userId]
    );
    connection.release();

    if (rows.length === 0 || !rows[0].profile_picture) {
      return res.status(404).json({ error: 'Profil fotoğrafı bulunamadı' });
    }

    res.set('Content-Type', 'image/jpeg');
    res.send(rows[0].profile_picture);
  } catch (error) {
    console.error('Profile picture fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== NEAR-MISS REPORTS ENDPOINTS ====================

app.get('/api/reports', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Fetch fresh user data from database to get current location_ids
    const [userRows] = await connection.query(
      'SELECT id, role, location_ids FROM users WHERE id = ?',
      [req.user.id]
    );

    if (userRows.length === 0) {
      connection.release();
      return res.json([]);
    }

    const user = userRows[0];

    // Parse location_ids properly (might be string or array)
    let locationIds = [];
    if (user.location_ids) {
      try {
        locationIds = typeof user.location_ids === 'string'
          ? JSON.parse(user.location_ids)
          : (Array.isArray(user.location_ids) ? user.location_ids : []);
      } catch (e) {
        locationIds = [];
      }
    }

    // Build query based on user role
    let query = `SELECT
      nmr.*,
      l.name as location_name,
      r.name as region_name
    FROM near_miss_reports nmr
    LEFT JOIN locations l ON nmr.location_id = l.id
    LEFT JOIN regions r ON nmr.region_id = r.id`;

    const params = [];

    // Role-based filtering
    if (user.role === 'viewer') {
      // Viewer: only see reports assigned to them
      query += ` WHERE nmr.assigned_user_id = ?`;
      params.push(user.id);
    } else if (user.role === 'isg_expert') {
      // ISG Expert: see reports from their assigned locations
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
    // Admin: see all reports (no WHERE clause)

    query += ` ORDER BY nmr.created_at DESC LIMIT 100`;

    const [rows] = await connection.query(query, params);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error getting reports:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get count of new reports for current user's locations
app.get('/api/reports/count/new', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Fetch fresh user data from database to get current location_ids
    const [userRows] = await connection.query(
      'SELECT id, role, location_ids FROM users WHERE id = ?',
      [req.user.id]
    );

    if (userRows.length === 0) {
      connection.release();
      return res.json({ count: 0 });
    }

    const user = userRows[0];

    // Parse location_ids properly (might be string or array)
    let locationIds = [];
    if (user.location_ids) {
      try {
        locationIds = typeof user.location_ids === 'string'
          ? JSON.parse(user.location_ids)
          : (Array.isArray(user.location_ids) ? user.location_ids : []);
      } catch (e) {
        locationIds = [];
      }
    }

    // Build query based on user role
    let query = `SELECT COUNT(*) as count FROM near_miss_reports WHERE status = 'Yeni'`;
    const params = [];

    // Role-based filtering
    if (user.role === 'viewer') {
      // Viewer: count only reports assigned to them
      query += ` AND assigned_user_id = ?`;
      params.push(user.id);
    } else if (user.role === 'isg_expert') {
      // ISG Expert: count reports from their assigned locations
      // If user has no assigned locations, return 0
      if (locationIds.length === 0) {
        connection.release();
        return res.json({ count: 0 });
      }

      // Filter by location_ids
      const placeholders = locationIds.map(() => '?').join(',');
      query += ` AND location_id IN (${placeholders})`;
      params.push(...locationIds);
    }
    // Admin: count all new reports (no additional WHERE clause)

    const [rows] = await connection.query(query, params);
    connection.release();
    res.json({ count: rows[0]?.count || 0 });
  } catch (error) {
    console.error('Error getting new reports count:', error);
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
app.put('/api/reports/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, internal_notes } = req.body;

    const connection = await pool.getConnection();

    // Rapor güncellemeden önce eski değerleri al
    const [oldReportRows] = await connection.query(
      'SELECT status, internal_notes, location_id, assigned_user_id FROM near_miss_reports WHERE id = ?',
      [id]
    );

    if (oldReportRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Rapor bulunamadı' });
    }

    // Check permissions: Admin can edit all, ISG Expert can edit reports from their locations, Viewer can edit assigned reports
    const oldReport = oldReportRows[0];
    if (req.user.role === 'admin') {
      // Admin can edit all reports
    } else if (req.user.role === 'isg_expert') {
      // ISG Expert can only edit reports from their assigned locations
      const userLocationIds = req.user.location_ids || [];
      if (!userLocationIds.includes(oldReport.location_id)) {
        connection.release();
        return res.status(403).json({ error: 'Bu rapora erişim izniniz yok' });
      }
    } else if (req.user.role === 'viewer') {
      // Viewer can only edit reports assigned to them
      if (oldReport.assigned_user_id !== req.user.id) {
        connection.release();
        return res.status(403).json({ error: 'Bu raporu düzenleme izniniz yok' });
      }
    } else {
      connection.release();
      return res.status(403).json({ error: 'Rapor düzenleme izniniz yok' });
    }

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

    // Get location name and report details for email
    const [locationRows] = await connection.query(
      'SELECT name FROM locations WHERE id = ?',
      [oldReport.location_id]
    );
    const locationName = locationRows.length > 0 ? locationRows[0].name : 'Bilinmeyen Lokasyon';

    // Get full report details for email
    const [reportRows] = await connection.query(
      'SELECT incident_number, category FROM near_miss_reports WHERE id = ?',
      [id]
    );
    const reportData = reportRows.length > 0 ? reportRows[0] : { incident_number: 'Bilinmiyor', category: 'Bilinmiyor' };

    connection.release();

    // Send email notification to ISG Experts if there are changes
    if (changes.length > 0) {
      try {
        const isgConnection = await pool.getConnection();

        // Get all isg_expert users assigned to this location
        const [experts] = await isgConnection.query(
          `SELECT email, full_name FROM users
           WHERE role = 'isg_expert' AND is_active = true
           AND JSON_CONTAINS(COALESCE(location_ids, '[]'), JSON_QUOTE(?))`,
          [oldReport.location_id]
        );

        isgConnection.release();

        const recipientEmails = experts.map(user => user.email);

        if (recipientEmails.length > 0) {
          // Prepare changes for email with display names
          const changesForEmail = changes.map(c => ({
            field_display: c.field === 'status' ? 'Durum' : 'İç Notlar',
            old_value: c.old || 'Boş',
            new_value: c.new || 'Boş'
          }));

          await sendReportUpdateNotification(
            recipientEmails,
            req.user.full_name,
            reportData,
            changesForEmail,
            locationName
          );
          console.log('[REPORT_UPDATE] Notification emails sent to', recipientEmails.length, 'ISG Experts');
        }
      } catch (emailError) {
        console.error('[REPORT_UPDATE] Failed to send notification emails:', emailError);
        // Don't fail the update if email fails
      }
    }

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
app.delete('/api/reports/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Get the report first to check for image and location
    const [reports] = await connection.query(
      'SELECT image_path, location_id FROM near_miss_reports WHERE id = ?',
      [id]
    );

    if (reports.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Rapor bulunamadı' });
    }

    // Check permissions: Admin can delete all, ISG Expert can delete reports from their locations
    const report = reports[0];
    if (req.user.role !== 'admin') {
      // ISG Expert can only delete reports from their assigned locations
      if (req.user.role === 'isg_expert') {
        const userLocationIds = req.user.location_ids || [];
        if (!userLocationIds.includes(report.location_id)) {
          connection.release();
          return res.status(403).json({ error: 'Bu rapora erişim izniniz yok' });
        }
      } else {
        connection.release();
        return res.status(403).json({ error: 'Rapor silme izniniz yok' });
      }
    }

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

// Assign Report to User
app.post('/api/reports/:id/assign', authenticateToken, adminOrExpert, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'Kullanıcı ID gereklidir' });
    }

    const connection = await pool.getConnection();

    // Get report details
    const [reports] = await connection.query(
      'SELECT * FROM near_miss_reports WHERE id = ?',
      [id]
    );

    if (reports.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Rapor bulunamadı' });
    }

    const report = reports[0];

    // Check permissions: Admin can assign all, ISG Expert can assign reports from their locations
    if (req.user.role !== 'admin') {
      if (req.user.role === 'isg_expert') {
        const userLocationIds = req.user.location_ids || [];
        if (!userLocationIds.includes(report.location_id)) {
          connection.release();
          return res.status(403).json({ error: 'Bu rapora erişim izniniz yok' });
        }
      } else {
        connection.release();
        return res.status(403).json({ error: 'Rapor atama izniniz yok' });
      }
    }

    // Get user details
    const [users] = await connection.query(
      'SELECT id, full_name, email, location_ids FROM users WHERE id = ?',
      [user_id]
    );

    if (users.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const user = users[0];

    // Get location name for email
    const [locations] = await connection.query(
      'SELECT name FROM locations WHERE id = ?',
      [report.location_id]
    );
    const locationName = locations.length > 0 ? locations[0].name : 'Bilinmeyen';

    // Update report with assigned user (if column exists, otherwise skip)
    try {
      await connection.query(
        'UPDATE near_miss_reports SET assigned_user_id = ?, assigned_user_name = ? WHERE id = ?',
        [user_id, user.full_name, id]
      );
    } catch (updateError) {
      // Column might not exist yet, log but continue
      console.log('Note: Could not update assigned_user fields (columns may not exist yet):', updateError.message);
    }

    // Record history
    await recordReportHistory(
      id,
      req.user.id,
      req.user.full_name,
      'ASSIGN',
      'assigned_user',
      null,
      user.full_name,
      `Rapor ${user.full_name} kullanıcısına atandı`
    );

    connection.release();

    // Send email notification
    try {
      await sendReportAssignmentEmail(user.email, user.full_name, {
        incident_number: report.incident_number,
        category: report.category,
        description: report.description,
      }, locationName);
      console.log('[REPORT_ASSIGNMENT] Email sent successfully to:', user.email);
    } catch (emailError) {
      console.error('[REPORT_ASSIGNMENT] Failed to send email:', emailError);
      // Don't fail the assignment if email fails
    }

    // Log action
    await logAction(req.user.id, 'ASSIGN_REPORT', {
      report_id: id,
      incident_number: report.incident_number,
      assigned_to: user.full_name,
      assigned_to_email: user.email,
    });

    res.json({
      success: true,
      message: 'Rapor başarıyla atandı ve kullanıcıya e-posta gönderildi',
    });
  } catch (error) {
    console.error('[REPORT_ASSIGNMENT] Error:', error);
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

    // First check if settings exist
    const [existing] = await connection.query('SELECT id FROM system_settings LIMIT 1');

    if (existing.length === 0) {
      // Insert new settings if none exist
      const [insertResult] = await connection.query(
        `INSERT INTO system_settings (id, site_title, smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email, backup_target_path, logo_path, background_path, favicon_path)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [site_title, smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email, backup_target_path, logo_path, background_path, favicon_path]
      );
      connection.release();
      res.json({ success: true, changes: 1, action: 'inserted' });
    } else {
      // Update existing settings
      const settingsId = existing[0].id;
      const [result] = await connection.query(
        `UPDATE system_settings SET
         site_title = ?, smtp_host = ?, smtp_port = ?,
         smtp_username = ?, smtp_password = ?, smtp_from_email = ?,
         backup_target_path = ?, logo_path = ?, background_path = ?, favicon_path = ?
         WHERE id = ?`,
        [site_title, smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email, backup_target_path, logo_path, background_path, favicon_path, settingsId]
      );
      connection.release();
      res.json({ success: true, changes: result.affectedRows, action: 'updated' });
    }
    // Re-initialize email service with new settings
    await initializeEmailService(pool);
    console.log('Email service re-initialized with new settings');
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// SMTP Test Endpoint
app.post('/api/settings/test-smtp', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email } = req.body;

    if (!smtp_host || !smtp_username || !smtp_password) {
      return res.status(400).json({ error: 'SMTP Host, kullanıcı adı ve şifre zorunludur' });
    }

    // Create a temporary transporter for testing
    const testTransporter = nodemailer.createTransport({
      host: smtp_host,
      port: parseInt(smtp_port) || 587,
      secure: false,
      auth: {
        user: smtp_username,
        pass: smtp_password,
      },
      connectionTimeout: 10000, // 10 seconds timeout
    });

    // Verify SMTP connection
    await testTransporter.verify();

    res.json({
      success: true,
      message: 'SMTP bağlantısı başarılı'
    });
  } catch (error) {
    console.error('SMTP test error:', error);

    let errorMessage = 'SMTP bağlantısı başarısız';
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'SMTP sunucusuna bağlanılamadı. Host ve port bilgilerini kontrol edin.';
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Kimlik doğrulama başarısız. Kullanıcı adı ve şifrenizi kontrol edin.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Bağlantı zaman aşımına uğradı. Sunucu erişilebilir durumda değil.';
    } else if (error.message) {
      errorMessage = `SMTP hatası: ${error.message}`;
    }

    res.status(400).json({ error: errorMessage });
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

// ==================== MESSAGING ENDPOINTS ====================

// Get conversation history between two users
app.get('/api/messages/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    res.json({
      conversationId,
      messages: messages.reverse(),
      total: await Message.countDocuments({ conversationId })
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get unread message count for current user
app.get('/api/messages/unread/count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total unread count for this user
    const unreadCount = await Message.countDocuments({
      receiverId: userId,
      is_read: false
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Get unread message count per conversation (for specific sender)
app.get('/api/messages/unread/:senderId', authenticateToken, async (req, res) => {
  try {
    const { senderId } = req.params;
    const receiverId = req.user.id;

    const unreadCount = await Message.countDocuments({
      senderId,
      receiverId,
      is_read: false
    });

    res.json({ unreadCount, senderId });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark messages as read in a conversation
app.put('/api/messages/:conversationId/read', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Mark all unread messages from other users in this conversation as read
    const result = await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        is_read: false
      },
      {
        $set: { is_read: true }
      }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Mark specific message as read
app.put('/api/messages/:messageId/mark-read', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await Message.findByIdAndUpdate(
      messageId,
      { $set: { is_read: true } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, message: result });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// ==================== SOCKET.IO HANDLERS ====================

// Helper function to generate conversation ID
function generateConversationId(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}

// Track connected users: { userId: socketId }
const connectedUsers = new Map();

// Socket connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join conversation room
  socket.on('join-conversation', (data) => {
    try {
      const { userId, targetUserId } = data;

      if (!userId || !targetUserId) {
        socket.emit('error', { message: 'User IDs are required' });
        return;
      }

      const conversationId = generateConversationId(userId, targetUserId);

      // Store user connection
      connectedUsers.set(userId, socket.id);

      // Join socket room
      socket.join(conversationId);
      socket.conversationId = conversationId;
      socket.userId = userId;
      socket.targetUserId = targetUserId;

      console.log(`User ${userId} joined conversation: ${conversationId}`);

      // Notify the other user that someone joined
      io.to(conversationId).emit('user-status-changed', {
        userId,
        status: 'online',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error joining conversation:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  });

  // Handle incoming messages
  socket.on('send-message', async (data) => {
    try {
      const { conversationId, senderId, receiverId, text } = data;

      if (!conversationId || !senderId || !receiverId || !text) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      // Save message to database
      const message = new Message({
        conversationId,
        senderId,
        receiverId,
        text
      });

      await message.save();

      // Broadcast message to conversation room
      io.to(conversationId).emit('message-received', {
        id: message._id,
        conversationId,
        senderId,
        receiverId,
        text,
        is_read: message.is_read,
        createdAt: message.createdAt,
        timestamp: new Date()
      });

      // Notify receiver that they have a new unread message (for UI updates)
      io.to(conversationId).emit('unread-message-received', {
        senderId,
        receiverId,
        conversationId
      });

      console.log(`Message sent in ${conversationId}: ${text.substring(0, 30)}...`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { conversationId, userId } = data;
    socket.to(conversationId).emit('user-typing', { userId, timestamp: new Date() });
  });

  // Handle stop typing
  socket.on('stop-typing', (data) => {
    const { conversationId, userId } = data;
    socket.to(conversationId).emit('user-stopped-typing', { userId, timestamp: new Date() });
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    const userId = socket.userId;
    const conversationId = socket.conversationId;

    if (userId && conversationId) {
      connectedUsers.delete(userId);
      io.to(conversationId).emit('user-status-changed', {
        userId,
        status: 'offline',
        timestamp: new Date()
      });
      console.log(`User ${userId} disconnected from ${conversationId}`);
    }

    console.log(`User disconnected: ${socket.id}`);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
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

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  Ramak Kala Reporting System (MySQL)    ║`);
  console.log(`║  Server running on port ${port}              ║`);
  console.log(`║  Database: ${process.env.MYSQL_DATABASE}                      ║`);
  console.log(`║  User: ${process.env.MYSQL_USER}                         ║`);
  console.log(`║  JWT Authentication: ✓ ENABLED         ║`);
  console.log(`║  Email Service: ✓ INITIALIZED          ║`);
  console.log(`║  Socket.io: ✓ ENABLED                  ║`);
  console.log(`║  MongoDB: ✓ CONNECTED                  ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
});
