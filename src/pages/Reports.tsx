import { useEffect, useState } from 'react';
import { api, supabase } from '../lib/supabase';
import { logAction, LogActions } from '../lib/logger';
import { Search, Filter, X, AlertTriangle, Eye, Download, Image as ImageIcon } from 'lucide-react';

interface Report {
  id: string;
  incident_number: string;
  location_id: string;
  region_id: string;
  full_name: string;
  phone: string;
  category: string;
  description: string;
  status: string;
  internal_notes: string;
  created_at: string;
  image_path?: string;
  location_name?: string;
  region_name?: string;
  locations?: { name: string };
  regions?: { name: string };
}

interface Location {
  id: string;
  name: string;
}

interface Region {
  id: string;
  name: string;
  location_id: string;
}

const CATEGORIES = [
  'Kayma/Düşme',
  'Elektrik',
  'Makine Güvenliği',
  'Kimyasal',
  'Yangın',
  'Ergonomi',
  'İş Ekipmanları',
  'Diğer',
];

const STATUSES = ['Yeni', 'İnceleniyor', 'Kapatıldı'];

export function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    location_id: '',
    region_id: '',
    category: '',
    status: '',
    date_from: '',
    date_to: '',
  });
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reports, filters, searchTerm]);

  async function loadData() {
    try {
      const [reportsData, locationsData, regionsData] = await Promise.all([
        api.reports.getList(),
        api.locations.getList(),
        api.regions.getList(''),
      ]);

      setReports(reportsData || []);
      setLocations(locationsData || []);
      setRegions(regionsData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...reports];

    if (filters.location_id) {
      filtered = filtered.filter((r) => r.location_id === filters.location_id);
    }

    if (filters.region_id) {
      filtered = filtered.filter((r) => r.region_id === filters.region_id);
    }

    if (filters.category) {
      filtered = filtered.filter((r) => r.category === filters.category);
    }

    if (filters.status) {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    if (filters.date_from) {
      filtered = filtered.filter(
        (r) => new Date(r.created_at) >= new Date(filters.date_from)
      );
    }

    if (filters.date_to) {
      const dateTo = new Date(filters.date_to);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => new Date(r.created_at) <= dateTo);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.incident_number.toLowerCase().includes(term) ||
          r.full_name.toLowerCase().includes(term) ||
          r.description.toLowerCase().includes(term)
      );
    }

    setFilteredReports(filtered);
  }

  function clearFilters() {
    setFilters({
      location_id: '',
      region_id: '',
      category: '',
      status: '',
      date_from: '',
      date_to: '',
    });
    setSearchTerm('');
  }

  function openDetail(report: Report) {
    setSelectedReport(report);
    setEditNotes(report.internal_notes);
    setEditStatus(report.status);
    setShowDetailModal(true);
  }

  async function handleUpdateReport() {
    if (!selectedReport) return;

    try {
      // Reports don't have an update method in the api, so we'll use the backend endpoint directly
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:6000'}/api/reports/${selectedReport.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: editStatus,
          internal_notes: editNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Rapor güncellenirken hata oluştu');
      }

      await logAction(LogActions.UPDATE_NEARMISS, { report_id: selectedReport.id });
      await loadData();
      setShowDetailModal(false);
    } catch (err) {
      console.error('Failed to update report:', err);
      alert('Rapor güncellenirken bir hata oluştu');
    }
  }

  const availableRegions = filters.location_id
    ? regions.filter((r) => r.location_id === filters.location_id)
    : regions;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ramak Kala Raporları</h1>
        <p className="text-gray-600 mt-1">Tüm ramak kala bildirimlerini görüntüleyin ve yönetin</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Olay no, ad soyad veya açıklamada ara..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filtreler
            {showFilters && <X className="w-4 h-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lokasyon</label>
              <select
                value={filters.location_id}
                onChange={(e) =>
                  setFilters({ ...filters, location_id: e.target.value, region_id: '' })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tümü</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bölge</label>
              <select
                value={filters.region_id}
                onChange={(e) => setFilters({ ...filters, region_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!filters.location_id}
              >
                <option value="">Tümü</option>
                {availableRegions.map((reg) => (
                  <option key={reg.id} value={reg.id}>
                    {reg.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tümü</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tümü</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{filteredReports.length}</span> rapor
            bulundu
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Olay No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lokasyon / Bölge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bildirim Yapan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {report.incident_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div>{report.location_name || (report.locations as unknown as { name: string })?.name}</div>
                    <div className="text-xs text-gray-500">
                      {report.region_name || (report.regions as unknown as { name: string })?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div>{report.full_name}</div>
                    <div className="text-xs text-gray-500">{report.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {report.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(report.created_at).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        report.status === 'Yeni'
                          ? 'bg-yellow-100 text-yellow-800'
                          : report.status === 'İnceleniyor'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openDetail(report)}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Detay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReports.length === 0 && (
          <div className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Rapor bulunamadı</h3>
            <p className="text-gray-600">Filtreleri değiştirerek tekrar deneyin</p>
          </div>
        )}
      </div>

      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Rapor Detayı</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Olay Numarası</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedReport.incident_number}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                  <p className="text-gray-900">
                    {new Date(selectedReport.created_at).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lokasyon</label>
                  <p className="text-gray-900">
                    {selectedReport.location_name || (selectedReport.locations as unknown as { name: string })?.name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bölge</label>
                  <p className="text-gray-900">
                    {selectedReport.region_name || (selectedReport.regions as unknown as { name: string })?.name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bildirim Yapan</label>
                  <p className="text-gray-900">{selectedReport.full_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <p className="text-gray-900">{selectedReport.phone}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <p className="text-gray-900">{selectedReport.category}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {selectedReport.description || 'Açıklama girilmemiş'}
                  </p>
                </div>
              </div>

              {selectedReport.image_path && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Yüklenen Görsel</label>
                  <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center gap-4">
                    <div className="w-full max-h-96 flex items-center justify-center bg-white rounded border border-gray-200">
                      <img
                        src={selectedReport.image_path}
                        alt="Rapor görseli"
                        className="max-w-full max-h-96 object-contain"
                      />
                    </div>
                    <div className="w-full flex gap-2">
                      <a
                        href={selectedReport.image_path}
                        download
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Görseli İndir
                      </a>
                      <a
                        href={selectedReport.image_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Tam Boyut
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dahili Notlar (Sadece yöneticiler görebilir)
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Rapor hakkında notlarınızı buraya ekleyin..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Kapat
                </button>
                <button
                  onClick={handleUpdateReport}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
