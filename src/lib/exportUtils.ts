import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

// Helper to fix Turkish character issues in standard PDF fonts
const fixTurkishChars = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
};

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
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
  completion_duration?: string;
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
    fixTurkishChars(log.date),
    fixTurkishChars(log.user),
    fixTurkishChars(log.action),
    fixTurkishChars(log.details),
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
  doc.text(options.title || 'Ramak Kala Raporları', 10, y);
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
    fixTurkishChars(report.incident_number),
    fixTurkishChars(report.location_name),
    fixTurkishChars(report.region_name),
    fixTurkishChars(report.full_name),
    fixTurkishChars(report.phone),
    fixTurkishChars(report.category),
    fixTurkishChars(report.status),
    fixTurkishChars(report.completion_duration || '-'),
    fixTurkishChars(report.description.substring(0, 40)), // İlk 40 karakter
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
        'Tamamlanma',
        'Açıklama',
      ],
    ],
    body: tableData,
    startY: y,
    margin: 10,
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      3: { cellWidth: 23 },
      4: { cellWidth: 18 },
      5: { cellWidth: 23 },
      6: { cellWidth: 16 },
      7: { cellWidth: 20 },
      8: { cellWidth: 'auto' },
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
    { wch: 22 },
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
    fixTurkishChars(item.location),
    fixTurkishChars(item.healthScore.toString()),
    fixTurkishChars(item.riskLevel),
    fixTurkishChars(item.reportCount.toString()),
    fixTurkishChars(item.lastReport),
    fixTurkishChars(item.regions),
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
    fixTurkishChars(item.rank.toString()),
    fixTurkishChars(item.location),
    fixTurkishChars(item.investigationDays.toString()),
    fixTurkishChars(item.resolutionDays.toString()),
    fixTurkishChars(item.resolutionRate),
    fixTurkishChars(item.speed),
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

/**
 * Rapor Detayını PDF olarak dışa aktar (Görsel ve tüm detaylar ile)
 * HTML2Canvas kullanarak tüm karakterleri ve tasarımı korur.
 */
export async function exportSingleReportAsPDF(
  report: any,
  options: ExportOptions,
  history: any[] = []
): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '700px'; // A4 proportional
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#334155';
  container.style.fontFamily = 'Arial, Helvetica, sans-serif';
  container.style.padding = '40px';
  container.style.lineHeight = '1.5';
  
  const imgUrl = report.image_path 
    ? (report.image_path.startsWith('http') 
        ? report.image_path 
        : `${import.meta.env.VITE_API_URL || 'http://localhost:6000'}${report.image_path.startsWith('/') ? '' : '/'}${report.image_path}`)
    : null;

  const historyHtml = history.length > 0 ? `
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px;">Rapor Hareketleri</h2>
      <div style="font-size: 12px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8fafc; text-align: left; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 10px;">Tarih</th>
              <th style="padding: 10px;">Kullanıcı</th>
              <th style="padding: 10px;">İşlem</th>
              <th style="padding: 10px;">Detay</th>
            </tr>
          </thead>
          <tbody>
            ${history.map((h, index) => `
              <tr style="${index !== history.length - 1 ? 'border-bottom: 1px solid #e2e8f0;' : ''}">
                <td style="padding: 10px; white-space: nowrap;">${new Date(h.created_at).toLocaleString('tr-TR')}</td>
                <td style="padding: 10px;">${h.changed_by_user_name || 'Sistem'}</td>
                <td style="padding: 10px;">${h.action}</td>
                <td style="padding: 10px;">${h.change_description || (h.field_name ? `${h.field_name}: ${h.old_value} → ${h.new_value}` : '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div style="border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 style="color: #1e293b; margin: 0; font-size: 28px; font-weight: bold;">RAMAK KALA RAPORU</h1>
        <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Risk Raporlama Sistemi</p>
      </div>
      <div style="text-align: right;">
        <p style="margin: 0; font-weight: bold; color: #1e293b;">Olay No: ${report.incident_number}</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">Tarih: ${new Date(report.created_at).toLocaleString('tr-TR')}</p>
      </div>
    </div>
    
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">Rapor Bilgileri</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div>
          <span style="color: #64748b; font-size: 12px; display: block; text-transform: uppercase;">Bildiren</span>
          <span style="font-weight: bold;">${report.full_name}</span>
        </div>
        <div>
          <span style="color: #64748b; font-size: 12px; display: block; text-transform: uppercase;">Kategori</span>
          <span style="font-weight: bold;">${report.category}</span>
        </div>
        <div>
          <span style="color: #64748b; font-size: 12px; display: block; text-transform: uppercase;">Lokasyon</span>
          <span style="font-weight: bold;">${report.location_name || report.locations?.name || '-'}</span>
        </div>
        <div>
          <span style="color: #64748b; font-size: 12px; display: block; text-transform: uppercase;">Bölge</span>
          <span style="font-weight: bold;">${report.region_name || report.regions?.name || '-'}</span>
        </div>
        <div>
          <span style="color: #64748b; font-size: 12px; display: block; text-transform: uppercase;">Telefon</span>
          <span style="font-weight: bold;">${report.phone || '-'}</span>
        </div>
        <div>
          <span style="color: #64748b; font-size: 12px; display: block; text-transform: uppercase;">Durum</span>
          <span style="background-color: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${report.status}</span>
        </div>
      </div>
    </div>
    
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 18px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px;">Olay Açıklaması</h2>
      <p style="white-space: pre-wrap; margin: 0; font-size: 14px; background-color: #f8fafc; padding: 15px; border-radius: 6px;">${report.description}</p>
    </div>
    
    ${report.internal_notes ? `
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px;">İç Notlar / Aksiyonlar</h2>
        <p style="white-space: pre-wrap; margin: 0; font-size: 14px; background-color: #f0fdf4; padding: 15px; border-radius: 6px; color: #166534;">${report.internal_notes}</p>
      </div>
    ` : ''}
    
    ${imgUrl ? `
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">Olay Görseli</h2>
        <div style="text-align: center; background-color: #f1f5f9; padding: 10px; border-radius: 8px;">
          <img src="${imgUrl}" style="max-width: 100%; max-height: 400px; border-radius: 4px;" />
        </div>
      </div>
    ` : ''}

    ${historyHtml}
    
    <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; pt: 10px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between;">
      <span>Risk Raporlama Sistemi tarafından oluşturuldu</span>
      <span>Oluşturma: ${new Date().toLocaleString('tr-TR')}</span>
    </div>
  `;
  
  document.body.appendChild(container);
  
  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - (2 * margin);
    const contentHeight = (canvas.height * contentWidth) / canvas.width;
    
    // Check if content exceeds one page height
    if (contentHeight > (pageHeight - 20)) {
        // Simple scaling to fit one page if it's close, otherwise it would need complex slicing
        const scaleToFit = (pageHeight - 20) / contentHeight;
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth * scaleToFit, contentHeight * scaleToFit);
    } else {
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);
    }
    
    pdf.save(options.filename);
  } catch (error) {
    console.error('PDF creation failed:', error);
    throw error;
  } finally {
    document.body.removeChild(container);
  }
}
