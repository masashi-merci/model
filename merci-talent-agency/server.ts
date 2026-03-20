import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
