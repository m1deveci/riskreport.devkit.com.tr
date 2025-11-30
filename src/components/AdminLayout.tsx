import { ReactNode, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  MapPin,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  Database,
  Grid3x3,
  Globe
} from 'lucide-react';
import { signOut } from '../lib/auth';
import { useI18n, LANGUAGES } from '../lib/i18n';
import type { UserProfile } from '../lib/auth';

interface AdminLayoutProps {
  children: ReactNode;
  currentUser: UserProfile;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard },
  { id: 'locations', label: 'Lokasyonlar', icon: MapPin },
  { id: 'regions', label: 'Bölgeler', icon: Grid3x3 },
  { id: 'reports', label: 'Ramak Kala Raporları', icon: AlertTriangle },
  { id: 'logs', label: 'Sistem Logları', icon: FileText },
  { id: 'users', label: 'Kullanıcılar ve Uzmanlar', icon: Users },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
];

export function AdminLayout({ children, currentUser, currentPage, onNavigate }: AdminLayoutProps) {
  const { language, setLanguage } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [siteTitle, setSiteTitle] = useState('Ramak Kala Sistemi');

  useEffect(() => {
    // Site title'ı settings'ten yükle
    async function loadSiteTitle() {
      try {
        const response = await fetch(
          (import.meta.env.VITE_API_URL || 'http://localhost:6000') + '/api/settings'
        );
        const data = await response.json();
        if (data.site_title) {
          setSiteTitle(data.site_title);
        }
      } catch (err) {
        console.error('Failed to load site title:', err);
      }
    }
    loadSiteTitle();
  }, []);

  async function handleLogout() {
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 z-20 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-300"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{siteTitle}</h1>
                <p className="text-xs text-slate-400">İSG Yönetim Paneli</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-white">{currentUser.full_name}</p>
              <p className="text-xs text-slate-400 capitalize">{currentUser.role}</p>
            </div>
            {/* Dil Seçici */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-600">
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">{language.toUpperCase()}</span>
              </button>
              <div className="absolute hidden group-hover:block right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                      language === lang.code
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {lang.nativeName}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 transition-colors border border-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">Çıkış</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-10 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-16 bottom-0 left-0 w-64 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-r border-slate-700 z-10 transition-transform duration-300 lg:translate-x-0 overflow-y-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-lg shadow-blue-500/20'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
