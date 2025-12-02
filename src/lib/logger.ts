import { api } from './api';
import { getCurrentUser } from './auth';

export async function logAction(
  action: string,
  details: Record<string, unknown> = {},
  userId?: string
) {
  try {
    const currentUser = await getCurrentUser();

    await api.logs.create({
      user_id: userId || currentUser?.id || null,
      action,
      details,
      ip_address: null,
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}

export const LogActions = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  CREATE_LOCATION: 'CREATE_LOCATION',
  UPDATE_LOCATION: 'UPDATE_LOCATION',
  DELETE_LOCATION: 'DELETE_LOCATION',
  CREATE_REGION: 'CREATE_REGION',
  UPDATE_REGION: 'UPDATE_REGION',
  DELETE_REGION: 'DELETE_REGION',
  CREATE_ISG_EXPERT: 'CREATE_ISG_EXPERT',
  UPDATE_ISG_EXPERT: 'UPDATE_ISG_EXPERT',
  DELETE_ISG_EXPERT: 'DELETE_ISG_EXPERT',
  CREATE_NEARMISS: 'CREATE_NEARMISS',
  UPDATE_NEARMISS: 'UPDATE_NEARMISS',
  DELETE_NEARMISS: 'DELETE_NEARMISS',
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  DOWNLOAD_BACKUP: 'DOWNLOAD_BACKUP',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
} as const;

// Action açıklamaları ve Türkçe çeviriler
export const ActionDescriptions: Record<string, { tr: string; icon: string }> = {
  LOGIN_SUCCESS: { tr: 'Başarılı Giriş', icon: '✅' },
  LOGIN_FAILED: { tr: 'Başarısız Giriş Denemesi', icon: '❌' },
  LOGOUT: { tr: 'Çıkış Yapıldı', icon: '🚪' },
  CREATE_LOCATION: { tr: 'Lokasyon Oluşturuldu', icon: '📍' },
  UPDATE_LOCATION: { tr: 'Lokasyon Güncellendi', icon: '✏️' },
  DELETE_LOCATION: { tr: 'Lokasyon Silindi', icon: '🗑️' },
  CREATE_REGION: { tr: 'Bölge Oluşturuldu', icon: '🗺️' },
  UPDATE_REGION: { tr: 'Bölge Güncellendi', icon: '🔄' },
  DELETE_REGION: { tr: 'Bölge Silindi', icon: '🗑️' },
  CREATE_ISG_EXPERT: { tr: 'İSG Uzmanı Oluşturuldu', icon: '👤' },
  UPDATE_ISG_EXPERT: { tr: 'İSG Uzmanı Güncellendi', icon: '✏️' },
  DELETE_ISG_EXPERT: { tr: 'İSG Uzmanı Silindi', icon: '🗑️' },
  CREATE_NEARMISS: { tr: 'Ramak Kala Raporu Oluşturuldu', icon: '⚠️' },
  UPDATE_NEARMISS: { tr: 'Ramak Kala Raporu Güncellendi', icon: '✏️' },
  DELETE_NEARMISS: { tr: 'Ramak Kala Raporu Silindi', icon: '🗑️' },
  CREATE_USER: { tr: 'Kullanıcı Oluşturuldu', icon: '👥' },
  UPDATE_USER: { tr: 'Kullanıcı Güncellendi', icon: '✏️' },
  DELETE_USER: { tr: 'Kullanıcı Silindi', icon: '🗑️' },
  UPDATE_SETTINGS: { tr: 'Ayarlar Güncellendi', icon: '⚙️' },
  DOWNLOAD_BACKUP: { tr: 'Yedekleme İndirildi', icon: '💾' },
  UPDATE_PROFILE: { tr: 'Profil Güncellendi', icon: '👤' },
  CHANGE_PASSWORD: { tr: 'Parola Değiştirildi', icon: '🔐' },
};

// Detay özelleştiricisi - detay alanlarını Türkçe ve okunabilir hale getir
export function formatLogDetails(
  action: string,
  details: Record<string, unknown>,
  usersMap?: Record<string, string>
): string {
  const lines: string[] = [];

  // Genel alanları işle
  if (details.name) {
    lines.push(`🔹 Ad: ${details.name}`);
  }
  if (details.full_name) {
    lines.push(`🔹 Ad Soyad: ${details.full_name}`);
  }
  if (details.email) {
    lines.push(`🔹 E-posta: ${details.email}`);
  }
  if (details.role) {
    const roleMap: Record<string, string> = {
      admin: 'Admin',
      isg_expert: 'İSG Uzmanı',
      viewer: 'Görüntüleyici',
    };
    lines.push(`🔹 Rol: ${roleMap[details.role as string] || details.role}`);
  }

  // Action-spesifik detaylar
  if (action.includes('LOCATION')) {
    if (details.location_id) {
      lines.push(`🔹 Lokasyon ID: ${details.location_id}`);
    }
    if (details.description) {
      lines.push(`🔹 Açıklama: ${details.description}`);
    }
  }

  if (action.includes('REGION')) {
    if (details.region_id) {
      lines.push(`🔹 Bölge ID: ${details.region_id}`);
    }
    if (details.qr_token) {
      lines.push(`🔹 QR Token: ${(details.qr_token as string).substring(0, 20)}...`);
    }
  }

  if (action.includes('ISG_EXPERT')) {
    if (details.expert_id) {
      const expertEmail = usersMap?.[details.expert_id as string];
      if (expertEmail) {
        lines.push(`🔹 Uzman E-posta: ${expertEmail}`);
      } else {
        lines.push(`🔹 Uzman ID: ${details.expert_id}`);
      }
    }
    if (details.phone) {
      lines.push(`🔹 Telefon: ${details.phone}`);
    }
    if (details.action === 'password_reset') {
      lines.push(`🔹 İşlem: Parola Sıfırlama`);
    }
    if (details.action === 'manual_password_reset') {
      lines.push(`🔹 İşlem: Manuel Parola Sıfırlama`);
    }
  }

  if (action.includes('NEARMISS')) {
    if (details.incident_number) {
      lines.push(`🔹 Olay Numarası: ${details.incident_number}`);
    }
    if (details.reporter_name) {
      lines.push(`🔹 Bildirim Yapan: ${details.reporter_name}`);
    }
    if (details.category) {
      lines.push(`🔹 Kategori: ${details.category}`);
    }
    if (details.phone && details.phone !== 'Belirtilmemiş') {
      lines.push(`🔹 Telefon: ${details.phone}`);
    }
    if (details.location_id) {
      lines.push(`🔹 Lokasyon ID: ${details.location_id}`);
    }
    if (details.region_id) {
      lines.push(`🔹 Bölge ID: ${details.region_id}`);
    }
    if (details.status) {
      lines.push(`🔹 Durum: ${details.status}`);
    }
  }

  if (action.includes('USER')) {
    if (details.user_id) {
      const userEmail = usersMap?.[details.user_id as string];
      if (userEmail) {
        lines.push(`🔹 Kullanıcı E-posta: ${userEmail}`);
      } else {
        lines.push(`🔹 Kullanıcı ID: ${details.user_id}`);
      }
    }
    if (details.action === 'password_reset') {
      lines.push(`🔹 İşlem: Parola Sıfırlama Bağlantısı Gönderildi`);
    }
    if (details.action === 'manual_password_reset') {
      lines.push(`🔹 İşlem: Manuel Parola Değiştirildi`);
    }
  }

  if (action.includes('SETTINGS')) {
    if (details.site_title) {
      lines.push(`🔹 Site Başlığı: ${details.site_title}`);
    }
    if (details.changes) {
      const changes = details.changes as Record<string, unknown>;
      Object.entries(changes).forEach(([key, value]) => {
        lines.push(`🔹 ${key}: ${value}`);
      });
    }
  }

  if (action === 'UPDATE_PROFILE') {
    if (details.action === 'profile_update') {
      lines.push(`🔹 İşlem: Profil Bilgileri Güncellendi`);
    }
    if (details.action === 'profile_picture_upload') {
      lines.push(`🔹 İşlem: Profil Fotoğrafı Yüklendi`);
    }
    if (details.fields && Array.isArray(details.fields)) {
      const fieldNames: Record<string, string> = {
        full_name: 'Ad Soyad',
        email: 'E-posta',
        profile_picture: 'Profil Fotoğrafı',
      };
      const fields = (details.fields as string[]).map(f => fieldNames[f] || f).join(', ');
      lines.push(`🔹 Güncellenen Alanlar: ${fields}`);
    }
  }

  if (action === 'CHANGE_PASSWORD') {
    if (details.success) {
      lines.push(`🔹 İşlem: Parola Başarıyla Değiştirildi`);
    }
  }

  // Eğer hiç line eklenmedi ise, raw details'ı göster
  if (lines.length === 0) {
    if (Object.keys(details).length > 0) {
      return Object.entries(details)
        .map(([key, value]) => `🔹 ${key}: ${value}`)
        .join('\n');
    }
    return 'Detay yok';
  }

  return lines.join('\n');
}
