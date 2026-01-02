// Vision Cam Edge Function - Secure fal.ai Image Generation
// Handles image upload and AI transformation without exposing API keys

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FAL_API_KEY = Deno.env.get('FAL_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface GenerateRequest {
  action: 'generate' | 'upload' | 'status';
  prompt?: string;
  imageUrl?: string;
  imageBase64?: string;
  strength?: number;
  requestId?: string;
}

// Upload image to fal.ai storage
async function uploadToFal(imageBase64: string): Promise<string> {
  // Convert base64 to blob
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

  // Upload to fal.ai storage
  const formData = new FormData();
  formData.append('file', new Blob([binaryData], { type: 'image/jpeg' }), 'image.jpg');

  const response = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.url;
}

// Generate image using fal.ai Nano Banana Pro (Google's image editing model)
async function generateVisionImage(
  prompt: string,
  imageUrl: string,
  strength: number = 0.75
): Promise<{ imageUrl: string; seed: number }> {

  console.log('Starting Nano Banana Pro generation with:', { prompt, imageUrl: imageUrl.substring(0, 50) });

  const response = await fetch('https://fal.run/fal-ai/nano-banana-pro/edit', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      image_urls: [imageUrl],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Nano Banana Pro error:', errorText);
    throw new Error(`Generation failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Nano Banana Pro response:', JSON.stringify(data).substring(0, 200));

  if (!data.images || data.images.length === 0) {
    throw new Error('No image generated');
  }

  return {
    imageUrl: data.images[0].url,
    seed: data.seed || 0,
  };
}

// Save generated image to Supabase storage
async function saveToSupabase(
  supabase: any,
  userId: string,
  imageUrl: string,
  prompt: string,
  projectId?: string,
  originalImageUrl?: string
): Promise<{ publicUrl: string; photoId: string }> {

  // Download the generated image
  const imageResponse = await fetch(imageUrl);
  const imageBlob = await imageResponse.blob();
  const imageBuffer = await imageBlob.arrayBuffer();

  // Upload to Supabase storage
  const fileName = `${userId}/ai-generated/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('project-photos')
    .upload(fileName, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: false
    });

  if (uploadError) {
    console.error('Supabase upload error:', uploadError);
    throw new Error(`Failed to save image: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('project-photos')
    .getPublicUrl(fileName);

  // Save to database with original image URL for regeneration
  const { data: photoData, error: dbError } = await supabase
    .from('project_photos')
    .insert({
      user_id: userId,
      project_id: projectId || null,
      image_url: publicUrl,
      caption: prompt,
      category: 'ai-generated',
      is_progress_photo: false,
      metadata: {
        type: 'ai-generated',
        prompt: prompt,
        model: 'fal-ai/nano-banana-pro',
        generatedAt: new Date().toISOString(),
        originalImageUrl: originalImageUrl || null
      }
    })
    .select()
    .single();

  if (dbError) {
    console.error('Database error:', dbError);
    // Don't throw - image is saved, just not in DB
  }

  return {
    publicUrl,
    photoId: photoData?.id || ''
  };
}

serve(async (req) => {
  console.log('Vision Cam request received:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing or invalid auth header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);

    // Check environment variables
    console.log('SUPABASE_URL present:', !!SUPABASE_URL);
    console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!SUPABASE_SERVICE_ROLE_KEY);
    console.log('FAL_API_KEY present:', !!FAL_API_KEY);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase config');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('User authenticated:', !!user, 'Error:', authError?.message);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if fal.ai API key is configured
    if (!FAL_API_KEY) {
      console.error('FAL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Vision Cam service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: GenerateRequest = await req.json();
    const { action, prompt, imageUrl, imageBase64, strength = 0.75 } = body;

    if (action === 'generate') {
      // Validate inputs - need either imageUrl or imageBase64
      if (!prompt || (!imageUrl && !imageBase64)) {
        return new Response(
          JSON.stringify({ error: 'Missing prompt or image' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use imageUrl directly if provided (for regeneration), otherwise upload base64
      let sourceImageUrl = imageUrl;
      if (imageBase64) {
        // For base64, we need to upload to Supabase first and use that URL
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        const tempFileName = `${user.id}/temp/${Date.now()}.jpg`;
        await supabase.storage
          .from('project-photos')
          .upload(tempFileName, binaryData, {
            contentType: 'image/jpeg',
            upsert: true
          });

        const { data: { publicUrl } } = supabase.storage
          .from('project-photos')
          .getPublicUrl(tempFileName);

        sourceImageUrl = publicUrl;
      }

      if (!sourceImageUrl) {
        return new Response(
          JSON.stringify({ error: 'Failed to process source image' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate the vision image
      const result = await generateVisionImage(prompt, sourceImageUrl, strength);

      // Return the generated image URL and original image URL for regeneration
      return new Response(
        JSON.stringify({
          success: true,
          generatedImageUrl: result.imageUrl,
          originalImageUrl: sourceImageUrl,
          seed: result.seed
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'upload') {
      // Save a generated image to user's gallery
      const { imageUrl: generatedUrl, prompt: imagePrompt, projectId, originalImageUrl } = body as any;

      if (!generatedUrl) {
        return new Response(
          JSON.stringify({ error: 'Missing image URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const saved = await saveToSupabase(
        supabase,
        user.id,
        generatedUrl,
        imagePrompt || 'AI Generated Vision',
        projectId,
        originalImageUrl
      );

      return new Response(
        JSON.stringify({
          success: true,
          publicUrl: saved.publicUrl,
          photoId: saved.photoId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Vision Cam Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Something went wrong' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
