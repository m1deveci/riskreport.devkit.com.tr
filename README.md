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

## Sistem Loglaması

Sistem loglaması, tüm önemli işlemlerin ve kullanıcı etkinliklerinin otomatik olarak kaydedilmesini sağlar. Loglar **Sistem Logları** sayfasında görüntülenebilir.

### 📊 Loglanmış İşlemler

#### 🔐 Kimlik Doğrulama İşlemleri
- **LOGIN_SUCCESS**: Başarılı kullanıcı girişi
  - Kaydedilen bilgiler: Kullanıcı ID, e-posta, tam ad
  - Örnek: "mustafa.deveci@ravago.com başarıyla giriş yaptı"

- **LOGIN_FAILED**: Başarısız giriş denemeleri
  - Kaydedilen bilgiler: E-posta, hata sebebi (Email bulunamadı / Şifre hatalı)
  - Örnek: "invalid@example.com - Şifre hatalı"

- **LOGOUT**: Kullanıcı çıkış işlemi
  - Kaydedilen bilgiler: Kullanıcı ID, e-posta, tam ad
  - Örnek: "Mustafa Deveci çıkış yaptı"

#### 📋 Rapor İşlemleri
- **CREATE_NEARMISS**: Yeni ramak kala raporu oluşturma (QR kod ile)
  - Kaydedilen bilgiler:
    - Olay numarası (RK-2025-XXXXXX formatında)
    - Bildirim yapan kişi adı
    - Kategori
    - Lokasyon ID
    - Bölge ID
    - Telefon numarası (varsa)
  - Örnek: "RK-2025-456789 raporu - Bildirim yapan: Ahmet Yılmaz (Makine Güvenliği)"

- **UPDATE_NEARMISS**: Rapor durumu veya notları güncelleme
  - Kaydedilen bilgiler: Durum, dahili notlar
  - Örnek: "RK-2025-456789 raporu 'İnceleniyor' durumuna güncellendi"

- **DELETE_NEARMISS**: Rapor silme
  - Kaydedilen bilgiler: Silinen raporun detayları
  - Örnek: "RK-2025-456789 raporu silindi"

#### 👥 Kullanıcı Yönetimi
- **CREATE_USER**: Yeni kullanıcı oluşturma
- **UPDATE_USER**: Kullanıcı bilgileri güncelleme
- **DELETE_USER**: Kullanıcı silme

#### 📍 Lokasyon Yönetimi
- **CREATE_LOCATION**: Yeni lokasyon oluşturma
- **UPDATE_LOCATION**: Lokasyon güncelleme
- **DELETE_LOCATION**: Lokasyon silme

#### 🗺️ Bölge Yönetimi
- **CREATE_REGION**: Yeni bölge ve QR kod oluşturma
- **UPDATE_REGION**: Bölge güncelleme
- **DELETE_REGION**: Bölge silme

#### 👨‍💼 İSG Uzmanı Yönetimi
- **CREATE_ISG_EXPERT**: Yeni İSG uzmanı ekleme
- **UPDATE_ISG_EXPERT**: İSG uzmanı bilgileri güncelleme
- **DELETE_ISG_EXPERT**: İSG uzmanı silme

#### ⚙️ Sistem Ayarları
- **UPDATE_SETTINGS**: Sistem ayarlarını güncelleme (Site başlığı, SMTP, yedekleme)

#### 💾 Yedekleme
- **DOWNLOAD_BACKUP**: Veritabanı yedeği indirme

### 🔍 Sistem Logları Sayfasını Kullanma

1. **Admin Paneline Giriş Yapın**
   - Admin yetkili hesabı ile https://riskreport.devkit.com.tr/#/logs sayfasına gidin

2. **Logları Görüntüleyin**
   - Tarih/Saat: İşlemin yapılma zamanı
   - Kullanıcı: İşlemi yapan kişi (veya "Sistem")
   - İşlem: Yapılan işlem türü (icon ve Türkçe açıklama)
   - Detaylar: Genişletmek için satıra tıklayın

3. **Arama Yapın**
   - İşlem türü, kullanıcı adı, arama barında yazarak filtreleme yapabilirsiniz

4. **Detayları Inceleyin**
   - Her logun detaylı bilgilerini görüntülemek için satırını genişletin
   - Raporlar için olay numarası, kategori, lokasyon bilgileri görüntülenebilir

### 📝 Log Detayları Örneği

```
📊 Sistem Logları
─────────────────────────────────────────────────────────────
Tarih/Saat: 30 Kasım 2025 16:45:30
Kullanıcı: -
İşlem: ⚠️ Ramak Kala Raporu Oluşturuldu

Detaylar (genişletilmiş):
🔹 Olay Numarası: RK-2025-123456
🔹 Bildirim Yapan: Ahmet Yılmaz
🔹 Kategori: Makine Güvenliği
🔹 Lokasyon ID: loc-001
🔹 Bölge ID: reg-003
🔹 Telefon: 0555 123 45 67
─────────────────────────────────────────────────────────────
```

### 🔒 Güvenlik ve Gizlilik

- Sadece **Admin** rolüne sahip kullanıcılar sistem loglarını görüntüleyebilir
- Loglar **8 ay** saklanır (bkz: Sistem Ayarları)
- Tüm hassas bilgiler (şifreler, tokens) hiçbir zaman loglanmaz
- Loglar **denetim ve uyum** amaçlarıyla kullanılır

### 📊 Loglama Veri Tabanında

Loglar `system_logs` tablosunda aşağıdaki alanlarla saklanır:
- `id`: Unique log ID
- `user_id`: İşlemi yapan kullanıcı ID (anonim işlemler için NULL)
- `action`: İşlem türü (LOGIN_SUCCESS, CREATE_NEARMISS vb.)
- `details`: JSON formatında işlem detayları
- `ip_address`: İsteği gönderen IP adresi
- `created_at`: İşlemin yapılma tarihi ve saati

---

## 🔐 İSG Uzmanları İçin Rol Tabanlı Erişim Kontrolü

İSG Uzmanı (isg_expert) rolüne sahip kullanıcılar için özel yetkilendirme sistemi:

### Sidebar Menüsü
- İSG Uzmanları **"Sistem Logları"** ve **"Ayarlar"** menülerini görmez
- Sadece erişim yetkilerine sahip oldukları menüleri görebilirler

### Kullanıcı Yönetimi Sayfası
- **Görüntüleme**: Sadece kendi lokasyonlarına atanmış kullanıcıları görebilir
- **Yeni Kullanıcı Ekleme**: Sadece kendi lokasyonlarına yeni kullanıcı ekleyebilir
- **Parola Sıfırlama**: Kendi lokasyonlarındaki kullanıcıların parolalarını sıfırlayabilir
- **Silme Yetkisi Yok**: İSG Uzmanları kullanıcı silemez

### Lokasyon Filtreleme
- Her İSG Uzmanı yalnızca kendisine atanmış lokasyonlarda yetkilendirme sahibi
- Lokasyon seçimi sınırlandırılmıştır
- Backend'de tüm operasyonlarda lokasyon doğrulaması yapılır

---

## 📧 Ramak Kala Formu Bildirim Sistemi

QR kod ile yeni ramak kala formu gönderildiğinde, o lokasyondaki tüm isg_expert rolüne sahip kullanıcılara otomatik e-posta gönderilir.

### Bildirim Özellikleri
- **Otomatik Gönderim**: Form gönderilir gönderilmez e-posta hazırlanır
- **Hedef Alıcılar**: Lokasyonda yetkili tüm aktif İSG Uzmanları
- **SMTP Ayarları**: Sistem Ayarları sayfasından yapılandırılan SMTP bilgileri kullanılır
- **E-posta İçeriği**:
  - Olay numarası
  - Lokasyon adı
  - Bildirim yapan kişi adı
  - Kategori
  - Telefon numarası
  - Açıklama
  - Sistem Logları sayfasına yönlendirme linki

### Sistem Logları Kaydı
```
E-posta Alıcıları:
- email_recipients_count: Kaç İSG Uzmanına e-posta gönderildiği
- email_recipients: E-posta alan İSG Uzmanların adları (virgülle ayrılmış)
```

### SMTP Yapılandırması
Sistem Ayarları sayfasından aşağıdaki bilgileri girin:
- SMTP Host (örn: smtp.gmail.com)
- SMTP Port (varsayılan: 587)
- SMTP Kullanıcı Adı
- SMTP Şifresi
- Gönderen E-posta Adresi

---

## 📋 Rapor Değişiklik Geçmişi ve Denetim İzleri

Reports sayfasındaki rapor detaylarında yapılan tüm değişiklikleri kaydeden kapsamlı audit trail sistemi.

### Takip Edilen Değişiklikler
- **Rapor Oluşturma**: Kimin ne zaman rapor oluşturduğu
- **Durum Değişikliği**: Eski durum → Yeni durum (Yeni → İnceleniyor → Kapatıldı)
- **Not Eklemeleri**: Dahili notlara yapılan eklemeler ve değişiklikler
- **Tüm Detaylar**: Eski değer, yeni değer, değişen alan adı

### Geçmiş Görüntüleme

#### Reports Sayfasında
1. Rapor detayı modalını açın
2. **"Geçmiş"** butonuna tıklayın
3. Değişiklik geçmişi modalını görüntüleyin

#### Geçmiş Modal'ında Gösterilen Bilgiler
- **Değişikliği Yapan Kişi**: Kullanıcı adı
- **Tarih ve Saat**: İşlemin yapılma tarihi (saniyeye kadar)
- **İşlem Türü**: Oluşturuldu (yeşil) / Güncellendi (mavi)
- **Değişiklik Açıklaması**: İnsan okunabilir format
- **Alan Detayları**:
  - Hangi alan değiştiğini
  - Eski değeri (kırmızı, çizili)
  - Yeni değeri (yeşil)

### Sistem Logları'nda Görüntüleme

Tüm rapor güncellemeleri Sistem Logları sayfasında `UPDATE_REPORT` olarak kaydedilir:

```
İşlem: 📊 Rapor Güncellendi
Detaylar:
- Rapor ID: report-xxxxx
- Kullanıcı: Mustafa Deveci
- Değişiklikler: [
    "Durum değiştirildi: Yeni → İnceleniyor",
    "Not eklendi/değiştirildi"
  ]
```

### Veritabanı Tablosu

Değişiklik geçmişi `report_history` tablosunda aşağıdaki alanlarla saklanır:
- `id`: Unique history ID
- `report_id`: İlişkili rapor ID
- `changed_by_user_id`: Değişikliği yapan kullanıcı ID (sistem işlemleri için NULL)
- `changed_by_user_name`: Değişikliği yapan kişi adı
- `action`: CREATE (Oluşturuldu) veya UPDATE (Güncellendi)
- `field_name`: Değişen alan adı (status, internal_notes vb.)
- `old_value`: Eski değer
- `new_value`: Yeni değer
- `change_description`: İnsan okunabilir değişiklik açıklaması
- `created_at`: Değişiklik tarihi ve saati

### Güvenlik ve Denetim
- **Tam Denetim İzleri**: Her değişiklik tam detaylarıyla kaydedilir
- **Sorumluluğu Net**: Kimin ne yaptığını açıkça belli olur
- **Geri Dönüş**: Değişikliklerin tarihçesi korunur
- **Uyumluluğu**: İş Sağlığı ve Güvenliği mevzuatına uyumlu belgelendirme

---

## 🔄 Son Güncellemeler (30 Kasım 2025)

### ✨ Ramak Kala E-Posta Tasarımı Modernize Edildi
- Gradient başlık tasarımı eklendi (kırmızı renk gradiyenti)
- Card-based layout ile bilgiler renklendirildi
- Her bilgi alanı için farklı renk kodları (Başlayan Kişi, İletişim, Kategori, Açıklama, Tarih)
- Modern ikonlar ve typography
- CTA butonu daha belirgin hale getirildi
- Professional footer eklendi
- Email client uyumluluğu sağlandı

### 🧹 Kod Temizliği
- Kullanılmayan `supabase` import'u NearMissForm.tsx'ten kaldırıldı
- Tüm API çağrıları `fetch()` kullanıyorsa, import gerekli değildir

### 🔧 Parola Sıfırlama Linki Hatası Düzeltildi
- Hash routing'te token parametresi doğru şekilde alınmıyor sorunu çözüldü
- `window.location.search` yerine `window.location.hash`'ten token alınıyor
- Parola sıfırlama e-posta linki `/#/reset-password?token=...` formatında çalışıyor

### ✨ Login Sayfasında Dil Seçimi İyileştirildi
- **Hover-based dropdown → Click-based dropdown**: Dil seçimi artık tıkla/aç-kapat ile yapılıyor
- **Dışarıya tıklanırsa dropdown kapatılıyor**: UX iyileştirildi
- **Daha geniş menü**: Dropdown alanı `w-48` olarak genişletildi
- **Seçili dili göster**: Check ikonu ile seçili dil gösterilir
- **Chevron animasyonu**: Dropdown açılı dönen Chevron ikonu
- **Gradient buton**: Mavi-indigo gradient ile modern tasarım
- **Mobile-friendly**: Tüm cihazlarda sorunsuz çalışır

---

**Not**: Uygulama Türkçe dilinde tasarlanmıştır ve Türkiye İş Sağlığı ve Güvenliği mevzuatına uygun ramak kala raporlama süreçlerini destekler.
