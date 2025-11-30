import { useEffect, useState } from 'react';
import { api, supabase } from '../lib/supabase';
import { logAction, LogActions } from '../lib/logger';
import { getCurrentUser } from '../lib/auth';
import { Plus, Edit2, Trash2, Users, AlertCircle, CheckCircle2, Lock, Key } from 'lucide-react';
import type { UserProfile } from '../lib/auth';

interface ISGExpert {
  id: string;
  location_ids?: string[];
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

interface Location {
  id: string;
  name: string;
}

export function ISGExperts() {
  const [experts, setExperts] = useState<ISGExpert[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordResetExpert, setPasswordResetExpert] = useState<ISGExpert | null>(null);
  const [manualPassword, setManualPassword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('');
  const [formData, setFormData] = useState({
    location_ids: [] as string[],
    full_name: '',
    email: '',
    phone: '',
    password: '',
    is_active: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      const [expertsData, locationsData] = await Promise.all([
        api.experts.getList(''),
        api.locations.getList(),
      ]);

      setExperts(expertsData || []);
      setLocations(locationsData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  function openModal(expert?: ISGExpert) {
    if (expert) {
      setEditingId(expert.id);
      setFormData({
        location_ids: expert.location_ids || [],
        full_name: expert.full_name,
        email: expert.email,
        phone: expert.phone,
        password: '',
        is_active: expert.is_active,
      });
    } else {
      setEditingId(null);
      // Admin olmayan kullanıcılar sadece kendi lokasyonlarını seçebilir
      const defaultLocations = currentUser?.role === 'admin' ? [] : (currentUser?.location_ids || []);
      setFormData({
        location_ids: defaultLocations,
        full_name: '',
        email: '',
        phone: '',
        password: '',
        is_active: true,
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
      // Admin olmayan kullanıcılar sadece kendi lokasyonlarında işlem yapabilir
      if (currentUser?.role !== 'admin') {
        const userLocations = currentUser?.location_ids || [];
        const isValidLocation = formData.location_ids.every(locId => userLocations.includes(locId));
        if (!isValidLocation) {
          throw new Error('Sadece kendi lokasyonlarınızda işlem yapabilirsiniz');
        }
      }

      if (editingId) {
        await api.experts.update(editingId, formData);

        await logAction(LogActions.UPDATE_ISG_EXPERT, { expert_id: editingId });
        setSuccess('İSG uzmanı başarıyla güncellendi');
      } else {
        await api.experts.create(formData);

        await logAction(LogActions.CREATE_ISG_EXPERT, { name: formData.full_name });
        setSuccess('İSG uzmanı başarıyla oluşturuldu');
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
    if (!confirm('Bu İSG uzmanını silmek istediğinize emin misiniz?')) return;

    try {
      // Silmeden önce uzman bilgilerini al
      const expertToDelete = experts.find(e => e.id === id);

      await api.experts.delete(id);

      // Detaylı bilgileri logla
      await logAction(LogActions.DELETE_ISG_EXPERT, {
        expert_id: id,
        expert_name: expertToDelete?.full_name,
        expert_email: expertToDelete?.email,
      });
      await loadData();
    } catch (err) {
      console.error('Failed to delete expert:', err);
      alert('İSG uzmanı silinirken bir hata oluştu');
    }
  }

  async function handleResetPassword(expertId: string) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Oturum geçersiz');
        return;
      }

      const response = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:6000') + `/api/password-reset/admin/${expertId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Hata oluştu');
      }

      setSuccess('Parola sıfırlama bağlantısı e-postaya gönderildi');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(errorMessage);
      setTimeout(() => setError(''), 3000);
    }
  }

  function openPasswordModal(expert: ISGExpert) {
    setPasswordResetExpert(expert);
    setManualPassword('');
    setError('');
    setSuccess('');
    setShowPasswordModal(true);
  }

  async function handleManualPasswordReset() {
    if (!passwordResetExpert) return;

    setError('');
    setSuccess('');

    if (!manualPassword || manualPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    try {
      const response = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:6000') + `/api/isg-experts/${passwordResetExpert.id}/password`,
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

      await logAction(LogActions.UPDATE_ISG_EXPERT, {
        expert_id: passwordResetExpert.id,
        action: 'manual_password_reset'
      });

      setSuccess('Parola başarıyla değiştirildi');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordResetExpert(null);
        setManualPassword('');
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(errorMessage);
    }
  }

  // Admin olmayan kullanıcılar sadece kendi lokasyonlarındaki uzmanları görebilir
  const userCanSee = (expert: ISGExpert) => {
    if (currentUser?.role === 'admin') return true;
    return expert.location_ids?.some(locId => currentUser?.location_ids?.includes(locId)) || false;
  };

  const visibleExperts = currentUser?.role === 'admin' ? experts : experts.filter(userCanSee);

  const filteredExperts = selectedLocationFilter
    ? visibleExperts.filter((e) => e.location_ids?.includes(selectedLocationFilter))
    : visibleExperts;

  const expertsByLocation = locations.map((loc) => ({
    location: loc,
    activeCount: experts.filter((e) => e.location_ids?.includes(loc.id) && e.is_active).length,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -mx-6 -my-6 px-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white">İSG Uzmanları</h1>
          <p className="text-slate-400 text-lg mt-2">
            {currentUser?.role === 'admin'
              ? 'İş sağlığı ve güvenliği uzmanlarını yönetin'
              : 'Kendi lokasyonunuzdaki uzmanları yönetin'}
          </p>
        </div>
        {(currentUser?.role === 'admin' || currentUser?.location_ids?.length > 0) && (
          <button
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Yeni İSG Uzmanı
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {expertsByLocation.map(({ location, activeCount }) => (
          <div key={location.id} className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{location.name}</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{activeCount} / 5</p>
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  activeCount >= 5 ? 'bg-red-100' : 'bg-green-100'
                }`}
              >
                <Users
                  className={`w-6 h-6 ${activeCount >= 5 ? 'text-red-600' : 'text-green-600'}`}
                />
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-slate-900/50 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    activeCount >= 5 ? 'bg-red-600' : 'bg-green-600'
                  }`}
                  style={{ width: `${(activeCount / 5) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md p-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Lokasyona Göre Filtrele
        </label>
        <select
          value={selectedLocationFilter}
          onChange={(e) => setSelectedLocationFilter(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Tüm Lokasyonlar</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
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
                  Lokasyon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  E-posta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Telefon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-slate-700">
              {filteredExperts.map((expert) => (
                <tr key={expert.id} className="hover:bg-slate-900/50 border-b border-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-100">{expert.full_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {expert.location_ids && expert.location_ids.length > 0 ? (
                        expert.location_ids.map((locId) => {
                          const location = locations.find((l) => l.id === locId);
                          return (
                            <span
                              key={locId}
                              className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                            >
                              {location?.name || 'Bilinmeyen'}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-500">Lokasyon atanmamış</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-300">{expert.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-300">{expert.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        expert.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {expert.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleResetPassword(expert.id)}
                      title="Parola sıfırlama linki gönder"
                      className="text-amber-600 hover:text-amber-900 inline-block"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openPasswordModal(expert)}
                      title="Parola değiştir"
                      className="text-orange-600 hover:text-orange-900 inline-block"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openModal(expert)}
                      className="text-blue-600 hover:text-blue-900 inline-block"
                      title="Düzenle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => handleDelete(expert.id)}
                        className="text-red-600 hover:text-red-900 inline-block"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredExperts.length === 0 && (
        <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md p-12 text-center">
          <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Henüz İSG uzmanı yok</h3>
          <p className="text-slate-400 mb-6">İlk İSG uzmanınızı ekleyerek başlayın</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 shadow-xl backdrop-blur-md max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">
                {editingId ? 'İSG Uzmanı Düzenle' : 'Yeni İSG Uzmanı'}
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
                  Lokasyonlar <span className="text-red-600">*</span>
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
                {formData.location_ids.length === 0 && (
                  <p className="mt-1 text-xs text-amber-400">En az bir lokasyon seçiniz</p>
                )}
              </div>

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
                />
              </div>

              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Parola <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    minLength={6}
                    placeholder="En az 6 karakter"
                  />
                  <p className="mt-1 text-xs text-slate-500">Minimum 6 karakter - Uzman bu parolayla login olabilecek</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Telefon <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
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

      {showPasswordModal && passwordResetExpert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 shadow-xl backdrop-blur-md max-w-md w-full">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">
                Parola Sıfırla
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {passwordResetExpert.full_name} ({passwordResetExpert.email})
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
                  Uzmanın parolası hemen değiştirilecektir. Bu işlem geri alınamaz.
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
