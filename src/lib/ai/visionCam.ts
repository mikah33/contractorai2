import { supabase } from '../supabase';

export interface GenerateVisionParams {
  prompt: string;
  imageBase64?: string; // Base64 encoded image (optional if imageUrl provided)
  imageUrl?: string; // Direct URL to source image (for regeneration)
  strength?: number; // How much to transform (0.0-1.0, default 0.75)
}

export interface GenerateVisionResult {
  imageUrl: string;
  originalImageUrl?: string;
  seed: number;
}

export interface SaveVisionParams {
  imageUrl: string;
  prompt: string;
  projectId?: string;
  originalImageUrl?: string;
}

export interface SaveVisionResult {
  publicUrl: string;
  photoId: string;
}

export interface GenerationProgress {
  status: 'uploading' | 'generating' | 'completed' | 'failed';
  progress?: number;
  message?: string;
}

/**
 * Generate a transformed image using fal.ai via Supabase Edge Function
 * Takes a base image and applies the contractor's prompt while preserving layout
 */
export async function generateVisionImage(
  params: GenerateVisionParams,
  onProgress?: (progress: GenerationProgress) => void
): Promise<GenerateVisionResult> {
  try {
    onProgress?.({ status: 'uploading', message: 'Uploading image...' });

    // Get current session for auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Please log in to use Vision Cam');
    }

    onProgress?.({ status: 'generating', message: 'Generating your vision...', progress: 30 });

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('vision-cam', {
      body: {
        action: 'generate',
        prompt: params.prompt,
        imageBase64: params.imageBase64 || undefined,
        imageUrl: params.imageUrl || undefined,
        strength: params.strength || 0.75
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to generate image');
    }

    if (!data?.success || !data?.generatedImageUrl) {
      throw new Error(data?.error || 'No image generated');
    }

    onProgress?.({ status: 'completed', progress: 100, message: 'Complete!' });

    return {
      imageUrl: data.generatedImageUrl,
      originalImageUrl: data.originalImageUrl,
      seed: data.seed || 0,
    };
  } catch (error: any) {
    onProgress?.({ status: 'failed', message: error.message });
    console.error('Vision generation error:', error);
    throw new Error(error.message || 'Failed to generate vision image');
  }
}

/**
 * Save a generated image to the user's gallery via Edge Function
 */
export async function saveVisionImage(params: SaveVisionParams): Promise<SaveVisionResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Please log in to save images');
    }

    const { data, error } = await supabase.functions.invoke('vision-cam', {
      body: {
        action: 'upload',
        imageUrl: params.imageUrl,
        prompt: params.prompt,
        projectId: params.projectId,
        originalImageUrl: params.originalImageUrl
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to save image');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to save image');
    }

    return {
      publicUrl: data.publicUrl,
      photoId: data.photoId
    };
  } catch (error: any) {
    console.error('Save vision error:', error);
    throw new Error(error.message || 'Failed to save image');
  }
}

/**
 * Convert a File to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Suggested prompts for contractors
 */
export const VISION_PROMPT_SUGGESTIONS = [
  "Renovated with modern finishes and fresh paint",
  "Landscaped yard with new lawn and plants",
  "Updated kitchen with white cabinets and granite counters",
  "New roof with architectural shingles",
  "Fresh exterior paint in a modern color scheme",
  "Remodeled bathroom with new tile and fixtures",
  "Finished basement with recessed lighting",
  "New hardwood floors throughout",
  "Updated windows and doors",
  "Professional landscaping with stone walkway"
];
