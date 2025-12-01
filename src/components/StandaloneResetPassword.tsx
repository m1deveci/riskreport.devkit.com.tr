import { useEffect, useState } from 'react';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export function StandaloneResetPassword() {
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Token geçerliliğini kontrol et
  useEffect(() => {
    if (!token) {
      setError('Token bulunamadı');
      setTokenValid(false);
      return;
    }

    // Token basit format check
    if (token.length < 20) {
      setError('Geçersiz token format');
      setTokenValid(false);
      return;
    }

    setTokenValid(true);
    console.log('[ResetPassword] Token found, length:', token.length);
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Tüm alanlar gereklidir');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    if (!token) {
      setError('Token bulunamadı');
      return;
    }

    setLoading(true);

    // Retry logic for browser extension interference
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ResetPassword] Attempt ${attempt}/${maxRetries}: Sending request`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('/api/password-reset/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword: password }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log(`[ResetPassword] Attempt ${attempt}: Status ${response.status}`);

        let data;
        try {
          data = await response.json();
        } catch (parseErr) {
          throw new Error(`Sunucu hatası (${response.status}): Yanıt işlenemedi`);
        }

        if (!response.ok) {
          throw new Error(data.error || `Sunucu hatası: ${response.status}`);
        }

        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        return;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[ResetPassword] Attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    let errorMessage = 'Bir hata oluştu';
    if (lastError) {
      if (lastError.message.includes('Failed to fetch') || lastError.message.includes('AbortError')) {
        errorMessage = 'Ağ bağlantısı kesintiye uğradı. Lütfen sayfayı yenileyin.';
      } else {
        errorMessage = lastError.message;
      }
      console.error('[ResetPassword] All retry attempts failed:', lastError);
    }
    setError(errorMessage);
    setLoading(false);
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 shadow-xl p-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Geçersiz Bağlantı</h1>
              <p className="text-slate-400 mb-4">{error}</p>
              <a href="/" className="text-blue-400 hover:text-blue-300">
                Ana sayfaya dön
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 shadow-xl backdrop-blur-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Parolayı Sıfırla</h1>
            <p className="text-slate-400">Yeni parolanızı belirleyin</p>
          </div>

          {success ? (
            // Success Message
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" />
                <h3 className="font-semibold text-green-800">Parola başarıyla sıfırlandı!</h3>
              </div>
              <p className="text-sm text-green-700">
                Parolanız güncellendi. Giriş sayfasına yönlendiriliyorsunuz...
              </p>
            </div>
          ) : (
            // Form
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Yeni Parola
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500"
                  placeholder="En az 6 karakter"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                  Parolayı Onayla
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500"
                  placeholder="Parolayı tekrar girin"
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Güncelleniyor...' : 'Parolayı Sıfırla'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
