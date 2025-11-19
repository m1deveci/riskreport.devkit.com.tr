import { useState } from 'react';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export function ForgotPasswordPage() {
  const handleNavigate = (path: string) => {
    window.location.hash = path;
  };
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('E-posta adresi gereklidir');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bir hata oluştu');
      }

      setSubmitted(true);
      setEmail('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
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
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Parolamı Unuttum</h1>
            <p className="text-slate-400">E-posta adresinizi girerek parola sıfırlama bağlantısını alabilirsiniz</p>
          </div>

          {submitted ? (
            // Success Message
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" />
                <h3 className="font-semibold text-green-800">E-posta gönderildi!</h3>
              </div>
              <p className="text-sm text-green-700 mb-4">
                E-posta adresinize parola sıfırlama bağlantısı gönderdik. Lütfen e-postanızı kontrol edin.
              </p>
              <p className="text-xs text-green-600">
                Bağlantı 1 saat içinde geçerliliğini yitirecektir.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                }}
                className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Başka bir e-posta deneyin
              </button>
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
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  E-posta Adresi
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500"
                  placeholder="ornek@sirketiniz.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
              </button>
            </form>
          )}
        </div>

        {/* Help Text */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Hesabınız yok mu?{' '}
          <button
            onClick={() => handleNavigate('/signup')}
            className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            Kayıt ol
          </button>
        </p>
      </div>
    </div>
  );
}
