import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

declare global {
  interface jsPDF {
    autoTable: any;
  }
}

export interface ExportOptions {
  filename: string;
  title?: string;
  subtitle?: string;
}

export interface SystemLogExportData {
  date: string;
  user: string;
  action: string;
  details: string;
}

export interface ReportExportData {
  incident_number: string;
  location_name: string;
  region_name: string;
  full_name: string;
  phone: string;
  category: string;
  status: string;
  description: string;
  internal_notes: string;
  created_at: string;
}

// Sistem Loglarını PDF olarak dışa aktar (Türkçe karakter desteği ile)
export async function exportLogsAsPDF(
  logs: SystemLogExportData[],
  options: ExportOptions
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Varsayılan font olarak Helvetica kullan (Türkçe karakterleri destekler)
  doc.setFont('helvetica');

  let y = 15;

  // Başlık
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title || 'Sistem Logları', 10, y);
  y += 7;

  // Subtitle
  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(options.subtitle, 10, y);
    y += 5;
  }

  // Dışa aktarma tarihi
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Dışa Aktarma: ${new Date().toLocaleString('tr-TR')}`, 10, y);
  y += 8;

  // Tablo verilerini hazırla
  const tableData = logs.map((log) => [
    log.date,
    log.user,
    log.action,
    log.details,
  ]);

  // autoTable ile tablo ekle (Türkçe karakterleri destekler)
  doc.autoTable({
    head: [['Tarih / Saat', 'Kullanıcı', 'İşlem', 'Detaylar']],
    body: tableData,
    startY: y,
    margin: 10,
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 25 },
      2: { cellWidth: 30 },
      3: { cellWidth: 'auto' },
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      font: 'helvetica',
    },
    bodyStyles: {
      font: 'helvetica',
      textColor: [0, 0, 0],
    },
    didDrawPage: () => {
      // Sayfa numarası ekle
      const pageCount = doc.internal.pages.length - 1;
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.getHeight();
      const pageWidth = pageSize.getWidth();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Sayfa ${doc.internal.pages.length - 1} / ${pageCount}`,
        pageWidth - 20,
        pageHeight - 10
      );
    },
  });

  doc.save(options.filename);
}

// Sistem Loglarını Excel olarak dışa aktar
export function exportLogsAsExcel(
  logs: SystemLogExportData[],
  options: ExportOptions
): void {
  const worksheet = XLSX.utils.json_to_sheet(logs);

  // Sütun genişliklerini ayarla
  worksheet['!cols'] = [
    { wch: 22 },
    { wch: 18 },
    { wch: 25 },
    { wch: 40 },
  ];

  // Başlık satırını biçimlendir (koyu arka plan)
  if (!worksheet['!ref']) return;

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let i = range.s.c; i <= range.e.c; i++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!worksheet[cellAddress]) continue;

    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2980B9' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sistem Logları');

  XLSX.writeFile(workbook, options.filename);
}

// Raporları PDF olarak dışa aktar (Türkçe karakter desteği ile)
export async function exportReportsAsPDF(
  reports: ReportExportData[],
  options: ExportOptions
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFont('helvetica');

  let y = 15;

  // Başlık
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title || 'Ramakkala Raporları', 10, y);
  y += 7;

  // Subtitle
  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(options.subtitle, 10, y);
    y += 5;
  }

  // Dışa aktarma tarihi
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Dışa Aktarma: ${new Date().toLocaleString('tr-TR')}`, 10, y);
  y += 8;

  // Tablo verilerini hazırla
  const tableData = reports.map((report) => [
    report.incident_number,
    report.location_name,
    report.region_name,
    report.full_name,
    report.phone,
    report.category,
    report.status,
    report.description.substring(0, 50), // İlk 50 karakter
  ]);

  // autoTable ile tablo ekle
  doc.autoTable({
    head: [
      [
        'Olay No',
        'Lokasyon',
        'Bölge',
        'Ad Soyad',
        'Telefon',
        'Kategori',
        'Durum',
        'Açıklama',
      ],
    ],
    body: tableData,
    startY: y,
    margin: 10,
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 25 },
      4: { cellWidth: 20 },
      5: { cellWidth: 25 },
      6: { cellWidth: 18 },
      7: { cellWidth: 'auto' },
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      font: 'helvetica',
    },
    bodyStyles: {
      font: 'helvetica',
      textColor: [0, 0, 0],
    },
    didDrawPage: () => {
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.getHeight();
      const pageWidth = pageSize.getWidth();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Sayfa ${doc.internal.pages.length - 1}`,
        pageWidth - 20,
        pageHeight - 10
      );
    },
  });

  doc.save(options.filename);
}

// Raporları Excel olarak dışa aktar
export function exportReportsAsExcel(
  reports: ReportExportData[],
  options: ExportOptions
): void {
  const worksheet = XLSX.utils.json_to_sheet(reports);

  // Sütun genişliklerini ayarla
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 15 },
    { wch: 20 },
    { wch: 14 },
    { wch: 35 },
    { wch: 25 },
    { wch: 18 },
  ];

  // Başlık satırını biçimlendir
  if (!worksheet['!ref']) return;

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let i = range.s.c; i <= range.e.c; i++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!worksheet[cellAddress]) continue;

    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2980B9' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Raporlar');

  XLSX.writeFile(workbook, options.filename);
}

// Lokasyon Risk Durumu PDF'ye aktar
export async function exportLocationRiskAsPDF(
  data: any[],
  options: ExportOptions
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFont('helvetica');

  let y = 15;

  // Başlık
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title || 'Lokasyon Risk Durumu', 10, y);
  y += 7;

  // Subtitle
  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(options.subtitle, 10, y);
    y += 5;
  }

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Dışa Aktarma: ${new Date().toLocaleString('tr-TR')}`, 10, y);
  y += 8;

  // Tablo verilerini hazırla
  const tableData = data.map((item) => [
    item.location,
    item.healthScore.toString(),
    item.riskLevel,
    item.reportCount.toString(),
    item.lastReport,
    item.regions,
  ]);

  // autoTable ile tablo ekle
  doc.autoTable({
    head: [['Lokasyon', 'Risk Skoru', 'Risk Seviyesi', 'Rapor Sayısı', 'Son Rapor', 'Bölgeler']],
    body: tableData,
    startY: y,
    margin: 10,
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 20 },
      2: { cellWidth: 25 },
      3: { cellWidth: 20 },
      4: { cellWidth: 30 },
      5: { cellWidth: 'auto' },
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      font: 'helvetica',
    },
    bodyStyles: {
      font: 'helvetica',
      textColor: [0, 0, 0],
    },
  });

  doc.save(options.filename);
}

// Lokasyon Risk Durumu Excel'e aktar
export function exportLocationRiskAsExcel(
  data: any[],
  options: ExportOptions
): void {
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Sütun genişliklerini ayarla
  worksheet['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 18 },
    { wch: 15 },
    { wch: 25 },
    { wch: 12 },
    { wch: 12 },
    { wch: 40 },
  ];

  // Başlık satırını biçimlendir
  if (!worksheet['!ref']) return;

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let i = range.s.c; i <= range.e.c; i++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!worksheet[cellAddress]) continue;

    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2980B9' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lokasyon Risk Durumu');

  XLSX.writeFile(workbook, options.filename);
}

// Hızlı Aksiyon Alınmış Lokasyonlar PDF'ye aktar
export async function exportActionSpeedAsPDF(
  data: any[],
  options: ExportOptions
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFont('helvetica');

  let y = 15;

  // Başlık
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title || 'Hızlı Aksiyon Alınmış Lokasyonlar', 10, y);
  y += 7;

  // Subtitle
  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(options.subtitle, 10, y);
    y += 5;
  }

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Dışa Aktarma: ${new Date().toLocaleString('tr-TR')}`, 10, y);
  y += 8;

  // Tablo verilerini hazırla
  const tableData = data.map((item) => [
    item.rank.toString(),
    item.location,
    item.investigationDays.toString(),
    item.resolutionDays.toString(),
    item.resolutionRate,
    item.speed,
  ]);

  // autoTable ile tablo ekle
  doc.autoTable({
    head: [['Sıra', 'Lokasyon', 'İnceleme Süresi', 'Çözüm Süresi', 'Çözüm Oranı', 'Hız']],
    body: tableData,
    startY: y,
    margin: 10,
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 35 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 20 },
      5: { cellWidth: 'auto' },
    },
    headStyles: {
      fillColor: [34, 139, 34],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      font: 'helvetica',
    },
    bodyStyles: {
      font: 'helvetica',
      textColor: [0, 0, 0],
    },
  });

  doc.save(options.filename);
}

// Hızlı Aksiyon Alınmış Lokasyonlar Excel'e aktar
export function exportActionSpeedAsExcel(
  data: any[],
  options: ExportOptions
): void {
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Sütun genişliklerini ayarla
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
  ];

  // Başlık satırını biçimlendir
  if (!worksheet['!ref']) return;

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let i = range.s.c; i <= range.e.c; i++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!worksheet[cellAddress]) continue;

    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '228B22' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Aksiyon Hızı');

  XLSX.writeFile(workbook, options.filename);
}
