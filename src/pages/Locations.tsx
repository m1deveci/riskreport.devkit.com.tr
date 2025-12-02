import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { logAction, LogActions } from '../lib/logger';
import { useI18n, useLanguageChange } from '../lib/i18n';
import { Plus, Edit2, Trash2, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';

interface Location {
  id: string;
  name: string;
  description: string;
  main_email: string;
  is_active: boolean;
  created_at: string;
}

export function Locations() {
  const { t } = useI18n();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    main_email: '',
    is_active: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadLocations();
  }, []);

  useLanguageChange();

  async function loadLocations() {
    try {
      const data = await api.locations.getList();
      setLocations(data || []);
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  }

  function openModal(location?: Location) {
    if (location) {
      setEditingId(location.id);
      setFormData({
        name: location.name,
        description: location.description,
        main_email: location.main_email,
        is_active: location.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        main_email: '',
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
      if (editingId) {
        await api.locations.update(editingId, formData);

        await logAction(LogActions.UPDATE_LOCATION, { location_id: editingId });
        setSuccess(`${t('messages.location')} ${t('messages.successUpdated')}`);
      } else {
        await api.locations.create(formData);

        await logAction(LogActions.CREATE_LOCATION, { name: formData.name });
        setSuccess(`${t('messages.location')} ${t('messages.successCreated')}`);
      }

      await loadLocations();

      // Show success with SweetAlert
      const message = editingId ? `${formData.name} güncellendi` : `${formData.name} oluşturuldu`;
      await Swal.fire({
        title: 'Başarılı!',
        text: message,
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
    const locationToDelete = locations.find(l => l.id === id);

    const result = await Swal.fire({
      title: 'Lokasyonu Sil',
      html: `<div style="text-align: left;">
        <p><strong>${locationToDelete?.name}</strong> lokasyonunu silmek istediğinize emin misiniz?</p>
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
      // Silmeden önce lokasyon bilgilerini al
      const locationToDelete = locations.find(l => l.id === id);

      await api.locations.delete(id);

      // Detaylı bilgileri logla
      await logAction(LogActions.DELETE_LOCATION, {
        location_id: id,
        location_name: locationToDelete?.name,
      });

      Swal.fire({
        title: 'Silindi!',
        text: `${locationToDelete?.name} başarıyla silindi.`,
        icon: 'success',
        confirmButtonColor: '#3b82f6',
      });

      await loadLocations();
    } catch (err) {
      console.error('Failed to delete location:', err);
      const errorMessage = err instanceof Error ? err.message : t('messages.errorDelete');
      Swal.fire({
        title: 'Hata!',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#3b82f6',
      });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{t('locations.title')}</h1>
          <p className="text-slate-400 text-sm sm:text-base md:text-lg mt-2">{t('locations.addNew')}</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          {t('locations.addNew')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location) => (
          <div key={location.id} className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">{location.name}</h3>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                        location.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {location.is_active ? t('common.active') : t('common.inactive')}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-400 mb-3 line-clamp-2">{location.description}</p>

              <div className="text-sm text-slate-400 mb-4">
                <p className="font-medium">{t('locations.email')}:</p>
                <p className="truncate">{location.main_email}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openModal(location)}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-600 transition-colors text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => handleDelete(location.id)}
                  className="flex items-center justify-center gap-2 bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {locations.length === 0 && (
        <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md p-12 text-center">
          <MapPin className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">{t('locations.noLocations') || 'Henüz lokasyon yok'}</h3>
          <p className="text-slate-400 mb-6">{t('locations.noLocationsDesc') || 'İlk lokasyonunuzu oluşturarak başlayın'}</p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('locations.addNew')}
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 shadow-xl backdrop-blur-md max-w-md w-full">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">
                {editingId ? `${t('locations.title')} ${t('common.edit')}` : `${t('common.add')} ${t('locations.title')}`}
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
                  {t('locations.name')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('locations.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('locations.email')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={formData.main_email}
                  onChange={(e) => setFormData({ ...formData, main_email: e.target.value })}
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
                  className="w-5 h-5 text-blue-600 border-slate-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-slate-300">
                  {t('locations.active')}
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
    </div>
  );
}
