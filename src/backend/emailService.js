import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;
let smtpConfig = null;

// Initialize transporter with config (to be called after SMTP settings are loaded)
export async function initializeEmailService(pool) {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email FROM system_settings LIMIT 1'
    );
    connection.release();

    if (rows.length === 0) {
      console.warn('SMTP settings not found in database, using env variables');
      smtpConfig = {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
        fromEmail: process.env.SMTP_FROM_EMAIL,
        fromName: process.env.SMTP_FROM_NAME || 'Risk Report System',
      };
    } else {
      const settings = rows[0];
      smtpConfig = {
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port) || 587,
        user: settings.smtp_username,
        pass: settings.smtp_password,
        fromEmail: settings.smtp_from_email,
        fromName: process.env.SMTP_FROM_NAME || 'Risk Report System',
      };
    }

    // Create transporter with loaded config
    transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });

    console.log('Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    return false;
  }
}

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User full name
 */
export async function sendPasswordResetEmail(email, resetToken, userName) {
  try {
    if (!transporter) {
      throw new Error('Email service not initialized. Please call initializeEmailService first.');
    }

    const resetLink = `${process.env.PASSWORD_RESET_LINK_BASE}/#/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: email,
      subject: 'Parola Sıfırlama - Risk Report Sistemi',
      html: `
        <div style="font-family: Arial, sans-serif; direction: ltr;">
          <h2 style="color: #333;">Parola Sıfırlama İsteği</h2>
          <p>Merhaba <strong>${userName}</strong>,</p>
          <p>Risk Report Sistemi'nde parolanızı sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
          <p style="margin: 20px 0;">
            <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Parolamı Sıfırla
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            Veya bu bağlantıyı tarayıcınıza yapıştırın:<br/>
            <code>${resetLink}</code>
          </p>
          <p style="color: #999; font-size: 12px;">
            Bu bağlantı 1 saat içinde geçerliliğini yitirecektir.
          </p>
          <p style="color: #999; font-size: 12px;">
            Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Risk Report Sistemi
          </p>
        </div>
      `,
      text: `Parolanızı sıfırlamak için bu bağlantıyı ziyaret edin: ${resetLink}\n\nBu bağlantı 1 saat içinde geçerliliğini yitirecektir.`,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('E-posta gönderme başarısız oldu');
  }
}

/**
 * Verify SMTP connection
 */
export async function verifyEmailConnection() {
  try {
    await transporter.verify();
    console.log('SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('SMTP connection failed:', error);
    return false;
  }
}
