import { useEffect, useState } from 'react';
import { api, supabase } from '../lib/supabase';
import { useI18n, useLanguageChange } from '../lib/i18n';
import { MapPin, AlertTriangle, TrendingUp, Calendar, Zap, Building2, BarChart3, Clock, Lock } from 'lucide-react';
import type { UserProfile } from '../lib/auth';

interface Stats {
  totalLocations: number;
  totalReports: number;
  newReports: number;
  reportsByCategory: { category: string; count: number }[];
  reportsByLocation: { location_name: string; count: number }[];
  recentReports: {
    id: string;
    incident_number: string;
    full_name: string;
    category: string;
    created_at: string;
    status: string;
  }[];
}

export function Dashboard() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalLocations: 0,
    totalReports: 0,
    newReports: 0,
    reportsByCategory: [],
    reportsByLocation: [],
    recentReports: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  // Dil değişiminde sayfayı yeniden render et
  useLanguageChange();

  async function loadStats() {
    try {
      // Get current user from localStorage
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      setCurrentUser(user);

      // Check if user has no assigned locations and is not admin
      if (user && user.role !== 'admin' && (!user.location_ids || user.location_ids.length === 0)) {
        // User has no access to any locations
        setStats({
          totalLocations: 0,
          totalReports: 0,
          newReports: 0,
          reportsByCategory: [],
          reportsByLocation: [],
          recentReports: [],
        });
        setLoading(false);
        return;
      }

      const [locationsData, reportsData] = await Promise.all([
        api.locations.getList(),
        api.reports.getList(),
      ]);

      const activeLocations = (locationsData || []).filter((loc: any) => loc.is_active);
      const allReports = reportsData || [];
      const newReports = allReports.filter((report: any) => report.status === 'Yeni');

      const categoryCount: Record<string, number> = {};
      allReports.forEach((report: any) => {
        categoryCount[report.category] = (categoryCount[report.category] || 0) + 1;
      });

      const locationCount: Record<string, number> = {};
      allReports.forEach((report: any) => {
        const locName = (report.locations as unknown as { name: string })?.name;
        if (locName) {
          locationCount[locName] = (locationCount[locName] || 0) + 1;
        }
      });

      const recentReportsList = allReports
        .slice(0, 10)
        .map((report: any) => ({
          id: report.id,
          incident_number: report.incident_number,
          full_name: report.full_name,
          category: report.category,
          created_at: report.created_at,
          status: report.status,
        }));

      setStats({
        totalLocations: activeLocations.length,
        totalReports: allReports.length,
        newReports: newReports.length,
        reportsByCategory: Object.entries(categoryCount).map(([category, count]) => ({
          category,
          count,
        })),
        reportsByLocation: Object.entries(locationCount).map(([location_name, count]) => ({
          location_name,
          count,
        })),
        recentReports: recentReportsList,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }

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

  const monthReports = stats.recentReports.filter((r) => {
    const date = new Date(r.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -mx-6 -my-6 px-6 py-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">{t('dashboard.title') || 'Gösterge Paneli'}</h1>
        <p className="text-slate-400 text-lg">{t('dashboard.subtitle') || 'Ramak kala raporlama sistemi özeti ve istatistikleri'}</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Locations Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl transition-all duration-300 group-hover:bg-blue-400/20" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium tracking-wide">{t('dashboard.totalLocations') || 'TOPLAM LOKASYON'}</p>
              <p className="text-4xl font-bold text-white mt-2">{stats.totalLocations}</p>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md transition-all duration-300 group-hover:scale-110">
              <Building2 className="h-10 w-10 text-blue-200" />
            </div>
          </div>
        </div>

        {/* Total Reports Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-1">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl transition-all duration-300 group-hover:bg-emerald-400/20" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium tracking-wide">{t('dashboard.totalReports') || 'TOPLAM RAPOR'}</p>
              <p className="text-4xl font-bold text-white mt-2">{stats.totalReports}</p>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md transition-all duration-300 group-hover:scale-110">
              <BarChart3 className="h-10 w-10 text-emerald-200" />
            </div>
          </div>
        </div>

        {/* New Reports Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-1">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl transition-all duration-300 group-hover:bg-amber-400/20" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium tracking-wide">{t('dashboard.newReports') || 'YENİ RAPORLAR'}</p>
              <p className="text-4xl font-bold text-white mt-2">{stats.newReports}</p>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md transition-all duration-300 group-hover:scale-110">
              <Zap className="h-10 w-10 text-amber-200" />
            </div>
          </div>
        </div>

        {/* This Month Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/20 hover:-translate-y-1">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-400/10 blur-2xl transition-all duration-300 group-hover:bg-violet-400/20" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-violet-100 text-sm font-medium tracking-wide">{t('dashboard.thisMonth') || 'BU AY'}</p>
              <p className="text-4xl font-bold text-white mt-2">{monthReports}</p>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md transition-all duration-300 group-hover:scale-110">
              <Clock className="h-10 w-10 text-violet-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Categories Distribution */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-6 border border-slate-700 backdrop-blur-md">
          <h2 className="text-xl font-bold text-white mb-6">{t('dashboard.categoryDistribution') || 'Kategorilere Göre Dağılım'}</h2>
          {stats.reportsByCategory.length === 0 ? (
            <p className="text-slate-400 text-center py-12">{t('dashboard.noReports') || 'Henüz rapor bulunmuyor'}</p>
          ) : (
            <div className="space-y-5">
              {stats.reportsByCategory
                .sort((a, b) => b.count - a.count)
                .map((item, index) => {
                  const colors = [
                    'from-blue-500 to-cyan-500',
                    'from-purple-500 to-pink-500',
                    'from-emerald-500 to-teal-500',
                    'from-orange-500 to-red-500',
                    'from-yellow-500 to-amber-500',
                  ];
                  const color = colors[index % colors.length];
                  const percentage = stats.totalReports > 0 ? (item.count / stats.totalReports) * 100 : 0;

                  return (
                    <div key={item.category}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-200 font-medium text-sm">{item.category}</span>
                        <span className="text-slate-400 text-sm">{item.count}</span>
                      </div>
                      <div className="w-full bg-slate-600/50 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
                          style={{
                            width: `${percentage}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Locations Distribution */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-6 border border-slate-700 backdrop-blur-md">
          <h2 className="text-xl font-bold text-white mb-6">{t('dashboard.locationDistribution') || 'Lokasyonlara Göre Dağılım'}</h2>
          {stats.reportsByLocation.length === 0 ? (
            <p className="text-slate-400 text-center py-12">{t('dashboard.noReports') || 'Henüz rapor bulunmuyor'}</p>
          ) : (
            <div className="space-y-5">
              {stats.reportsByLocation
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((item, index) => {
                  const colors = [
                    'from-emerald-500 to-teal-500',
                    'from-cyan-500 to-blue-500',
                    'from-violet-500 to-purple-500',
                    'from-pink-500 to-rose-500',
                    'from-amber-500 to-orange-500',
                  ];
                  const color = colors[index % colors.length];
                  const percentage = stats.totalReports > 0 ? (item.count / stats.totalReports) * 100 : 0;

                  return (
                    <div key={item.location_name}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-200 font-medium text-sm">{item.location_name}</span>
                        <span className="text-slate-400 text-sm">{item.count}</span>
                      </div>
                      <div className="w-full bg-slate-600/50 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
                          style={{
                            width: `${percentage}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Reports Section */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md overflow-hidden">
        <div className="p-6 border-b border-slate-600">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full" />
            {t('dashboard.recentReports') || 'Son Raporlar'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-600">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {t('dashboard.incidentNumber') || 'Olay No'}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {t('dashboard.reporter') || 'Bildirim Yapan'}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {t('reports.category') || 'Kategori'}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {t('dashboard.date') || 'Tarih'}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {t('reports.status') || 'Durum'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {stats.recentReports.map((report, index) => (
                <tr
                  key={report.id}
                  className="hover:bg-slate-900/50 transition-colors duration-200 border-slate-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-300">
                    {report.incident_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {report.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-3 py-1 rounded-lg bg-slate-700/50 text-slate-200 text-xs font-medium">
                      {report.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {new Date(report.created_at).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="sm:px-6 px-3 sm:py-4 py-2 whitespace-nowrap">
                    <span
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg backdrop-blur-md transition-all duration-200 ${
                        report.status === 'Yeni'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : report.status === 'İnceleniyor'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stats.recentReports.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-400">{t('dashboard.noReports') || 'Henüz rapor bulunmuyor'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
