import { api } from './supabase';
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
};

// Detay özelleştiricisi - detay alanlarını Türkçe ve okunabilir hale getir
export function formatLogDetails(action: string, details: Record<string, unknown>): Array<{label: string, value: string}> {
  const items: Array<{label: string, value: string}> = [];

  // Genel alanları işle
  if (details.name) {
    items.push({label: 'Ad', value: String(details.name)});
  }
  if (details.full_name) {
    items.push({label: 'Ad Soyad', value: String(details.full_name)});
  }
  if (details.email) {
    items.push({label: 'E-posta', value: String(details.email)});
  }
  if (details.role) {
    const roleMap: Record<string, string> = {
      admin: 'Admin',
      isg_expert: 'İSG Uzmanı',
      viewer: 'Görüntüleyici',
    };
    items.push({label: 'Rol', value: roleMap[details.role as string] || String(details.role)});
  }

  // Action-spesifik detaylar
  if (action.includes('LOCATION')) {
    if (details.location_id) {
      items.push({label: 'Lokasyon ID', value: String(details.location_id)});
    }
    if (details.description) {
      items.push({label: 'Açıklama', value: String(details.description)});
    }
  }

  if (action.includes('REGION')) {
    if (details.region_id) {
      items.push({label: 'Bölge ID', value: String(details.region_id)});
    }
    if (details.qr_token) {
      items.push({label: 'QR Token', value: (details.qr_token as string).substring(0, 20) + '...'});
    }
  }

  if (action.includes('ISG_EXPERT')) {
    if (details.expert_id) {
      items.push({label: 'Uzman ID', value: String(details.expert_id)});
    }
    if (details.phone) {
      items.push({label: 'Telefon', value: String(details.phone)});
    }
    if (details.action === 'password_reset') {
      items.push({label: 'İşlem Türü', value: 'Parola Sıfırlama'});
    }
    if (details.action === 'manual_password_reset') {
      items.push({label: 'İşlem Türü', value: 'Manuel Parola Sıfırlama'});
    }
  }

  if (action.includes('NEARMISS')) {
    if (details.incident_number) {
      items.push({label: 'Olay Numarası', value: String(details.incident_number)});
    }
    if (details.status) {
      items.push({label: 'Durum', value: String(details.status)});
    }
    if (details.category) {
      items.push({label: 'Kategori', value: String(details.category)});
    }
  }

  if (action.includes('USER')) {
    if (details.user_id) {
      items.push({label: 'Kullanıcı ID', value: String(details.user_id)});
    }
    if (details.action === 'password_reset') {
      items.push({label: 'İşlem Türü', value: 'Parola Sıfırlama Bağlantısı Gönderildi'});
    }
    if (details.action === 'manual_password_reset') {
      items.push({label: 'İşlem Türü', value: 'Manuel Parola Değiştirildi'});
    }
  }

  if (action.includes('SETTINGS')) {
    if (details.site_title) {
      items.push({label: 'Site Başlığı', value: String(details.site_title)});
    }
    if (details.changes) {
      const changes = details.changes as Record<string, unknown>;
      Object.entries(changes).forEach(([key, value]) => {
        items.push({label: key, value: String(value)});
      });
    }
  }

  // Eğer hiç item eklenmedi ise, raw details'ı göster
  if (items.length === 0) {
    if (Object.keys(details).length > 0) {
      Object.entries(details).forEach(([key, value]) => {
        items.push({label: key, value: String(value)});
      });
    } else {
      items.push({label: 'Durum', value: 'Detay yok'});
    }
  }

  return items;
}
