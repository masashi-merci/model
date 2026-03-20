export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'uploads';
    const customName = formData.get('customName');

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Clean filename
    const cleanCustomName = customName ? customName.replace(/[^a-zA-Z0-9]/g, '_') : null;
    const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const extension = file.name.split('.').pop();
    const fileName = cleanCustomName 
      ? `${cleanCustomName}.${extension}`
      : originalName;
    
    const key = `${folder}/${fileName}`;

    // Upload to R2 using the binding
    // Note: You must bind your R2 bucket to the variable name 'MY_BUCKET' in Cloudflare Pages settings
    if (!env.MY_BUCKET) {
      return new Response(JSON.stringify({ error: 'R2 bucket binding (MY_BUCKET) is missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.MY_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const baseUrl = env.VITE_R2_PUBLIC_URL.replace(/\/$/, '');
    const publicUrl = `${baseUrl}/${key}`;

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
