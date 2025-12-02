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

## 🔐 Son Güncellemeler (Aralık 2025)

### 👥 İSG Uzmanı Kullanıcı Yönetimi Erişim Kontrolü
İSG Uzmanı (isg_expert) rolüne sahip kullanıcılar için geliştirilmiş erişim kontrolü sistemi:

**Yeni Özellikleri:**
- **Lokasyon Bazlı Görüntüleme**: İSG Uzmanları sadece kendi lokasyonlarına atanmış kullanıcıları görebilir
- **Lokasyon Kısıtlı Ekleme**: Yeni kullanıcı eklenirken sadece kendi lokasyonlarını seçebilir
- **Backend Doğrulaması**: Tüm işlemler backend'de lokasyon doğrulamasından geçer
- **Güvenli Filtrering**: SQL sorguları ile veritabanı seviyesinde filtreleme
- **Log Kaydı**: Tüm yetkilendirme işlemleri sistem loglarında kaydedilir

**İşlem Akışı:**
1. `/api/users` GET endpoint'i isg_expert kullanıcılarına açılmıştır
2. Gelen verileri kendi location_ids'lerine göre filtrelenmiştir
3. Yeni kullanıcı oluşturulurken (POST) location_ids doğrulaması yapılır
4. Yetkisiz lokasyon atama dentemesinde 403 Forbidden döndürülür

---

### 📧 Yeni Kullanıcı Hoş Geldiniz E-Postası
Yeni kullanıcı oluşturulduğunda otomatik gönderilen profesyonel hoş geldiniz e-postası:

**E-Posta İçeriği:**
- **Gradient Başlık**: Modern tasarım ile hoşlanılacak görünüm
- **Login Bilgileri**: E-posta, hashlenmemiş parola (güvenli şekilde), rol
- **Yetkilendirilmiş Lokasyonlar**: Kullanıcının erişim yetkisi olan lokasyonlar listesi
- **Giriş Butonu**: Doğrudan sisteme yönlendiren bağlantı
- **Güvenlik Uyarısı**: Parolanın güvenli tutulması hakkında bilgi
- **Adım Adım Talimat**: Giriş yapma talimatları

**Teknik Detaylar:**
- `sendWelcomeEmail()` fonksiyonu emailService.js'e eklendi
- HTML ve plain text formatlarında gönderimi destekler
- POST /api/users endpoint'inde otomatik tetiklenir
- E-posta gönderme hatası durumunda kullanıcı yine de oluşturulur

**Sistem Loglaması:**
- E-posta gönderimi başarılı/başarısız kaydedilir
- create_user action'ında email_sent flag'i ve locations bilgisi kaydedilir

---

### 🔒 Login Rate Limiting ve Otomatik Sayfa Yenilemesi
Başarısız giriş denemelerine karşı koruma sistemi ve geliştirilmiş kullanıcı deneyimi:

**Rate Limiting Özellikleri:**
- **3 Başarısız Denemesi Blokla**: Her IP için maksimum 3 deneme izni
- **10 Dakika Blokaj**: 3 başarısız denemeden sonra IP 10 dakika bloke edilir
- **IP Bazlı Takip**: Proxy'ler için X-Forwarded-For header'ı destekler
- **Otomatik Reset**: 1 saat hiçbir deneme olmadığında otomatik reset
- **Başarılı Giriş Temizliği**: Başarılı giriş sırasında deneme sayacı sıfırlanır

**Frontend Otomatik Yenilemesi:**
- **3 Saniyede Yenileme**: Başarısız giriş sonrasında sayfa otomatik yenilenir
- **Turnstile Reset**: Sayfanın yenilenmesiyle Turnstile CAPTCHA otomatik reset olur
- **Hata Görüntüsü**: Error mesajı 3 saniye gösterilmiş olur
- **Kullanıcı Geri Bildirimi**: Yenileme öncesi hata nedeni görülür

**API Yanıtları:**
```json
// Başarısız giriş (401)
{
  "error": "Email veya şifre hatalı",
  "failedAttempts": 2,
  "maxAttempts": 3
}

// Bloke edilen IP (429)
{
  "error": "Çok fazla başarısız giriş denemesi. Lütfen 10 dakika sonra tekrar deneyin.",
  "attemptsBlocked": true,
  "retryAfter": 600
}
```

**Sistem Loglaması:**
- `[RATE_LIMIT]` prefixli console loglar
- Her başarısız deneme "failed_attempts" sayacı ile kaydedilir
- IP blokaj zamanı loglanır
- Başarılı girişte başarısız denemeler temizlenir

**Korunan Işlemler:**
1. Email doğrulama başarısızlığı
2. Parola yanlışlığı
3. Turnstile CAPTCHA doğrulama başarısızlığı

**Güvenlik Avantajları:**
- ✅ Brute force saldırılarına karşı koruma
- ✅ Otomatik sistemle manuel bypass riski azalır
- ✅ IP bazlı takip ile şüpheli aktivite tespiti
- ✅ Audit trail ile denetim imkanı

---

### 💬 Login Denemesi Sayacı Gösterimi

Kullanıcılara başarısız giriş denemelerinin sayısını görüntüleme:

**Özellikler:**
- **Başarısız Deneme Sayısı**: Her başarısız girişte "Başarısız Deneme: X/3" gösterilir
- **Kalan Deneme**: "Kalan Deneme: Y" kullanıcıya uyarı vermek için gösterilir
- **Kilit Mesajı**: IP bloke olduğunda "Hesabınız Z dakika boyunca kilitlenmiştir" gösterilir
- **Multiline Hata Mesajı**: Hata mesajları düzgün biçimde gösterilir

**Görüntüleme Örneği:**
```
Email veya şifre hatalı

⚠️ Başarısız Deneme: 1/3
Kalan Deneme: 2
```

---

### 📱 Mobil Uyumluluk Kritik Sorunları Çözüldü

Tüm sayfaların mobil cihazlarda düzgün görüntülenmesi için optimizasyonlar:

**Tablo Padding Responsive Hale Getirildi (8 Sayfa):**
- Users, Reports, Dashboard, Locations, Regions, ISGExperts, SystemLogs, Settings
- Desktop: `px-6 py-4` → Mobil: `px-3 py-2`
- Tablo hücreleri mobilde daha dar ve okunabilir

**Başlık Layout Responsive:**
- Users, Locations, SystemLogs sayfalarında başlık ve butonlar stack olur
- `flex-col sm:flex-row` pattern kullanılır
- Metin boyutları responsive: `text-2xl sm:text-4xl`

**Tıklama Hedefleri 44px+ (WCAG Standard):**
- Checkbox ve input boyutları `w-4 h-4` → `w-5 h-5` artırıldı
- 4 sayfada güncelleme: Users, ISGExperts, Regions, Locations
- Mobilde dokunmatik kontroller daha kolay

**Sonuç:**
- Mobil Uyumluluk Skor: **B+ → A-**
- Touch Target Min Size: 16px → 20px+ (44px)
- Tüm sayfalar responsive grid sistemini kullanır

---

### 🎨 SweetAlert2 Kullanıcı Onay Diyalogları

Kullanıcı silme işlemi ve CRUD operasyonları için profesyonel onay diyalogları:

**Users Sayfası (Kullanıcı Yönetimi):**
- ✅ Kullanıcı oluşturma başarısı SweetAlert ile
- ✅ Kullanıcı güncelleme başarısı SweetAlert ile
- ✅ Kullanıcı silme işlemi SweetAlert confirmation
- ✅ Parola sıfırlama (email) SweetAlert ile
- ✅ Manuel parola değiştirme SweetAlert ile
- ✅ Tüm hatalar SweetAlert ile gösterilir

**Regions Sayfası (Bölge Yönetimi):**
- ✅ Bölge düzenleme sonuçları SweetAlert ile
- ✅ Bölge silme işlemi SweetAlert confirmation:
  ```
  Başlık: "Bölgeyi Sil"
  Mesaj: "[Bölge Adı] bölgesini silmek istediğinize emin misiniz?"
  Uyarı: "Bu işlem geri alınamaz!"
  ```
- ✅ Silme başarısı ve hatası SweetAlert ile

**Locations Sayfası (Lokasyon Yönetimi):**
- ✅ Lokasyon ekleme sonuçları SweetAlert ile
- ✅ Lokasyon düzenleme sonuçları SweetAlert ile
- ✅ Lokasyon silme işlemi SweetAlert confirmation:
  ```
  Başlık: "Lokasyonu Sil"
  Mesaj: "[Lokasyon Adı] lokasyonunu silmek istediğinize emin misiniz?"
  Uyarı: "Bu işlem geri alınamaz!"
  ```
- ✅ Silme başarısı ve hatası SweetAlert ile

**Diyalog Özellikleri:**
- 🔴 Uyarı (Warning): Kırmızı buton (#ef4444) - Silme işlemleri
- ✅ Başarı (Success): Mavi buton (#3b82f6) - Oluşturma/Güncelleme
- ❌ Hata (Error): Mavi buton (#3b82f6) - Hatalar
- Icon'lar ve smooth animasyonlar dahil

**Kullanıcı Deneyimi:**
- Tüm işlemler kullanıcıya geri bildirim sağlar
- Yanlışlıkla silme işlemi engellenir (confirmation)
- Başarı mesajları detaylı ve açıklayıcı
- Hata mesajları kullanıcıya yardımcı olur

---

## 🔐 Parola Sıfırlama Modern E-Postası ve Önerme Sistemi

Users sayfasında kullanıcı parolalarını sıfırlarken modern e-posta şablonu ve otomatik parola önerme sistemi:

### 📧 Parola Sıfırlama E-Postası

Kullanıcı parolası sıfırlandığında gönderilen profesyonel e-posta:

**E-Posta Özellikler:**
- **Gradient Başlık**: Turuncu/sarı renk gradiyenti ile modern tasarım
- **Yeni Giriş Bilgileri Kartı**: E-posta ve yeni parola belirtilen alan
- **Güvenlik Uyarısı**: Parolanın güvenli tutulması hakkında uyarı
- **Giriş Butonu**: Doğrudan sisteme yönlendiren bağlantı
- **Adım Adım Talimat**: Giriş yapma talimatları sırası ile
- **Professional Footer**: Sistem adı ve açıklaması ile

**Teknik Detaylar:**
- `sendPasswordResetNotificationEmail()` fonksiyonu emailService.js'e eklendi
- Backend'de PUT `/api/users/:id/password` endpoint'inde otomatik tetiklenir
- HTML ve plain text formatlarında gönderimi destekler
- E-posta gönderme hatası durumunda parola yine de sıfırlanır

### 🎯 Parola Önerme Sistemi

Users sayfasında Parola Sıfırla modal'ında yeni parola önerme özellikleri:

**Özellikler:**
- **"Parola Öner" Butonu**: Mavi buton ile 8 karakterlik rastgele parola üretimi
- **Otomatik Doldurma**: Önerilen parola form alanına otomatik doldurulur
- **Manuel Düzenleme**: Kullanıcı önerilen parolayı isterse değiştirebilir
- **Kopyala Butonu**: Önerilen parolayı panoya kopyalamak için (📋 ikonlu)
- **Parola Gösterimi**: Monospace font ile kolay okunur şekilde gösterilir

**Parola Oluşturma:**
- 8 karakterden oluşur
- Büyük harf, küçük harf, rakam ve özel karakterler içerir
- Güvenli ve rastgele oluşturulur
- Minimum 6 karakter validasyonu sağlanır

**Güvenlik:**
- Parolalar şifrelenerek veritabanına kaydedilir
- E-posta yoluyla açık metin olarak gönderilir (e-posta gönderimi sırasında şifrelenmiş kanal kullanılırsa)
- Sistem loglarında parola kaydı yapılmaz

**Sistem Loglaması:**
- RESET_PASSWORD action'ında `manual_password_reset` flag'i kaydedilir
- Parola değişikliği kim tarafından yapıldığı kaydedilir

---

## 🔔 Yeni Raporlar Bildirim Badge'ı

Header'da oturum açan kullanıcının kendi lokasyonlarındaki yeni raporları gösteren bildirim sistemi:

### Bildirim Badge Özellikleri

**Header'da Gösterim:**
- **Zil İkonu**: 🔔 Bell ikonu ile gösterilir
- **Kırmızı Badge**: Yeni rapor varsa kırmızı numara badge'ı görüntülenir
- **Sayı Gösterimi**: 1-99 arası sayılar direkt gösterilir, 100+ için "99+" gösterilir
- **Renk Kodlaması**:
  - Yeni rapor varsa: Kırmızı arka plan (`bg-red-600/20`)
  - Rapor yoksa: Gri arka plan (`bg-slate-700/50`)

**Tıklanabilir Badge:**
- Badge'a tıklandığında Reports sayfasına gider
- Otomatik olarak "Yeni" statusu filtrelenir
- Yeni raporlar listesi hemen görüntülenir

### 🔄 Otomatik Güncelleme

**Teknik Detaylar:**
- Backend endpoint: `GET /api/reports/count/new`
- Token ile kimlik doğrulama yapılır
- Rol bazlı filtreleme: Admin tüm raporları, diğer kullanıcılar sadece kendi lokasyonlarını görebilir
- Lokasyon bazlı filtreleme: Kullanıcı sadece atanmış olduğu lokasyonlardaki yeni raporları görür

**Sayfa Yüklemede:**
- AdminLayout montajında otomatik olarak rapor sayısı yüklenir
- Token ve autorization header'ı ile güvenli API çağrısı yapılır

### 📋 Reports Sayfasında Filtreleme

Badge'dan yönlendirme:
1. Reports sayfasına navigasyon yapılır
2. URL parametresi: `?status=Yeni` eklenir
3. Sayfa yüklenince otomatik filtre uygulanır
4. Yeni raporlar listesi gösterilir
5. URL parametresi temizlenir (bookmark uyumluluğu için)

### Sistem Loglaması

- `GET /api/reports/count/new` çağrısı sistem loglarına kaydedilir
- Rapor filtreleme işlemleri audit trail'e eklenir
- Başarısız API çağrıları hata loglarına kaydedilir

**Örnek Kullanım:**
1. Kullanıcı sisteme giriş yapar
2. Header'da "Yeni: 5" gösterilir (5 yeni rapor var)
3. Badge'a tıklar
4. Reports sayfasına gider ve 5 yeni rapor otomatik filtrelenir
5. Bir raporu durumunu değiştirirse, sayfayı yenilediğinde badge güncellenir

---

---

## 📊 Dashboard Analitikleri ve Dışarı Aktarma Özellikleri (Aralık 2025)

### 🎯 Lokasyon Risk Durumu Kartları

Dashboard'da her lokasyonun risk seviyesini görsel olarak gösteren interaktif kartlar:

**Kartın İçeriği:**
- **Risk Skoru (0-100)**: Dinamik olarak hesaplanan lokasyon risk seviyesi
  - 🟢 80+: Güvenli
  - 🟡 60-79: Dikkat
  - 🔴 40-59: Uyarı
  - 🚨 0-39: Tehlike

- **Rapor Sayısı**: Lokasyondaki toplam ramak kala bildirimi sayısı

- **Son Rapor Tarihi**:
  - "Bugün", "Dün", "X gün önce", "X hafta önce", "X ay önce"
  - Rapor yoksa: "Rapor yok (Güvenli)"

- **Bölgeler Listesi**:
  - 🟢 Yeşil: Rapor gelmemiş (Güvenli) bölgeler
  - 🔴 Kırmızı: Rapor gelmiş (Tehlikeli) bölgeler
  - Her bölgenin rapor sayısı gösterilir

- **Sağlık Barı**: Visual progress bar ile risk durumu gösterilir

**Risk Skoru Hesaplama Mantığı:**
```
Başlangıç: 100 puan
Her rapor: -5 puan
Günler geçme: +2 puan/gün (günler geçtikçe riski azalt)
Sonuç: 0-100 arasında dinamik skor
```

### ⚡ Hızlı Aksiyon Alınmış Lokasyonlar Tablosu

Raporların durumlarının değişim sürelerine göre lokasyonları sıralayan analitik tablo:

**Tablo Sütunları:**
| Sıra | Lokasyon | İnceleme Süresi | Çözüm Süresi | Çözüm Oranı | Aksiyon Hızı |
|------|----------|-----------------|--------------|-------------|-------------|
| 1 | Fabrika A | 1 gün | 3 gün | %95 | 🟢 Hızlı |
| 2 | Fabrika B | 2 gün | 6 gün | %87 | 🟡 Normal |
| 3 | Fabrika C | 3 gün | 12 gün | %72 | 🔴 Yavaş |

**Aksiyon Hızı Renklendirmesi:**
- 🟢 Hızlı: 0-3 gün
- 🟡 Normal: 4-7 gün
- 🔴 Yavaş: 8+ gün

### 📥 PDF ve Excel Dışarı Aktarma

#### Lokasyon Risk Durumu Export

**PDF Raporu:**
- **Format**: Portrait (Dikey)
- **İçerik**:
  - Rapor başlığı ve dışa aktarma tarihi
  - Tablo: Lokasyon, Risk Skoru, Risk Seviyesi, Rapor Sayısı, Son Rapor, Bölgeler
  - Türkçe karakter tam desteği (jspdf-autotable)
  - Sayfa numaralandırması otomatik

- **Dosya Adı**: `lokasyon_risk_durumu_YYYY-MM-DD.pdf`

**Excel Raporu:**
- **Format**: .xlsx (Microsoft Excel)
- **Sütunlar**:
  - Lokasyon Adı
  - Risk Skoru
  - Risk Seviyesi
  - Rapor Sayısı
  - Son Rapor
  - Güvenli Bölge Sayısı
  - Tehlikeli Bölge Sayısı
  - Tüm Bölgeler (noktalı virgülle ayrılmış)

- **Dosya Adı**: `lokasyon_risk_durumu_YYYY-MM-DD.xlsx`
- **Özellikler**: Mavi başlık, otomatik sütun genişliği, metin kaydırma

#### Hızlı Aksiyon Alınmış Lokasyonlar Export

**PDF Raporu:**
- **Format**: Portrait (Dikey)
- **İçerik**:
  - Rapor başlığı ve dışa aktarma tarihi
  - Tablo: Sıra, Lokasyon, İnceleme Süresi, Çözüm Süresi, Çözüm Oranı, Hız
  - Yeşil başlık tasarımı
  - Sayfa numaralandırması

- **Dosya Adı**: `hizli_aksiyon_lokasyonlari_YYYY-MM-DD.pdf`

**Excel Raporu:**
- **Format**: .xlsx (Microsoft Excel)
- **Sütunlar**:
  - Sıra (Ranking)
  - Lokasyon
  - Ortalama İnceleme Süresi (Gün)
  - Ortalama Çözüm Süresi (Gün)
  - Çözüm Oranı (%)
  - Aksiyon Hızı

- **Dosya Adı**: `hizli_aksiyon_lokasyonlari_YYYY-MM-DD.xlsx`
- **Özellikler**: Yeşil başlık, otomatik sütun genişliği, metin kaydırma

### 🎛️ Sistem Logları ve Raporlar Sayfasında Export

#### Sistem Logları Sayfası (`/logs`)

**PDF Export Özellikleri:**
- Dikey (Portrait) format
- Tablo: Tarih/Saat, Kullanıcı, İşlem, Detaylar
- Mavi başlık tasarımı
- Sayfa numaralandırması
- Dosya Adı: `sistemlogları_YYYY-MM-DD.pdf`

**Excel Export Özellikleri:**
- Mavi başlık
- Otomatik sütun genişliği
- Türkçe başlıklar: "Tarih / Saat", "Kullanıcı", "İşlem", "Detaylar"
- Dosya Adı: `sistemlogları_YYYY-MM-DD.xlsx`

#### Raporlar Sayfası (`/reports`)

**PDF Export Özellikleri:**
- Yatay (Landscape) format (daha geniş tablo için)
- Tablo: Olay No, Lokasyon, Bölge, Ad Soyad, Telefon, Kategori, Durum, Açıklama
- Mavi başlık tasarımı
- Otomatik sayfa atlama
- Dosya Adı: `raporlar_YYYY-MM-DD.pdf`

**Excel Export Özellikleri:**
- Mavi başlık
- 10 sütun: Olay No, Lokasyon, Bölge, Ad Soyad, Telefon, Kategori, Durum, Açıklama, İç Notlar, Oluşturulma Tarihi
- Otomatik sütun genişliği
- Dosya Adı: `raporlar_YYYY-MM-DD.xlsx`

### 🔧 Teknik Detaylar

**Kullanılan Kütüphaneler:**
- `jspdf@4.2.1`: PDF oluşturma
- `html2canvas@1.4.1`: HTML to Canvas dönüştürme
- `xlsx@0.18.5`: Excel dosyası oluşturma
- `jspdf-autotable@3.8.3`: PDF tablolama ve Türkçe karakter desteği

**Ana Modüller:**
- `src/lib/dashboardAnalytics.ts`: Analitik hesaplama fonksiyonları
- `src/lib/exportUtils.ts`: PDF ve Excel export fonksiyonları

**Export Fonksiyonları:**
```typescript
// Sistem Logları
exportLogsAsPDF(logs, options)
exportLogsAsExcel(logs, options)

// Raporlar
exportReportsAsPDF(reports, options)
exportReportsAsExcel(reports, options)

// Dashboard Analytics
exportLocationRiskAsPDF(locationHealth, options)
exportLocationRiskAsExcel(locationHealth, options)
exportActionSpeedAsPDF(actionSpeed, options)
exportActionSpeedAsExcel(actionSpeed, options)
```

### 📍 Butonlar Nerede?

**Dashboard Sayfası:**
- "Lokasyon Risk Durumu" kartının sağ üst köşesinde **PDF** ve **Excel** butonları
- "Hızlı Aksiyon Alınmış Lokasyonlar" kartının sağ üst köşesinde **PDF** ve **Excel** butonları

**Sistem Logları Sayfası:**
- Başlığın yanında **PDF** (kırmızı) ve **Excel** (yeşil) butonları

**Raporlar Sayfası:**
- Başlığın yanında **PDF** (kırmızı) ve **Excel** (yeşil) butonları

### 🌍 Türkçe Dil Desteği

- Tüm başlıklar, sütun adları ve açıklamalar Türkçe
- Tarih/Saat formatı: `DD.MM.YYYY HH:mm` (Türkiye standartı)
- Dosya adlarında Türkçe karakterler (`lokasyon_risk_durumu`, `hızlı_aksiyon_lokasyonlari`)
- PDF'lerde `helvetica` font ile Türkçe karakterleri destekler
- Excel'de Unicode tam desteği

### 💡 Kullanım Örnekleri

**1. Günlük Raporlama:**
```
1. Dashboard'a git
2. "Lokasyon Risk Durumu" kartında PDF indir
3. Raporu yöneticiye gönder
```

**2. Aylık Analiz:**
```
1. Dashboard'a git
2. "Hızlı Aksiyon Alınmış Lokasyonlar" Excel'i indir
3. Lokasyonları karşılaştır
```

**3. Denetim ve Belgelendirme:**
```
1. Sistem Logları sayfasına git
2. Raporlar sayfasında tüm filtreleri uygula
3. PDF'leri indir ve denetim dosyasında sakla
```

---

**Not**: Uygulama Türkçe dilinde tasarlanmıştır ve Türkiye İş Sağlığı ve Güvenliği mevzuatına uygun ramak kala raporlama süreçlerini destekler.
