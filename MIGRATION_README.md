# Database Migration Guide

## Rapor Atama Özelliği için Veritabanı Güncellemesi

Bu migration, "Kullanıcıya Ata" özelliğini desteklemek için `near_miss_reports` tablosuna yeni kolonlar ekler.

### Eklenen Özellikler

1. **image_path**: Rapor görseli yolu
2. **assigned_user_id**: Atanan kullanıcının ID'si
3. **assigned_user_name**: Atanan kullanıcının adı

### Migration Nasıl Uygulanır?

#### Yöntem 1: Otomatik Migration (Önerilen)

Schema dosyası zaten `ADD COLUMN IF NOT EXISTS` komutlarını içeriyor. Eğer veritabanınızı yeniden oluşturuyorsanız:

```bash
mysql -u your_username -p your_database_name < schema.mysql.sql
```

#### Yöntem 2: Manuel Migration (Mevcut Veritabanı için)

Eğer veritabanınız zaten varsa ve sadece yeni kolonları eklemek istiyorsanız:

```bash
mysql -u your_username -p your_database_name < migration_add_assigned_users.sql
```

#### Yöntem 3: MySQL Workbench veya phpMyAdmin

1. MySQL Workbench veya phpMyAdmin'i açın
2. Veritabanınızı seçin
3. `migration_add_assigned_users.sql` dosyasının içeriğini kopyalayın
4. SQL sorgu penceresine yapıştırın
5. Çalıştır'a tıklayın

### Migration Sonrası Doğrulama

Migration'ı uyguladıktan sonra, aşağıdaki sorguyu çalıştırarak kolonların eklendiğini doğrulayabilirsiniz:

```sql
DESCRIBE near_miss_reports;
```

Veya:

```sql
SELECT
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'near_miss_reports'
  AND COLUMN_NAME IN ('image_path', 'assigned_user_id', 'assigned_user_name');
```

Çıktıda şu kolonları görmelisiniz:
- `image_path` (TEXT, NULL)
- `assigned_user_id` (CHAR(36), NULL)
- `assigned_user_name` (VARCHAR(255), NULL)

### Geri Alma (Rollback)

Eğer migration'ı geri almak isterseniz (önerilmez):

```sql
ALTER TABLE near_miss_reports DROP COLUMN IF EXISTS image_path;
ALTER TABLE near_miss_reports DROP COLUMN IF EXISTS assigned_user_id;
ALTER TABLE near_miss_reports DROP COLUMN IF EXISTS assigned_user_name;
ALTER TABLE near_miss_reports DROP INDEX IF EXISTS idx_near_miss_reports_assigned_user_id;
```

### Notlar

- Bu kolonlar NULL değer alabilir, bu nedenle mevcut raporlar etkilenmez
- Foreign key constraint, atanan kullanıcı silindiğinde otomatik olarak NULL değerini atar (ON DELETE SET NULL)
- Backup almayı unutmayın!

### Destek

Herhangi bir sorunla karşılaşırsanız:
1. Backup'ınızın olduğundan emin olun
2. Migration dosyasını tekrar kontrol edin
3. MySQL hata mesajlarını kaydedin
4. Sistem yöneticinize başvurun
