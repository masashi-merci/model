import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { onRequestPost as upload } from './functions/api/upload';
import { onRequestPost as sendEmail } from './functions/api/send-email';
import { onRequestGet as adminSession } from './functions/api/admin-session';

dotenv.config();

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID || '', secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '' },
});

async function startServer() {
  const app = express();
  const PORT = 3000;
  const env = {
    ...process.env,
    MY_BUCKET: process.env.R2_BUCKET_NAME && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY ? {
      put: (key, body, options) => r2Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME, Key: key, Body: body,
        ContentType: options.httpMetadata.contentType,
        ContentDisposition: options.httpMetadata.contentDisposition,
      })),
    } : undefined,
  };
  // Both development and Pages use identical validation/authentication handlers.
  // Do not parse the body first: each handler enforces a streamed byte limit.
  const adapt = (handler) => async (req, res) => {
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers.set(key, value);
      }
      // Never trust a client-supplied Cloudflare IP header on the standalone server.
      headers.set('cf-connecting-ip', req.socket.remoteAddress || 'unknown');
      const request = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
        method: req.method, headers,
        ...(req.method === 'GET' ? {} : { body: req, duplex: 'half' }),
      } as RequestInit);
      const response = await handler({ request, env });
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
    } catch { res.status(500).json({ error: 'Request could not be completed' }); }
  };
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/admin-session', adapt(adminSession));
  app.post('/api/upload', adapt(upload));
  app.post('/api/send-email', adapt(sendEmail));

  // API 404 Handler - prevent falling through to Vite SPA fallback
  app.use('/api/*', (req, res) => {
    console.warn(`404 API Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
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
