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
    if (!env.BUCKET) {
      throw new Error('R2 Bucket binding is missing. Please check your Cloudflare dashboard.');
    }

    const fileName = `${folder}/${Date.now()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();

    await env.BUCKET.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

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
