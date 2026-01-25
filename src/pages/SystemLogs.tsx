import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ActionDescriptions, formatLogDetails } from '../lib/logger';
import { FileText, Search, ChevronDown, ChevronUp, Download, LogIn, MapPin, Map, AlertTriangle, UserCheck, Users, Settings } from 'lucide-react';
import { useI18n, useLanguageChange } from '../lib/i18n';
import { exportLogsAsPDF, exportLogsAsExcel, type SystemLogExportData } from '../lib/exportUtils';

interface SystemLog {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  users?: { full_name: string };
}

// Action categories for filtering
const ACTION_CATEGORIES = {
  auth: {
    name: 'Oturum',
    icon: LogIn,
    color: { bg: 'bg-blue-600', bgLight: 'bg-blue-500/20', border: 'border-blue-500', ring: 'ring-blue-400', text: 'text-blue-400', textActive: 'text-blue-100' },
    actions: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT'],
  },
  location: {
    name: 'Lokasyon',
    icon: MapPin,
    color: { bg: 'bg-green-600', bgLight: 'bg-green-500/20', border: 'border-green-500', ring: 'ring-green-400', text: 'text-green-400', textActive: 'text-green-100' },
    actions: ['CREATE_LOCATION', 'UPDATE_LOCATION', 'DELETE_LOCATION'],
  },
  region: {
    name: 'Bölge',
    icon: Map,
    color: { bg: 'bg-purple-600', bgLight: 'bg-purple-500/20', border: 'border-purple-500', ring: 'ring-purple-400', text: 'text-purple-400', textActive: 'text-purple-100' },
    actions: ['CREATE_REGION', 'UPDATE_REGION', 'DELETE_REGION'],
  },
  nearmiss: {
    name: 'Ramak Kala',
    icon: AlertTriangle,
    color: { bg: 'bg-orange-600', bgLight: 'bg-orange-500/20', border: 'border-orange-500', ring: 'ring-orange-400', text: 'text-orange-400', textActive: 'text-orange-100' },
    actions: ['CREATE_NEARMISS', 'UPDATE_NEARMISS', 'DELETE_NEARMISS'],
  },
  isgExpert: {
    name: 'İSG Uzmanı',
    icon: UserCheck,
    color: { bg: 'bg-cyan-600', bgLight: 'bg-cyan-500/20', border: 'border-cyan-500', ring: 'ring-cyan-400', text: 'text-cyan-400', textActive: 'text-cyan-100' },
    actions: ['CREATE_ISG_EXPERT', 'UPDATE_ISG_EXPERT', 'DELETE_ISG_EXPERT'],
  },
  user: {
    name: 'Kullanıcı',
    icon: Users,
    color: { bg: 'bg-pink-600', bgLight: 'bg-pink-500/20', border: 'border-pink-500', ring: 'ring-pink-400', text: 'text-pink-400', textActive: 'text-pink-100' },
    actions: ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER'],
  },
  system: {
    name: 'Sistem',
    icon: Settings,
    color: { bg: 'bg-amber-600', bgLight: 'bg-amber-500/20', border: 'border-amber-500', ring: 'ring-amber-400', text: 'text-amber-400', textActive: 'text-amber-100' },
    actions: ['UPDATE_SETTINGS', 'DOWNLOAD_BACKUP', 'UPDATE_PROFILE', 'CHANGE_PASSWORD'],
  },
};

export function SystemLogs() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    let result = [...logs];

    // Apply category filter first
    if (activeCategory) {
      const category = ACTION_CATEGORIES[activeCategory as keyof typeof ACTION_CATEGORIES];
      if (category) {
        result = result.filter((log) => category.actions.includes(log.action));
      }
    }

    // Then apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((log) => {
        const actionDesc = ActionDescriptions[log.action]?.tr || log.action;
        const userName = (log.users as unknown as { full_name: string })?.full_name || 'Sistem';
        // Parse details if it's a string (from database)
        const parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
        const detailsText = formatLogDetails(log.action, parsedDetails, usersMap).toLowerCase();

        return (
          log.action.toLowerCase().includes(term) ||
          actionDesc.toLowerCase().includes(term) ||
          userName.toLowerCase().includes(term) ||
          detailsText.includes(term)
        );
      });
    }

    setFilteredLogs(result);
  }, [logs, searchTerm, activeCategory]);

  useLanguageChange();

  async function loadLogs() {
    try {
      // Kullanıcı bilgilerini yükle
      const users = await api.users.getList();
      const userMap: Record<string, string> = {};
      if (users) {
        users.forEach((user: any) => {
          if (user.id && user.email) {
            userMap[user.id] = user.email;
          }
        });
      }
      setUsersMap(userMap);

      // Logları yükle
      const data = await api.logs.getList();
      setLogs((data || []).slice(0, 500));
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    const dataToExport: SystemLogExportData[] = filteredLogs.map((log) => {
      const actionDesc = ActionDescriptions[log.action];
      const parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
      const detailsText = formatLogDetails(log.action, parsedDetails, usersMap);

      return {
        date: new Date(log.created_at).toLocaleString('tr-TR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        user: (log.users as unknown as { full_name: string })?.full_name || 'Sistem',
        action: actionDesc?.tr || log.action,
        details: detailsText,
      };
    });

    const filename = `sistemlogları_${new Date().toISOString().split('T')[0]}.pdf`;
    await exportLogsAsPDF(dataToExport, {
      filename,
      title: 'Sistem Logları',
      subtitle: `Toplam ${dataToExport.length} log kaydı`,
    });
  }

  function handleExportExcel() {
    const dataToExport: SystemLogExportData[] = filteredLogs.map((log) => {
      const actionDesc = ActionDescriptions[log.action];
      const parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
      const detailsText = formatLogDetails(log.action, parsedDetails, usersMap);

      return {
        date: new Date(log.created_at).toLocaleString('tr-TR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        user: (log.users as unknown as { full_name: string })?.full_name || 'Sistem',
        action: actionDesc?.tr || log.action,
        details: detailsText,
      };
    });

    const filename = `sistemlogları_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportLogsAsExcel(dataToExport, {
      filename,
      title: 'Sistem Logları',
    });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{t('logs.title')}</h1>
          <p className="text-slate-400 text-sm sm:text-base md:text-lg mt-2">{t('logs.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
            title="PDF olarak indir"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
            title="Excel olarak indir"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Action Category Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {/* Tümü Card */}
        <button
          onClick={() => setActiveCategory(null)}
          className={`p-3 rounded-lg border transition-all duration-200 ${
            activeCategory === null
              ? 'bg-slate-600 border-slate-500 ring-2 ring-slate-400'
              : 'bg-gradient-to-br from-slate-800 to-slate-700 border-slate-700 hover:border-slate-500'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className={`p-2 rounded-lg ${activeCategory === null ? 'bg-slate-500' : 'bg-slate-500/20'}`}>
              <FileText className={`w-5 h-5 ${activeCategory === null ? 'text-white' : 'text-slate-400'}`} />
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${activeCategory === null ? 'text-white' : 'text-slate-300'}`}>
                {logs.length}
              </p>
              <p className={`text-xs ${activeCategory === null ? 'text-slate-100' : 'text-slate-400'}`}>
                Tümü
              </p>
            </div>
          </div>
        </button>

        {/* Category Cards */}
        {Object.entries(ACTION_CATEGORIES).map(([key, category]) => {
          const Icon = category.icon;
          const count = logs.filter((log) => category.actions.includes(log.action)).length;
          const isActive = activeCategory === key;

          return (
            <button
              key={key}
              onClick={() => setActiveCategory(isActive ? null : key)}
              className={`p-3 rounded-lg border transition-all duration-200 ${
                isActive
                  ? `${category.color.bg} ${category.color.border} ring-2 ${category.color.ring}`
                  : `bg-gradient-to-br from-slate-800 to-slate-700 border-slate-700 hover:${category.color.border}`
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={`p-2 rounded-lg ${isActive ? category.color.bg.replace('600', '500') : category.color.bgLight}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : category.color.text}`} />
                </div>
                <div className="text-center">
                  <p className={`text-lg font-bold ${isActive ? 'text-white' : category.color.text}`}>
                    {count}
                  </p>
                  <p className={`text-xs truncate ${isActive ? category.color.textActive : 'text-slate-400'}`}>
                    {category.name}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="İşlem veya kullanıcı adında ara..."
            className="w-full pl-10 pr-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b border-slate-600">
              <tr>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('logs.date')}
                </th>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('logs.user')}
                </th>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('logs.action')}
                </th>
                <th className="sm:px-6 px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {t('logs.details')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-slate-700">
              {filteredLogs.map((log) => {
                const actionDesc = ActionDescriptions[log.action];
                const isExpanded = expandedLogId === log.id;
                // Parse details if it's a string (from database)
                const parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                const detailsText = formatLogDetails(log.action, parsedDetails, usersMap);

                return (
                  <>
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-900/50 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-slate-900/50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {new Date(log.created_at).toLocaleString('tr-TR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {(log.users as unknown as { full_name: string })?.full_name || 'Sistem'}
                      </td>
                      <td
                        colSpan={2}
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{actionDesc?.icon || '•'}</span>
                          <span className="flex-1">{actionDesc?.tr || log.action}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-blue-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-900/30 border-b border-slate-700">
                        <td colSpan={4} className="sm:px-6 px-3 sm:py-4 py-2">
                          <div className="bg-slate-800/50 rounded p-4 border border-slate-700">
                            <h4 className="text-sm font-semibold text-white mb-3">📋 İşlem Detayları</h4>
                            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed break-words">
                              {detailsText}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">{t('logs.notFound')}</h3>
            <p className="text-slate-400">{t('logs.noActivity')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
