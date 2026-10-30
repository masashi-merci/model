import { Resend } from 'resend';
import { boundedBody, checkRequest, errorResponse, HttpError, validateEmailPayload } from '../_lib/security';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    checkRequest(request, 'email', 5);
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'JSON required');
    const bytes = await boundedBody(request, 32 * 1024);
    let payload: unknown;
    try { payload = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400, 'Invalid JSON'); }
    const { type, data, email } = validateEmailPayload(payload, env.VITE_R2_PUBLIC_URL);

    // Hardcoded recipient as requested
    const toEmail = 'info@talentmerci.com';
    
    // Use Resend API
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is missing. Please check your Cloudflare dashboard.');
    }
    const resend = new Resend(env.RESEND_API_KEY);
    const fromEmail = env.RESEND_FROM_EMAIL || 'info@talentmerci.com';

    let html = '';

    if (type === 'contact') {
      html = `
        <h3>お問い合わせ内容</h3>
        <p><strong>お名前:</strong> ${data.name}</p>
        <p><strong>メールアドレス:</strong> ${data.email}</p>
        <p><strong>件名:</strong> ${data.subject}</p>
        <p><strong>お問い合わせ内容:</strong></p>
        <p>${data.message.replace(/\n/g, '<br>')}</p>
      `;
    } else if (type === 'order') {
      const locationAddress = `〒${data.locationPostalCode || ''} ${data.locationPrefecture || ''}${data.locationCity || ''}${data.locationAddressDetail || ''}`;
      const rehearsalDateTime = data.rehearsal === 'yes' ? `${data.rehearsalDate || ''} ${data.rehearsalStartTime || ''} ～ ${data.rehearsalEndTime || ''}` : '';
      const mainEventDateTime = `${data.mainEventDate || ''} ${data.mainEventStartTime || ''} ～ ${data.mainEventEndTime || ''}`;

      html = `
        <h3>オーダー内容</h3>
        <p><strong>会社名:</strong> ${data.companyName}</p>
        <p><strong>担当者名:</strong> ${data.contactPerson}</p>
        <p><strong>メールアドレス:</strong> ${data.email}</p>
        <p><strong>募集締切日:</strong> ${data.deadline}</p>
        <p><strong>案件名:</strong> ${data.projectName}</p>
        <p><strong>場所:</strong> ${locationAddress}</p>
        <p><strong>リハーサル有無:</strong> ${data.rehearsal === 'yes' ? '有' : '無'}</p>
        ${data.rehearsal === 'yes' ? `
          <p><strong>リハーサル日時:</strong> ${rehearsalDateTime}</p>
          <p><strong>リハーサル場所:</strong> ${data.rehearsalLocation}</p>
        ` : ''}
        <p><strong>本番日時:</strong> ${mainEventDateTime}</p>
        <p><strong>採用人数:</strong> ${data.hiringCount}</p>
        <p><strong>業務内容:</strong></p>
        <p>${data.jobDescription.replace(/\n/g, '<br>')}</p>
        <p><strong>条件:</strong> ${data.conditions.join(', ') || 'なし'}</p>
        <p><strong>衣装支給の有無:</strong> ${data.costumeProvided === 'yes' ? '有' : '無'}</p>
        ${data.costumeImageUrl ? `
          <p><strong>衣装画像:</strong><br>
          <img src="${data.costumeImageUrl}" alt="衣装画像" style="max-width: 300px; height: auto; margin-top: 10px; border: 1px solid #eee;" />
          <br><a href="${data.costumeImageUrl}" style="font-size: 12px; color: #666;">[ 画像をフルサイズで表示 ]</a>
          </p>
        ` : ''}
        <p><strong>選考方法:</strong> ${data.selectionMethod === 'document' ? '書類選考' : '書類選考通過後のオーディション'}</p>
        <p><strong>時給または日給:</strong> ${data.hourlyDailyRate}</p>
        <p><strong>交通費:</strong> ${data.transportation || 'なし'}</p>
        <p><strong>食事代:</strong> ${data.mealAllowance || 'なし'}</p>
      `;
    }

    // 1. Send notification to Admin
    const { data: resendData, error: resendError } = await resend.emails.send({
      from: `Merci Talent Agency <${fromEmail}>`,
      to: [toEmail],
      subject: type === 'order' ? '【オーダー】新しいお申し込み' : '【お問い合わせ】新しいメッセージ',
      html: html,
      replyTo: email
    });

    if (resendError) throw resendError;

    // 2. Send Auto-reply to Customer
    if (data.email) {
      const isOrder = type === 'order';
      const autoReplySubject = isOrder 
        ? '【Merci Talent Agency】オーダーを承りました' 
        : '【Merci Talent Agency】お問い合わせありがとうございます';
      
      const autoReplyHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.8; margin: 0; padding: 0; background-color: #ffffff; }
            .container { max-width: 600px; margin: 0 auto; padding: 60px 20px; }
            .header { text-align: center; margin-bottom: 50px; }
            .logo { font-size: 28px; font-weight: 300; letter-spacing: 0.4em; text-transform: uppercase; border-bottom: 1px solid #1a1a1a; padding-bottom: 25px; display: inline-block; }
            .content { padding: 30px 0; font-size: 14px; letter-spacing: 0.05em; }
            .greeting { font-size: 16px; margin-bottom: 30px; }
            .details { background-color: #f8f8f8; padding: 30px; margin: 30px 0; border-left: 1px solid #1a1a1a; }
            .details-title { font-size: 12px; font-weight: bold; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 15px; color: #666; }
            .detail-item { margin: 10px 0; }
            .label { font-weight: bold; width: 120px; display: inline-block; vertical-align: top; }
            .footer { margin-top: 60px; padding-top: 30px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; letter-spacing: 0.15em; text-transform: uppercase; }
            .button-container { text-align: center; margin-top: 40px; }
            .button { display: inline-block; padding: 18px 40px; background-color: #1a1a1a; color: #ffffff !important; text-decoration: none; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; transition: opacity 0.3s; }
            .signature { margin-top: 40px; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Merci Talent Agency</div>
            </div>
            <div class="content">
              <p class="greeting">${isOrder ? 'ご担当者' : 'お客様'} 様</p>
              <p>この度は、Merci Talent Agencyへ${isOrder ? 'オーダー' : 'お問い合わせ'}をいただき、誠にありがとうございます。<br>
              以下の内容でリクエストを承りました。</p>
              
              <div class="details">
                <div class="details-title">Submission Details</div>
                内容を受け付けました。
              </div>

              <p>内容を確認の上、担当者より改めてご連絡させていただきます。<br>
              今しばらくお待ちいただけますようお願い申し上げます。</p>
              
              <p>ご不明な点がございましたら、本メールへ返信いただくか、公式サイトよりお問い合わせください。</p>
              
              <div class="button-container">
                <a href="https://talentmerci.com" class="button">Visit Our Website</a>
              </div>

              <p class="signature">Best Regards,<br>Merci Talent Agency Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Merci Talent Agency. All Rights Reserved.</p>
              <p>Tokyo, Japan | info@talentmerci.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await resend.emails.send({
        from: `Merci Talent Agency <${fromEmail}>`,
        to: [email],
        subject: autoReplySubject,
        html: autoReplyHtml,
      }).catch(err => console.error('Auto-reply failed:', err));
    }

    return new Response(JSON.stringify({ success: true, data: resendData }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return errorResponse(error);
  }
}
