import { useState, useEffect, useRef } from 'react';
import { signIn } from '../lib/auth';
import { useI18n, LANGUAGES } from '../lib/i18n';
import { Loader2, AlertCircle, Globe, ChevronDown, Check } from 'lucide-react';
import Turnstile from 'react-turnstile';

interface LoginPageProps {
  onLogin: () => void;
}

interface Settings {
  site_title: string;
  logo_path: string;
  background_path: string;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const { t, language, setLanguage } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileRef = useRef<any>(null);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Close language dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setLanguageDropdownOpen(false);
      }
    }

    if (languageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [languageDropdownOpen]);

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

    if (!turnstileToken) {
      setError('Lütfen Turnstile doğrulamasını tamamlayın');
      setLoading(false);
      return;
    }

    try {
      await signIn(email, password, turnstileToken);
      onLogin();
    } catch (err: unknown) {
      let errorMessage = err instanceof Error ? err.message : t('auth.loginError');
      let displayError = errorMessage;

      // Check if error response includes attempt information
      if (err instanceof Error) {
        try {
          const errorData = JSON.parse(err.message);
          if (errorData.failedAttempts !== undefined && errorData.maxAttempts !== undefined) {
            const remainingAttempts = errorData.maxAttempts - errorData.failedAttempts;
            displayError = errorData.error;

            // Add attempt information
            if (errorData.attemptsBlocked && errorData.retryAfter) {
              const minutesRemaining = Math.ceil(errorData.retryAfter / 60);
              displayError += `\n\n🔒 Hesabınız ${minutesRemaining} dakika boyunca kilitlenmiştir.`;
            } else if (remainingAttempts > 0) {
              displayError += `\n\n⚠️ Başarısız Deneme: ${errorData.failedAttempts}/${errorData.maxAttempts}`;
              displayError += `\nKalan Deneme: ${remainingAttempts}`;
            }
          }
        } catch (e) {
          // If JSON parsing fails, use original message
          displayError = errorMessage;
        }
      }

      setError(displayError);

      // Reset Turnstile on error
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
      setTurnstileToken('');

      // Auto-refresh page after 3 seconds to reset Turnstile CAPTCHA
      // and give user fresh attempt
      const refreshTimer = setTimeout(() => {
        console.log('[LOGIN] Auto-refreshing page after failed login attempt');
        window.location.reload();
      }, 3000);

      // Store timer ID in a ref if needed for cleanup
      // (not necessary in this case since page will reload)
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
        {/* Dil Seçeci */}
        <div className="absolute top-4 right-4" ref={languageDropdownRef}>
          <div className="relative">
            <button
              onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 text-gray-700 text-sm font-medium transition-all"
            >
              <Globe className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-700">{language.toUpperCase()}</span>
              <ChevronDown className={`w-4 h-4 text-blue-600 transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {languageDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="py-1">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setLanguageDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                        language === lang.code
                          ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{lang.nativeName}</span>
                      {language === lang.code && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

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
            {settings?.site_title || 'Ramakkala Sistemi'}
          </h1>
        
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 whitespace-pre-line">{error}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.email')}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="example@ravago.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.password')}
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
                {t('auth.forgotPassword')}
              </a>
            </div>
          </div>

          <div className="flex justify-center">
            <Turnstile
              ref={turnstileRef}
              sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onVerify={(token) => setTurnstileToken(token)}
              onError={() => {
                setTurnstileToken('');
                setError('Turnstile doğrulaması başarısız oldu');
              }}
              theme="light"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !turnstileToken}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                {t('common.loading')}
              </>
            ) : (
              t('auth.loginButton')
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
          Ramakkala Raporlama Sistemi &copy; 2025 Tüm hakları saklıdır. - Geliştirici: Devkit
          </p>
        </div>
      </div>
    </div>
  );
}
