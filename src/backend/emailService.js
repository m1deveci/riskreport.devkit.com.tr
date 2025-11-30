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
 * Send near-miss report email to multiple recipients
 * @param {Array} recipients - Array of email addresses
 * @param {Object} reportData - Report data to include in email
 * @param {string} locationName - Location name for the report
 */
export async function sendNearMissReportEmail(recipients, reportData, locationName) {
  try {
    if (!transporter) {
      throw new Error('Email service not initialized. Please call initializeEmailService first.');
    }

    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients provided');
    }

    const mailOptions = {
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: recipients.join(','),
      subject: `Ramak Kala Bildirim - ${reportData.incident_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #d9534f; margin: 0 0 15px 0;">🚨 Yeni Ramak Kala Bildirimi</h2>
            <p style="margin: 5px 0; color: #666;">Lokasyon: <strong>${locationName}</strong></p>
            <p style="margin: 5px 0; color: #666;">Olay No: <strong>${reportData.incident_number}</strong></p>
          </div>

          <div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">Bildirim Detayları</h3>

            <div style="margin-bottom: 15px;">
              <p style="margin: 5px 0; font-weight: bold; color: #333;">Başlayan Kişi:</p>
              <p style="margin: 5px 0; color: #666;">${reportData.full_name}</p>
            </div>

            <div style="margin-bottom: 15px;">
              <p style="margin: 5px 0; font-weight: bold; color: #333;">İletişim:</p>
              <p style="margin: 5px 0; color: #666;">${reportData.phone || 'Belirtilmemiş'}</p>
            </div>

            <div style="margin-bottom: 15px;">
              <p style="margin: 5px 0; font-weight: bold; color: #333;">Kategori:</p>
              <p style="margin: 5px 0; color: #666;">${reportData.category}</p>
            </div>

            <div style="margin-bottom: 15px;">
              <p style="margin: 5px 0; font-weight: bold; color: #333;">Açıklama:</p>
              <p style="margin: 5px 0; color: #666; white-space: pre-wrap;">${reportData.description || '-'}</p>
            </div>

            <div style="margin-bottom: 15px;">
              <p style="margin: 5px 0; font-weight: bold; color: #333;">Bildirim Tarihi:</p>
              <p style="margin: 5px 0; color: #666;">${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}</p>
            </div>
          </div>

          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="margin: 0;">Lütfen <a href="https://riskreport.devkit.com.tr/#/logs" style="color: #0275d8; text-decoration: none; font-weight: bold;">Sistem Logları</a> sayfasında bu bildirim hakkında detaylı bilgileri görebilirsiniz.</p>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; margin: 10px 0;">
            Risk Report Sistemi - Ramak Kala Yönetimi
          </p>
        </div>
      `,
      text: `Yeni Ramak Kala Bildirimi\n\nOlay No: ${reportData.incident_number}\nLokasyon: ${locationName}\nBaşlayan Kişi: ${reportData.full_name}\nKategori: ${reportData.category}\n\nDetaylı bilgi için: https://riskreport.devkit.com.tr/#/logs`,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Near-miss report email sent to', recipients.length, 'recipients:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending near-miss report email:', error);
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
