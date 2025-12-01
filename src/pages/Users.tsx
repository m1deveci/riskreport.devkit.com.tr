import { useEffect, useState } from 'react';
import { signUp, getCurrentUser } from '../lib/auth';
import { api } from '../lib/supabase';
import { logAction, LogActions } from '../lib/logger';
import { Plus, Edit2, Trash2, Users as UsersIcon, AlertCircle, CheckCircle2, Key, RefreshCw, Copy } from 'lucide-react';
import { useI18n, useLanguageChange } from '../lib/i18n';
import type { UserProfile } from '../lib/auth';
import Swal from 'sweetalert2';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  location_ids?: string[];
  created_at: string;
  last_login?: string | null;
}

interface Location {
  id: string;
  name: string;
}

// Moved ROLES to a function so it can use t()
function getRoles(t: (key: string) => string) {
  return [
    { value: 'admin', label: t('users.roleAdmin') || 'Admin' },
    { value: 'isg_expert', label: t('users.roleExpert') || 'İSG Uzmanı' },
    { value: 'viewer', label: t('users.roleViewer') || 'Görüntüleyici' },
  ];
}

export function Users() {
  const { t } = useI18n();
  const ROLES = getRoles(t);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [manualPassword, setManualPassword] = useState('');
  const [suggestedPassword, setSuggestedPassword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'viewer',
    is_active: true,
    location_ids: [] as string[],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useLanguageChange();

  async function loadData() {
    try {
      const [usersData, locationsData, user] = await Promise.all([
        api.users.getList(),
        api.locations.getList(),
        getCurrentUser(),
      ]);

      // Ensure data is array
      setUsers(Array.isArray(usersData) ? usersData : []);
      setLocations(Array.isArray(locationsData) ? locationsData : []);
      setCurrentUser(user);
    } catch (err) {
      console.error('Failed to load data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Veri yüklenirken hata oluştu';
      setError(errorMessage);
      setUsers([]);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }

  function openModal(user?: User) {
    if (user) {
      setEditingId(user.id);
      setFormData({
        full_name: user.full_name,
        email: user.email,
        password: '',
        role: user.role,
        is_active: user.is_active,
        location_ids: user.location_ids || [],
      });
    } else {
      setEditingId(null);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role: 'viewer',
        is_active: true,
        location_ids: [],
      });
    }
    setShowModal(true);
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // ISG Expert validation: cannot assign locations outside of their own
      if (currentUser?.role === 'isg_expert') {
        const invalidLocations = formData.location_ids.filter(
          (locId) => !currentUser.location_ids?.includes(locId)
        );
        if (invalidLocations.length > 0) {
          throw new Error('Sadece kendi lokasyonlarınıza kullanıcı atayabilirsiniz');
        }
      }

      if (editingId) {
        const updateData: {
          full_name: string;
          role: string;
          is_active: boolean;
          location_ids: string[];
        } = {
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active,
          location_ids: formData.location_ids,
        };

        await api.users.update(editingId, updateData);

        await logAction(LogActions.UPDATE_USER, { user_id: editingId });
        setSuccess(t('messages.successUpdated'));
      } else {
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Şifre en az 6 karakter olmalıdır');
        }

        // ISG Expert cannot create admin users
        if (currentUser?.role === 'isg_expert' && formData.role === 'admin') {
          throw new Error('İSG Uzmanları admin kullanıcı oluşturamazlar');
        }

        await signUp(
          formData.email,
          formData.password,
          formData.full_name,
          formData.role as 'admin' | 'isg_expert' | 'viewer',
          formData.location_ids
        );

        await logAction(LogActions.CREATE_USER, { email: formData.email });
        setSuccess(t('messages.successCreated'));
      }

      await loadData();

      // Show success message with SweetAlert
      const isEditing = editingId ? 'Güncellendi' : 'Oluşturuldu';
      await Swal.fire({
        title: 'Başarılı!',
        text: `${formData.full_name} ${editingId ? 'güncellendi' : 'oluşturuldu'}.`,
        icon: 'success',
        confirmButtonColor: '#3b82f6',
      });

      setShowModal(false);
      setSuccess('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('messages.errorGeneric');

      Swal.fire({
        title: 'Hata!',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#3b82f6',
      });
      setError(errorMessage);
    }
  }

  async function handleDelete(id: string) {
    // ISG Expert kullanıcılar diğer kullanıcıları silemezler
    if (currentUser?.role === 'isg_expert') {
      setError('İSG Uzmanları kullanıcı silemezler');
      return;
    }

    const userToDelete = users.find(u => u.id === id);

    const result = await Swal.fire({
      title: 'Kullanıcıyı Sil',
      html: `<div style="text-align: left;">
        <p><strong>${userToDelete?.full_name}</strong> adlı kullanıcıyı silmek istediğinize emin misiniz?</p>
        <p style="margin-top: 10px; color: #888; font-size: 0.9em;">
          <strong>E-posta:</strong> ${userToDelete?.email}<br/>
          <strong>Rol:</strong> ${userToDelete?.role}
        </p>
        <p style="margin-top: 15px; color: #d32f2f; font-weight: 500;">Bu işlem geri alınamaz!</p>
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Evet, Sil',
      cancelButtonText: 'İptal',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await api.users.delete(id);

      // Detaylı bilgileri logla
      await logAction(LogActions.DELETE_USER, {
        user_id: id,
        user_name: userToDelete?.full_name,
        user_email: userToDelete?.email,
        user_role: userToDelete?.role,
      });

      await Swal.fire({
        title: 'Silindi!',
        text: `${userToDelete?.full_name} başarıyla silindi.`,
        icon: 'success',
        confirmButtonColor: '#3b82f6',
      });

      await loadData();
    } catch (err) {
      console.error('Failed to delete user:', err);
      const errorMessage = err instanceof Error ? err.message : t('messages.errorDelete');
      Swal.fire({
        title: 'Hata!',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#3b82f6',
      });
    }
  }

  async function handleResetPassword(id: string, email: string, fullName: string) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:6000') + `/api/password-reset/admin/${id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Parola sıfırlama başarısız oldu');
      }

      await logAction(LogActions.UPDATE_USER, { user_id: id, action: 'password_reset' });
      Swal.fire({
        title: 'Başarılı!',
        text: `Parola sıfırlama bağlantısı ${email} adresine gönderildi.`,
        icon: 'success',
        confirmButtonColor: '#3b82f6',
      });
    } catch (err) {
      console.error('Failed to reset password:', err);
      const errorMessage = err instanceof Error ? err.message : 'Parola sıfırlama işleminde bir hata oluştu';
      Swal.fire({
        title: 'Hata!',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#3b82f6',
      });
    }
  }

  // Generate random password (8 characters)
  function generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  function openPasswordModal(user: User) {
    setPasswordResetUser(user);
    setManualPassword('');
    setSuggestedPassword('');
    setError('');
    setSuccess('');
    setShowPasswordModal(true);
  }

  function handleSuggestPassword() {
    const newPassword = generateRandomPassword();
    setSuggestedPassword(newPassword);
    setManualPassword(newPassword);
  }

  function handleUseSuggestedPassword() {
    if (suggestedPassword) {
      setManualPassword(suggestedPassword);
    }
  }

  async function handleManualPasswordReset() {
    if (!passwordResetUser) return;

    setError('');
    setSuccess('');

    if (!manualPassword || manualPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    try {
      // Kullanıcı parolasını güncellemek için backend API'sini çağır
      const response = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:6000') + `/api/users/${passwordResetUser.id}/password`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ password: manualPassword }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Parola değiştirme başarısız oldu');
      }

      await logAction(LogActions.UPDATE_USER, {
        user_id: passwordResetUser.id,
        action: 'manual_password_reset'
      });

      Swal.fire({
        title: 'Başarılı!',
        text: `${passwordResetUser.full_name} parolası değiştirildi.`,
        icon: 'success',
        confirmButtonColor: '#3b82f6',
      });

      setShowPasswordModal(false);
      setPasswordResetUser(null);
      setManualPassword('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('messages.errorGeneric');
      Swal.fire({
        title: 'Hata!',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#3b82f6',
      });
      setError(errorMessage);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter users based on current user's role and assigned locations
  const filteredUsers = currentUser?.role === 'isg_expert'
    ? users.filter(user => {
        // isg_expert can only see users from their assigned locations
        if (!currentUser.location_ids || currentUser.location_ids.length === 0) {
          return false;
        }
        // Show users that have at least one location in common with isg_expert's locations
        const userLocations = user.location_ids || [];
        return userLocations.some(locId => currentUser.location_ids?.includes(locId));
      })
    : users;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -mx-6 -my-6 px-6 py-6">
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{t('users.title') || 'Kullanıcı Yönetimi'}</h1>
          <p className="text-slate-400 text-sm sm:text-base md:text-lg mt-2">{t('users.subtitle') || 'Sistem kullanıcılarını yönetin'}</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('users.addNew') || 'Yeni Kullanıcı'}
        </button>
      </div>

      <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b border-slate-600">
              <tr>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('users.fullName') || 'Ad Soyad'}
                </th>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('users.email') || 'E-posta'}
                </th>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('users.role') || 'Rol'}
                </th>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('users.locations') || 'Lokasyonlar'}
                </th>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('reports.status') || 'Durum'}
                </th>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('users.registrationDate') || 'Kayıt Tarihi'}
                </th>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('users.lastLogin') || 'Son Giriş'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('common.actions') || 'İşlemler'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-900/50 border-b border-slate-700">
                  <td className="sm:px-6 px-3 sm:py-4 py-2 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-100">{user.full_name}</div>
                  </td>
                  <td className="sm:px-6 px-3 sm:py-4 py-2 whitespace-nowrap">
                    <div className="text-sm text-slate-300">{user.email}</div>
                  </td>
                  <td className="sm:px-6 px-3 sm:py-4 py-2 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                      {ROLES.find((r) => r.value === user.role)?.label || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.location_ids && user.location_ids.length > 0 ? (
                        user.location_ids.map((locId) => {
                          const location = locations.find((l) => l.id === locId);
                          return (
                            <span
                              key={locId}
                              className="px-2 py-1 text-xs font-medium rounded-full bg-slate-600 text-slate-200"
                            >
                              {location?.name || 'Bilinmeyen'}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-500">{t('users.noLocationsAssigned') || 'Hiç lokasyon atanmamış'}</span>
                      )}
                    </div>
                  </td>
                  <td className="sm:px-6 px-3 sm:py-4 py-2 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.is_active ? t('common.active') : (t('common.inactive') || 'Pasif')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : (t('common.unknown') || 'Bilinmiyor')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : (t('users.neverLoggedIn') || 'Hiç giriş yapmadı')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openModal(user)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title={t('common.edit')}
                    >
                      <Edit2 className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => openPasswordModal(user)}
                      className="text-orange-600 hover:text-orange-900 mr-3"
                      title={t('users.resetPassword') || 'Parola Sıfırla'}
                    >
                      <Key className="w-4 h-4 inline" />
                    </button>
                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <UsersIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {currentUser?.role === 'isg_expert'
                ? (t('users.noUsersInLocations') || 'Kendi lokasyonlarında henüz kullanıcı yok')
                : (t('users.noUsers') || 'Henüz kullanıcı yok')}
            </h3>
            <p className="text-slate-400 mb-6">
              {currentUser?.role === 'isg_expert'
                ? (t('users.addUserToLocation') || 'Yeni kullanıcı ekleyerek başlayın')
                : (t('users.createFirstUser') || 'İlk kullanıcıyı oluşturarak başlayın')}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 shadow-xl backdrop-blur-md max-w-md w-full">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">
                {editingId ? (t('users.editUser') || 'Kullanıcı Düzenle') : (t('users.addNew') || 'Yeni Kullanıcı')}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('users.fullName') || 'Ad Soyad'} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('users.email') || 'E-posta'} <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={!!editingId}
                />
              </div>

              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('users.password') || 'Şifre'} <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    minLength={6}
                  />
                  <p className="mt-1 text-xs text-slate-500">{t('users.minCharacters') || 'Minimum 6 karakter'}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('users.role') || 'Rol'} <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('users.locations') || 'Lokasyonlar'} {formData.role !== 'admin' && <span className="text-red-600">*</span>}
                </label>
                <div className="space-y-2 border border-slate-600 bg-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {locations.length === 0 ? (
                    <p className="text-sm text-slate-500">{t('users.noLocations') || 'Henüz lokasyon yok'}</p>
                  ) : (
                    locations
                      .filter((location) => {
                        // isg_expert can only select locations they are assigned to
                        if (currentUser?.role === 'isg_expert') {
                          return currentUser.location_ids?.includes(location.id);
                        }
                        // Admin can see all locations
                        return true;
                      })
                      .map((location) => (
                        <label key={location.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.location_ids.includes(location.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  location_ids: [...formData.location_ids, location.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  location_ids: formData.location_ids.filter((id) => id !== location.id),
                                });
                              }
                            }}
                            className="w-5 h-5 text-blue-600 border-slate-600 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-slate-300">{location.name}</span>
                        </label>
                      ))
                  )}
                </div>
                {currentUser?.role === 'isg_expert' && (
                  <p className="mt-1 text-xs text-slate-400">{t('users.canOnlyAssignOwnLocations') || 'Sadece kendi lokasyonlarınıza kullanıcı atayabilirsiniz'}</p>
                )}
                {formData.role !== 'admin' && formData.location_ids.length === 0 && (
                  <p className="mt-1 text-xs text-amber-400">{t('users.selectAtLeastOneLocation') || 'En az bir lokasyon seçiniz'}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-slate-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-slate-300">
                  {t('common.active')}
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingId ? t('common.save') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && passwordResetUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 shadow-xl backdrop-blur-md max-w-md w-full">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">
                {t('users.resetPassword') || 'Parola Sıfırla'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {passwordResetUser.full_name} ({passwordResetUser.email})
              </p>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-300">
                    {t('users.newPassword') || 'Yeni Şifre'} <span className="text-red-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestPassword}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    title="Parola öner"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Parola Öner
                  </button>
                </div>
                <input
                  type="text"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder={t('users.minCharactersPlaceholder') || 'En az 6 karakter'}
                  minLength={6}
                />
                <p className="mt-1 text-xs text-slate-500">{t('users.minCharacters') || 'Minimum 6 karakter'}</p>

                {suggestedPassword && (
                  <div className="mt-3 p-3 bg-slate-600 rounded-lg">
                    <p className="text-xs font-semibold text-slate-300 mb-2">Önerilen Parola:</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="flex-1 text-sm text-white font-mono bg-slate-700 px-2 py-1 rounded text-center">
                        {suggestedPassword}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(suggestedPassword);
                          Swal.fire({
                            icon: 'success',
                            title: 'Kopyalandı!',
                            text: 'Parola panoya kopyalandı.',
                            showConfirmButton: false,
                            timer: 2000,
                          });
                        }}
                        className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                        title="Kopyala"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Yukarıdaki şifre otomatik olarak forma dolduruldu. İstiyorsanız manuel olarak düzenleyebilirsiniz.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-400 p-3">
                <p className="text-xs text-amber-700">
                  {t('users.passwordChangeWarning') || 'Kullanıcının parolası hemen değiştirilecektir. Bu işlem geri alınamaz.'}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleManualPasswordReset}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  {t('users.changePassword') || t('common.save') || 'Şifreyi Değiştir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
