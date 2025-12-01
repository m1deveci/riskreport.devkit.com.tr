import { useEffect, useState } from 'react';
import { NearMissForm } from './components/NearMissForm';
import { LoginPage } from './components/LoginPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { AdminLayout } from './components/AdminLayout';
import { Dashboard } from './pages/Dashboard';
import { Locations } from './pages/Locations';
import { Regions } from './pages/Regions';
import { ISGExperts } from './pages/ISGExperts';
import { Reports } from './pages/Reports';
import { SystemLogs } from './pages/SystemLogs';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { getCurrentUser, onAuthStateChange } from './lib/auth';
import { I18nProvider } from './lib/i18n';
import type { UserProfile } from './lib/auth';

type AppMode = 'loading' | 'public-form' | 'login' | 'forgot-password' | 'reset-password' | 'admin';

function App() {
  const [mode, setMode] = useState<AppMode>('loading');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = useState(() => {
    // localStorage'dan sayfa bilgisini al
    return localStorage.getItem('currentPage') || 'dashboard';
  });
  const [formParams, setFormParams] = useState<{
    locationId: string;
    regionId: string;
    qrToken: string;
  } | null>(null);

  // currentPage değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
    // URL'yi hash ile update et
    window.history.replaceState(null, '', `#/${currentPage}`);
  }, [currentPage]);

  // Favicon ve site başlığını yükle
  useEffect(() => {
    async function loadFaviconAndTitle() {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();

        // Başlığı güncelle
        if (data.site_title) {
          document.title = data.site_title;
        }

        // Favicon'u güncelle
        if (data.favicon_path) {
          const faviconLink = document.getElementById('favicon') as HTMLLinkElement;
          if (faviconLink) {
            faviconLink.href = data.favicon_path;
            // SVG olmayan favicon türleri için type'ı güncelle
            if (data.favicon_path.endsWith('.ico')) {
              faviconLink.type = 'image/x-icon';
            } else if (data.favicon_path.endsWith('.png')) {
              faviconLink.type = 'image/png';
            } else if (data.favicon_path.endsWith('.jpg') || data.favicon_path.endsWith('.jpeg')) {
              faviconLink.type = 'image/jpeg';
            }
          }
        }
      } catch (err) {
        console.error('Failed to load favicon and title:', err);
      }
    }

    loadFaviconAndTitle();
  }, []);

  useEffect(() => {
    const initializeRouting = async () => {
      try {
        const path = window.location.pathname;
        console.log('[App] Current pathname:', path);

        // Check for pathname-based routes first
        if (path === '/reset-password') {
          console.log('[App] Reset password route detected');
          setMode('reset-password');
          return;
        }

        if (path === '/forgot-password') {
          console.log('[App] Forgot password route detected');
          setMode('forgot-password');
          return;
        }

        const isReportRoute = path.match(/^\/report\/([^/]+)\/([^/]+)$/);

        if (isReportRoute) {
          // Report route ise hiç auth kontrolü yapmadan form göster
          checkRoute();
        } else {
          // Diğer route'lar için auth kontrol et
          await initializeApp();
        }

        // Auth state değişikliklerini dinle (sadece report dışı sayfalar için)
        if (!isReportRoute) {
          onAuthStateChange((user) => {
            setCurrentUser(user);
            if (user) {
              setMode('admin');
            } else {
              checkRoute();
            }
          });

          // Custom auth event listener
          const handleAuthChange = async () => {
            const user = await getCurrentUser();
            setCurrentUser(user);
            if (user) {
              setMode('admin');
            } else {
              checkRoute();
            }
          };

          window.addEventListener('auth-changed', handleAuthChange);

          // Listen for hash changes (for forgot-password, reset-password routes)
          const handleHashChange = () => {
            checkRoute();
          };
          window.addEventListener('hashchange', handleHashChange);

          return () => {
            window.removeEventListener('auth-changed', handleAuthChange);
            window.removeEventListener('hashchange', handleHashChange);
          };
        }
      } catch (error) {
        console.error('[App] Error during initialization:', error);
        setMode('login');
      }
    };

    initializeRouting();
  }, []);

  async function initializeApp() {
    const user = await getCurrentUser();
    setCurrentUser(user);

    if (user) {
      setMode('admin');
    } else {
      checkRoute();
    }
  }

  function checkRoute() {
    const path = window.location.pathname;
    const hash = window.location.hash;
    const reportMatch = path.match(/^\/report\/([^/]+)\/([^/]+)$/);

    // Hash-based routing
    if (hash) {
      if (hash.includes('/forgot-password')) {
        setMode('forgot-password');
        return;
      }
      if (hash.includes('/reset-password')) {
        setMode('reset-password');
        return;
      }
    }

    if (reportMatch) {
      const locationId = reportMatch[1];
      const qrToken = reportMatch[2];

      const urlParams = new URLSearchParams(window.location.search);
      const regionId = urlParams.get('region') || '';

      if (regionId) {
        setFormParams({ locationId, regionId, qrToken });
        setMode('public-form');
      } else {
        setMode('login');
      }
    } else {
      setMode('login');
    }
  }

  function handleLogin() {
    setMode('admin');
  }

  function renderContent() {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'locations':
        return <Locations />;
      case 'regions':
        return <Regions />;
      case 'experts':
      case 'users':
        return <Users />;
      case 'reports':
        return <Reports />;
      case 'logs':
        return <SystemLogs />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  }

  if (mode === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (mode === 'public-form' && formParams) {
    return (
      <NearMissForm
        locationId={formParams.locationId}
        regionId={formParams.regionId}
        qrToken={formParams.qrToken}
      />
    );
  }

  if (mode === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (mode === 'forgot-password') {
    return <ForgotPasswordPage />;
  }

  if (mode === 'reset-password') {
    return <ResetPasswordPage />;
  }

  if (mode === 'admin' && currentUser) {
    return (
      <AdminLayout
        currentUser={currentUser}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      >
        {renderContent()}
      </AdminLayout>
    );
  }

  return null;
}

function AppWithProvider() {
  return (
    <I18nProvider>
      <App />
    </I18nProvider>
  );
}

export default AppWithProvider;
