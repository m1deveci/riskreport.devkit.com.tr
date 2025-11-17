# Ramak Kala (Near-Miss) Raporlama Sistemi

İş Sağlığı ve Güvenliği (İSG) için mobil uyumlu ramak kala raporlama sistemi. QR kod tabanlı hızlı bildirim ve kapsamlı yönetim paneli.

## Özellikler

### 🎯 Genel Özellikler
- **Çoklu Lokasyon Desteği**: Birden fazla fabrika/işyeri yönetimi
- **QR Kod Sistemi**: Her bölge için benzersiz QR kod ile hızlı bildirim
- **Mobil Uyumlu**: Tüm cihazlarda sorunsuz çalışır
- **Rol Tabanlı Yetkilendirme**: Admin, İSG Uzmanı, Görüntüleyici rolleri
- **PostgreSQL Veritabanı**: Güvenli ve ölçeklenebilir Supabase altyapısı

### 📱 Kullanıcı (QR Tarama) Özellikleri
- QR kod ile doğrudan rapor formu açılır
- Basit ve hızlı form (Ad Soyad, Telefon, Kategori, Açıklama)
- Otomatik olay numarası oluşturma (RK-2025-000123 formatında)
- Form gönderimi sonrası onay ekranı

### 🎛️ Admin Panel Özellikleri

#### Dashboard
- Toplam lokasyon, rapor, yeni rapor sayıları
- Bu ay raporları
- Kategorilere göre rapor dağılımı (grafik)
- Lokasyonlara göre rapor dağılımı (grafik)
- Son raporlar listesi

#### Lokasyon Yönetimi
- Lokasyon ekleme/düzenleme/silme
- Her lokasyon için İSG e-posta adresi
- Aktif/Pasif durumu

#### Bölge Yönetimi
- Her lokasyon için bölge tanımlama
- Otomatik QR kod oluşturma
- QR kod PNG olarak indirme
- Her bölge için benzersiz URL oluşturma

#### İSG Uzmanları Yönetimi
- Lokasyon başına maksimum 5 aktif uzman
- Uzman bilgileri (Ad, E-posta, Telefon)
- Aktif/Pasif durumu
- Her lokasyon için uzman doluluk oranı göstergesi

#### Ramak Kala Raporları
- Tüm raporları görüntüleme
- Gelişmiş filtreleme:
  - Lokasyon
  - Bölge
  - Kategori
  - Durum (Yeni/İnceleniyor/Kapatıldı)
  - Tarih aralığı
- Arama: Olay no, ad soyad, açıklama
- Rapor detayı görüntüleme
- Durum güncelleme
- Dahili notlar ekleme (sadece yöneticiler görebilir)

#### Sistem Logları
- Tüm sistem işlemlerinin kaydı
- Kullanıcı bazlı log takibi
- İşlem detayları (JSON formatında)
- Arama ve filtreleme

#### Kullanıcı Yönetimi
- Yeni kullanıcı oluşturma
- Rol atama (Admin/İSG Uzmanı/Görüntüleyici)
- Kullanıcı güncelleme/silme
- Aktif/Pasif durumu

#### Sistem Ayarları
- Site başlığı
- SMTP ayarları (e-posta bildirimleri için)
- Yedekleme ayarları

## Teknolojiler

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Tip güvenliği
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Modern ikonlar
- **Vite** - Hızlı build tool

### Backend
- **Supabase** - Backend as a Service
- **PostgreSQL** - İlişkisel veritabanı
- **Row Level Security (RLS)** - Veritabanı seviyesinde güvenlik
- **Supabase Auth** - Kimlik doğrulama
- **Edge Functions** - Sunucusuz fonksiyonlar

### Güvenlik
- Row Level Security (RLS) her tabloda aktif
- Rol tabanlı erişim kontrolü
- Şifreli kimlik doğrulama
- Güvenli QR token sistemi
- SQL injection koruması

## Kurulum

### 1. Gereksinimler
- Node.js 18+ ve npm
- Supabase hesabı (ücretsiz olabilir)

### 2. Projeyi Klonlayın
```bash
git clone <repository-url>
cd ramak-kala-sistemi
```

### 3. Bağımlılıkları Yükleyin
```bash
npm install
```

### 4. Ortam Değişkenlerini Ayarlayın

`.env` dosyası zaten Supabase bağlantı bilgileriyle hazır durumda.

### 5. Veritabanı Hazır

Veritabanı şeması ve tüm tablolar otomatik olarak oluşturuldu:
- `locations` - Lokasyonlar
- `regions` - Bölgeler ve QR kodları
- `isg_experts` - İSG uzmanları (lokasyon başına max 5)
- `near_miss_reports` - Ramak kala raporları
- `users` - Sistem kullanıcıları
- `system_logs` - Sistem logları
- `system_settings` - Sistem ayarları

### 6. İlk Admin Kullanıcısı Oluşturun

Supabase Dashboard'da SQL Editor'ü açın ve şu komutu çalıştırın:

```sql
-- Önce auth.users'a kullanıcı ekleyin (Supabase Dashboard > Authentication > Users > Add User)
-- Email: admin@example.com
-- Password: YourSecurePassword123

-- Sonra kullanıcı ID'sini alıp aşağıdaki komutu çalıştırın:
INSERT INTO users (id, full_name, email, role, is_active)
VALUES (
  'USER_ID_BURAYA',  -- Supabase Auth'dan aldığınız kullanıcı ID'si
  'Admin Kullanıcı',
  'admin@example.com',
  'admin',
  true
);
```

### 7. Uygulamayı Başlatın
```bash
npm run dev
```

Uygulama http://localhost:5173 adresinde çalışacaktır.

### 8. Production Build
```bash
npm run build
```

Build çıktısı `dist/` klasöründe oluşturulur.

## Kullanım

### İlk Kurulum Adımları

1. **Admin paneline giriş yapın**
   - E-posta ve şifrenizle giriş yapın

2. **İlk lokasyonu oluşturun**
   - Lokasyonlar sayfasından "Yeni Lokasyon" butonuna tıklayın
   - Lokasyon adı, açıklama ve İSG e-posta adresini girin

3. **Bölgeleri tanımlayın**
   - Bölgeler sayfasından lokasyon seçin
   - Her bölge için "Yeni Bölge" butonuna tıklayın
   - QR kod otomatik oluşturulur

4. **QR kodları indirin ve yerleştirin**
   - Her bölge için "QR Kodu İndir" butonuna tıklayın
   - QR kodları ilgili bölgelere yerleştirin

5. **İSG uzmanlarını ekleyin**
   - İSG Uzmanları sayfasından uzman ekleyin
   - Her lokasyon için maksimum 5 uzman ekleyebilirsiniz

6. **Test edin**
   - QR kodu telefon kamerasıyla tarayın
   - Form açılmalı ve rapor gönderebilmelisiniz

### QR Kod Kullanımı

1. Çalışan QR kodu tarar
2. Telefonda otomatik olarak form açılır
3. Formu doldurur (Ad Soyad, Telefon, Kategori, Açıklama)
4. "Raporu Gönder" butonuna basar
5. Olay numarası ile onay ekranı görür
6. İSG ekibine otomatik bildirim gider (SMTP ayarlandıysa)

### E-posta Bildirimleri

E-posta bildirimleri için Sistem Ayarları sayfasından SMTP ayarlarını yapılandırın:
- SMTP Host (örn: smtp.gmail.com)
- SMTP Port (varsayılan: 587)
- Kullanıcı adı ve şifre
- Gönderen e-posta adresi

Her yeni rapor:
1. Lokasyonun ana İSG e-postasına gönderilir
2. O lokasyondaki tüm aktif İSG uzmanlarına gönderilir

## Veritabanı Şeması

### Tablolar
- **locations**: Fabrika/işyeri bilgileri
- **regions**: QR kodlu bölgeler
- **isg_experts**: İSG uzmanları (max 5/lokasyon)
- **near_miss_reports**: Ramak kala raporları
- **users**: Sistem kullanıcıları
- **system_logs**: Denetim logları
- **system_settings**: Sistem konfigürasyonu

### Önemli Özellikler
- Otomatik `updated_at` trigger'ları
- Otomatik olay numarası oluşturma (RK-YYYY-NNNNNN)
- İSG uzman sayısı kontrolü (trigger)
- Row Level Security (RLS) tüm tablolarda aktif
- Foreign key constraints ile veri bütünlüğü

## Roller ve Yetkiler

### Admin
- Tüm sayfalara tam erişim
- Lokasyon, bölge, uzman ekleme/düzenleme/silme
- Kullanıcı yönetimi
- Sistem ayarları
- Tüm raporları görüntüleme ve düzenleme

### İSG Uzmanı
- Dashboard görüntüleme
- Raporları görüntüleme ve durum güncelleme
- Lokasyon ve bölge görüntüleme
- İSG uzmanları görüntüleme
- Sistem logları görüntüleme

### Görüntüleyici
- Sadece okuma yetkisi
- Dashboard ve raporları görüntüleme

## Güvenlik Özellikleri

1. **Authentication**: Supabase Auth ile güvenli giriş
2. **Row Level Security**: Veritabanı seviyesinde yetkilendirme
3. **Role-Based Access Control**: Rol bazlı sayfa ve işlem erişimi
4. **Audit Logs**: Tüm önemli işlemler loglanır
5. **QR Token Security**: Her QR kod benzersiz token ile korunur
6. **Input Validation**: Tüm form girdileri doğrulanır
7. **SQL Injection Protection**: Prepared statements kullanımı

## Kategoriler

Sistem şu ramak kala kategorilerini destekler:
- Kayma/Düşme
- Elektrik
- Makine Güvenliği
- Kimyasal
- Yangın
- Ergonomi
- İş Ekipmanları
- Diğer

## Durum Yönetimi

Raporlar üç durumda olabilir:
- **Yeni**: Yeni gelen raporlar
- **İnceleniyor**: İnceleme aşamasındaki raporlar
- **Kapatıldı**: Tamamlanmış raporlar

## Sorun Giderme

### Build Hatası
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Veritabanı Bağlantı Hatası
- `.env` dosyasındaki Supabase URL ve anahtarları kontrol edin
- Supabase projesinin aktif olduğundan emin olun

### QR Kod Çalışmıyor
- Bölgenin aktif olduğundan emin olun
- QR kod URL'sinin doğru oluşturulduğunu kontrol edin
- URL formatı: `/report/{locationId}/{token}?region={regionId}`

### Giriş Yapamıyorum
- Kullanıcının `users` tablosunda kayıtlı olduğundan emin olun
- Kullanıcının `is_active` değerinin `true` olduğunu kontrol edin

## Lisans

Bu proje özel kullanım içindir.

## Destek

Sorularınız için lütfen İSG ekibinizle iletişime geçin.

---

**Not**: Uygulama Türkçe dilinde tasarlanmıştır ve Türkiye İş Sağlığı ve Güvenliği mevzuatına uygun ramak kala raporlama süreçlerini destekler.
