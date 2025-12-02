import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { logAction, LogActions } from '../lib/logger';
import { Settings as SettingsIcon, Save, AlertCircle, CheckCircle2, Download, Upload, Trash2, Eye, Globe, Mail, Image as ImageIcon } from 'lucide-react';
import { useI18n, useLanguageChange } from '../lib/i18n';

interface SystemSettings {
  id: string;
  site_title: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_from_email: string;
  backup_target_path: string;
  logo_path: string;
  background_path: string;
  favicon_path: string;
}

export function Settings() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [formData, setFormData] = useState({
    site_title: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_from_email: '',
    backup_target_path: '',
    logo_path: '',
    background_path: '',
    favicon_path: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState<{ logo: boolean; background: boolean; favicon: boolean }>({
    logo: false,
    background: false,
    favicon: false,
  });
  const [previewModal, setPreviewModal] = useState<{ type: 'logo' | 'background' | 'favicon' | null; src: string }>({
    type: null,
    src: '',
  });
  const [activeTab, setActiveTab] = useState<'general' | 'smtp' | 'files' | 'backup'>('general');

  useEffect(() => {
    loadSettings();
  }, []);

  useLanguageChange();

  async function loadSettings() {
    try {
      const data = await api.settings.get();

      if (data) {
        setSettings(data);
        setFormData({
          site_title: data.site_title,
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port,
          smtp_username: data.smtp_username,
          smtp_password: data.smtp_password,
          smtp_from_email: data.smtp_from_email,
          backup_target_path: data.backup_target_path,
          logo_path: data.logo_path || '',
          background_path: data.background_path || '',
          favicon_path: data.favicon_path || '',
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'background' | 'favicon') {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading({ ...uploading, [type]: true });
    setError('');

    try {
      const formDataObj = new FormData();
      formDataObj.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataObj,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Yükleme başarısız');
      }

      const pathKey = `${type}_path` as keyof typeof formData;
      setFormData({ ...formData, [pathKey]: data.path });

      setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} başarıyla yüklendi`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Yükleme başarısız';
      setError(errorMessage);
    } finally {
      setUploading({ ...uploading, [type]: false });
    }
  }

  async function handleDeleteAsset(type: 'logo' | 'background' | 'favicon') {
    if (!confirm(`${type.charAt(0).toUpperCase() + type.slice(1)} dosyasını silmek istediğinize emin misiniz?`)) {
      return;
    }

    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/settings/asset/${type}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Silme başarısız');
      }

      const pathKey = `${type}_path` as keyof typeof formData;
      setFormData({ ...formData, [pathKey]: '' });

      setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} dosyası silindi`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Silme başarısız';
      setError(errorMessage);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.settings.update(formData);

      await logAction(LogActions.UPDATE_SETTINGS);
      setSuccess(t('messages.successUpdated') || 'Ayarlar başarıyla kaydedildi');
      await loadSettings();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('messages.errorGeneric');
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadBackup() {
    try {
      setBackingUp(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Kimlik doğrulama gereklidir');
        setBackingUp(false);
        return;
      }

      // Fetch backup from server
      const response = await fetch('/api/backup/download', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Yedek oluşturulamadı');
      }

      // Get the filename from content-disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'riskreport_backup.sql';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+?)"?$/);
        if (match) {
          filename = match[1];
        }
      }

      // Convert blob to download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(`Veritabanı yedeği başarıyla indirildi: ${filename}`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Yedek oluşturulamadı';
      setError(errorMessage);
      console.error('Backup failed:', err);
    } finally {
      setBackingUp(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -mx-6 -my-6 px-6 py-6">
      <div>
        <h1 className="text-4xl font-bold text-white">{t('settings.title')}</h1>
        <p className="text-slate-400 text-lg mt-2">{t('settings.subtitle') || 'İSG Yönetim Paneli'}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mt-6 border-b border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'general'
              ? 'border-blue-600 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          {t('settings.generalTab') || 'Genel Ayarlar'}
        </button>
        <button
          onClick={() => setActiveTab('smtp')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'smtp'
              ? 'border-blue-600 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4" />
          {t('settings.smtpTab') || 'SMTP Ayarları'}
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'files'
              ? 'border-blue-600 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          {t('settings.filesTab') || 'Dosyalar'}
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'backup'
              ? 'border-blue-600 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Download className="w-4 h-4" />
          {t('settings.backupTab') || 'Yedek Alma'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Genel Ayarlar Tab */}
        {activeTab === 'general' && (
        <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              {t('settings.generalTab') || 'Genel Ayarlar'}
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4">
                <div className="flex">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('settings.siteTitle')}
              </label>
              <input
                type="text"
                value={formData.site_title}
                onChange={(e) => setFormData({ ...formData, site_title: e.target.value })}
                placeholder={t('settings.siteTitlePlaceholder') || 'Ramak Kala Sistemi'}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-2 text-xs text-slate-400">{t('settings.siteTitleHelp') || 'Bu başlık, uygulamanın başında gösterilir'}</p>
            </div>
          </div>
        </div>
        )}

        {/* Dosyalar Tab - Asset Management Section */}
        {activeTab === 'files' && (
        <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              {t('settings.designElements') || 'Tasarım Elemanları'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {t('settings.designElementsDesc') || 'Oturum açma sayfası ve başlık için logo, arka plan ve favicon yükleyin'}
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">{t('settings.logo') || 'Logo'}</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="relative cursor-pointer">
                    <div className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-600 rounded-lg hover:border-blue-500 transition-colors">
                      <div className="flex flex-col items-center">
                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-sm text-slate-300">
                          {uploading.logo ? (t('settings.uploading') || 'Yükleniyor...') : (t('settings.selectOrDragLogo') || 'Logo seçin veya sürükleyin')}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                        className="hidden"
                        disabled={uploading.logo}
                      />
                    </div>
                  </label>
                </div>
                {formData.logo_path && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewModal({ type: 'logo', src: formData.logo_path })}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      {t('settings.preview') || 'Önizle'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAsset('logo')}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('common.delete') || 'Sil'}
                    </button>
                  </div>
                )}
              </div>
              {formData.logo_path && (
                <p className="mt-2 text-xs text-slate-400">{t('settings.uploadedFile') || 'Yüklü dosya'}: {formData.logo_path.split('/').pop()}</p>
              )}
            </div>

            {/* Background Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">{t('settings.background') || 'Arka Plan Görseli'}</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="relative cursor-pointer">
                    <div className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-600 rounded-lg hover:border-blue-500 transition-colors">
                      <div className="flex flex-col items-center">
                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-sm text-slate-300">
                          {uploading.background ? (t('settings.uploading') || 'Yükleniyor...') : (t('settings.selectOrDragBackground') || 'Arka plan seçin veya sürükleyin')}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'background')}
                        className="hidden"
                        disabled={uploading.background}
                      />
                    </div>
                  </label>
                </div>
                {formData.background_path && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewModal({ type: 'background', src: formData.background_path })}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      {t('settings.preview') || 'Önizle'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAsset('background')}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('common.delete') || 'Sil'}
                    </button>
                  </div>
                )}
              </div>
              {formData.background_path && (
                <p className="mt-2 text-xs text-slate-400">{t('settings.uploadedFile') || 'Yüklü dosya'}: {formData.background_path.split('/').pop()}</p>
              )}
            </div>

            {/* Favicon Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">{t('settings.favicon') || 'Favicon (Sekme İkonu)'}</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="relative cursor-pointer">
                    <div className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-600 rounded-lg hover:border-blue-500 transition-colors">
                      <div className="flex flex-col items-center">
                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-sm text-slate-300">
                          {uploading.favicon ? (t('settings.uploading') || 'Yükleniyor...') : (t('settings.selectOrDragFavicon') || 'Favicon seçin veya sürükleyin')}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'favicon')}
                        className="hidden"
                        disabled={uploading.favicon}
                      />
                    </div>
                  </label>
                </div>
                {formData.favicon_path && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewModal({ type: 'favicon', src: formData.favicon_path })}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      {t('settings.preview') || 'Önizle'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAsset('favicon')}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('common.delete') || 'Sil'}
                    </button>
                  </div>
                )}
              </div>
              {formData.favicon_path && (
                <p className="mt-2 text-xs text-slate-400">{t('settings.uploadedFile') || 'Yüklü dosya'}: {formData.favicon_path.split('/').pop()}</p>
              )}
            </div>
          </div>
        </div>
        )}

        {/* SMTP Tab */}
        {activeTab === 'smtp' && (
        <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {t('settings.smtpTab') || 'SMTP Ayarları'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {t('settings.smtpDesc') || 'E-posta bildirimleri için SMTP sunucu ayarları'}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('settings.smtpHost') || 'SMTP Host'}</label>
                <input
                  type="text"
                  value={formData.smtp_host}
                  onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                  placeholder={t('settings.smtpHostPlaceholder') || 'smtp.gmail.com'}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('settings.smtpPort') || 'SMTP Port'}</label>
                <input
                  type="number"
                  value={formData.smtp_port}
                  onChange={(e) =>
                    setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })
                  }
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('settings.smtpUsername') || 'SMTP Kullanıcı Adı'}
                </label>
                <input
                  type="text"
                  value={formData.smtp_username}
                  onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('settings.smtpPassword') || 'SMTP Şifre'}</label>
                <input
                  type="password"
                  value={formData.smtp_password}
                  onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('settings.smtpFromEmail') || 'Gönderen E-posta'}
                </label>
                <input
                  type="email"
                  value={formData.smtp_from_email}
                  onChange={(e) => setFormData({ ...formData, smtp_from_email: e.target.value })}
                  placeholder={t('settings.smtpFromEmailPlaceholder') || 'noreply@sirket.com'}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Backup Tab */}
        {activeTab === 'backup' && (
        <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 backdrop-blur-md">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Download className="w-5 h-5" />
              {t('settings.backupSettings') || 'Yedekleme Ayarları'}
            </h2>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('settings.backupTargetPath') || 'Yedek Hedef Yolu'}
              </label>
              <input
                type="text"
                value={formData.backup_target_path}
                onChange={(e) => setFormData({ ...formData, backup_target_path: e.target.value })}
                placeholder={t('settings.backupTargetPathPlaceholder') || '/backups'}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={backingUp}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {backingUp ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('settings.creatingBackup') || 'Yedek Oluşturuluyor...'}
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {t('settings.downloadBackup') || 'Veritabanı Yedeği Al'}
                </>
              )}
            </button>
          </div>
        </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Kaydediliyor...' : t('settings.save')}
          </button>
        </div>
      </form>

      {/* Preview Modal */}
      {previewModal.type && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              {previewModal.type === 'logo' && (t('settings.logoPreview') || 'Logo Önizlemesi')}
              {previewModal.type === 'background' && (t('settings.backgroundPreview') || 'Arka Plan Önizlemesi')}
              {previewModal.type === 'favicon' && (t('settings.faviconPreview') || 'Favicon Önizlemesi')}
            </h3>
            <div className="flex justify-center bg-slate-900 rounded-lg p-4 mb-4">
              {previewModal.type === 'favicon' ? (
                <img src={previewModal.src} alt="Favicon" className="w-16 h-16" />
              ) : (
                <img src={previewModal.src} alt={previewModal.type} className="max-w-full max-h-96 rounded" />
              )}
            </div>
            <button
              onClick={() => setPreviewModal({ type: null, src: '' })}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {t('common.close') || 'Kapat'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
