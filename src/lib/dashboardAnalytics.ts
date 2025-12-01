// Dashboard Analytics Utilities - Türkçe desteği ile

export interface LocationReport {
  id: string;
  location_id: string;
  location_name?: string;
  region_id: string;
  region_name?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  reported_at?: string;
}

export interface LocationHealth {
  location_id: string;
  location_name: string;
  daysSinceLastReport: number;
  reportCount: number;
  lastReportDate: string | null;
  healthScore: number; // 0-100, yeşil=güvenli, kırmızı=tehlikeli
  color: string; // Tailwind rengi
  regions: RegionHealth[];
}

export interface RegionHealth {
  region_id: string;
  region_name: string;
  reportCount: number;
  lastReportDate: string | null;
  daysSinceLastReport: number;
  color: string;
  isSafe: boolean; // True = rapor yok (yeşil), False = rapor var (kırmızı)
}

export interface ReportStatusAnalysis {
  location_id: string;
  location_name: string;
  averageDaysToInvestigation: number; // Bildirimden "İnceleniyor"a kaç gün
  averageDaysToResolution: number; // Bildirimden "Kapatıldı"ya kaç gün
  reportCount: number;
  resolvedCount: number;
  resolutionRate: number; // Yüzde
}

export interface ActionSpeedData {
  location_name: string;
  avgDaysToInvestigation: number;
  avgDaysToResolution: number;
  resolutionRate: number;
}

// Lokasyonlara göre son rapordan itibaren geçen günleri hesapla
export function calculateLocationHealth(
  reports: LocationReport[],
  locations: any[],
  regions: any[]
): LocationHealth[] {
  const today = new Date();

  const locationMap: Record<string, LocationHealth> = {};

  // Her lokasyonun temel bilgisini hazırla
  locations.forEach((loc) => {
    locationMap[loc.id] = {
      location_id: loc.id,
      location_name: loc.name,
      daysSinceLastReport: 999, // Çok büyük değer (rapor yok anlamı)
      reportCount: 0,
      lastReportDate: null,
      healthScore: 100, // Başlangıçta güvenli
      color: 'bg-green-500',
      regions: regions
        .filter((r) => r.location_id === loc.id)
        .map((r) => ({
          region_id: r.id,
          region_name: r.name,
          reportCount: 0,
          lastReportDate: null,
          daysSinceLastReport: 999,
          color: 'bg-green-500',
          isSafe: true, // Başlangıçta güvenli
        })),
    };
  });

  // Raporları işle
  reports.forEach((report) => {
    if (!locationMap[report.location_id]) return;

    const reportDate = new Date(report.created_at);
    const daysAgo = Math.floor((today.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24));

    // Lokasyon istatistikleri güncelle
    const location = locationMap[report.location_id];
    location.reportCount += 1;

    // Son rapordan itibaren geçen gün sayısını güncelle (en küçük değeri tut)
    if (daysAgo < location.daysSinceLastReport) {
      location.daysSinceLastReport = daysAgo;
      location.lastReportDate = report.created_at;
    }

    // Bölge istatistikleri güncelle
    const region = location.regions.find((r) => r.region_id === report.region_id);
    if (region) {
      region.reportCount += 1;
      region.isSafe = false; // Rapor varsa güvenli değil
      region.color = 'bg-red-500';

      if (daysAgo < region.daysSinceLastReport) {
        region.daysSinceLastReport = daysAgo;
        region.lastReportDate = report.created_at;
      }
    }
  });

  // Health score hesapla (lokasyon bazında)
  Object.values(locationMap).forEach((location) => {
    // Eğer hiç rapor yoksa güvenli (yeşil)
    if (location.reportCount === 0) {
      location.healthScore = 100;
      location.color = 'bg-green-500';
      location.daysSinceLastReport = 999;
    } else {
      // Rapor varsa risk var
      // Rapor sayısına ve son rapor zamanına göre score hesapla
      let score = 100;

      // Rapor sayısından puan kesy
      score -= Math.min(location.reportCount * 5, 50);

      // Son rapordan itibaren geçen günlere göre puan ekle
      // (Günler geçtikçe riski azalt, çünkü yeni rapor yoksa zaten iyiye gidiyor demek)
      if (location.daysSinceLastReport < 999) {
        score += Math.min(location.daysSinceLastReport * 2, 30);
      }

      location.healthScore = Math.max(score, 0);

      // Sağlık skoru rengini belirle
      if (location.healthScore >= 70) {
        location.color = 'bg-yellow-500'; // Sarı - Uyarı
      } else if (location.healthScore >= 40) {
        location.color = 'bg-orange-500'; // Turuncu - Dikkat
      } else {
        location.color = 'bg-red-500'; // Kırmızı - Tehlike
      }
    }
  });

  return Object.values(locationMap);
}

// Raporların durumlarına göre aksiyon sürelerinihesapla
export function analyzeReportStatusTransition(
  reports: LocationReport[],
  locations: any[]
): ReportStatusAnalysis[] {
  const locationAnalytics: Record<string, ReportStatusAnalysis> = {};

  // Her lokasyon için temel veriyi hazırla
  locations.forEach((loc) => {
    locationAnalytics[loc.id] = {
      location_id: loc.id,
      location_name: loc.name,
      averageDaysToInvestigation: 0,
      averageDaysToResolution: 0,
      reportCount: 0,
      resolvedCount: 0,
      resolutionRate: 0,
    };
  });

  // Raporları analiz et
  const daysToInvestigationList: Record<string, number[]> = {};
  const daysToResolutionList: Record<string, number[]> = {};

  // Not: Bu analiz için backend'de report history veya updated_at field'ı gerekli
  // Şimdilik demo verisi ile gösterelim
  reports.forEach((report) => {
    if (!locationAnalytics[report.location_id]) return;

    const analytics = locationAnalytics[report.location_id];
    analytics.reportCount += 1;

    if (report.status === 'Kapatıldı') {
      analytics.resolvedCount += 1;

      // Oluşturulma ve kapanma tarihi arasındaki fark
      const created = new Date(report.created_at);
      const updated = new Date(report.updated_at || report.created_at);
      const daysDiff = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

      if (!daysToResolutionList[report.location_id]) {
        daysToResolutionList[report.location_id] = [];
      }
      daysToResolutionList[report.location_id].push(Math.max(daysDiff, 0));
    }

    if (report.status === 'İnceleniyor') {
      const created = new Date(report.created_at);
      const updated = new Date(report.updated_at || report.created_at);
      const daysDiff = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

      if (!daysToInvestigationList[report.location_id]) {
        daysToInvestigationList[report.location_id] = [];
      }
      daysToInvestigationList[report.location_id].push(Math.max(daysDiff, 0));
    }
  });

  // Ortalamaları hesapla
  Object.values(locationAnalytics).forEach((analytics) => {
    if (daysToInvestigationList[analytics.location_id]) {
      const days = daysToInvestigationList[analytics.location_id];
      analytics.averageDaysToInvestigation = Math.round(
        days.reduce((a, b) => a + b, 0) / days.length
      );
    }

    if (daysToResolutionList[analytics.location_id]) {
      const days = daysToResolutionList[analytics.location_id];
      analytics.averageDaysToResolution = Math.round(
        days.reduce((a, b) => a + b, 0) / days.length
      );
    }

    if (analytics.reportCount > 0) {
      analytics.resolutionRate = Math.round((analytics.resolvedCount / analytics.reportCount) * 100);
    }
  });

  return Object.values(locationAnalytics);
}

// Aksiyon hızını sıralama
export function getActionSpeedRanking(
  analysis: ReportStatusAnalysis[]
): ActionSpeedData[] {
  return analysis
    .map((a) => ({
      location_name: a.location_name,
      avgDaysToInvestigation: a.averageDaysToInvestigation,
      avgDaysToResolution: a.averageDaysToResolution,
      resolutionRate: a.resolutionRate,
    }))
    .sort((a, b) => a.avgDaysToResolution - b.avgDaysToResolution); // En hızlı çözüm yapanlar öne çık
}

// Health score'a göre lokasyonları renklendir
export function getHealthColor(healthScore: number): string {
  if (healthScore >= 80) return 'text-green-400'; // Güvenli
  if (healthScore >= 60) return 'text-yellow-400'; // Dikkat
  if (healthScore >= 40) return 'text-orange-400'; // Uyarı
  return 'text-red-400'; // Tehlike
}

export function getHealthBgColor(healthScore: number): string {
  if (healthScore >= 80) return 'bg-green-500';
  if (healthScore >= 60) return 'bg-yellow-500';
  if (healthScore >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

// Days since last report'un Türkçe tanımı
export function getLastReportDescription(days: number): string {
  if (days === 999) {
    return 'Rapor yok (Güvenli)';
  }
  if (days === 0) {
    return 'Bugün';
  }
  if (days === 1) {
    return 'Dün';
  }
  if (days < 7) {
    return `${days} gün önce`;
  }
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} hafta önce`;
  }
  const months = Math.floor(days / 30);
  return `${months} ay önce`;
}
