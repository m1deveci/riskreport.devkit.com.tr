import { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Camera, X } from 'lucide-react';
import Turnstile from 'react-turnstile';

interface NearMissFormProps {
  locationId: string;
  regionId: string;
  qrToken: string;
}

interface Region {
  id: string;
  name: string;
  location_id: string;
}

interface Location {
  id: string;
  name: string;
}

const CATEGORIES = [
  'Kayma/Düşme',
  'Elektrik',
  'Makine Güvenliği',
  'Kimyasal',
  'Yangın',
  'Ergonomi',
  'İş Ekipmanları',
  'Diğer',
];

export function NearMissForm({ locationId, regionId, qrToken }: NearMissFormProps) {
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [incidentNumber, setIncidentNumber] = useState('');
  const [region, setRegion] = useState<Region | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [siteTitle, setSiteTitle] = useState('Ramakkala Raporlama Sistemi');
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileRef = useRef<any>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    category: '',
    description: '',
    image: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState(false);

  useEffect(() => {
    loadSiteTitle();
    validateQRCode();
  }, [locationId, regionId, qrToken]);

  async function loadSiteTitle() {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.site_title) {
        setSiteTitle(data.site_title);
      }
    } catch (err) {
      console.error('Failed to load site title:', err);
    }
  }

  async function validateQRCode() {
    try {
      setValidating(true);
      setError('');
      setRateLimitError(false);

      // Fetch region by ID from API
      const regionsResponse = await fetch('/api/regions');
      if (!regionsResponse.ok) {
        throw new Error('Bölgeler yüklenemedi');
      }

      const allRegions = await regionsResponse.json();

      // Find the region matching QR code parameters
      const regionData = allRegions.find(
        (r: any) =>
          r.id === regionId &&
          r.location_id === locationId &&
          r.qr_code_token === qrToken &&
          r.is_active
      );

      if (!regionData) {
        setError('Geçersiz QR kodu. Lütfen sistem yöneticinizle iletişime geçin.');
        return;
      }

      setRegion(regionData);

      // Increment scan count for this region
      try {
        await fetch(`/api/regions/${regionId}/increment-scan`, {
          method: 'POST',
        });
      } catch (err) {
        // Don't block the form if scan count fails to increment
        console.error('Failed to increment scan count:', err);
      }

      // Fetch location data
      const locationsResponse = await fetch('/api/locations');
      if (locationsResponse.ok) {
        const allLocations = await locationsResponse.json();
        const locationData = allLocations.find((l: any) => l.id === locationId);
        if (locationData) {
          setLocation(locationData);
        }
      }

      // Check rate limiting - 1 report per 5 minutes per region
      const reportsResponse = await fetch('/api/reports');
      if (reportsResponse.ok) {
        const allReports = await reportsResponse.json();
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

        const recentReport = allReports.find((r: any) => {
          if (r.region_id !== regionId) return false;
          const createdTime = new Date(r.created_at).getTime();
          return createdTime > fiveMinutesAgo;
        });

        if (recentReport) {
          setRateLimitError(true);
          setError('Bu bölge için son 5 dakika içinde zaten bir rapor gönderilmiş. Lütfen daha sonra tekrar deneyin.');
        }
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      console.error(err);
    } finally {
      setValidating(false);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Dosya boyutu 10 MB\'den küçük olmalıdır.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Lütfen bir resim dosyası seçiniz.');
        return;
      }

      setFormData({ ...formData, image: file });

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  }

  function removeImage() {
    setFormData({ ...formData, image: null });
    setImagePreview(null);
  }

  function formatTurkishPhone(value: string): string {
    // Remove all non-digit characters except +
    let cleaned = value.replace(/[^\d+]/g, '');

    // Remove + and any leading zeros/ones (except the first digit)
    if (cleaned.startsWith('+')) {
      cleaned = '+' + cleaned.substring(1).replace(/[^\d]/g, '');
    } else {
      cleaned = cleaned.replace(/[^\d]/g, '');
    }

    // Handle different input formats
    let digits = cleaned.replace(/\D/g, '');

    if (!digits) return '';

    // If it starts with 0 and has 10+ digits, remove leading 0 and add +90
    if (cleaned.startsWith('0') && digits.length >= 10) {
      digits = '90' + digits.substring(1);
    }
    // If it starts with +90, keep as is
    else if (cleaned.startsWith('+90') && digits.length > 2) {
      // Already has +90
    }
    // If it doesn't start with +90 and doesn't start with 0, but is 10 digits starting with 5
    else if (digits.length === 10 && digits.startsWith('5')) {
      digits = '90' + digits;
    }
    // If it's 11 digits starting with 05, convert to 90 format
    else if (digits.length === 11 && digits.startsWith('0')) {
      digits = '90' + digits.substring(1);
    }

    // Format as +90 5XX XXX XX XX
    if (digits.startsWith('90') && digits.length >= 10) {
      const countryCode = digits.substring(0, 2);
      const areaCode = digits.substring(2, 5);
      const firstPart = digits.substring(5, 8);
      const secondPart = digits.substring(8, 10);
      const thirdPart = digits.substring(10, 12);

      let formatted = '+' + countryCode;
      if (areaCode) formatted += ' ' + areaCode;
      if (firstPart) formatted += ' ' + firstPart;
      if (secondPart) formatted += ' ' + secondPart;
      if (thirdPart) formatted += ' ' + thirdPart;

      return formatted;
    }

    return cleaned;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatTurkishPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!turnstileToken) {
      setError('Lütfen güvenlik doğrulamasını tamamlayın');
      setLoading(false);
      return;
    }

    try {
      if (!formData.full_name.trim()) {
        throw new Error('Ad Soyad alanı zorunludur');
      }

      if (!formData.category) {
        throw new Error('Kategori seçimi zorunludur');
      }

      if (!formData.image) {
        throw new Error('Görsel (fotoğraf) zorunludur');
      }

      if (rateLimitError) {
        throw new Error('Bu bölge için son 5 dakika içinde zaten bir rapor gönderilmiş. Lütfen daha sonra tekrar deneyin.');
      }

      // Upload image to backend
      let imagePath = '';
      if (formData.image) {
        const imageFormData = new FormData();
        imageFormData.append('file', formData.image);
        imageFormData.append('region_id', regionId);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: imageFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Görsel yüklenirken hata oluştu');
        }

        const uploadData = await uploadResponse.json();
        imagePath = uploadData.path;
      }

      // Submit report using API
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_id: locationId,
          region_id: regionId,
          full_name: formData.full_name.trim(),
          phone: formData.phone || null,
          category: formData.category,
          description: formData.description.trim(),
          image_path: imagePath,
          status: 'Yeni',
          turnstileToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Rapor gönderilirken hata oluştu');
      }

      const data = await response.json();
      setIncidentNumber(data.incident_number);
      setSubmitted(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(errorMessage);
      // Reset Turnstile on error
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
      setTurnstileToken('');
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">QR kod doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  if (error && !region) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Geçersiz QR Kod</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Rapor Başarıyla Gönderildi</h2>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Olay Numaranız</p>
            <p className="text-2xl font-bold text-blue-600">{incidentNumber}</p>
          </div>
          <p className="text-gray-600 mb-6">
            Ramakkala raporunuz başarıyla kaydedildi. İSG ekibi bilgilendirildi ve en kısa sürede
            incelenecektir.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Yeni Rapor Oluştur
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{siteTitle} Bildirimi</h1>
            <div className="flex flex-col gap-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">Lokasyon:</span> {location?.name}
              </p>
              <p>
                <span className="font-medium">Bölge:</span> {region?.name}
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium mb-1">
                  RamakKala Nedir?
                </p>
                <p className="text-sm text-yellow-700">
                  Kaza olmadı ama olabilirdi. Bu tür durumları bildirerek iş güvenliğine katkıda
                  bulunun.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                Ad Soyad <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder="Ad Soyadınız"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Telefon Numarası
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder="+90 5XX XXX XX XX"
              />
              <p className="mt-1 text-xs text-gray-500">
                Türkçe telefon formatında otomatik düzenlenecektir
              </p>
            </div>

            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                Görsel / Fotoğraf <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                  required
                />
                <label
                  htmlFor="image"
                  className="flex items-center justify-center gap-3 w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors bg-gray-50"
                >
                  <Camera className="w-6 h-6 text-gray-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Fotoğraf Seç veya Çek</p>
                    <p className="text-xs text-gray-500 mt-1">Mobil cihazdan kamera veya galeri ile görsel yükleyin.</p>
                  </div>
                </label>
              </div>

              {imagePreview && (
                <div className="mt-4 relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full rounded-lg border border-gray-300 max-h-64 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Kategori <span className="text-red-600">*</span>
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                required
              >
                <option value="">Kategori Seçin</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base resize-none"
                placeholder="Ne oldu? Neler gördünüz? Detaylı açıklayın..."
              />
              <p className="mt-2 text-sm text-gray-500">
                Olayı mümkün olduğunca detaylı açıklayın. Bu bilgi güvenlik önlemlerinin
                geliştirilmesine yardımcı olacaktır.
              </p>
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
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Gönderiliyor...
                </>
              ) : (
                'Raporu Gönder'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
