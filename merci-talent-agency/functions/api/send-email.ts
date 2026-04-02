import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { type, data, modelName } = await request.json();

    const supabase = createClient(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_ANON_KEY
    );

    // Fetch contact email from site_settings
    const { data: settings, error: settingsError } = await supabase
      .from('site_settings')
      .select('contact_email')
      .single();

    if (settingsError) throw new Error('Could not fetch contact email');

    const toEmail = settings?.contact_email || env.GMAIL_USER || 'event@thisismerci.com';
    
    // Use Resend API (standard for Cloudflare/Serverless)
    const resend = new Resend(env.RESEND_API_KEY);

    let subject = '';
    let html = '';

    if (type === 'contact') {
      subject = `【お問い合わせ】${data.name}様より`;
      html = `
        <h3>お問い合わせ内容</h3>
        <p><strong>お名前:</strong> ${data.name}</p>
        <p><strong>メールアドレス:</strong> ${data.email}</p>
        <p><strong>お問い合わせ内容:</strong></p>
        <p>${data.message.replace(/\n/g, '<br>')}</p>
      `;
    } else if (type === 'booking') {
      subject = `【出演依頼】${modelName}への依頼`;
      html = `
        <h3>出演依頼内容</h3>
        <p><strong>モデル名:</strong> ${modelName}</p>
        <p><strong>会社名:</strong> ${data.company}</p>
        <p><strong>お名前:</strong> ${data.name}</p>
        <p><strong>メールアドレス:</strong> ${data.email}</p>
        <p><strong>電話番号:</strong> ${data.phone}</p>
        <p><strong>依頼内容:</strong></p>
        <p>${data.message.replace(/\n/g, '<br>')}</p>
      `;
    }

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: 'Merci Talent Agency <onboarding@resend.dev>', // 独自ドメイン設定前はこれを使用
      to: [toEmail],
      subject: subject,
      html: html,
      replyTo: data.email
    });

    if (resendError) throw resendError;

    return new Response(JSON.stringify({ success: true, data: resendData }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
