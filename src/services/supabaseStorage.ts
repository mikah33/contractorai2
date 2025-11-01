/**
 * Supabase Storage Service for PDF Uploads
 * Handles uploading estimate PDFs to Supabase Storage
 */

import { supabase } from '../lib/supabase';
import { SupabaseStorageResponse } from '../types/estimateResponse';

const STORAGE_BUCKET = 'estimate-pdfs';

/**
 * Upload PDF blob to Supabase Storage
 * @param pdfBlob - The PDF file as a Blob
 * @param estimateId - The estimate ID for naming the file
 * @returns Promise with public URL or error
 */
export async function uploadEstimatePDF(
  pdfBlob: Blob,
  estimateId: string
): Promise<SupabaseStorageResponse> {
  try {
    // Validate inputs
    if (!pdfBlob || pdfBlob.size === 0) {
      throw new Error('Invalid PDF blob provided');
    }

    if (!estimateId) {
      throw new Error('Estimate ID is required');
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileName = `estimate-${estimateId}-${timestamp}.pdf`;
    const filePath = `${fileName}`;

    console.log('Uploading PDF to Supabase Storage:', {
      bucket: STORAGE_BUCKET,
      path: filePath,
      size: pdfBlob.size
    });

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      throw uploadError;
    }

    console.log('Upload successful:', uploadData);

    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!publicUrlData.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded PDF');
    }

    console.log('Public URL generated:', publicUrlData.publicUrl);

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl
    };
  } catch (error) {
    console.error('Error uploading PDF to Supabase Storage:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown upload error')
    };
  }
}

/**
 * Delete a PDF from Supabase Storage
 * @param pdfUrl - The public URL of the PDF to delete
 * @returns Promise indicating success or failure
 */
export async function deleteEstimatePDF(pdfUrl: string): Promise<boolean> {
  try {
    if (!pdfUrl) {
      throw new Error('PDF URL is required');
    }

    // Extract file path from public URL
    const urlParts = pdfUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];

    console.log('Deleting PDF from Supabase Storage:', fileName);

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([fileName]);

    if (error) {
      console.error('Error deleting PDF:', error);
      throw error;
    }

    console.log('PDF deleted successfully:', fileName);
    return true;
  } catch (error) {
    console.error('Error in deleteEstimatePDF:', error);
    return false;
  }
}

/**
 * Check if the storage bucket exists and is accessible
 * @returns Promise indicating bucket accessibility
 */
export async function verifyStorageBucket(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list('', { limit: 1 });

    if (error) {
      console.error('Storage bucket verification failed:', error);
      return false;
    }

    console.log('Storage bucket verified:', STORAGE_BUCKET);
    return true;
  } catch (error) {
    console.error('Error verifying storage bucket:', error);
    return false;
  }
}

/**
 * Upload PDF to Supabase Storage (alias for uploadEstimatePDF)
 * @param pdfBlob - The PDF file as a Blob
 * @param fileName - The filename to use
 * @returns Promise with public URL string
 */
export async function uploadPdfToStorage(
  pdfBlob: Blob,
  fileName: string
): Promise<string> {
  try {
    console.log('Uploading PDF to Supabase Storage:', {
      bucket: STORAGE_BUCKET,
      fileName,
      size: pdfBlob.size
    });

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      throw uploadError;
    }

    console.log('Upload successful:', uploadData);

    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    if (!publicUrlData.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded PDF');
    }

    console.log('Public URL generated:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading PDF to Supabase Storage:', error);
    throw error;
  }
}
