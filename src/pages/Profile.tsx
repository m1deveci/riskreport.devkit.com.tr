import { useState, useEffect } from 'react';
import { getCurrentUser } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { logAction, LogActions } from '../lib/logger';
import { ArrowLeft, Upload, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import type { UserProfile } from '../lib/auth';

export function Profile({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUserProfile();
  }, []);

  async function loadUserProfile() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setFormData(prev => ({
        ...prev,
        full_name: currentUser?.full_name || '',
        email: currentUser?.email || '',
      }));
      // Load profile image if available
      if (currentUser?.id) {
        loadProfilePicture(currentUser.id);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Profil yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  async function loadProfilePicture(userId: string) {
    try {
      const response = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:6000') + `/api/profile/picture/${userId}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onload = (e) => {
          setProfileImage(e.target?.result as string);
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      console.error('Failed to load profile picture:', err);
    }
  }

  async function uploadProfilePicture(token: string) {
    try {
      if (!profileImage) return;

      const response = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:6000') + '/api/profile/upload-picture',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            imageData: profileImage,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fotoğraf yüklenemedi');
      }
    } catch (err) {
      console.error('Failed to upload profile picture:', err);
      throw err;
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Dosya boyutu 5 MB\'den küçük olmalıdır');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Lütfen bir resim dosyası seçiniz');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  }

  async function handleSaveProfile() {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!formData.full_name.trim()) {
        setError('Ad Soyad alanı zorunludur');
        return;
      }

      const token = localStorage.getItem('token');

      // Save profile name
      const response = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:6000') + '/api/profile',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: formData.full_name.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Profil güncellenemedi');
      }

      // Upload profile picture if changed
      if (profileImage && !profileImage.startsWith('blob:')) {
        await uploadProfilePicture(token);
      }

      await logAction(LogActions.UPDATE_PROFILE, {
        action: 'profile_update',
        fields: ['full_name'],
      });

      setSuccess('Profil başarıyla güncellendi');
      await loadUserProfile();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Profil güncellenirken hata oluştu';
      setError(errorMessage);
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!formData.current_password) {
        setError('Mevcut parola zorunludur');
        return;
      }

      if (!formData.new_password || formData.new_password.length < 6) {
        setError('Yeni parola en az 6 karakter olmalıdır');
        return;
      }

      if (formData.new_password !== formData.confirm_password) {
        setError('Yeni parolalar eşleşmiyor');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:6000') + '/api/profile/change-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: formData.current_password,
            new_password: formData.new_password,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Parola değiştirilmedi');
      }

      await logAction(LogActions.UPDATE_PROFILE, {
        action: 'password_change',
      });

      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: '',
      }));

      Swal.fire({
        title: 'Başarılı!',
        text: 'Parolanız başarıyla değiştirildi',
        icon: 'success',
        confirmButtonColor: '#3b82f6',
      });

      setSuccess('Parola başarıyla değiştirildi');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Parola değiştirilirken hata oluştu';
      setError(errorMessage);
      console.error('Failed to change password:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold text-white">Profil Ayarları</h1>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded">
          <div className="flex">
            <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-6">Profil Bilgileri</h2>

        {/* Profile Picture */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">Profil Fotoğrafı</label>
          <div className="flex items-center gap-6">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-blue-500"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-600 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-500">
                <span className="text-sm">Fotoğraf</span>
              </div>
            )}
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Fotoğraf Yükle</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={saving}
              />
            </label>
          </div>
          <p className="text-xs text-slate-400 mt-2">Maksimum 5 MB, PNG, JPG, GIF</p>
        </div>

        {/* Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Ad Soyad <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ad Soyadınız"
            disabled={saving}
          />
        </div>

        {/* Email (Read-only) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">E-posta</label>
          <input
            type="email"
            value={formData.email}
            className="w-full px-4 py-2 border border-slate-600 bg-slate-600 text-slate-400 rounded-lg cursor-not-allowed"
            disabled
          />
          <p className="text-xs text-slate-400 mt-1">E-posta adresi değiştirilemez</p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Kaydediliyor...
            </>
          ) : (
            'Profili Kaydet'
          )}
        </button>
      </div>

      {/* Password Change Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Parola Değiştir</h2>

        {/* Current Password */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Mevcut Parola <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              type={showPasswords.current ? 'text' : 'password'}
              value={formData.current_password}
              onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
              className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              placeholder="Mevcut parolanız"
              disabled={saving}
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
            >
              {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Yeni Parola <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              value={formData.new_password}
              onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
              className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              placeholder="Yeni parolanız (en az 6 karakter)"
              disabled={saving}
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
            >
              {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">Minimum 6 karakter</p>
        </div>

        {/* Confirm Password */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Parolayı Onayla <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              placeholder="Parolayı tekrar girin"
              disabled={saving}
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
            >
              {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Change Password Button */}
        <button
          onClick={handleChangePassword}
          disabled={saving || !formData.current_password || !formData.new_password}
          className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Değiştiriliyor...
            </>
          ) : (
            'Parolayı Değiştir'
          )}
        </button>
      </div>
    </div>
  );
}
