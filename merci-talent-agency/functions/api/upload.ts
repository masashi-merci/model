import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'uploads';

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });

    const fileName = `${folder}/${Date.now()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();

    await s3Client.send(new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: fileName,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type,
    }));

    const publicUrl = `${env.VITE_R2_PUBLIC_URL}/${fileName}`;

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
