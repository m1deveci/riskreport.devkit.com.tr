import { useEffect, useState } from 'react';
import { api } from '../lib/supabase';
import { MapPin, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';

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

  async function loadStats() {
    try {
      const { data: locations } = await supabase
        .from('locations')
        .select('id')
        .eq('is_active', true);

      const { data: reports } = await supabase.from('near_miss_reports').select('*');

      const { data: newReports } = await supabase
        .from('near_miss_reports')
        .select('id')
        .eq('status', 'Yeni');

      const categoryCount: Record<string, number> = {};
      reports?.forEach((report) => {
        categoryCount[report.category] = (categoryCount[report.category] || 0) + 1;
      });

      const { data: reportsByLocation } = await supabase
        .from('near_miss_reports')
        .select('location_id, locations(name)')
        .order('created_at', { ascending: false });

      const locationCount: Record<string, number> = {};
      reportsByLocation?.forEach((report: { locations: { name: string } }) => {
        const locName = (report.locations as unknown as { name: string }).name;
        locationCount[locName] = (locationCount[locName] || 0) + 1;
      });

      const { data: recentReports } = await supabase
        .from('near_miss_reports')
        .select('id, incident_number, full_name, category, created_at, status')
        .order('created_at', { ascending: false })
        .limit(10);

      setStats({
        totalLocations: locations?.length || 0,
        totalReports: reports?.length || 0,
        newReports: newReports?.length || 0,
        reportsByCategory: Object.entries(categoryCount).map(([category, count]) => ({
          category,
          count,
        })),
        reportsByLocation: Object.entries(locationCount).map(([location_name, count]) => ({
          location_name,
          count,
        })),
        recentReports: recentReports || [],
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gösterge Paneli</h1>
        <p className="text-gray-600 mt-1">Ramak kala raporlama sistemi özeti</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Lokasyon</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalLocations}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Rapor</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalReports}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Yeni Raporlar</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.newReports}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bu Ay</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {
                  stats.recentReports.filter((r) => {
                    const date = new Date(r.created_at);
                    const now = new Date();
                    return (
                      date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
                    );
                  }).length
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Kategorilere Göre Dağılım</h2>
          </div>
          <div className="p-6">
            {stats.reportsByCategory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz rapor bulunmuyor</p>
            ) : (
              <div className="space-y-4">
                {stats.reportsByCategory
                  .sort((a, b) => b.count - a.count)
                  .map((item) => (
                    <div key={item.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{item.category}</span>
                        <span className="text-gray-600">{item.count} rapor</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(item.count / stats.totalReports) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Lokasyonlara Göre Dağılım</h2>
          </div>
          <div className="p-6">
            {stats.reportsByLocation.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz rapor bulunmuyor</p>
            ) : (
              <div className="space-y-4">
                {stats.reportsByLocation
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5)
                  .map((item) => (
                    <div key={item.location_name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{item.location_name}</span>
                        <span className="text-gray-600">{item.count} rapor</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${(item.count / stats.totalReports) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Son Raporlar</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Olay No
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {report.incident_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {report.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {report.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(report.created_at).toLocaleDateString('tr-TR')}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
