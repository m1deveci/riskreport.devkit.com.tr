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

    const resetLink = `${process.env.PASSWORD_RESET_LINK_BASE}/reset-password?token=${resetToken}`;

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
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #2c3e50; margin: 0; padding: 0; background-color: #f5f7fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; margin: 0; padding: 0;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <!-- Main Container -->
                <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; margin: 0;">

                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #d32f2f 0%, #e53935 100%); padding: 40px 30px; text-align: center;">
                      <p style="margin: 0 0 10px 0; font-size: 13px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px;">🚨 Acil Bildirim</p>
                      <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: white;">Yeni Ramak Kala Bildirimi</h1>
                    </td>
                  </tr>

                  <!-- Location & Incident Info -->
                  <tr>
                    <td style="background: linear-gradient(90deg, #f5f7fa 0%, #ffffff 100%); padding: 25px 30px; border-bottom: 2px solid #f0f0f0;">
                      <table style="width: 100%; border-collapse: collapse; margin: 0;">
                        <tr>
                          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                            <p style="margin: 0; font-size: 12px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px;">📍 Lokasyon</p>
                            <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600; color: #2c3e50;">${locationName}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <p style="margin: 0; font-size: 12px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px;">🔢 Olay No</p>
                            <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600; color: #d32f2f; font-family: 'Courier New', monospace;">${reportData.incident_number}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Details Cards -->
                  <tr>
                    <td style="padding: 30px;">
                      <!-- Başlayan Kişi -->
                      <div style="margin-bottom: 20px; background: #fafbfc; padding: 15px; border-left: 4px solid #d32f2f; border-radius: 4px;">
                        <p style="margin: 0 0 8px 0; font-size: 11px; color: #95a5a6; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">👤 Başlayan Kişi</p>
                        <p style="margin: 0; font-size: 15px; color: #2c3e50; font-weight: 500;">${reportData.full_name}</p>
                      </div>

                      <!-- İletişim -->
                      <div style="margin-bottom: 20px; background: #fafbfc; padding: 15px; border-left: 4px solid #f39c12; border-radius: 4px; direction: ltr; text-align: left;">
                        <p style="margin: 0 0 8px 0; font-size: 11px; color: #95a5a6; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">📞 İletişim</p>
                        <p style="margin: 0; font-size: 15px; color: #2c3e50; font-weight: 500; font-family: 'Courier New', monospace;">${reportData.phone || 'Belirtilmemiş'}</p>
                      </div>

                      <!-- Kategori -->
                      <div style="margin-bottom: 20px; background: #fafbfc; padding: 15px; border-left: 4px solid #3498db; border-radius: 4px;">
                        <p style="margin: 0 0 8px 0; font-size: 11px; color: #95a5a6; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">📋 Kategori</p>
                        <p style="margin: 0; font-size: 15px; color: #2c3e50; font-weight: 500; background: #e8f4f8; padding: 8px 12px; border-radius: 4px; display: inline-block;">${reportData.category}</p>
                      </div>

                      <!-- Açıklama -->
                      <div style="margin-bottom: 20px; background: #fafbfc; padding: 15px; border-left: 4px solid #27ae60; border-radius: 4px;">
                        <p style="margin: 0 0 8px 0; font-size: 11px; color: #95a5a6; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">📝 Açıklama</p>
                        <p style="margin: 0; font-size: 14px; color: #34495e; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">${reportData.description || '-'}</p>
                      </div>

                      <!-- Tarih -->
                      <div style="background: #fafbfc; padding: 15px; border-left: 4px solid #9b59b6; border-radius: 4px;">
                        <p style="margin: 0 0 8px 0; font-size: 11px; color: #95a5a6; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">⏰ Bildirim Tarihi</p>
                        <p style="margin: 0; font-size: 15px; color: #2c3e50; font-weight: 500;">${new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })} - ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </td>
                  </tr>

                  <!-- CTA Section -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%); padding: 25px 30px; border-top: 2px solid #f0f0f0; text-align: center;">
                      <p style="margin: 0 0 15px 0; font-size: 14px; color: #2c3e50;">Detaylı bilgi ve yönetim için Sistem Logları sayfasını ziyaret edin:</p>
                      <a href="https://riskreport.devkit.com.tr/#/logs" style="display: inline-block; background: linear-gradient(135deg, #d32f2f 0%, #e53935 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);">
                        → Detayları Göster
                      </a>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #2c3e50; color: rgba(255,255,255,0.8); padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0 0 5px 0; font-size: 12px;">Risk Report Sistemi</p>
                      <p style="margin: 0; font-size: 11px; opacity: 0.7;">Ramak Kala (Near-Miss) Yönetim Platformu</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `,
      text: `Yeni Ramak Kala Bildirimi\n\nOlay No: ${reportData.incident_number}\nLokasyon: ${locationName}\nBaşlayan Kişi: ${reportData.full_name}\nİletişim: ${reportData.phone || 'Belirtilmemiş'}\nKategori: ${reportData.category}\nAçıklama: ${reportData.description || '-'}\n\nDetaylı bilgi için: https://riskreport.devkit.com.tr/#/logs`,
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
 * Send welcome email to newly created user with login credentials
 * @param {string} email - Recipient email address
 * @param {string} fullName - User's full name
 * @param {string} plainPassword - Plain text password (NOT hashed)
 * @param {Array} locationIds - Array of location IDs assigned to user
 * @param {Array} locationNames - Array of location names corresponding to IDs
 * @param {string} role - User role (admin, isg_expert, viewer)
 */
export async function sendWelcomeEmail(email, fullName, plainPassword, locationIds, locationNames, role) {
  try {
    if (!transporter) {
      throw new Error('Email service not initialized. Please call initializeEmailService first.');
    }

    const loginUrl = 'https://riskreport.devkit.com.tr';
    const roleDisplay = {
      'admin': 'Yönetici',
      'isg_expert': 'İSG Uzmanı',
      'viewer': 'Görüntüleyici'
    }[role] || role;

    const locationsList = locationNames && locationNames.length > 0
      ? locationNames.map((name, idx) => `<li style="margin: 5px 0; font-size: 14px; color: #2c3e50;"><strong>${name}</strong></li>`).join('')
      : '<li style="margin: 5px 0; font-size: 14px; color: #666;">Hiç lokasyon atanmamış</li>';

    const mailOptions = {
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: email,
      subject: 'Hoş Geldiniz - Risk Report Sistemi Hesap Bilgileriniz',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa; margin: 0; padding: 0;">
          <!-- Outer Wrapper -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <!-- Main Container -->
                <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: white;">🎉 Hoş Geldiniz!</h1>
                      <p style="margin: 10px 0 0 0; font-size: 16px; color: rgba(255,255,255,0.9);">Ramakkala Raporlama Sistemi'ni kullanmaya hazırsınız.</p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px 0; font-size: 16px; color: #2c3e50; line-height: 1.6;">
                        Merhaba <strong>${fullName}</strong>,
                      </p>
                      <p style="margin: 0 0 25px 0; font-size: 15px; color: #555; line-height: 1.6;">
                        Ramakkala Raporlama Sistemi'nde bir hesap oluşturulmuştur. Aşağıdaki bilgileri kullanarak sisteme giriş yapabilirsiniz.
                      </p>

                      <!-- Login Credentials Card -->
                      <div style="background: linear-gradient(135deg, #f0f4ff 0%, #f9fbff 100%); border: 2px solid #dbeafe; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                        <p style="margin: 0 0 15px 0; font-size: 13px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">📧 Giriş Bilgileri</p>

                        <!-- Email -->
                        <div style="margin-bottom: 15px;">
                          <label style="display: block; font-size: 12px; color: #7f8c8d; text-transform: uppercase; margin-bottom: 5px;">E-posta Adresi:</label>
                          <div style="background: white; padding: 12px; border-radius: 5px; border: 1px solid #e0e7ff; font-family: 'Courier New', monospace; font-size: 14px; color: #2c3e50; word-break: break-all;">
                            ${email}
                          </div>
                        </div>

                        <!-- Password -->
                        <div style="margin-bottom: 15px;">
                          <label style="display: block; font-size: 12px; color: #7f8c8d; text-transform: uppercase; margin-bottom: 5px;">Parola:</label>
                          <div style="background: white; padding: 12px; border-radius: 5px; border: 1px solid #e0e7ff; font-family: 'Courier New', monospace; font-size: 14px; color: #2c3e50; letter-spacing: 2px;">
                            ${plainPassword}
                          </div>
                          <p style="margin: 8px 0 0 0; font-size: 12px; color: #ef4444;">⚠️ Parolayı güvenli bir yerde saklayın ve başkasıyla paylaşmayın</p>
                        </div>

                        <!-- Role -->
                        <div>
                          <label style="display: block; font-size: 12px; color: #7f8c8d; text-transform: uppercase; margin-bottom: 5px;">Rol:</label>
                          <div style="background: #dbeafe; padding: 12px; border-radius: 5px; border: 1px solid #93c5fd; font-size: 14px; color: #1e40af; font-weight: 600;">
                            👤 ${roleDisplay}
                          </div>
                        </div>
                      </div>

                      <!-- Authorized Locations Card -->
                      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #f9fff8 100%); border: 2px solid #d1fae5; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                        <p style="margin: 0 0 15px 0; font-size: 13px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">📍 Yetkilendirilmiş Lokasyonlar</p>
                        <ul style="margin: 0; padding-left: 0; list-style: none;">
                          ${locationsList}
                        </ul>
                      </div>

                      <!-- Login Button -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: transform 0.2s;">
                          🔐 Sisteme Giriş Yap
                        </a>
                      </div>

                      <!-- Information -->
                      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 15px; margin-bottom: 25px;">
                        <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
                          <strong>ℹ️ Önemli:</strong> Ilk giriş yaptığınızda parolanızı değiştirmenizi tavsiye ederiz. Herhangi bir sorunla karşılaşırsanız sistem yöneticisine başvurunuz.
                        </p>
                      </div>

                      <!-- Login Instructions -->
                      <div style="background: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
                        <p style="margin: 0 0 12px 0; font-size: 13px; color: #7f8c8d; text-transform: uppercase; font-weight: 600;">Giriş Adımları:</p>
                        <ol style="margin: 0; padding-left: 20px; color: #2c3e50; font-size: 14px; line-height: 1.8;">
                          <li>Risk Report Sistemi'ne gidin</li>
                          <li>Yukarıdaki e-posta adresini girin</li>
                          <li>Yukarıdaki parolayı girin</li>
                          <li>"Giriş Yap" düğmesine tıklayın</li>
                          <li>Başarılı bir şekilde sisteme giriş yapacaksınız</li>
                        </ol>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; color: rgba(255,255,255,0.8); padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600;">Risk Report Sistemi</p>
                      <p style="margin: 0; font-size: 12px; opacity: 0.8;">Ramak Kala (Near-Miss) Yönetim Platformu</p>
                      <p style="margin: 10px 0 0 0; font-size: 11px; opacity: 0.6;">Bu e-posta, sistem yöneticisi tarafından otomatik olarak oluşturulmuştur.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `,
      text: `Hoş Geldiniz - Risk Report Sistemi\n\nMerhaba ${fullName},\n\nRisk Report Sistemi'nde bir hesap oluşturulmuştur. Aşağıdaki bilgileri kullanarak sisteme giriş yapabilirsiniz.\n\n--- GİRİŞ BİLGİLERİ ---\nE-posta: ${email}\nParola: ${plainPassword}\nRol: ${roleDisplay}\n\n--- YETKİLENDİRİLMİŞ LOKASYONLAR ---\n${locationNames && locationNames.length > 0 ? locationNames.join('\n') : 'Hiç lokasyon atanmamış'}\n\nGiriş URL'si: ${loginUrl}\n\nRisk Report Sistemi`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('[WELCOME_EMAIL] Welcome email sent to:', email, '- Message ID:', result.messageId);
    return result;
  } catch (error) {
    console.error('[WELCOME_EMAIL] Error sending welcome email:', error);
    throw new Error('Hoş geldiniz e-postası gönderilemedi');
  }
}

/**
 * Send password reset confirmation email with new credentials
 * @param {string} email - Recipient email address
 * @param {string} fullName - User's full name
 * @param {string} plainPassword - Plain text password (NOT hashed)
 */
export async function sendPasswordResetNotificationEmail(email, fullName, plainPassword) {
  try {
    if (!transporter) {
      throw new Error('Email service not initialized. Please call initializeEmailService first.');
    }

    const loginUrl = 'https://riskreport.devkit.com.tr';

    const mailOptions = {
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: email,
      subject: 'Parolanız Sıfırlandı - Risk Report Sistemi',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa; margin: 0; padding: 0;">
          <!-- Outer Wrapper -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <!-- Main Container -->
                <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: white;">🔑 Parolanız Sıfırlandı</h1>
                      <p style="margin: 10px 0 0 0; font-size: 16px; color: rgba(255,255,255,0.9);">Yeni giriş bilgilerinizi alabilirsiniz</p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px 0; font-size: 16px; color: #2c3e50; line-height: 1.6;">
                        Merhaba <strong>${fullName}</strong>,
                      </p>
                      <p style="margin: 0 0 25px 0; font-size: 15px; color: #555; line-height: 1.6;">
                        Parolanız sistem yöneticisi tarafından sıfırlanmıştır. Aşağıdaki yeni bilgileri kullanarak sisteme giriş yapabilirsiniz.
                      </p>

                      <!-- Login Credentials Card -->
                      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%); border: 2px solid #fcd34d; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                        <p style="margin: 0 0 15px 0; font-size: 13px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">📧 Yeni Giriş Bilgileri</p>

                        <!-- Email -->
                        <div style="margin-bottom: 15px;">
                          <label style="display: block; font-size: 12px; color: #92400e; text-transform: uppercase; margin-bottom: 5px;">E-posta Adresi:</label>
                          <div style="background: white; padding: 12px; border-radius: 5px; border: 1px solid #fbbf24; font-family: 'Courier New', monospace; font-size: 14px; color: #2c3e50; word-break: break-all;">
                            ${email}
                          </div>
                        </div>

                        <!-- Password -->
                        <div>
                          <label style="display: block; font-size: 12px; color: #92400e; text-transform: uppercase; margin-bottom: 5px;">Yeni Parola:</label>
                          <div style="background: white; padding: 12px; border-radius: 5px; border: 1px solid #fbbf24; font-family: 'Courier New', monospace; font-size: 14px; color: #2c3e50; letter-spacing: 2px; font-weight: 600;">
                            ${plainPassword}
                          </div>
                          <p style="margin: 8px 0 0 0; font-size: 12px; color: #ef4444;">⚠️ Parolayı güvenli bir yerde saklayın ve başkasıyla paylaşmayın</p>
                        </div>
                      </div>

                      <!-- Login Button -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); transition: transform 0.2s;">
                          🔐 Sisteme Giriş Yap
                        </a>
                      </div>

                      <!-- Security Warning -->
                      <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin-bottom: 25px;">
                        <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.6;">
                          <strong>⚠️ Güvenlik Notu:</strong> Ilk giriş yaptığınızda parolanızı hemen değiştirmenizi tavsiye ederiz. Bu parolayı başkası ile asla paylaşmayınız.
                        </p>
                      </div>

                      <!-- Information -->
                      <div style="background: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
                        <p style="margin: 0 0 12px 0; font-size: 13px; color: #7f8c8d; text-transform: uppercase; font-weight: 600;">Giriş Adımları:</p>
                        <ol style="margin: 0; padding-left: 20px; color: #2c3e50; font-size: 14px; line-height: 1.8;">
                          <li>Risk Report Sistemi'ne gidin</li>
                          <li>Yukarıdaki e-posta adresini girin</li>
                          <li>Yukarıdaki yeni parolayı girin</li>
                          <li>"Giriş Yap" düğmesine tıklayın</li>
                          <li>Başarılı bir şekilde sisteme giriş yapacaksınız</li>
                        </ol>
                      </div>

                      <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
                        Herhangi bir sorunla karşılaşırsanız sistem yöneticisine başvurunuz.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; color: rgba(255,255,255,0.8); padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600;">Risk Report Sistemi</p>
                      <p style="margin: 0; font-size: 12px; opacity: 0.8;">Ramak Kala (Near-Miss) Yönetim Platformu</p>
                      <p style="margin: 10px 0 0 0; font-size: 11px; opacity: 0.6;">Bu e-posta, sistem yöneticisi tarafından otomatik olarak oluşturulmuştur.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `,
      text: `Parolanız Sıfırlandı\n\nMerhaba ${fullName},\n\nParolanız sistem yöneticisi tarafından sıfırlanmıştır. Aşağıdaki yeni bilgileri kullanarak sisteme giriş yapabilirsiniz.\n\n--- YENİ GİRİŞ BİLGİLERİ ---\nE-posta: ${email}\nYeni Parola: ${plainPassword}\n\nGiriş URL'si: ${loginUrl}\n\nIlk giriş yaptığınızda parolanızı değiştirmenizi tavsiye ederiz.\n\nRisk Report Sistemi`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('[PASSWORD_RESET_NOTIFICATION] Email sent to:', email, '- Message ID:', result.messageId);
    return result;
  } catch (error) {
    console.error('[PASSWORD_RESET_NOTIFICATION] Error sending email:', error);
    throw new Error('Parola sıfırlama e-postası gönderilemedi');
  }
}

/**
 * Send report assignment notification email
 * @param {string} email - Recipient email address
 * @param {string} userName - User's full name
 * @param {Object} reportData - Report data
 * @param {string} locationName - Location name
 */
export async function sendReportAssignmentEmail(email, userName, reportData, locationName) {
  try {
    if (!transporter) {
      throw new Error('Email service not initialized. Please call initializeEmailService first.');
    }

    const reportUrl = `https://riskreport.devkit.com.tr/#/reports`;

    const mailOptions = {
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: email,
      subject: `Size Bir Rapor Atandı - ${reportData.incident_number}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa; margin: 0; padding: 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: white;">📋 Size Bir Rapor Atandı</h1>
                      <p style="margin: 10px 0 0 0; font-size: 16px; color: rgba(255,255,255,0.9);">Lütfen aşağıdaki raporu inceleyin ve gerekli işlemleri yapın</p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px 0; font-size: 16px; color: #2c3e50; line-height: 1.6;">
                        Merhaba <strong>${userName}</strong>,
                      </p>
                      <p style="margin: 0 0 25px 0; font-size: 15px; color: #555; line-height: 1.6;">
                        Size bir Ramak Kala ve Tehlike raporu atanmıştır. Lütfen raporun detaylarını aşağıda inceleyip gerekli işlemleri yapınız.
                      </p>

                      <!-- Report Details Card -->
                      <div style="background: linear-gradient(135deg, #f0f4ff 0%, #f9fbff 100%); border: 2px solid #dbeafe; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                        <p style="margin: 0 0 15px 0; font-size: 13px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">📄 Rapor Bilgileri</p>

                        <div style="margin-bottom: 15px;">
                          <label style="display: block; font-size: 12px; color: #7f8c8d; text-transform: uppercase; margin-bottom: 5px;">Olay Numarası:</label>
                          <div style="background: white; padding: 12px; border-radius: 5px; border: 1px solid #e0e7ff; font-family: 'Courier New', monospace; font-size: 14px; color: #2c3e50; font-weight: 600;">
                            ${reportData.incident_number}
                          </div>
                        </div>

                        <div style="margin-bottom: 15px;">
                          <label style="display: block; font-size: 12px; color: #7f8c8d; text-transform: uppercase; margin-bottom: 5px;">Lokasyon:</label>
                          <div style="background: white; padding: 12px; border-radius: 5px; border: 1px solid #e0e7ff; font-size: 14px; color: #2c3e50;">
                            ${locationName}
                          </div>
                        </div>

                        <div style="margin-bottom: 15px;">
                          <label style="display: block; font-size: 12px; color: #7f8c8d; text-transform: uppercase; margin-bottom: 5px;">Kategori:</label>
                          <div style="background: #dbeafe; padding: 12px; border-radius: 5px; border: 1px solid #93c5fd; font-size: 14px; color: #1e40af; font-weight: 600;">
                            ${reportData.category}
                          </div>
                        </div>

                        <div>
                          <label style="display: block; font-size: 12px; color: #7f8c8d; text-transform: uppercase; margin-bottom: 5px;">Açıklama:</label>
                          <div style="background: white; padding: 12px; border-radius: 5px; border: 1px solid #e0e7ff; font-size: 14px; color: #2c3e50; line-height: 1.6;">
                            ${reportData.description || 'Açıklama girilmemiş'}
                          </div>
                        </div>
                      </div>

                      <!-- CTA Button -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <a href="${reportUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                          🔍 Raporu Görüntüle
                        </a>
                      </div>

                      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 15px;">
                        <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
                          <strong>ℹ️ Not:</strong> Bu raporu sisteme giriş yaptıktan sonra Raporlar sayfasında detaylı olarak inceleyebilirsiniz.
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; color: rgba(255,255,255,0.8); padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600;">Ramak Kala ve Tehlike Raporlama Sistemi</p>
                      <p style="margin: 0; font-size: 12px; opacity: 0.8;">Güvenli ve Sağlıklı Çalışma Ortamı İçin</p>
                      <p style="margin: 10px 0 0 0; font-size: 11px; opacity: 0.6;">Bu e-posta otomatik olarak oluşturulmuştur.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `,
      text: `Size Bir Rapor Atandı\n\nMerhaba ${userName},\n\nSize bir Ramak Kala ve Tehlike raporu atanmıştır.\n\n--- RAPOR BİLGİLERİ ---\nOlay Numarası: ${reportData.incident_number}\nLokasyon: ${locationName}\nKategori: ${reportData.category}\nAçıklama: ${reportData.description || 'Açıklama girilmemiş'}\n\nRaporu görüntülemek için: ${reportUrl}\n\nRamak Kala ve Tehlike Raporlama Sistemi`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('[REPORT_ASSIGNMENT] Email sent to:', email, '- Message ID:', result.messageId);
    return result;
  } catch (error) {
    console.error('[REPORT_ASSIGNMENT] Error sending email:', error);
    throw new Error('Rapor atama e-postası gönderilemedi');
  }
}

/**
 * Send report update notification to ISG Experts
 * @param {Array} recipients - Array of ISG Expert email addresses
 * @param {string} userName - User who made the changes
 * @param {Object} reportData - Report data
 * @param {Array} changes - Array of changes made
 * @param {string} locationName - Location name
 */
export async function sendReportUpdateNotification(recipients, userName, reportData, changes, locationName) {
  try {
    if (!transporter) {
      throw new Error('Email service not initialized. Please call initializeEmailService first.');
    }

    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients provided');
    }

    const changesHtml = changes.map(change => `
      <div style="background: #f3f4f6; padding: 12px; border-radius: 5px; margin-bottom: 10px;">
        <p style="margin: 0; font-size: 13px; color: #6b7280; font-weight: 600;">${change.field_display}</p>
        <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
          <span style="color: #ef4444; font-size: 14px;">${change.old_value || '-'}</span>
          <span style="color: #6b7280;">→</span>
          <span style="color: #10b981; font-size: 14px; font-weight: 600;">${change.new_value || '-'}</span>
        </div>
      </div>
    `).join('');

    const reportUrl = `https://riskreport.devkit.com.tr/#/reports`;

    const mailOptions = {
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: recipients.join(','),
      subject: `Rapor Güncellendi - ${reportData.incident_number}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa; margin: 0; padding: 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: white;">🔔 Rapor Güncellendi</h1>
                      <p style="margin: 10px 0 0 0; font-size: 16px; color: rgba(255,255,255,0.9);">Bir raporda değişiklik yapıldı</p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px 0; font-size: 16px; color: #2c3e50; line-height: 1.6;">
                        <strong>${userName}</strong> tarafından bir raporda değişiklik yapıldı.
                      </p>

                      <!-- Report Details Card -->
                      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%); border: 2px solid #fcd34d; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                        <p style="margin: 0 0 15px 0; font-size: 13px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">📄 Rapor Bilgileri</p>

                        <div style="margin-bottom: 15px;">
                          <label style="display: block; font-size: 12px; color: #92400e; text-transform: uppercase; margin-bottom: 5px;">Olay Numarası:</label>
                          <div style="background: white; padding: 12px; border-radius: 5px; border: 1px solid #fbbf24; font-family: 'Courier New', monospace; font-size: 14px; color: #2c3e50; font-weight: 600;">
                            ${reportData.incident_number}
                          </div>
                        </div>

                        <div style="margin-bottom: 15px;">
                          <label style="display: block; font-size: 12px; color: #92400e; text-transform: uppercase; margin-bottom: 5px;">Lokasyon:</label>
                          <div style="background: white; padding: 12px; border-radius: 5px; border: 1px solid #fbbf24; font-size: 14px; color: #2c3e50;">
                            ${locationName}
                          </div>
                        </div>

                        <div>
                          <label style="display: block; font-size: 12px; color: #92400e; text-transform: uppercase; margin-bottom: 5px;">Kategori:</label>
                          <div style="background: white; padding: 12px; border-radius: 5px; border: 1px solid #fbbf24; font-size: 14px; color: #2c3e50;">
                            ${reportData.category}
                          </div>
                        </div>
                      </div>

                      <!-- Changes Card -->
                      <div style="background: linear-gradient(135deg, #e0e7ff 0%, #f0f4ff 100%); border: 2px solid #818cf8; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                        <p style="margin: 0 0 15px 0; font-size: 13px; color: #3730a3; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">🔄 Yapılan Değişiklikler</p>
                        ${changesHtml}
                      </div>

                      <!-- CTA Button -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <a href="${reportUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
                          🔍 Raporu Görüntüle
                        </a>
                      </div>

                      <div style="background: #e0f2fe; border: 1px solid #7dd3fc; border-radius: 6px; padding: 15px;">
                        <p style="margin: 0; font-size: 13px; color: #075985; line-height: 1.6;">
                          <strong>ℹ️ Not:</strong> Bu değişiklikler rapor geçmişinde kayıt altına alınmıştır.
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; color: rgba(255,255,255,0.8); padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600;">Ramak Kala ve Tehlike Raporlama Sistemi</p>
                      <p style="margin: 0; font-size: 12px; opacity: 0.8;">İSG Yönetim Platformu</p>
                      <p style="margin: 10px 0 0 0; font-size: 11px; opacity: 0.6;">Bu e-posta otomatik olarak oluşturulmuştur.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `,
      text: `Rapor Güncellendi\n\n${userName} tarafından bir raporda değişiklik yapıldı.\n\n--- RAPOR BİLGİLERİ ---\nOlay Numarası: ${reportData.incident_number}\nLokasyon: ${locationName}\nKategori: ${reportData.category}\n\n--- YAPILAN DEĞİŞİKLİKLER ---\n${changes.map(c => `${c.field_display}: ${c.old_value || '-'} → ${c.new_value || '-'}`).join('\n')}\n\nRaporu görüntülemek için: ${reportUrl}\n\nRamak Kala ve Tehlike Raporlama Sistemi`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('[REPORT_UPDATE] Email sent to', recipients.length, 'ISG Experts:', result.messageId);
    return result;
  } catch (error) {
    console.error('[REPORT_UPDATE] Error sending email:', error);
    throw new Error('Rapor güncelleme e-postası gönderilemedi');
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
