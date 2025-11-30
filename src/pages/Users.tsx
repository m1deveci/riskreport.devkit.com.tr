import { useEffect, useState } from 'react';
import { api, supabase } from '../lib/supabase';
import { signUp } from '../lib/auth';
import { logAction, LogActions } from '../lib/logger';
import { Plus, Edit2, Trash2, Users as UsersIcon, AlertCircle, CheckCircle2, Key } from 'lucide-react';

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

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'isg_expert', label: 'İSG Uzmanı' },
  { value: 'viewer', label: 'Görüntüleyici' },
];

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [manualPassword, setManualPassword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
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

  async function loadData() {
    try {
      const [usersData, locationsData] = await Promise.all([
        api.users.getList(),
        api.locations.getList(),
      ]);
      setUsers(usersData || []);
      setLocations(locationsData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
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
        setSuccess('Kullanıcı başarıyla güncellendi');
      } else {
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Şifre en az 6 karakter olmalıdır');
        }

        await signUp(
          formData.email,
          formData.password,
          formData.full_name,
          formData.role as 'admin' | 'isg_expert' | 'viewer',
          formData.location_ids
        );

        await logAction(LogActions.CREATE_USER, { email: formData.email });
        setSuccess('Kullanıcı başarıyla oluşturuldu');
      }

      await loadData();
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(errorMessage);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;

    try {
      await api.users.delete(id);

      await logAction(LogActions.DELETE_USER, { user_id: id });
      await loadData();
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Kullanıcı silinirken bir hata oluştu');
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
      alert(`Parola sıfırlama bağlantısı ${email} adresine gönderildi`);
    } catch (err) {
      console.error('Failed to reset password:', err);
      const errorMessage = err instanceof Error ? err.message : 'Parola sıfırlama işleminde bir hata oluştu';
      alert(errorMessage);
    }
  }

  function openPasswordModal(user: User) {
    setPasswordResetUser(user);
    setManualPassword('');
    setError('');
    setSuccess('');
    setShowPasswordModal(true);
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

      setSuccess('Parola başarıyla değiştirildi');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordResetUser(null);
        setManualPassword('');
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -mx-6 -my-6 px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Kullanıcı Yönetimi</h1>
          <p className="text-slate-400 text-lg mt-2">Sistem kullanıcılarını yönetin</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Yeni Kullanıcı
        </button>
      </div>

      <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b border-slate-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Ad Soyad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  E-posta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Lokasyonlar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Kayıt Tarihi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Son Giriş
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-slate-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-900/50 border-b border-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-100">{user.full_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-300">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
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
                        <span className="text-xs text-slate-500">Hiç lokasyon atanmamış</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Bilinmiyor'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Hiç giriş yapmadı'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openModal(user)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Düzenle"
                    >
                      <Edit2 className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => openPasswordModal(user)}
                      className="text-orange-600 hover:text-orange-900 mr-3"
                      title="Parola Sıfırla"
                    >
                      <Key className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-12 text-center">
            <UsersIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Henüz kullanıcı yok</h3>
            <p className="text-slate-400 mb-6">İlk kullanıcıyı oluşturarak başlayın</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 shadow-xl backdrop-blur-md max-w-md w-full">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">
                {editingId ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
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
                  Ad Soyad <span className="text-red-600">*</span>
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
                  E-posta <span className="text-red-600">*</span>
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
                    Şifre <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    minLength={6}
                  />
                  <p className="mt-1 text-xs text-slate-500">Minimum 6 karakter</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rol <span className="text-red-600">*</span>
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
                  Lokasyonlar {formData.role !== 'admin' && <span className="text-red-600">*</span>}
                </label>
                <div className="space-y-2 border border-slate-600 bg-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {locations.length === 0 ? (
                    <p className="text-sm text-slate-500">Henüz lokasyon yok</p>
                  ) : (
                    locations.map((location) => (
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
                          className="w-4 h-4 text-blue-600 border-slate-600 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-slate-300">{location.name}</span>
                      </label>
                    ))
                  )}
                </div>
                {formData.role !== 'admin' && formData.location_ids.length === 0 && (
                  <p className="mt-1 text-xs text-amber-400">En az bir lokasyon seçiniz</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-slate-300">
                  Aktif
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingId ? 'Güncelle' : 'Oluştur'}
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
                Parola Sıfırla
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Yeni Şifre <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="En az 6 karakter"
                  minLength={6}
                />
                <p className="mt-1 text-xs text-slate-500">Minimum 6 karakter</p>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-400 p-3">
                <p className="text-xs text-amber-700">
                  Kullanıcının parolası hemen değiştirilecektir. Bu işlem geri alınamaz.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleManualPasswordReset}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Şifreyi Değiştir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
