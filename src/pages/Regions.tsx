import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { logAction, LogActions } from '../lib/logger';
import { Plus, Edit2, Trash2, QrCode, Download, AlertCircle, CheckCircle2, MapPin, Building2 } from 'lucide-react';
import { useI18n, useLanguageChange } from '../lib/i18n';
import QRCode from 'qrcode';
import Swal from 'sweetalert2';

interface Region {
  id: string;
  location_id: string;
  name: string;
  description: string;
  qr_code_token: string;
  qr_code_url: string;
  is_active: boolean;
  scan_count: number;
  created_at: string;
  locations?: { name: string };
}

interface Location {
  id: string;
  name: string;
}

interface User {
  id: string;
  role: string;
  location_ids?: string[];
}

export function Regions() {
  const { t } = useI18n();
  const [regions, setRegions] = useState<Region[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('');
  const [activeLocationCard, setActiveLocationCard] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
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
      // Get current user info from token
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      setUser(currentUser);

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
      // Check if isg_expert has permission to edit this region
      if (user?.role === 'isg_expert') {
        const allowedLocations = user.location_ids || [];
        if (!allowedLocations.includes(region.location_id)) {
          Swal.fire({
            title: 'Hata!',
            text: 'Bu bölgeyi düzenleme yetkisi yoktur',
            icon: 'error',
            confirmButtonColor: '#3b82f6',
          });
          return;
        }
      }

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

        // Create region with just the token, QR code will be generated dynamically on demand
        const newRegionData = {
          ...formData,
          qr_code_token: token,
          qr_code_url: '', // Will be generated dynamically when needed
        };

        const newRegion = await api.regions.create(newRegionData);

        if (!newRegion || !newRegion.id) throw new Error('Bölge oluşturulamadı');

        await logAction(LogActions.CREATE_REGION, { name: formData.name });
        setSuccess(`${t('messages.region')} ${t('messages.successCreated')}`);
      }

      await loadData();

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
    const regionToDelete = regions.find(r => r.id === id);

    // Check if isg_expert has permission to delete this region
    if (user?.role === 'isg_expert') {
      const allowedLocations = user.location_ids || [];
      if (!allowedLocations.includes(regionToDelete?.location_id || '')) {
        Swal.fire({
          title: 'Hata!',
          text: 'Bu bölgeyi silme yetkisi yoktur',
          icon: 'error',
          confirmButtonColor: '#3b82f6',
        });
        return;
      }
    }

    const result = await Swal.fire({
      title: 'Bölgeyi Sil',
      html: `<div style="text-align: left;">
        <p><strong>${regionToDelete?.name}</strong> bölgesini silmek istediğinize emin misiniz?</p>
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
      // Silmeden önce bölge bilgilerini al
      const regionToDelete = regions.find(r => r.id === id);

      await api.regions.delete(id);

      // Detaylı bilgileri logla
      await logAction(LogActions.DELETE_REGION, {
        region_id: id,
        region_name: regionToDelete?.name,
        location_id: regionToDelete?.location_id,
        location_name: (regionToDelete?.locations as unknown as { name: string })?.name,
      });

      Swal.fire({
        title: 'Silindi!',
        text: `${regionToDelete?.name} başarıyla silindi.`,
        icon: 'success',
        confirmButtonColor: '#3b82f6',
      });

      await loadData();
    } catch (err) {
      console.error('Failed to delete region:', err);
      const errorMessage = err instanceof Error ? err.message : t('messages.errorDelete');
      Swal.fire({
        title: 'Hata!',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#3b82f6',
      });
    }
  }

  // Generate dynamic QR code URL based on current region data
  function generateQRCodeUrl(region: Region): string {
    // Use VITE_API_URL as base URL for domain portability
    // This allows the project to be moved to different domains without updating QR codes
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
    return `${baseUrl}/report/${region.location_id}/${region.qr_code_token}?region=${region.id}`;
  }

  async function generateAndDownloadQRCode(region: Region) {
    try {
      // Generate QR code with current region data
      const dynamicQrUrl = generateQRCodeUrl(region);

      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, dynamicQrUrl, {
        width: 297, // %15 küçültme (350 * 0.85 = 297.5)
        margin: 2,
      });

      // Get location name from locations state
      const location = locations.find(l => l.id === region.location_id);
      const locationName = location?.name || (region.locations as unknown as { name: string })?.name || 'Lokasyon';

      // Create a new canvas with extra space for title and location info
      const titleHeight = 160;
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = qrCanvas.width;
      finalCanvas.height = qrCanvas.height + titleHeight;

      const ctx = finalCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context bulunamadı');

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // Draw location name
      ctx.fillStyle = '#6B7280'; // Gray
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`📍 ${locationName}`, finalCanvas.width / 2, 8);

      // Draw region name
      ctx.fillStyle = '#1F2937'; // Dark gray
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText(region.name, finalCanvas.width / 2, 38);

      // Draw main title
      ctx.fillStyle = '#1F2937'; // Dark gray
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText('Ramakkala Bildirimi Yap', finalCanvas.width / 2, 80);

      // Draw instruction text
      ctx.fillStyle = '#6B7280'; // Gray
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.fillText('QR kodu tarayarak rapor gönderin', finalCanvas.width / 2, 110);

      // Draw QR code on the canvas below title
      ctx.drawImage(qrCanvas, (finalCanvas.width - qrCanvas.width) / 2, titleHeight);

      // Download
      const link = document.createElement('a');
      link.download = `qr-${locationName.replace(/\s+/g, '-')}-${region.name.replace(/\s+/g, '-')}.png`;
      link.href = finalCanvas.toDataURL();
      link.click();
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      alert(t('messages.qrCodeError') || 'QR kod oluşturulurken bir hata oluştu');
    }
  }

  // Generate and display QR code in a modal
  async function generateAndDisplayQRCode(region: Region) {
    try {
      const dynamicQrUrl = generateQRCodeUrl(region);

      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, dynamicQrUrl, {
        width: 400,
        margin: 2,
      });

      // Get location name from locations state
      const location = locations.find(l => l.id === region.location_id);
      const locationName = location?.name || (region.locations as unknown as { name: string })?.name || 'Lokasyon';

      // Create modal to display QR code
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-2">📍 ${locationName}</h2>
          <h3 class="text-lg font-medium text-gray-700 mb-4">${region.name}</h3>
          <div class="flex justify-center mb-4"></div>
          <p class="text-sm text-gray-600 mb-2 text-center font-mono text-blue-600 break-all">${dynamicQrUrl}</p>
          <button class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">Kopyala</button>
        </div>
      `;

      const qrContainer = modal.querySelector('div:nth-child(2)');
      if (qrContainer) {
        qrContainer.appendChild(qrCanvas);
      }

      const copyBtn = modal.querySelector('button');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(dynamicQrUrl);
            copyBtn.textContent = 'Kopyalandı!';
            setTimeout(() => {
              copyBtn.textContent = 'Kopyala';
            }, 2000);
          } catch (err) {
            console.error('Failed to copy:', err);
          }
        });
      }

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });

      document.body.appendChild(modal);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      alert(t('messages.qrCodeError') || 'QR kod oluşturulurken bir hata oluştu');
    }
  }

  // Calculate region counts per location
  const locationCounts = locations.reduce((acc, loc) => {
    acc[loc.id] = regions.filter((r) => r.location_id === loc.id).length;
    return acc;
  }, {} as Record<string, number>);

  // Handle location card click
  function handleLocationCardClick(locationId: string | null) {
    if (locationId === activeLocationCard) {
      // Clicking the same card again deselects it
      setActiveLocationCard(null);
      setSelectedLocationFilter('');
    } else {
      setActiveLocationCard(locationId);
      setSelectedLocationFilter(locationId || '');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold text-white">{t('regions.title')}</h1>
          <p className="text-slate-400 text-lg mt-2">{t('regions.subtitle') || 'QR kodlu bölgeleri yönetin'}</p>
        </div>
        <button
          onClick={() => openModal()}
          disabled={user?.role === 'isg_expert' && (!user.location_ids || user.location_ids.length === 0)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          {t('regions.addNew')}
        </button>
      </div>

      {/* Location Cards */}
      {locations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
          {/* Tümü Card */}
          <button
            onClick={() => handleLocationCardClick(null)}
            className={`p-4 rounded-lg border transition-all duration-200 ${
              activeLocationCard === null && !selectedLocationFilter
                ? 'bg-slate-600 border-slate-500 ring-2 ring-slate-400'
                : 'bg-gradient-to-br from-slate-800 to-slate-700 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${activeLocationCard === null && !selectedLocationFilter ? 'bg-slate-500' : 'bg-slate-500/20'}`}>
                <Building2 className={`w-5 h-5 ${activeLocationCard === null && !selectedLocationFilter ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <div className="text-left min-w-0">
                <p className={`text-xl font-bold ${activeLocationCard === null && !selectedLocationFilter ? 'text-white' : 'text-slate-300'}`}>
                  {regions.length}
                </p>
                <p className={`text-xs truncate ${activeLocationCard === null && !selectedLocationFilter ? 'text-slate-100' : 'text-slate-400'}`}>
                  Tümü
                </p>
              </div>
            </div>
          </button>

          {/* Location Cards */}
          {locations.map((location, index) => {
            const colors = [
              { bg: 'bg-blue-600', bgLight: 'bg-blue-500/20', border: 'border-blue-500', ring: 'ring-blue-400', text: 'text-blue-400', textActive: 'text-blue-100' },
              { bg: 'bg-green-600', bgLight: 'bg-green-500/20', border: 'border-green-500', ring: 'ring-green-400', text: 'text-green-400', textActive: 'text-green-100' },
              { bg: 'bg-purple-600', bgLight: 'bg-purple-500/20', border: 'border-purple-500', ring: 'ring-purple-400', text: 'text-purple-400', textActive: 'text-purple-100' },
              { bg: 'bg-orange-600', bgLight: 'bg-orange-500/20', border: 'border-orange-500', ring: 'ring-orange-400', text: 'text-orange-400', textActive: 'text-orange-100' },
              { bg: 'bg-cyan-600', bgLight: 'bg-cyan-500/20', border: 'border-cyan-500', ring: 'ring-cyan-400', text: 'text-cyan-400', textActive: 'text-cyan-100' },
              { bg: 'bg-pink-600', bgLight: 'bg-pink-500/20', border: 'border-pink-500', ring: 'ring-pink-400', text: 'text-pink-400', textActive: 'text-pink-100' },
              { bg: 'bg-amber-600', bgLight: 'bg-amber-500/20', border: 'border-amber-500', ring: 'ring-amber-400', text: 'text-amber-400', textActive: 'text-amber-100' },
              { bg: 'bg-teal-600', bgLight: 'bg-teal-500/20', border: 'border-teal-500', ring: 'ring-teal-400', text: 'text-teal-400', textActive: 'text-teal-100' },
            ];
            const color = colors[index % colors.length];
            const isActive = activeLocationCard === location.id;

            return (
              <button
                key={location.id}
                onClick={() => handleLocationCardClick(location.id)}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  isActive
                    ? `${color.bg} ${color.border} ring-2 ${color.ring}`
                    : `bg-gradient-to-br from-slate-800 to-slate-700 border-slate-700 hover:${color.border}`
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isActive ? color.bg.replace('600', '500') : color.bgLight}`}>
                    <MapPin className={`w-5 h-5 ${isActive ? 'text-white' : color.text}`} />
                  </div>
                  <div className="text-left min-w-0">
                    <p className={`text-xl font-bold ${isActive ? 'text-white' : color.text}`}>
                      {locationCounts[location.id] || 0}
                    </p>
                    <p className={`text-xs truncate ${isActive ? color.textActive : 'text-slate-400'}`} title={location.name}>
                      {location.name}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md p-4 mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">{t('regions.filterByLocation') || 'Lokasyona Göre Filtrele'}</label>
        <select
          value={selectedLocationFilter}
          onChange={(e) => {
            setSelectedLocationFilter(e.target.value);
            setActiveLocationCard(e.target.value || null);
          }}
          className="w-full sm:w-64 px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">{t('regions.allLocations') || 'Tüm Lokasyonlar'}</option>
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
            <thead>
              <tr className="border-b border-slate-600">
                <th className="text-left p-4 text-sm font-semibold text-slate-300">{t('regions.name')}</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-300">{t('regions.location')}</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-300">{t('regions.description')}</th>
                <th className="text-center p-4 text-sm font-semibold text-slate-300">{t('common.status') || 'Durum'}</th>
                <th className="text-center p-4 text-sm font-semibold text-slate-300">{t('regions.scanCount') || 'Tarama Sayısı'}</th>
                <th className="text-center p-4 text-sm font-semibold text-slate-300">{t('regions.qrCode') || 'QR Kod'}</th>
                <th className="text-center p-4 text-sm font-semibold text-slate-300">{t('common.actions') || 'İşlemler'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegions.map((region) => (
                <tr key={region.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <span className="text-slate-100 font-medium">{region.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-300">
                    {(region.locations as unknown as { name: string })?.name}
                  </td>
                  <td className="p-4 text-slate-400 text-sm max-w-xs truncate">
                    {region.description || '-'}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        region.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {region.is_active ? t('common.active') : (t('common.inactive') || 'Pasif')}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-slate-100 font-semibold text-lg">
                      {region.scan_count || 0}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => generateAndDisplayQRCode(region)}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        title={t('regions.viewQr') || 'QR Kodu Görüntüle'}
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => generateAndDownloadQRCode(region)}
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        title={t('regions.downloadQr') || 'QR Kodu İndir'}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openModal(region)}
                        disabled={user?.role === 'isg_expert' && !(user.location_ids || []).includes(region.location_id)}
                        className="p-2 bg-slate-600 text-slate-300 rounded-lg hover:bg-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('common.edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(region.id)}
                        disabled={user?.role === 'isg_expert' && !(user.location_ids || []).includes(region.location_id)}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('common.delete') || 'Sil'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredRegions.length === 0 && (
        <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md p-12 text-center">
          <QrCode className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">{t('regions.noRegions') || 'Henüz bölge yok'}</h3>
          <p className="text-slate-400 mb-6">{t('regions.createFirstRegion') || 'İlk bölgenizi oluşturarak başlayın'}</p>
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
                  <option value="">{t('regions.selectLocation') || 'Lokasyon Seçin'}</option>
                  {locations.map((loc) => {
                    // For isg_expert, only show their assigned locations
                    if (user?.role === 'isg_expert') {
                      const allowedLocations = user.location_ids || [];
                      if (!allowedLocations.includes(loc.id)) {
                        return null;
                      }
                    }
                    return (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    );
                  })}
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
    </div>
  );
}
