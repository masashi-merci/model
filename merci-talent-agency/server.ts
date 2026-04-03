import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.GMAIL_USER?.trim();
    const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');
    
    if (!user || !pass) {
      console.error('Email Configuration Missing: GMAIL_USER or GMAIL_APP_PASSWORD not set');
      throw new Error('Email configuration is missing. Please check server environment variables.');
    }

    console.log(`Initializing transporter for user: ${user}`);
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }
  return transporter;
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const upload = multer({ storage: multer.memoryStorage() });

// R2 Client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      env: {
        supabase: !!process.env.VITE_SUPABASE_URL,
        r2: !!process.env.R2_ACCOUNT_ID,
        r2_bucket: !!process.env.R2_BUCKET_NAME,
        r2_public: !!process.env.VITE_R2_PUBLIC_URL,
        gmail: !!process.env.GMAIL_USER,
        gmail_pass: !!process.env.GMAIL_APP_PASSWORD,
        resend: !!process.env.RESEND_API_KEY
      }
    });
  });

  // Logging middleware for API requests
  app.use('/api', (req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // API Routes
  app.post('/api/upload', (req, res, next) => {
    console.log('POST /api/upload hit');
    next();
  }, upload.single('file'), async (req, res) => {
    console.log('Upload request processing');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    try {
      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({ error: 'No file uploaded' });
      }
      console.log('File:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const folder = req.body.folder || 'uploads';
      const customName = req.body.customName ? req.body.customName.replace(/[^a-zA-Z0-9]/g, '_') : null;
      const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
      const timestamp = Date.now();
      const fileName = customName 
        ? `${customName}_${timestamp}${path.extname(req.file.originalname)}`
        : `${path.parse(originalName).name}_${timestamp}${path.extname(originalName)}`;
      const key = `${folder}/${fileName}`;

      console.log(`Uploading to R2: ${key}`);

      if (!process.env.R2_BUCKET_NAME) {
        throw new Error('R2_BUCKET_NAME is not configured');
      }

      if (!process.env.VITE_R2_PUBLIC_URL) {
        throw new Error('VITE_R2_PUBLIC_URL is not configured');
      }

      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });

      await r2Client.send(command);

      const baseUrl = process.env.VITE_R2_PUBLIC_URL.replace(/\/$/, '');
      const publicUrl = `${baseUrl}/${key}`;
      console.log(`Upload successful: ${publicUrl}`);
      res.json({ url: publicUrl });
    } catch (error: any) {
      console.error('R2 Upload Error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  app.post('/api/send-email', async (req, res) => {
    const { type, data, modelName } = req.body;
    console.log(`Email request received: ${type}`);

    try {
      // Fetch contact email from site_settings
      const { data: settings, error: settingsError } = await supabase
        .from('site_settings')
        .select('contact_email')
        .single();

      if (settingsError) {
        console.error('Error fetching site settings:', settingsError);
        throw new Error('Could not fetch contact email from settings');
      }

      const toEmail = settings?.contact_email || 'info@talentmerci.com';
      console.log(`Sending email to: ${toEmail}`);
      let subject = '';
      let html = '';

      if (type === 'contact') {
        subject = `[Contact] New message from ${data.name}`;
        html = `
          <h2>New Contact Message</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <p><strong>Message:</strong></p>
          <p>${data.message.replace(/\n/g, '<br>')}</p>
        `;
      } else if (type === 'order') {
        subject = `[New Order] Project: ${data.projectName}`;
        html = `
          <h2>New Order Request</h2>
          <hr>
          <h3>Client Information</h3>
          <p><strong>会社名:</strong> ${data.companyName}</p>
          <p><strong>担当者名:</strong> ${data.contactPerson}</p>
          <p><strong>住所:</strong> ${data.address}</p>
          <p><strong>メールアドレス:</strong> ${data.email}</p>

          <h3>Basic Information</h3>
          <p><strong>募集締切日:</strong> ${data.deadline}</p>
          <p><strong>案件名:</strong> ${data.projectName}</p>
          <p><strong>場所:</strong> ${data.location}</p>
          
          <h3>Schedule</h3>
          <p><strong>リハーサル有無:</strong> ${data.rehearsal === 'yes' ? '有' : '無'}</p>
          ${data.rehearsal === 'yes' ? `
            <p><strong>リハーサル日時:</strong> ${data.rehearsalDateTime}</p>
            <p><strong>リハーサル場所:</strong> ${data.rehearsalLocation}</p>
          ` : ''}
          <p><strong>日程（本番）:</strong> ${data.mainEvent}</p>
          <p><strong>本番日時:</strong> ${data.mainEventDateTime}</p>
          
          <h3>Job Details</h3>
          <p><strong>採用人数:</strong> ${data.hiringCount}</p>
          <p><strong>業務内容:</strong></p>
          <p>${data.jobDescription.replace(/\n/g, '<br>')}</p>
          <p><strong>条件:</strong> ${data.conditions.join(', ') || 'なし'}</p>
          
          <h3>Attire & Selection</h3>
          <p><strong>衣装支給の有無:</strong> ${data.costumeProvided === 'yes' ? '有' : '無'}</p>
          ${data.costumeImageUrl ? `<p><strong>衣装画像:</strong> <a href="${data.costumeImageUrl}">${data.costumeImageUrl}</a></p>` : ''}
          <p><strong>選考方法:</strong> ${data.selectionMethod === 'document' ? '書類選考' : '書類選考通過後のオーディション'}</p>
          
          <h3>Payment</h3>
          <p><strong>時給または日給:</strong> ${data.hourlyDailyRate}</p>
          <p><strong>交通費:</strong> ${data.transportation || 'なし'}</p>
          <p><strong>食事代:</strong> ${data.mealAllowance || 'なし'}</p>
        `;
      }

      if (resend) {
        console.log('Using Resend to send email');
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        
        // 1. Send notification to Admin
        const { data: resendData, error: resendError } = await resend.emails.send({
          from: `Merci Talent Agency <${fromEmail}>`,
          to: toEmail,
          subject: subject,
          html: html,
          replyTo: data.email,
        });

        if (resendError) {
          console.error('Resend Error (Admin):', resendError);
          throw new Error(`Resend failed: ${resendError.message}`);
        }

        // 2. Send Auto-reply to Customer
        if (data.email) {
          const isOrder = type === 'order';
          const autoReplySubject = isOrder 
            ? '【Merci Talent Agency】オーダーを承りました' 
            : '【Merci Talent Agency】お問い合わせありがとうございます';
          
          const greeting = isOrder 
            ? `${data.companyName || ''}<br>${data.contactPerson || ''} 様` 
            : `${data.name || ''} 様`;

          const orderDetails = isOrder ? `
            <div class="detail-item"><span class="label">会社名:</span> ${data.companyName}</div>
            <div class="detail-item"><span class="label">担当者名:</span> ${data.contactPerson}</div>
            <div class="detail-item"><span class="label">住所:</span> ${data.address}</div>
            <div class="detail-item"><span class="label">メールアドレス:</span> ${data.email}</div>
            <div class="detail-item"><span class="label">募集締切日:</span> ${data.deadline}</div>
            <div class="detail-item"><span class="label">案件名:</span> ${data.projectName}</div>
            <div class="detail-item"><span class="label">場所:</span> ${data.location}</div>
            <div class="detail-item"><span class="label">リハーサル有無:</span> ${data.rehearsal === 'yes' ? '有' : '無'}</div>
            ${data.rehearsal === 'yes' ? `
              <div class="detail-item"><span class="label">リハーサル日時:</span> ${data.rehearsalDateTime}</div>
              <div class="detail-item"><span class="label">リハーサル場所:</span> ${data.rehearsalLocation}</div>
            ` : ''}
            <div class="detail-item"><span class="label">日程（本番）:</span> ${data.mainEvent}</div>
            <div class="detail-item"><span class="label">本番日時:</span> ${data.mainEventDateTime}</div>
            <div class="detail-item"><span class="label">採用人数:</span> ${data.hiringCount}</div>
            <div class="detail-item"><span class="label">業務内容:</span><br>${data.jobDescription.replace(/\n/g, '<br>')}</div>
            <div class="detail-item"><span class="label">条件:</span> ${data.conditions.join(', ') || 'なし'}</div>
            <div class="detail-item"><span class="label">衣装支給の有無:</span> ${data.costumeProvided === 'yes' ? '有' : '無'}</div>
            ${data.costumeImageUrl ? `<div class="detail-item"><span class="label">衣装画像:</span> <a href="${data.costumeImageUrl}">${data.costumeImageUrl}</a></div>` : ''}
            <div class="detail-item"><span class="label">選考方法:</span> ${data.selectionMethod === 'document' ? '書類選考' : '書類選考通過後のオーディション'}</div>
            <div class="detail-item"><span class="label">時給または日給:</span> ${data.hourlyDailyRate}</div>
            <div class="detail-item"><span class="label">交通費:</span> ${data.transportation || 'なし'}</div>
            <div class="detail-item"><span class="label">食事代:</span> ${data.mealAllowance || 'なし'}</div>
          ` : `
            <div class="detail-item"><span class="label">件名:</span> ${data.subject}</div>
            <div class="detail-item"><span class="label">メッセージ:</span><br>${data.message.replace(/\n/g, '<br>')}</div>
          `;

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
                  <p class="greeting">${greeting}</p>
                  <p>この度は、Merci Talent Agencyへ${isOrder ? 'オーダー' : 'お問い合わせ'}をいただき、誠にありがとうございます。<br>
                  以下の内容でリクエストを承りました。</p>
                  
                  <div class="details">
                    <div class="details-title">Submission Details</div>
                    ${orderDetails}
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
            to: data.email,
            subject: autoReplySubject,
            html: autoReplyHtml,
          }).catch(err => console.error('Auto-reply failed:', err));
        }

        console.log('Email sent via Resend:', resendData?.id);
        return res.json({ success: true, id: resendData?.id });
      }

      // Fallback to Nodemailer/Gmail
      const transporter = getTransporter();
      
      // 1. Send to Admin
      const mailOptions = {
        from: `"Merci Talent Agency" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: subject,
        html: html,
        replyTo: data.email,
      };

      const info = await transporter.sendMail(mailOptions);
      
      // 2. Send Auto-reply to Customer
      if (data.email) {
        const isOrder = type === 'order';
        const autoReplySubject = isOrder 
          ? '【Merci Talent Agency】オーダーを承りました' 
          : '【Merci Talent Agency】お問い合わせありがとうございます';
        
        const greeting = isOrder 
          ? `${data.companyName || ''}<br>${data.contactPerson || ''} 様` 
          : `${data.name || ''} 様`;

        const orderDetails = isOrder ? `
          <div class="detail-item"><span class="label">会社名:</span> ${data.companyName}</div>
          <div class="detail-item"><span class="label">担当者名:</span> ${data.contactPerson}</div>
          <div class="detail-item"><span class="label">住所:</span> ${data.address}</div>
          <div class="detail-item"><span class="label">メールアドレス:</span> ${data.email}</div>
          <div class="detail-item"><span class="label">募集締切日:</span> ${data.deadline}</div>
          <div class="detail-item"><span class="label">案件名:</span> ${data.projectName}</div>
          <div class="detail-item"><span class="label">場所:</span> ${data.location}</div>
          <div class="detail-item"><span class="label">リハーサル有無:</span> ${data.rehearsal === 'yes' ? '有' : '無'}</div>
          ${data.rehearsal === 'yes' ? `
            <div class="detail-item"><span class="label">リハーサル日時:</span> ${data.rehearsalDateTime}</div>
            <div class="detail-item"><span class="label">リハーサル場所:</span> ${data.rehearsalLocation}</div>
          ` : ''}
          <div class="detail-item"><span class="label">日程（本番）:</span> ${data.mainEvent}</div>
          <div class="detail-item"><span class="label">本番日時:</span> ${data.mainEventDateTime}</div>
          <div class="detail-item"><span class="label">採用人数:</span> ${data.hiringCount}</div>
          <div class="detail-item"><span class="label">業務内容:</span><br>${data.jobDescription.replace(/\n/g, '<br>')}</div>
          <div class="detail-item"><span class="label">条件:</span> ${data.conditions.join(', ') || 'なし'}</div>
          <div class="detail-item"><span class="label">衣装支給の有無:</span> ${data.costumeProvided === 'yes' ? '有' : '無'}</div>
          ${data.costumeImageUrl ? `<div class="detail-item"><span class="label">衣装画像:</span> <a href="${data.costumeImageUrl}">${data.costumeImageUrl}</a></div>` : ''}
          <div class="detail-item"><span class="label">選考方法:</span> ${data.selectionMethod === 'document' ? '書類選考' : '書類選考通過後のオーディション'}</div>
          <div class="detail-item"><span class="label">時給または日給:</span> ${data.hourlyDailyRate}</div>
          <div class="detail-item"><span class="label">交通費:</span> ${data.transportation || 'なし'}</div>
          <div class="detail-item"><span class="label">食事代:</span> ${data.mealAllowance || 'なし'}</div>
        ` : `
          <div class="detail-item"><span class="label">件名:</span> ${data.subject}</div>
          <div class="detail-item"><span class="label">メッセージ:</span><br>${data.message.replace(/\n/g, '<br>')}</div>
        `;

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
                <p class="greeting">${greeting}</p>
                <p>この度は、Merci Talent Agencyへ${isOrder ? 'オーダー' : 'お問い合わせ'}をいただき、誠にありがとうございます。<br>
                以下の内容でリクエストを承りました。</p>
                
                <div class="details">
                  <div class="details-title">Submission Details</div>
                  ${orderDetails}
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

        await transporter.sendMail({
          from: `"Merci Talent Agency" <${process.env.GMAIL_USER}>`,
          to: data.email,
          subject: autoReplySubject,
          html: autoReplyHtml,
        }).catch(err => console.error('Auto-reply failed:', err));
      }
      console.log('Email sent via Gmail:', info.messageId);

      res.json({ success: true, id: info.messageId });
    } catch (error: any) {
      console.error('Email Error:', error);
      res.status(500).json({ error: error.message || 'Failed to send email' });
    }
  });

  // Generic API error handler
  app.use('/api', (err: any, req: any, res: any, next: any) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({ 
      error: err.message || 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
