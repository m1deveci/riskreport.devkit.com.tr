import { useEffect, useState } from 'react';
import { api } from '../lib/supabase';
import { FileText, Search } from 'lucide-react';

interface SystemLog {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  users?: { full_name: string };
}

export function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      setFilteredLogs(
        logs.filter(
          (log) =>
            log.action.toLowerCase().includes(term) ||
            (log.users as unknown as { full_name: string })?.full_name?.toLowerCase().includes(term)
        )
      );
    } else {
      setFilteredLogs(logs);
    }
  }, [logs, searchTerm]);

  async function loadLogs() {
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*, users(full_name)')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
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
        <h1 className="text-3xl font-bold text-gray-900">Sistem Logları</h1>
        <p className="text-gray-600 mt-1">Tüm sistem aktivitelerini görüntüleyin</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="İşlem veya kullanıcı adında ara..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih/Saat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detaylar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(log.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {(log.users as unknown as { full_name: string })?.full_name || 'Sistem'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <pre className="text-xs max-w-md overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Log bulunamadı</h3>
            <p className="text-gray-600">Henüz sistem aktivitesi kaydedilmemiş</p>
          </div>
        )}
      </div>
    </div>
  );
}
