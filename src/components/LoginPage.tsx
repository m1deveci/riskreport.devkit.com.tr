import { useState, useEffect } from 'react';
import { signIn } from '../lib/auth';
import { Loader2, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

interface Settings {
  site_title: string;
  logo_path: string;
  background_path: string;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      onLogin();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Giriş yapılırken bir hata oluştu';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const backgroundStyle = settings?.background_path
    ? { backgroundImage: `url(${settings.background_path})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4"
      style={backgroundStyle}
    >
      {/* Overlay for better text visibility when background is present */}
      {settings?.background_path && (
        <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
      )}

      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8 w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          {settings?.logo_path ? (
            <img
              src={settings.logo_path}
              alt="Logo"
              className="w-16 h-16 mx-auto mb-4 object-contain"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <span className="text-xl font-bold text-white">RK</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {settings?.site_title || 'Ramak Kala Sistemi'}
          </h1>
          <p className="text-gray-600">Yönetim Paneli Girişi</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              E-posta
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ornek@sirket.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Şifre
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
            <div className="mt-2 text-right">
              <a
                href="/#/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Parolamı Unuttum?
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Giriş yapılıyor...
              </>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            İş Sağlığı ve Güvenliği Yönetim Sistemi
          </p>
        </div>
      </div>
    </div>
  );
}
