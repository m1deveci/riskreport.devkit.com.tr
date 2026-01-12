import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { logAction, LogActions } from '../lib/logger';
import { api } from '../lib/api';
import { Search, Filter, X, AlertTriangle, Eye, Download, Image as ImageIcon, Lock, History, FileDown, UserPlus, Users } from 'lucide-react';
import type { UserProfile } from '../lib/auth';
import { useI18n, useLanguageChange } from '../lib/i18n';
import { exportReportsAsPDF, exportReportsAsExcel, type ReportExportData } from '../lib/exportUtils';

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
  assigned_user_id?: string;
  assigned_user_name?: string;
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

interface ReportHistory {
  id: string;
  report_id: string;
  changed_by_user_id: string | null;
  changed_by_user_name: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  change_description: string | null;
  created_at: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  location_ids: string[];
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

const STATUSES = ['Yeni', 'Devam Ediyor', 'Tamamlandı'];

// Helper function to translate field names based on language
const getFieldDisplayName = (fieldName: string, t: (key: string) => string): string => {
  const fieldMap: { [key: string]: string } = {
    'status': t('reports.fieldStatus') || 'Durum',
    'internal_notes': t('reports.fieldInternalNotes') || 'İç Notlar',
  };
  return fieldMap[fieldName] || fieldName;
};

// Helper function to translate change descriptions
const getChangeDescription = (fieldName: string, oldValue: string, newValue: string, t: (key: string) => string): string => {
  if (fieldName === 'status') {
    return `${t('reports.statusChanged') || 'Durum değiştirildi'}: ${oldValue} → ${newValue}`;
  } else if (fieldName === 'internal_notes') {
    return t('reports.notesChanged') || 'Not eklendi/değiştirildi';
  }
  return '';
};

export function Reports() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportHistory, setReportHistory] = useState<ReportHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [showQuickAddUser, setShowQuickAddUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    full_name: '',
    email: '',
    password: '',
  });
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

    // URL'den status parametresini oku ve filtre uygula
    const searchParams = new URLSearchParams(window.location.search);
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setFilters((prev) => ({
        ...prev,
        status: statusParam,
      }));
      // URL'den parametreyi temizle
      window.history.replaceState({}, '', '/reports');
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reports, filters, searchTerm]);

  useLanguageChange();

  async function loadData() {
    try {
      // Get current user from localStorage
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      setCurrentUser(user);

      // Check if user has no assigned locations and is not admin
      if (user && user.role !== 'admin' && (!user.location_ids || user.location_ids.length === 0)) {
        // User has no access to any locations
        setReports([]);
        setLocations([]);
        setRegions([]);
        setLoading(false);
        return;
      }

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

  async function handleExportPDF() {
    const dataToExport: ReportExportData[] = filteredReports.map((report) => ({
      incident_number: report.incident_number,
      location_name: report.location_name || report.locations?.name || 'Bilinmeyen',
      region_name: report.region_name || report.regions?.name || 'Bilinmeyen',
      full_name: report.full_name,
      phone: report.phone,
      category: report.category,
      status: report.status,
      description: report.description,
      internal_notes: report.internal_notes,
      created_at: new Date(report.created_at).toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    const filename = `raporlar_${new Date().toISOString().split('T')[0]}.pdf`;
    await exportReportsAsPDF(dataToExport, {
      filename,
      title: 'Ramakkala Raporları',
      subtitle: `Toplam ${dataToExport.length} rapor`,
    });
  }

  function handleExportExcel() {
    const dataToExport: ReportExportData[] = filteredReports.map((report) => ({
      incident_number: report.incident_number,
      location_name: report.location_name || report.locations?.name || 'Bilinmeyen',
      region_name: report.region_name || report.regions?.name || 'Bilinmeyen',
      full_name: report.full_name,
      phone: report.phone,
      category: report.category,
      status: report.status,
      description: report.description,
      internal_notes: report.internal_notes,
      created_at: new Date(report.created_at).toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    const filename = `raporlar_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportReportsAsExcel(dataToExport, {
      filename,
      title: 'Ramakkala Raporları',
    });
  }

  function canEditReport(report: Report): boolean {
    if (currentUser.role === 'admin') {
      return true;
    }
    if (currentUser.role === 'isg_expert') {
      // ISG Expert can only edit reports from their assigned locations
      const userLocationIds = currentUser.location_ids || [];
      return userLocationIds.includes(report.location_id);
    }
    if (currentUser.role === 'viewer') {
      // Viewer can only edit reports assigned to them
      return report.assigned_user_id === currentUser.id;
    }
    return false;
  }

  function canDeleteReport(report: Report): boolean {
    // Only admin and isg_expert can delete reports
    if (currentUser.role === 'admin') {
      return true;
    }
    if (currentUser.role === 'isg_expert') {
      const userLocationIds = currentUser.location_ids || [];
      return userLocationIds.includes(report.location_id);
    }
    return false;
  }

  function openDetail(report: Report) {
    setSelectedReport(report);
    setEditNotes(report.internal_notes);
    setEditStatus(report.status);
    setShowDetailModal(true);
    setShowHistoryModal(false);
    loadReportHistory(report.id);
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
        const errorData = await response.json();
        throw new Error(errorData.error || t('messages.errorUpdate'));
      }

      await logAction(LogActions.UPDATE_NEARMISS, { report_id: selectedReport.id });
      await loadData();
      setShowDetailModal(false);

      // Show success message with SweetAlert
      await Swal.fire({
        icon: 'success',
        title: 'Başarılı',
        text: 'Rapor başarıyla güncellenmiştir.',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Tamam',
      });
    } catch (err) {
      console.error('Failed to update report:', err);

      // Show error message with SweetAlert
      await Swal.fire({
        icon: 'error',
        title: 'Hata',
        text: err instanceof Error ? err.message : t('messages.errorUpdate'),
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Tamam',
      });
    }
  }

  async function loadReportHistory(reportId: string) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:6000'}/api/reports/${reportId}/history`);
      if (!response.ok) {
        throw new Error('Failed to load history');
      }
      const history = await response.json();
      setReportHistory(history);
    } catch (err) {
      console.error('Failed to load report history:', err);
      setReportHistory([]);
    }
  }

  async function handleDeleteReport() {
    if (!selectedReport) return;

    // Show SweetAlert confirmation
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Raporu Sil?',
      text: 'Bu işlem geri alınamaz. Raporu silmek istiyor musunuz?',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Evet, Sil',
      cancelButtonText: 'İptal',
    });

    if (!result.isConfirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:6000'}/api/reports/${selectedReport.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('messages.errorDelete'));
      }

      // Detaylı bilgileri logla
      await logAction(LogActions.DELETE_NEARMISS, {
        report_id: selectedReport.id,
        incident_number: selectedReport.incident_number,
        report_title: selectedReport.title || `${selectedReport.category} - ${selectedReport.reporter_name}`,
        category: selectedReport.category,
        reporter_name: selectedReport.reporter_name,
      });
      await loadData();
      setShowDetailModal(false);

      // Show success message with SweetAlert
      await Swal.fire({
        icon: 'success',
        title: 'Başarılı',
        text: 'Rapor başarıyla silinmiştir.',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Tamam',
      });
    } catch (err) {
      console.error('Failed to delete report:', err);

      // Show error message with SweetAlert
      await Swal.fire({
        icon: 'error',
        title: 'Hata',
        text: err instanceof Error ? err.message : t('messages.errorDelete'),
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Tamam',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function loadUsers() {
    try {
      const data = await api.users.getList();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }

  function openAssignModal(report: Report) {
    setSelectedReport(report);
    setShowAssignModal(true);
    setSelectedUserId('');
    setShowQuickAddUser(false);
    loadUsers();
  }

  async function handleAssignReport() {
    if (!selectedReport || !selectedUserId) {
      await Swal.fire({
        icon: 'warning',
        title: 'Uyarı',
        text: 'Lütfen bir kullanıcı seçin',
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Tamam',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:6000'}/api/reports/${selectedReport.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: selectedUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Rapor atama başarısız');
      }

      await loadData();
      setShowAssignModal(false);

      await Swal.fire({
        icon: 'success',
        title: 'Başarılı',
        text: 'Rapor başarıyla kullanıcıya atandı ve e-posta gönderildi',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Tamam',
      });
    } catch (err) {
      console.error('Failed to assign report:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Hata',
        text: err instanceof Error ? err.message : 'Rapor atama başarısız',
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Tamam',
      });
    }
  }

  async function handleQuickAddUser() {
    if (!newUserData.full_name || !newUserData.email || !newUserData.password) {
      await Swal.fire({
        icon: 'warning',
        title: 'Uyarı',
        text: 'Tüm alanları doldurun',
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Tamam',
      });
      return;
    }

    if (!selectedReport) return;

    try {
      const userData = {
        full_name: newUserData.full_name,
        email: newUserData.email,
        password: newUserData.password,
        role: 'viewer',
        location_ids: [selectedReport.location_id],
      };

      const result = await api.users.create(userData);

      await Swal.fire({
        icon: 'success',
        title: 'Başarılı',
        text: 'Kullanıcı başarıyla oluşturuldu',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Tamam',
      });

      // Reload users and select the new user
      await loadUsers();
      setSelectedUserId(result.id);
      setShowQuickAddUser(false);
      setNewUserData({ full_name: '', email: '', password: '' });
    } catch (err) {
      console.error('Failed to create user:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Hata',
        text: err instanceof Error ? err.message : 'Kullanıcı oluşturma başarısız',
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Tamam',
      });
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

  // Check if user is restricted and has no assigned locations
  if (currentUser && currentUser.role !== 'admin' && (!currentUser.location_ids || currentUser.location_ids.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -mx-6 -my-6 px-6 py-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Lock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">{t('dashboard.restrictedAccess') || 'Erişim Kısıtlı'}</h2>
            <p className="text-slate-400">{t('dashboard.noAccessMessage') || 'Henüz hiçbir lokasyona yetki verilmemiştir. Sistem yöneticisine başvurunuz.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -mx-6 -my-6 px-6 py-6">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white">{t('reports.title')}</h1>
          <p className="text-slate-400 text-lg mt-2">{t('reports.subtitle') || 'Tüm ramakkala bildirimlerini görüntüleyin ve yönetin'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
            title="PDF olarak indir"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
            title="Excel olarak indir"
          >
            <FileDown className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('reports.search')}
              className="w-full pl-10 pr-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
          >
            <Filter className="w-5 h-5" />
            {t('reports.filter')}
            {showFilters && <X className="w-4 h-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-700">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('reports.location')}</label>
              <select
                value={filters.location_id}
                onChange={(e) =>
                  setFilters({ ...filters, location_id: e.target.value, region_id: '' })
                }
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('common.all') || 'Tümü'}</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('reports.region')}</label>
              <select
                value={filters.region_id}
                onChange={(e) => setFilters({ ...filters, region_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!filters.location_id}
              >
                <option value="">{t('common.all') || 'Tümü'}</option>
                {availableRegions.map((reg) => (
                  <option key={reg.id} value={reg.id}>
                    {reg.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('reports.category')}</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('common.all') || 'Tümü'}</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('reports.status')}</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('common.all') || 'Tümü'}</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('reports.from')}
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('reports.to')}</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                {t('reports.clearFilters') || 'Filtreleri Temizle'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            <span className="font-medium text-slate-100">{filteredReports.length}</span> {t('reports.reportsFound') || 'rapor bulundu'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b border-slate-600">
              <tr>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('dashboard.incidentNumber') || 'Olay No'}
                </th>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('reports.locationRegion') || 'Lokasyon / Bölge'}
                </th>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('dashboard.reporter') || 'Bildirim Yapan'}
                </th>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('reports.category') || 'Kategori'}
                </th>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('dashboard.date') || 'Tarih'}
                </th>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('reports.status') || 'Durum'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('common.actions') || 'İşlemler'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-slate-700">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-900/50 border-b border-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">
                    {report.incident_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    <div>{report.location_name || (report.locations as unknown as { name: string })?.name}</div>
                    <div className="text-xs text-slate-500">
                      {report.region_name || (report.regions as unknown as { name: string })?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    <div>{report.full_name}</div>
                    <div className="text-xs text-slate-500">{report.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {report.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {new Date(report.created_at).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="sm:px-6 px-3 sm:py-4 py-2 whitespace-nowrap">
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
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openDetail(report)}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        {t('reports.viewDetails') || 'Detayları Gör'}
                      </button>
                      {(currentUser?.role === 'admin' || currentUser?.role === 'isg_expert') && (
                        <button
                          onClick={() => openAssignModal(report)}
                          className="text-green-600 hover:text-green-900 inline-flex items-center gap-1"
                          title="Kullanıcıya Ata"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReports.length === 0 && (
          <div className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">{t('reports.noReportsFound') || 'Rapor bulunamadı'}</h3>
            <p className="text-slate-400">{t('reports.tryDifferentFilters') || 'Filtreleri değiştirerek tekrar deneyin'}</p>
          </div>
        )}
      </div>

      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 shadow-xl backdrop-blur-md max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">{t('reports.reportDetail') || 'Rapor Detayı'}</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t('reports.incidentNumber') || 'Olay Numarası'}</label>
                  <p className="text-lg font-semibold text-slate-100">{selectedReport.incident_number}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t('dashboard.date') || 'Tarih'}</label>
                  <p className="text-slate-100">
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
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t('reports.location') || 'Lokasyon'}</label>
                  <p className="text-slate-100">
                    {selectedReport.location_name || (selectedReport.locations as unknown as { name: string })?.name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t('reports.region') || 'Bölge'}</label>
                  <p className="text-slate-100">
                    {selectedReport.region_name || (selectedReport.regions as unknown as { name: string })?.name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t('dashboard.reporter') || 'Bildirim Yapan'}</label>
                  <p className="text-slate-100">{selectedReport.full_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t('reports.phone') || 'Telefon'}</label>
                  <p className="text-slate-100">{selectedReport.phone}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t('reports.category') || 'Kategori'}</label>
                  <p className="text-slate-100">{selectedReport.category}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t('reports.status') || 'Durum'}</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    disabled={!canEditReport(selectedReport)}
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('reports.description') || 'Açıklama'}</label>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-slate-100 whitespace-pre-wrap">
                    {selectedReport.description || (t('reports.noDescription') || 'Açıklama girilmemiş')}
                  </p>
                </div>
              </div>

              {selectedReport.image_path && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('reports.uploadedImage') || 'Yüklenen Görsel'}</label>
                  <div className="bg-slate-900/50 rounded-lg p-4 flex flex-col items-center gap-4">
                    <div className="w-full max-h-96 flex items-center justify-center bg-slate-800 rounded border border-slate-600">
                      <img
                        src={selectedReport.image_path}
                        alt={t('reports.reportImage') || 'Rapor görseli'}
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
                        {t('reports.downloadImage') || 'Görseli İndir'}
                      </a>
                      <a
                        href={selectedReport.image_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <ImageIcon className="w-4 h-4" />
                        {t('reports.fullSize') || 'Tam Boyut'}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('reports.internalNotes')}
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  disabled={!canEditReport(selectedReport)}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={t('reports.notesPlaceholder') || 'Rapor hakkında notlarınızı buraya ekleyin...'}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDetailModal(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('common.cancel') || 'Kapat'}
                </button>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <History className="w-4 h-4" />
                  {t('reports.history') || 'Geçmiş'}
                </button>
                {selectedReport && canDeleteReport(selectedReport) && (
                  <button
                    onClick={handleDeleteReport}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDeleting ? (t('common.deleting') || 'Siliniyor...') : t('common.delete')}
                  </button>
                )}
                {selectedReport && canEditReport(selectedReport) && (
                  <button
                    onClick={handleUpdateReport}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('common.save')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 shadow-xl backdrop-blur-md max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-blue-400" />
                <div>
                  <h2 className="text-xl font-semibold text-white">{t('reports.changeHistory') || 'Değişiklik Geçmişi'}</h2>
                  <p className="text-sm text-slate-400">{selectedReport.incident_number}</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {reportHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">{t('reports.noHistoryFound') || 'Değişiklik geçmişi bulunamadı'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reportHistory.map((item) => (
                    <div key={item.id} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-100">
                            {item.changed_by_user_name}
                          </p>
                          <p className="text-sm text-slate-400">
                            {new Date(item.created_at).toLocaleDateString('tr-TR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.action === 'CREATE'
                            ? 'bg-green-100 text-green-800'
                            : item.action === 'UPDATE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.action === 'CREATE' ? t('reports.created') || 'Oluşturuldu' :
                           item.action === 'UPDATE' ? t('reports.updated') || 'Güncellendi' : item.action}
                        </span>
                      </div>

                      <p className="text-slate-100 mb-2">
                        {item.field_name && item.old_value && item.new_value
                          ? getChangeDescription(item.field_name, item.old_value, item.new_value, t)
                          : item.change_description}
                      </p>

                      {item.field_name && (
                        <div className="text-sm space-y-1 bg-slate-800/50 p-2 rounded border border-slate-700">
                          <p className="text-slate-400">
                            <span className="font-medium">{t('reports.field') || 'Alan'}:</span> {getFieldDisplayName(item.field_name, t)}
                          </p>
                          {item.old_value && (
                            <p className="text-slate-400">
                              <span className="font-medium">{t('reports.oldValue') || 'Eski Değer'}:</span>{' '}
                              <span className="text-red-400 line-through">{item.old_value}</span>
                            </p>
                          )}
                          {item.new_value && (
                            <p className="text-slate-400">
                              <span className="font-medium">{t('reports.newValue') || 'Yeni Değer'}:</span>{' '}
                              <span className="text-green-400">{item.new_value}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                {t('common.close') || 'Kapat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 shadow-xl backdrop-blur-md max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-green-400" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Kullanıcıya Ata</h2>
                  <p className="text-sm text-slate-400">{selectedReport.incident_number}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!showQuickAddUser ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Kullanıcı Seçin
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Kullanıcı seçin...</option>
                      {users
                        .filter((user) => {
                          // Admin sees all users
                          if (currentUser?.role === 'admin') return true;
                          // ISG Expert sees only users from their locations
                          if (currentUser?.role === 'isg_expert') {
                            const userLocationIds = currentUser.location_ids || [];
                            return user.location_ids.some((locId) => userLocationIds.includes(locId));
                          }
                          return false;
                        })
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name} ({user.email})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleAssignReport}
                      disabled={!selectedUserId}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Atama Yap
                    </button>
                    <button
                      onClick={() => setShowQuickAddUser(true)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <UserPlus className="w-4 h-4 inline mr-2" />
                      Hızlı Kullanıcı Ekle
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-white mb-4">Yeni Kullanıcı Oluştur</h3>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Ad Soyad
                    </label>
                    <input
                      type="text"
                      value={newUserData.full_name}
                      onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ad Soyad"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      E-posta
                    </label>
                    <input
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Parola
                    </label>
                    <input
                      type="password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Parola (min. 6 karakter)"
                    />
                  </div>

                  <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                    <p className="text-sm text-blue-300">
                      ℹ️ Kullanıcı <strong>Çalışan (Viewer)</strong> rolüyle ve <strong>{locations.find(l => l.id === selectedReport.location_id)?.name || 'seçili'}</strong> lokasyonuna atanarak oluşturulacaktır.
                    </p>
                    <p className="text-sm text-blue-200 mt-2">
                      💡 Bu kullanıcı sadece kendisine atanan raporları görebilir ve düzenleyebilir. İSG Uzmanı eklemek için Users sayfasını kullanın.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowQuickAddUser(false)}
                      className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      Geri
                    </button>
                    <button
                      onClick={handleQuickAddUser}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Kullanıcı Oluştur ve Devam Et
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
