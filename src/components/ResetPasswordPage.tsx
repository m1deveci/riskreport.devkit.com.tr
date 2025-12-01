import { useEffect, useState } from 'react';
import { Lock, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export function ResetPasswordPage() {
  const handleNavigate = (path: string) => {
    window.location.href = path;
  };

  // Get token from URL query parameters (pathname routing)
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Geçersiz veya eksik token');
    }
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
      setError('Geçersiz veya eksik token');
      return;
    }

    setLoading(true);

    // Retry logic for handling browser extension interference
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const requestBody = { token, newPassword: password };
        console.log(`[ResetPassword] Attempt ${attempt}/${maxRetries}: Sending fetch request`, {
          token: token?.substring(0, 10) + '...',
          passwordLength: password.length,
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch('/api/password-reset/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log(`[ResetPassword] Attempt ${attempt}: Response received`, {
          status: response.status,
          statusText: response.statusText,
        });

        let data;
        try {
          data = await response.json();
        } catch (parseErr) {
          console.error(`Attempt ${attempt}: JSON Parse Error:`, parseErr);
          throw new Error(`Sunucu hatası (${response.status}): Yanıt işlenemedi`);
        }

        if (!response.ok) {
          throw new Error(data.error || `Sunucu hatası: ${response.status}`);
        }

        // Success!
        setSuccess(true);
        setTimeout(() => {
          handleNavigate('/login');
        }, 2000);
        return;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[ResetPassword] Attempt ${attempt} failed:`, lastError.message);

        // If not the last attempt, wait a bit before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // All retries failed
    let errorMessage = 'Bir hata oluştu';
    if (lastError) {
      if (lastError.message.includes('Failed to fetch') || lastError.message.includes('AbortError')) {
        errorMessage = 'Ağ bağlantısı kesintiye uğradı. Lütfen sayfayı yenileyin ve tarayıcı uzantılarını kontrol edin (özellikle LastPass).';
      } else {
        errorMessage = lastError.message;
      }
      console.error('[ResetPassword] All retry attempts failed:', lastError);
    }
    setError(errorMessage);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => handleNavigate('/login')}
          className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Giriş sayfasına geri dön
        </button>

        {/* Card */}
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
