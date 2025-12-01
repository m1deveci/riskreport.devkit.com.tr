import { useEffect, useState } from 'react';
import { api, supabase } from '../lib/supabase';
import { useI18n, useLanguageChange } from '../lib/i18n';
import { MapPin, AlertTriangle, TrendingUp, Calendar, Zap, Building2, BarChart3, Clock, Lock, Activity, Target, Download } from 'lucide-react';
import type { UserProfile } from '../lib/auth';
import {
  calculateLocationHealth,
  analyzeReportStatusTransition,
  getActionSpeedRanking,
  getHealthColor,
  getHealthBgColor,
  getLastReportDescription,
  type LocationHealth,
  type ReportStatusAnalysis,
} from '../lib/dashboardAnalytics';
import {
  exportLocationRiskAsPDF,
  exportLocationRiskAsExcel,
  exportActionSpeedAsPDF,
  exportActionSpeedAsExcel,
} from '../lib/exportUtils';

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
  locationHealth: LocationHealth[];
  statusAnalysis: ReportStatusAnalysis[];
  actionSpeedRanking: any[];
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
    locationHealth: [],
    statusAnalysis: [],
    actionSpeedRanking: [],
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
          locationHealth: [],
          statusAnalysis: [],
          actionSpeedRanking: [],
        });
        setLoading(false);
        return;
      }

      const [locationsData, reportsData, regionsData] = await Promise.all([
        api.locations.getList(),
        api.reports.getList(),
        api.regions.getList(''),
      ]);

      const activeLocations = (locationsData || []).filter((loc: any) => loc.is_active);
      const allReports = reportsData || [];
      const allRegions = regionsData || [];
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

      // Yeni analytics hesapla
      const locationHealth = calculateLocationHealth(
        allReports as any[],
        activeLocations,
        allRegions
      );

      const statusAnalysis = analyzeReportStatusTransition(
        allReports as any[],
        activeLocations
      );

      const actionSpeedRanking = getActionSpeedRanking(statusAnalysis);

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
        locationHealth,
        statusAnalysis,
        actionSpeedRanking,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportLocationRiskPDF() {
    const dataToExport = stats.locationHealth.map((loc) => ({
      location: loc.location_name,
      healthScore: loc.healthScore,
      riskLevel: getHealthColorText(loc.healthScore),
      reportCount: loc.reportCount,
      lastReport: getLastReportDescription(loc.daysSinceLastReport),
      regions: loc.regions.map((r) => r.region_name).join(', '),
    }));

    const filename = `lokasyon_risk_durumu_${new Date().toISOString().split('T')[0]}.pdf`;
    await exportLocationRiskAsPDF(dataToExport, {
      filename,
      title: 'Lokasyon Risk Durumu Raporu',
      subtitle: `${new Date().toLocaleString('tr-TR')}`,
    });
  }

  function handleExportLocationRiskExcel() {
    const dataToExport = stats.locationHealth.map((loc) => ({
      'Lokasyon Adı': loc.location_name,
      'Risk Skoru': loc.healthScore,
      'Risk Seviyesi': getHealthColorText(loc.healthScore),
      'Rapor Sayısı': loc.reportCount,
      'Son Rapor': getLastReportDescription(loc.daysSinceLastReport),
      'Güvenli Bölgeler': loc.regions.filter((r) => r.isSafe).length,
      'Tehlikeli Bölgeler': loc.regions.filter((r) => !r.isSafe).length,
      'Tüm Bölgeler': loc.regions.map((r) => r.region_name).join('; '),
    }));

    const filename = `lokasyon_risk_durumu_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportLocationRiskAsExcel(dataToExport, {
      filename,
      title: 'Lokasyon Risk Durumu',
    });
  }

  function handleExportActionSpeedPDF() {
    const dataToExport = stats.actionSpeedRanking.map((item, index) => ({
      rank: index + 1,
      location: item.location_name,
      investigationDays: item.avgDaysToInvestigation > 0 ? item.avgDaysToInvestigation : '—',
      resolutionDays: item.avgDaysToResolution > 0 ? item.avgDaysToResolution : '—',
      resolutionRate: `%${item.resolutionRate}`,
      speed: getActionSpeedText(item.avgDaysToResolution),
    }));

    const filename = `hizli_aksiyon_lokasyonlari_${new Date().toISOString().split('T')[0]}.pdf`;
    exportActionSpeedAsPDF(dataToExport, {
      filename,
      title: 'Hızlı Aksiyon Alınmış Lokasyonlar Raporu',
      subtitle: `${new Date().toLocaleString('tr-TR')}`,
    });
  }

  function handleExportActionSpeedExcel() {
    const dataToExport = stats.actionSpeedRanking.map((item, index) => ({
      'Sıra': index + 1,
      'Lokasyon': item.location_name,
      'Ortalama İnceleme Süresi (Gün)': item.avgDaysToInvestigation > 0 ? item.avgDaysToInvestigation : '—',
      'Ortalama Çözüm Süresi (Gün)': item.avgDaysToResolution > 0 ? item.avgDaysToResolution : '—',
      'Çözüm Oranı (%)': item.resolutionRate,
      'Aksiyon Hızı': getActionSpeedText(item.avgDaysToResolution),
    }));

    const filename = `hizli_aksiyon_lokasyonlari_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportActionSpeedAsExcel(dataToExport, {
      filename,
      title: 'Hızlı Aksiyon Alınmış Lokasyonlar',
    });
  }

  function getHealthColorText(score: number): string {
    if (score >= 80) return 'Güvenli';
    if (score >= 60) return 'Dikkat';
    if (score >= 40) return 'Uyarı';
    return 'Tehlike';
  }

  function getActionSpeedText(days: number): string {
    if (days <= 0) return '—';
    if (days <= 3) return 'Hızlı';
    if (days <= 7) return 'Normal';
    return 'Yavaş';
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

      {/* Location Risk Status Section */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-6 border border-slate-700 backdrop-blur-md mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-400" />
            Lokasyon Risk Durumu
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleExportLocationRiskPDF}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
              title="PDF olarak indir"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={handleExportLocationRiskExcel}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
              title="Excel olarak indir"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>
        {stats.locationHealth.length === 0 ? (
          <p className="text-slate-400 text-center py-12">Henüz lokasyon bulunmuyor</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.locationHealth.map((location) => (
              <div
                key={location.location_id}
                className="rounded-lg bg-slate-700/50 p-4 border border-slate-600 hover:border-slate-500 transition-colors"
              >
                {/* Lokasyon Başlığı */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white text-sm">{location.location_name}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {location.reportCount > 0 ? `${location.reportCount} rapor` : 'Rapor yok'}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg ${location.color}`}
                  >
                    {location.healthScore}
                  </div>
                </div>

                {/* Son Rapor Bilgisi */}
                <div className="mb-4 text-xs text-slate-300 bg-slate-800/50 p-2 rounded">
                  <p>
                    Son rapor:{' '}
                    <span className={getHealthColor(location.healthScore)}>
                      {getLastReportDescription(location.daysSinceLastReport)}
                    </span>
                  </p>
                </div>

                {/* Bölgeler */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-300 mb-2">Bölgeler:</p>
                  <div className="flex flex-wrap gap-2">
                    {location.regions.map((region) => (
                      <div
                        key={region.region_id}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          region.isSafe
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                        title={
                          region.isSafe
                            ? 'Rapor yok (Güvenli)'
                            : `${region.reportCount} rapor - Son: ${getLastReportDescription(region.daysSinceLastReport)}`
                        }
                      >
                        {region.region_name}
                        {!region.isSafe && ` (${region.reportCount})`}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sağlık Barı */}
                <div className="mt-4 pt-4 border-t border-slate-600">
                  <div className="w-full bg-slate-600/50 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${location.color}`}
                      style={{
                        width: `${Math.max(location.healthScore, 5)}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    {location.healthScore >= 80
                      ? '✅ Güvenli'
                      : location.healthScore >= 60
                        ? '⚠️ Dikkat'
                        : location.healthScore >= 40
                          ? '🔴 Uyarı'
                          : '🚨 Tehlike'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Speed Ranking Section */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-6 border border-slate-700 backdrop-blur-md mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            Hızlı Aksiyon Alınmış Lokasyonlar
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleExportActionSpeedPDF}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
              title="PDF olarak indir"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={handleExportActionSpeedExcel}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
              title="Excel olarak indir"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>
        {stats.actionSpeedRanking.length === 0 ? (
          <p className="text-slate-400 text-center py-12">Henüz analiz verisi bulunmuyor</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="px-4 py-3 text-left text-slate-300 font-semibold">Lokasyon</th>
                  <th className="px-4 py-3 text-center text-slate-300 font-semibold">
                    İnceleme Süresi
                  </th>
                  <th className="px-4 py-3 text-center text-slate-300 font-semibold">
                    Çözüm Süresi
                  </th>
                  <th className="px-4 py-3 text-center text-slate-300 font-semibold">Çözüm Oranı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-600">
                {stats.actionSpeedRanking.map((item, index) => (
                  <tr key={item.location_name} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">
                      <span className="inline-block w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center mr-2">
                        {index + 1}
                      </span>
                      {item.location_name}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {item.avgDaysToInvestigation > 0
                        ? `${item.avgDaysToInvestigation} gün`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-semibold ${
                          item.avgDaysToResolution <= 3
                            ? 'text-green-400'
                            : item.avgDaysToResolution <= 7
                              ? 'text-yellow-400'
                              : 'text-orange-400'
                        }`}
                      >
                        {item.avgDaysToResolution > 0
                          ? `${item.avgDaysToResolution} gün`
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                        %{item.resolutionRate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
