export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'uploads';

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
    }

    // Use R2 binding directly (much lighter than S3 SDK)
    const bucket = env.BUCKET || env.MY_BUCKET;
    if (!bucket) {
      throw new Error('R2 Bucket binding is missing. Please check your Cloudflare dashboard. (Expected binding: BUCKET or MY_BUCKET)');
    }

    const fileName = `${folder}/${Date.now()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();

    await bucket.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    const publicUrlBase = env.VITE_R2_PUBLIC_URL;
    if (!publicUrlBase) {
      throw new Error('VITE_R2_PUBLIC_URL environment variable is missing. Please check your Cloudflare dashboard.');
    }

    const publicUrl = `${publicUrlBase}/${fileName}`;

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
