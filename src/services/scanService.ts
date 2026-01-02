import { supabase } from '../lib/supabase';
import { RoomScanResult } from './lidarScannerService';

export interface FloorPlanMetadata {
  materialEstimates?: {
    flooring: number;
    wallPaint: number;
    baseboardTrim: number;
    crownMolding: number;
    drywallSheets: number;
    ceilingPaint: number;
  };
  rooms?: Array<{
    index: number;
    label: string;
    area: number;
  }>;
  annotations?: Array<{
    position: { x: number; y: number };
    text: string;
    type: 'note' | 'measurement' | 'repair' | 'electrical' | 'plumbing';
  }>;
}

export interface CloudScan {
  id: string;
  user_id: string;
  project_id?: string;
  scan_data: RoomScanResult;
  model_url?: string;
  floor_plan_url?: string;
  room_name?: string;
  ceiling_height?: number;
  floor_plan_metadata?: FloorPlanMetadata;
  created_at: string;
}

// Save scan to Supabase
export async function saveScanToCloud(
  scanData: RoomScanResult,
  modelBase64?: string,
  projectId?: string
): Promise<CloudScan | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user logged in');
      return null;
    }

    let modelUrl: string | undefined;

    // Upload USDZ model to storage if provided
    if (modelBase64) {
      const fileName = `${user.id}/${scanData.scanId || Date.now()}.usdz`;

      // Convert base64 to blob
      const byteCharacters = atob(modelBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'model/vnd.usdz+zip' });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('room-scans')
        .upload(fileName, blob, {
          contentType: 'model/vnd.usdz+zip',
          upsert: true
        });

      if (uploadError) {
        console.error('Failed to upload model:', uploadError);
      } else {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('room-scans')
          .getPublicUrl(fileName);
        modelUrl = urlData.publicUrl;
      }
    }

    // Save scan metadata to database
    const { data, error } = await supabase
      .from('room_scans')
      .insert({
        user_id: user.id,
        project_id: projectId || null,
        scan_data: scanData,
        model_url: modelUrl
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save scan:', error);
      return null;
    }

    return data as CloudScan;
  } catch (err) {
    console.error('Error saving scan to cloud:', err);
    return null;
  }
}

// Get all scans for current user
export async function getCloudScans(projectId?: string): Promise<CloudScan[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('room_scans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch scans:', error);
      return [];
    }

    return data as CloudScan[];
  } catch (err) {
    console.error('Error fetching cloud scans:', err);
    return [];
  }
}

// Get single scan by ID
export async function getCloudScan(scanId: string): Promise<CloudScan | null> {
  try {
    const { data, error } = await supabase
      .from('room_scans')
      .select('*')
      .eq('id', scanId)
      .single();

    if (error) {
      console.error('Failed to fetch scan:', error);
      return null;
    }

    return data as CloudScan;
  } catch (err) {
    console.error('Error fetching cloud scan:', err);
    return null;
  }
}

// Delete scan
export async function deleteCloudScan(scanId: string): Promise<boolean> {
  try {
    // Get scan first to delete model from storage
    const scan = await getCloudScan(scanId);

    if (scan?.model_url) {
      // Extract file path from URL
      const urlParts = scan.model_url.split('/room-scans/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('room-scans').remove([filePath]);
      }
    }

    const { error } = await supabase
      .from('room_scans')
      .delete()
      .eq('id', scanId);

    if (error) {
      console.error('Failed to delete scan:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deleting cloud scan:', err);
    return false;
  }
}

// Link scan to project
export async function linkScanToProject(scanId: string, projectId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('room_scans')
      .update({ project_id: projectId })
      .eq('id', scanId);

    if (error) {
      console.error('Failed to link scan to project:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error linking scan to project:', err);
    return false;
  }
}

// Upload floor plan to Supabase and update scan record
export async function saveFloorPlanToCloud(
  cloudScanId: string,
  floorPlanBase64: string,
  format: 'png' | 'pdf' = 'png'
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user logged in');
      return null;
    }

    // Remove data URI prefix if present
    const base64Data = floorPlanBase64.replace(/^data:image\/\w+;base64,/, '').replace(/^data:application\/pdf;base64,/, '');

    const fileName = `${user.id}/floorplans/${cloudScanId}_floorplan.${format}`;
    const contentType = format === 'pdf' ? 'application/pdf' : 'image/png';

    // Convert base64 to blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('room-scans')
      .upload(fileName, blob, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error('Failed to upload floor plan:', uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('room-scans')
      .getPublicUrl(fileName);

    const floorPlanUrl = urlData.publicUrl;

    // Update scan record with floor plan URL
    const { error: updateError } = await supabase
      .from('room_scans')
      .update({ floor_plan_url: floorPlanUrl })
      .eq('id', cloudScanId);

    if (updateError) {
      console.error('Failed to update scan with floor plan URL:', updateError);
    }

    return floorPlanUrl;
  } catch (err) {
    console.error('Error saving floor plan to cloud:', err);
    return null;
  }
}

// Get floor plan URL for a scan
export async function getFloorPlanUrl(cloudScanId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('room_scans')
      .select('floor_plan_url')
      .eq('id', cloudScanId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.floor_plan_url || null;
  } catch (err) {
    console.error('Error getting floor plan URL:', err);
    return null;
  }
}

// Update room name for a scan
export async function updateScanRoomName(
  cloudScanId: string,
  roomName: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('room_scans')
      .update({ room_name: roomName })
      .eq('id', cloudScanId);

    if (error) {
      console.error('Failed to update room name:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error updating room name:', err);
    return false;
  }
}

// Update ceiling height for a scan
export async function updateScanCeilingHeight(
  cloudScanId: string,
  ceilingHeight: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('room_scans')
      .update({ ceiling_height: ceilingHeight })
      .eq('id', cloudScanId);

    if (error) {
      console.error('Failed to update ceiling height:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error updating ceiling height:', err);
    return false;
  }
}

// Update floor plan metadata (material estimates, rooms, annotations)
export async function updateFloorPlanMetadata(
  cloudScanId: string,
  metadata: FloorPlanMetadata
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('room_scans')
      .update({ floor_plan_metadata: metadata })
      .eq('id', cloudScanId);

    if (error) {
      console.error('Failed to update floor plan metadata:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error updating floor plan metadata:', err);
    return false;
  }
}

// Save complete floor plan data (URL + metadata) in one call
export async function saveFloorPlanData(
  cloudScanId: string,
  floorPlanUrl: string,
  ceilingHeight: number,
  metadata: FloorPlanMetadata,
  roomName?: string
): Promise<boolean> {
  try {
    const updateData: Record<string, unknown> = {
      floor_plan_url: floorPlanUrl,
      ceiling_height: ceilingHeight,
      floor_plan_metadata: metadata
    };

    if (roomName) {
      updateData.room_name = roomName;
    }

    const { error } = await supabase
      .from('room_scans')
      .update(updateData)
      .eq('id', cloudScanId);

    if (error) {
      console.error('Failed to save floor plan data:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error saving floor plan data:', err);
    return false;
  }
}
