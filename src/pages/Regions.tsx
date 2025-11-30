import { useEffect, useState } from 'react';
import { api, supabase } from '../lib/supabase';
import { logAction, LogActions } from '../lib/logger';
import { Plus, Edit2, Trash2, QrCode, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useI18n, useLanguageChange } from '../lib/i18n';
import QRCode from 'qrcode';

interface Region {
  id: string;
  location_id: string;
  name: string;
  description: string;
  qr_code_token: string;
  qr_code_url: string;
  is_active: boolean;
  created_at: string;
  locations?: { name: string };
}

interface Location {
  id: string;
  name: string;
}

export function Regions() {
  const { t } = useI18n();
  const [regions, setRegions] = useState<Region[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('');
  const [formData, setFormData] = useState({
    location_id: '',
    name: '',
    description: '',
    is_active: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useLanguageChange();

  async function loadData() {
    try {
      const [regionsData, locationsData] = await Promise.all([
        api.regions.getList(''),
        api.locations.getList(),
      ]);

      setRegions(regionsData || []);
      setLocations(locationsData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  function generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  function openModal(region?: Region) {
    if (region) {
      setEditingId(region.id);
      setFormData({
        location_id: region.location_id,
        name: region.name,
        description: region.description,
        is_active: region.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({
        location_id: '',
        name: '',
        description: '',
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
        await api.regions.update(editingId, formData);

        await logAction(LogActions.UPDATE_REGION, { region_id: editingId });
        setSuccess(`${t('messages.region')} ${t('messages.successUpdated')}`);
      } else {
        const token = generateToken();

        // Generate QR code URL before creating region
        const qrUrl = `${window.location.origin}/report/${formData.location_id}/${token}`;

        const newRegionData = {
          ...formData,
          qr_code_token: token,
          qr_code_url: qrUrl,
        };

        const newRegion = await api.regions.create(newRegionData);

        if (!newRegion || !newRegion.id) throw new Error('Bölge oluşturulamadı');

        // Update QR code URL with region ID query parameter
        const finalQrUrl = `${qrUrl}?region=${newRegion.id}`;
        await api.regions.update(newRegion.id, { qr_code_url: finalQrUrl });

        await logAction(LogActions.CREATE_REGION, { name: formData.name });
        setSuccess(`${t('messages.region')} ${t('messages.successCreated')}`);
      }

      await loadData();
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('messages.errorGeneric');
      setError(errorMessage);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('messages.confirmDeleteRegion'))) return;

    try {
      await api.regions.delete(id);

      await logAction(LogActions.DELETE_REGION, { region_id: id });
      await loadData();
    } catch (err) {
      console.error('Failed to delete region:', err);
      alert(t('messages.errorDelete'));
    }
  }

  async function downloadQRCode(region: Region) {
    try {
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, region.qr_code_url, {
        width: 512,
        margin: 2,
      });

      // Create a new canvas with extra space for title
      const titleHeight = 100;
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = qrCanvas.width;
      finalCanvas.height = qrCanvas.height + titleHeight;

      const ctx = finalCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context bulunamadı');

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // Draw title
      ctx.fillStyle = '#1F2937'; // Dark gray
      ctx.font = 'bold 48px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('RAMAK KALA BİLDİR', finalCanvas.width / 2, 20);

      // Draw QR code on the canvas below title
      ctx.drawImage(qrCanvas, 0, titleHeight);

      // Download
      const link = document.createElement('a');
      link.download = `qr-${region.name.replace(/\s+/g, '-')}.png`;
      link.href = finalCanvas.toDataURL();
      link.click();
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      alert(t('messages.qrCodeError') || 'QR kod oluşturulurken bir hata oluştu');
    }
  }

  const filteredRegions = selectedLocationFilter
    ? regions.filter((r) => r.location_id === selectedLocationFilter)
    : regions;

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
          <h1 className="text-4xl font-bold text-white">{t('regions.title')}</h1>
          <p className="text-slate-400 text-lg mt-2">QR kodlu bölgeleri yönetin</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('regions.addNew')}
        </button>
      </div>

      <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md p-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">Lokasyona Göre Filtrele</label>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRegions.map((region) => (
          <div key={region.id} className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-1">{region.name}</h3>
                  <p className="text-sm text-slate-400">
                    {(region.locations as unknown as { name: string })?.name}
                  </p>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-2 ${
                      region.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {region.is_active ? t('common.active') : 'Pasif'}
                  </span>
                </div>
                <QrCode className="w-8 h-8 text-blue-600" />
              </div>

              <p className="text-sm text-slate-400 mb-4 line-clamp-2">{region.description}</p>

              <div className="bg-slate-900/50 rounded p-3 mb-4">
                <p className="text-xs text-slate-500 mb-1">QR Kod URL:</p>
                <p className="text-xs text-slate-300 font-mono truncate">{region.qr_code_url}</p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => downloadQRCode(region)}
                  className="flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  QR Kodu İndir
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(region)}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-600 transition-colors text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(region.id)}
                    className="flex items-center justify-center gap-2 bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRegions.length === 0 && (
        <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md p-12 text-center">
          <QrCode className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Henüz bölge yok</h3>
          <p className="text-slate-400 mb-6">İlk bölgenizi oluşturarak başlayın</p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('regions.addNew')}
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 shadow-xl backdrop-blur-md max-w-md w-full">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">
                {editingId ? `${t('regions.title')} ${t('common.edit')}` : t('regions.addNew')}
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
                  {t('regions.location')} <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.location_id}
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={!!editingId}
                >
                  <option value="">Lokasyon Seçin</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('regions.name')} <span className="text-red-600">*</span>
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
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('regions.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
    </div>
  );
}
