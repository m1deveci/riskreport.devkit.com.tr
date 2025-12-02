import express from 'express';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const createChatRouter = (pool, authenticateToken) => {
  const router = express.Router();

  // Multer configuration for file uploads
  const uploadsDir = path.join(dirname(dirname(dirname(__dirname))), 'uploads', 'messages');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  });

  // Get list of users to chat with (MUST BE BEFORE /:userId)
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [users] = await connection.execute(
        `SELECT DISTINCT u.id, u.full_name, u.email, u.last_login
         FROM users u
         WHERE u.id != ? AND u.is_active = TRUE
         ORDER BY u.full_name`,
        [req.user.id]
      );

      connection.release();
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  // Get messages between two users
  router.get('/:userId', authenticateToken, async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;

      const connection = await pool.getConnection();
      const [messages] = await connection.execute(
        `SELECT m.*,
                sender.full_name as sender_name,
                receiver.full_name as receiver_name
         FROM messages m
         JOIN users sender ON m.sender_id = sender.id
         JOIN users receiver ON m.receiver_id = receiver.id
         WHERE (m.sender_id = ? AND m.receiver_id = ?)
            OR (m.sender_id = ? AND m.receiver_id = ?)
         ORDER BY m.created_at ASC`,
        [currentUserId, userId, userId, currentUserId]
      );

      // Load reactions for each message
      for (let message of messages) {
        const [reactions] = await connection.execute(
          `SELECT mr.emoji, u.full_name as user_name, mr.user_id
           FROM message_reactions mr
           JOIN users u ON mr.user_id = u.id
           WHERE mr.message_id = ?`,
          [message.id]
        );
        message.reactions = reactions;
      }

      connection.release();
      res.json(messages);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  // Send message
  router.post('/send', authenticateToken, async (req, res) => {
    try {
      const { receiver_id, message } = req.body;

      if (!receiver_id || !message) {
        return res
          .status(400)
          .json({ error: 'Receiver ID and message are required' });
      }

      const connection = await pool.getConnection();
      const [result] = await connection.execute(
        `INSERT INTO messages (sender_id, receiver_id, message, created_at)
         VALUES (?, ?, ?, NOW())`,
        [req.user.id, receiver_id, message]
      );

      const [newMessage] = await connection.execute(
        `SELECT m.*,
                sender.full_name as sender_name,
                receiver.full_name as receiver_name
         FROM messages m
         JOIN users sender ON m.sender_id = sender.id
         JOIN users receiver ON m.receiver_id = receiver.id
         WHERE m.id = ?`,
        [result.insertId]
      );

      connection.release();
      res.json(newMessage[0]);
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Mark message as read
  router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [messageDetails] = await connection.execute(
        'SELECT sender_id, receiver_id FROM messages WHERE id = ?',
        [req.params.id]
      );

      if (messageDetails.length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Message not found' });
      }

      await connection.execute(
        `UPDATE messages
         SET is_read = TRUE, read_at = NOW()
         WHERE id = ? AND receiver_id = ?`,
        [req.params.id, req.user.id]
      );

      connection.release();
      res.json({ success: true });
    } catch (error) {
      console.error('Mark message as read error:', error);
      res.status(500).json({ error: 'Failed to mark message as read' });
    }
  });

  // Get unread message counts
  router.get('/unread/counts', authenticateToken, async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [counts] = await connection.execute(
        `SELECT sender_id, COUNT(*) as count
         FROM messages
         WHERE receiver_id = ? AND is_read = FALSE
         GROUP BY sender_id`,
        [req.user.id]
      );

      const unreadCounts = {};
      counts.forEach((row) => {
        unreadCounts[row.sender_id] = row.count;
      });

      connection.release();
      res.json(unreadCounts);
    } catch (error) {
      console.error('Get unread counts error:', error);
      res.status(500).json({ error: 'Failed to get unread counts' });
    }
  });

  // Delete message
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute(
        `DELETE FROM messages
         WHERE id = ? AND sender_id = ?`,
        [req.params.id, req.user.id]
      );

      if (result.affectedRows === 0) {
        connection.release();
        return res
          .status(404)
          .json({ error: 'Message not found or not authorized' });
      }

      connection.release();
      res.json({ success: true });
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  // Edit message
  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      const { message } = req.body;
      const messageId = req.params.id;

      const connection = await pool.getConnection();
      const [existing] = await connection.execute(
        'SELECT sender_id FROM messages WHERE id = ?',
        [messageId]
      );

      if (
        existing.length === 0 ||
        existing[0].sender_id !== req.user.id
      ) {
        connection.release();
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await connection.execute(
        'UPDATE messages SET message = ?, edited_at = NOW() WHERE id = ?',
        [message, messageId]
      );

      connection.release();
      res.json({ success: true });
    } catch (error) {
      console.error('Edit message error:', error);
      res.status(500).json({ error: 'Failed to edit message' });
    }
  });

  // Add reaction to message
  router.post('/:id/reaction', authenticateToken, async (req, res) => {
    try {
      const { emoji } = req.body;
      const messageId = req.params.id;

      const connection = await pool.getConnection();
      const [existing] = await connection.execute(
        'SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ?',
        [messageId, req.user.id]
      );

      if (existing.length > 0) {
        // Update existing reaction
        await connection.execute(
          'UPDATE message_reactions SET emoji = ? WHERE message_id = ? AND user_id = ?',
          [emoji, messageId, req.user.id]
        );
      } else {
        // Add new reaction
        await connection.execute(
          'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)',
          [messageId, req.user.id, emoji]
        );
      }

      connection.release();
      res.json({ success: true });
    } catch (error) {
      console.error('Add reaction error:', error);
      res.status(500).json({ error: 'Failed to add reaction' });
    }
  });

  // Remove reaction from message
  router.delete('/:id/reaction', authenticateToken, async (req, res) => {
    try {
      const connection = await pool.getConnection();
      await connection.execute(
        'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ?',
        [req.params.id, req.user.id]
      );

      connection.release();
      res.json({ success: true });
    } catch (error) {
      console.error('Remove reaction error:', error);
      res.status(500).json({ error: 'Failed to remove reaction' });
    }
  });

  // File upload endpoint
  router.post('/file', authenticateToken, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { receiverId } = req.body;
      if (!receiverId) {
        return res.status(400).json({ error: 'Receiver ID is required' });
      }

      const fileUrl = `/uploads/messages/${req.file.filename}`;
      const fileMessage = `[Dosya: ${req.file.originalname}] ${fileUrl}`;

      const connection = await pool.getConnection();
      const [result] = await connection.execute(
        `INSERT INTO messages (sender_id, receiver_id, message, message_type, created_at)
         VALUES (?, ?, ?, 'file', NOW())`,
        [req.user.id, receiverId, fileMessage]
      );

      const [newMessage] = await connection.execute(
        `SELECT m.*,
                sender.full_name as sender_name,
                receiver.full_name as receiver_name
         FROM messages m
         JOIN users sender ON m.sender_id = sender.id
         JOIN users receiver ON m.receiver_id = receiver.id
         WHERE m.id = ?`,
        [result.insertId]
      );

      connection.release();
      res.json(newMessage[0]);
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Typing indicator - start
  router.post('/typing/start', authenticateToken, async (req, res) => {
    try {
      const { receiverId } = req.body;
      if (!receiverId) {
        return res.status(400).json({ error: 'Receiver ID is required' });
      }

      const connection = await pool.getConnection();
      await connection.execute(
        `INSERT INTO typing_status (user_id, receiver_id, created_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE created_at = NOW()`,
        [req.user.id, receiverId]
      );

      connection.release();
      res.json({ success: true });
    } catch (error) {
      console.error('Start typing error:', error);
      res.status(500).json({ error: 'Failed to start typing' });
    }
  });

  // Typing indicator - stop
  router.post('/typing/stop', authenticateToken, async (req, res) => {
    try {
      const { receiverId } = req.body;
      if (!receiverId) {
        return res.status(400).json({ error: 'Receiver ID is required' });
      }

      const connection = await pool.getConnection();
      await connection.execute(
        'DELETE FROM typing_status WHERE user_id = ? AND receiver_id = ?',
        [req.user.id, receiverId]
      );

      connection.release();
      res.json({ success: true });
    } catch (error) {
      console.error('Stop typing error:', error);
      res.status(500).json({ error: 'Failed to stop typing' });
    }
  });

  // Check typing status
  router.get('/typing/status/:userId', authenticateToken, async (req, res) => {
    try {
      const { userId } = req.params;
      const connection = await pool.getConnection();
      const [result] = await connection.execute(
        `SELECT * FROM typing_status
         WHERE user_id = ? AND receiver_id = ?
         AND created_at > DATE_SUB(NOW(), INTERVAL 5 SECOND)`,
        [userId, req.user.id]
      );

      connection.release();
      res.json({ typing: result.length > 0 });
    } catch (error) {
      console.error('Check typing status error:', error);
      res.json({ typing: false });
    }
  });

  // Get online users with unread message counts
  router.get('/online/users-list', authenticateToken, async (req, res) => {
    try {
      const connection = await pool.getConnection();

      // Get all online users (active in last 1 minute) excluding current user
      const [onlineUsers] = await connection.execute(
        `SELECT u.id, u.full_name, u.email, u.profile_picture,
                us.is_online, us.last_activity,
                COALESCE(unread.unread_count, 0) as unread_count
         FROM users u
         LEFT JOIN user_sessions us ON u.id = us.user_id
         LEFT JOIN (
           SELECT sender_id, COUNT(*) as unread_count
           FROM messages
           WHERE receiver_id = ? AND is_read = FALSE
           GROUP BY sender_id
         ) unread ON u.id = unread.sender_id
         WHERE u.id != ? AND u.is_active = TRUE
         ORDER BY CASE WHEN us.is_online = TRUE THEN 0 ELSE 1 END,
                  unread.unread_count DESC,
                  u.full_name ASC`,
        [req.user.id, req.user.id]
      );

      connection.release();
      res.json(onlineUsers);
    } catch (error) {
      console.error('Get online users error:', error);
      res.status(500).json({ error: 'Failed to get online users' });
    }
  });

  // User heartbeat - update last_activity in user_sessions
  router.post('/heartbeat', authenticateToken, async (req, res) => {
    try {
      const connection = await pool.getConnection();

      await connection.execute(
        `UPDATE user_sessions
         SET last_activity = NOW()
         WHERE user_id = ?`,
        [req.user.id]
      );

      connection.release();
      res.json({ success: true });
    } catch (error) {
      console.error('Heartbeat error:', error);
      res.status(500).json({ error: 'Failed to update heartbeat' });
    }
  });

  // Get unread message summary (unread count per sender)
  router.get('/messages/unread/summary', authenticateToken, async (req, res) => {
    try {
      const connection = await pool.getConnection();

      const [counts] = await connection.execute(
        `SELECT sender_id, COUNT(*) as unread_count
         FROM messages
         WHERE receiver_id = ? AND is_read = FALSE
         GROUP BY sender_id`,
        [req.user.id]
      );

      const unreadSummary = {};
      counts.forEach((row) => {
        unreadSummary[row.sender_id] = row.unread_count;
      });

      connection.release();
      res.json(unreadSummary);
    } catch (error) {
      console.error('Get unread summary error:', error);
      res.status(500).json({ error: 'Failed to get unread summary' });
    }
  });

  // Batch mark messages as read from a specific sender
  router.put('/messages/batch-read', authenticateToken, async (req, res) => {
    try {
      const { sender_id } = req.body;

      if (!sender_id) {
        return res.status(400).json({ error: 'Sender ID is required' });
      }

      const connection = await pool.getConnection();

      const [result] = await connection.execute(
        `UPDATE messages
         SET is_read = TRUE, read_at = NOW()
         WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE`,
        [sender_id, req.user.id]
      );

      connection.release();
      res.json({ success: true, updated: result.affectedRows });
    } catch (error) {
      console.error('Batch read error:', error);
      res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  });

  return router;
};
