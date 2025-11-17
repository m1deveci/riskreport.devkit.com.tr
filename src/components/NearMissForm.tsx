import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

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

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    category: '',
    description: '',
  });

  useEffect(() => {
    validateQRCode();
  }, [locationId, regionId, qrToken]);

  async function validateQRCode() {
    try {
      setValidating(true);
      setError('');

      const { data: regionData, error: regionError } = await supabase
        .from('regions')
        .select('*, locations(id, name)')
        .eq('id', regionId)
        .eq('location_id', locationId)
        .eq('qr_code_token', qrToken)
        .eq('is_active', true)
        .maybeSingle();

      if (regionError || !regionData) {
        setError('Geçersiz QR kodu. Lütfen sistem yöneticinizle iletişime geçin.');
        return;
      }

      setRegion(regionData);
      setLocation((regionData.locations as unknown) as Location);
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      console.error(err);
    } finally {
      setValidating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.full_name.trim()) {
        throw new Error('Ad Soyad alanı zorunludur');
      }

      if (!formData.phone.trim()) {
        throw new Error('Telefon alanı zorunludur');
      }

      if (!formData.category) {
        throw new Error('Kategori seçimi zorunludur');
      }

      const { data, error: insertError } = await supabase
        .from('near_miss_reports')
        .insert({
          location_id: locationId,
          region_id: regionId,
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim(),
          category: formData.category,
          description: formData.description.trim(),
          status: 'Yeni',
        })
        .select('incident_number')
        .single();

      if (insertError) throw insertError;

      setIncidentNumber(data.incident_number);
      setSubmitted(true);

      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-nearmiss-notification`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              incident_number: data.incident_number,
              location_id: locationId,
              region_id: regionId,
            }),
          }
        );
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(errorMessage);
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
            Ramak kala raporunuz başarıyla kaydedildi. İSG ekibi bilgilendirildi ve en kısa sürede
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ramak Kala Bildirimi</h1>
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
                  Ramak Kala Nedir?
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
                Telefon <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder="0555 555 55 55"
                required
              />
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

            <button
              type="submit"
              disabled={loading}
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
