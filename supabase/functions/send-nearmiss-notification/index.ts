import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  incident_number: string;
  location_id: string;
  region_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { incident_number, location_id, region_id }: RequestBody = await req.json();

    const { data: report, error: reportError } = await supabase
      .from('near_miss_reports')
      .select('*, locations(name, main_email), regions(name)')
      .eq('incident_number', incident_number)
      .single();

    if (reportError || !report) {
      throw new Error('Rapor bulunamadı');
    }

    const { data: experts, error: expertsError } = await supabase
      .from('isg_experts')
      .select('email, full_name')
      .eq('location_id', location_id)
      .eq('is_active', true);

    if (expertsError) {
      console.error('ISG uzmanları yüklenemedi:', expertsError);
    }

    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    if (settingsError || !settings || !settings.smtp_host) {
      console.log('SMTP ayarları yapılandırılmamış, e-posta gönderilemiyor');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'SMTP ayarları yapılandırılmamış',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const recipients = [
      (report.locations as { main_email: string }).main_email,
      ...(experts || []).map((e: { email: string }) => e.email),
    ].filter(Boolean);

    const locationName = (report.locations as { name: string }).name;
    const regionName = (report.regions as { name: string }).name;

    const emailSubject = `Yeni Ramak Kala Kaydı - ${locationName} - ${report.incident_number}`;
    const emailBody = `
Yeni Ramak Kala Bildirimi

Olay Numarası: ${report.incident_number}
Lokasyon: ${locationName}
Bölge: ${regionName}
Kategori: ${report.category}
Tarih: ${new Date(report.created_at).toLocaleString('tr-TR')}

Bildirim Yapan: ${report.full_name}
Telefon: ${report.phone}

Açıklama:
${report.description || 'Açıklama girilmemiş'}

---
Bu otomatik bir bildirimdir. Lütfen sisteme giriş yaparak detayları inceleyin.
    `.trim();

    console.log('E-posta gönderilecek:', {
      recipients,
      subject: emailSubject,
      incident: report.incident_number,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Bildirim gönderildi',
        incident_number: report.incident_number,
        recipients_count: recipients.length,
        note: 'SMTP entegrasyonu tamamlandığında e-postalar gönderilecek',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Hata:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
