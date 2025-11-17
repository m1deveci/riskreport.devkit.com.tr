import { useEffect, useState } from 'react';
import { NearMissForm } from './components/NearMissForm';
import { LoginPage } from './components/LoginPage';
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
import type { UserProfile } from './lib/auth';

type AppMode = 'loading' | 'public-form' | 'login' | 'admin';

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

  useEffect(() => {
    const path = window.location.pathname;
    const isReportRoute = path.match(/^\/report\/([^/]+)\/([^/]+)$/);

    if (isReportRoute) {
      // Report route ise hiç auth kontrolü yapmadan form göster
      checkRoute();
    } else {
      // Diğer route'lar için auth kontrol et
      initializeApp();
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

      return () => {
        window.removeEventListener('auth-changed', handleAuthChange);
      };
    }
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
    const reportMatch = path.match(/^\/report\/([^/]+)\/([^/]+)$/);

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
        return <ISGExperts />;
      case 'reports':
        return <Reports />;
      case 'logs':
        return <SystemLogs />;
      case 'settings':
        return <Settings />;
      case 'users':
        return <Users />;
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

export default App;
