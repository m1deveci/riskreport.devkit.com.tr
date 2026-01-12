# 🎯 İş Akışı Uygulaması Tamamlandı

## 📋 Uygulanan İş Akışı

### 1. QR Kod Okutma → Rapor Oluşturma
- Kullanıcı QR kod okuttur
- Form doldurulur (Ad Soyad, Telefon, Kategori, Açıklama, Görsel)
- Rapor oluşturulur (Durum: **"Yeni"**)
- ✅ History kaydı: "Rapor oluşturuldu"
- ✅ İSG Uzmanlarına e-posta gönderilir

### 2. İSG Uzmanı → Kullanıcıya Atama
- İSG Uzmanı Reports sayfasında "Kullanıcıya Ata" butonuna tıklar
- Kendi lokasyonundaki kullanıcıları görür
- Dilerse hızlı kullanıcı ekleme yapar
- Raporu kullanıcıya atar
- ✅ History kaydı: "Rapor [kullanıcı_adı] kullanıcısına atandı"
- ✅ Atanan kullanıcıya e-posta gönderilir

### 3. Atanan Kullanıcı → Rapor Yönetimi
- Kullanıcı sisteme giriş yapar
- **Sidebar'da sadece "Ramak Kala ve Tehlike Raporları"** sayfasını görür
- **Sadece kendisine atanan raporları** görür
- Rapor detayını açar
- Durumu **"Devam Ediyor"** olarak değiştirir
- ✅ History kaydı: "Durum değiştirildi: Yeni → Devam Ediyor"
- İç notlar ekler
- ✅ History kaydı: "Not eklendi/değiştirildi"

### 4. Atanan Kullanıcı → Rapor Kapatma
- Gerekli işlemleri tamamladıktan sonra
- Durumu **"Tamamlandı"** olarak değiştirir
- ✅ History kaydı: "Durum değiştirildi: Devam Ediyor → Tamamlandı"
- Son notları ekler
- Rapor kapatılır

---

## 🔐 Rol Bazlı Yetkiler

### Admin
- ✅ Tüm sayfaları görebilir
- ✅ Tüm raporları görebilir
- ✅ Tüm raporları düzenleyebilir
- ✅ Tüm raporları silebilir
- ✅ Kullanıcı oluşturabilir
- ✅ Kullanıcıya rapor atayabilir

### İSG Uzmanı
- ✅ Dashboard, Locations, Regions, Reports, Users sayfalarını görebilir
- ✅ Kendi lokasyonlarındaki raporları görebilir
- ✅ Kendi lokasyonlarındaki raporları düzenleyebilir
- ✅ Kendi lokasyonlarındaki raporları silebilir
- ✅ Kendi lokasyonlarındaki kullanıcıları oluşturabilir
- ✅ Rapor atayabilir

### Viewer (Atanan Kullanıcılar)
- ✅ **Sidebar'da SADECE "Ramak Kala ve Tehlike Raporları" sayfasını görür**
- ✅ **SADECE kendisine atanan raporları görür**
- ✅ **SADECE kendisine atanan raporların durumunu değiştirebilir**
- ✅ **SADECE kendisine atanan raporlara not ekleyebilir**
- ❌ Rapor silemez
- ❌ Kullanıcı oluşturamaz
- ❌ Diğer sayfaları göremez

---

## 📊 Durum Akışı

```
Yeni → Devam Ediyor → Tamamlandı
```

### Durum Tanımları

| Durum | Açıklama | Kim Değiştirebilir |
|-------|----------|-------------------|
| **Yeni** | QR kod okutularak oluşturulmuş, henüz atanmamış veya işlem görmemiş | İSG Uzmanı, Admin |
| **Devam Ediyor** | Kullanıcıya atanmış, üzerinde çalışılıyor | Atanan Kullanıcı, İSG Uzmanı, Admin |
| **Tamamlandı** | İşlemler tamamlanmış, kapatılmış | Atanan Kullanıcı, İSG Uzmanı, Admin |

---

## 📝 Report History Kayıtları

Tüm işlemler `report_history` tablosunda kayıt altına alınır:

### Kaydedilen İşlemler

1. **CREATE**: Rapor oluşturulması (QR kod ile)
   ```
   Rapor oluşturuldu - Başlayan: [ad_soyad], Kategori: [kategori]
   ```

2. **ASSIGN**: Kullanıcıya atama
   ```
   Rapor [kullanıcı_adı] kullanıcısına atandı
   ```

3. **UPDATE - Status**: Durum değişikliği
   ```
   Durum değiştirildi: [eski_durum] → [yeni_durum]
   ```

4. **UPDATE - Internal Notes**: Not ekleme/değiştirme
   ```
   Not eklendi/değiştirildi
   ```

### History Kaydı Formatı

| Alan | Açıklama |
|------|----------|
| `report_id` | Rapor ID'si |
| `changed_by_user_id` | Değişikliği yapan kullanıcı ID'si (sistem için NULL) |
| `changed_by_user_name` | Değişikliği yapan kullanıcı adı (sistem için "Sistem") |
| `action` | İşlem tipi (CREATE, ASSIGN, UPDATE) |
| `field_name` | Değiştirilen alan adı (status, internal_notes) |
| `old_value` | Eski değer |
| `new_value` | Yeni değer |
| `change_description` | Değişiklik açıklaması |
| `created_at` | İşlem zamanı |

---

## 🔄 Değişiklik Özeti

### Frontend Değişiklikleri

1. **AdminLayout.tsx** (39-61. satırlar)
   - ✅ Viewer rolü için sidebar filtreleme
   - ✅ Sadece "Reports" sayfası gösterimi

2. **Reports.tsx**
   - ✅ Durum değerleri güncellendi: "Yeni", "Devam Ediyor", "Tamamlandı"
   - ✅ `canEditReport()` fonksiyonu: Viewer'lar kendilerine atanan raporları düzenleyebilir
   - ✅ `canDeleteReport()` fonksiyonu: Sadece Admin ve İSG Uzmanı silebilir
   - ✅ Status select ve internal notes textarea rol bazlı disable
   - ✅ Delete butonu sadece yetkisi olanlara gösterilir

### Backend Değişiklikleri

1. **GET /api/reports** (1403-1448. satırlar)
   - ✅ Viewer: `assigned_user_id = user.id` filtresi
   - ✅ ISG Expert: `location_id IN (user.location_ids)` filtresi
   - ✅ Admin: Tüm raporlar

2. **GET /api/reports/count/new** (1451-1487. satırlar)
   - ✅ Viewer için assigned_user_id filtresi
   - ✅ ISG Expert için location_ids filtresi

3. **PUT /api/reports/:id** (1618-1714. satırlar)
   - ✅ Viewer'lar kendilerine atanan raporları güncelleyebilir
   - ✅ Detaylı history kayıtları (durum ve not değişiklikleri)

4. **POST /api/reports** (1511-1615. satırlar)
   - ✅ Rapor oluşturulduğunda history kaydı (zaten vardı)

5. **POST /api/reports/:id/assign** (1787-1899. satırlar)
   - ✅ Kullanıcıya atama history kaydı (zaten vardı)

---

## 🚀 Kullanım Senaryoları

### Senaryo 1: İSG Uzmanı İş Akışı

1. İSG Uzmanı sisteme giriş yapar
2. Dashboard'u, Locations, Regions, Reports, Users sayfalarını görür
3. Reports sayfasında "Yeni" durumunda bir rapor görür
4. "Kullanıcıya Ata" butonuna tıklar
5. Kendi lokasyonundaki kullanıcılardan birini seçer veya yeni kullanıcı oluşturur
6. Raporu kullanıcıya atar
7. Kullanıcıya e-posta gönderilir

### Senaryo 2: Atanan Kullanıcı İş Akışı

1. Viewer rolündeki kullanıcı e-posta alır: "Size bir rapor atandı"
2. Sisteme giriş yapar
3. **Sidebar'da SADECE "Ramak Kala ve Tehlike Raporları" sayfasını görür**
4. **SADECE kendisine atanan raporları listede görür**
5. Rapor detayını açar
6. Durumu "Devam Ediyor" olarak değiştirir
7. İç notlar ekler: "Saha incelemesi yapıldı, önlemler alınıyor"
8. Kaydet butonuna tıklar → History kaydedilir
9. İşlemler tamamlandığında durumu "Tamamlandı" olarak değiştirir
10. Son notları ekler: "Tüm önlemler alındı, rapor kapatıldı"
11. Kaydet → Rapor tamamlanmış olur

### Senaryo 3: History Görüntüleme

1. Herhangi bir kullanıcı (yetkisi olan) rapor detayını açar
2. "Geçmiş" butonuna tıklar
3. Tüm değişiklikleri kronolojik sırayla görür:
   - "Rapor oluşturuldu - Sistem - [tarih]"
   - "Rapor Ahmet Yılmaz kullanıcısına atandı - İSG Uzmanı - [tarih]"
   - "Durum değiştirildi: Yeni → Devam Ediyor - Ahmet Yılmaz - [tarih]"
   - "Not eklendi/değiştirildi - Ahmet Yılmaz - [tarih]"
   - "Durum değiştirildi: Devam Ediyor → Tamamlandı - Ahmet Yılmaz - [tarih]"

---

## ✅ Test Checklist

### Rol Testleri

- [ ] **Viewer Login**
  - [ ] Sidebar'da sadece "Reports" görünüyor
  - [ ] Sadece kendisine atanan raporları görebiliyor
  - [ ] Diğer kullanıcıların raporlarını göremiyor
  - [ ] Dashboard, Users, Settings, Logs sayfalarını göremiyor

- [ ] **Viewer Rapor Düzenleme**
  - [ ] Kendisine atanan raporun durumunu değiştirebiliyor
  - [ ] Kendisine atanan raporun notlarını düzenleyebiliyor
  - [ ] Delete butonu görünmüyor
  - [ ] Başkasının raporu açıldığında tüm alanlar disabled

- [ ] **İSG Uzmanı**
  - [ ] Kendi lokasyonlarındaki raporları görebiliyor
  - [ ] Rapor atayabiliyor
  - [ ] Hızlı kullanıcı oluşturabiliyor
  - [ ] Dashboard, Locations, Regions, Reports, Users sayfalarını görebiliyor
  - [ ] Settings ve Logs sayfalarını göremiyor

- [ ] **Admin**
  - [ ] Tüm sayfaları görebiliyor
  - [ ] Tüm raporları görebiliyor ve düzenleyebiliyor

### History Testleri

- [ ] Rapor oluşturulduğunda CREATE kaydı oluşuyor
- [ ] Kullanıcıya atandığında ASSIGN kaydı oluşuyor
- [ ] Durum değiştiğinde UPDATE kaydı oluşuyor (eski ve yeni değer ile)
- [ ] Not eklendiğinde UPDATE kaydı oluşuyor
- [ ] History modalında tüm değişiklikler kronolojik sırayla görünüyor

### E-posta Testleri

- [ ] Rapor oluşturulduğunda İSG Uzmanlarına e-posta gidiyor
- [ ] Kullanıcıya atandığında atanan kullanıcıya e-posta gidiyor
- [ ] E-posta içeriğinde rapor detayları doğru görünüyor

---

## 🎉 Özet

Tüm istenen özellikler başarıyla uygulandı:

✅ **Viewer kullanıcılar sidebar'da sadece Reports sayfasını görüyor**
✅ **Viewer kullanıcılar sadece kendilerine atanan raporları görüyor**
✅ **Durum akışı: Yeni → Devam Ediyor → Tamamlandı**
✅ **Tüm işlemler report_history'de kayıt altına alınıyor**
✅ **İş akışı tam olarak tanımlanan mantığa göre çalışıyor**

**Hazır ve test edilmeye başlanabilir!** 🚀
