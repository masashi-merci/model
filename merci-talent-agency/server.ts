import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    
    if (!user || !pass) {
      throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required');
    }

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

  // Logging middleware for API requests
  app.use('/api', (req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // API Routes
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    console.log('Upload request received');
    try {
      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const folder = req.body.folder || 'uploads';
      const customName = req.body.customName ? req.body.customName.replace(/[^a-zA-Z0-9]/g, '_') : null;
      const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = customName 
        ? `${customName}${path.extname(req.file.originalname)}`
        : originalName;
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

      const toEmail = settings?.contact_email || 'masashi@milz.tech';
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
      } else if (type === 'booking') {
        subject = `[Booking Request] ${modelName} - from ${data.name}`;
        html = `
          <h2>New Booking Request</h2>
          <p><strong>Model:</strong> ${modelName}</p>
          <hr>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Company:</strong> ${data.company || 'N/A'}</p>
          <p><strong>Date:</strong> ${data.date || 'N/A'}</p>
          <p><strong>Message:</strong></p>
          <p>${data.message.replace(/\n/g, '<br>')}</p>
        `;
      }

      const transporter = getTransporter();
      const mailOptions = {
        from: `"Merci Talent Agency" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: subject,
        html: html,
        replyTo: data.email,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);

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
