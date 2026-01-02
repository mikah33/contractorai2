import { registerPlugin } from '@capacitor/core';

// Define the plugin interface
export interface LiDARScannerPlugin {
  checkLiDARSupport(): Promise<LiDARSupportResult>;
  startRoomScan(): Promise<RoomScanResult>;
  startQuickMeasure(): Promise<QuickMeasureResult>;
  viewModel(options: { modelPath: string }): Promise<{ success: boolean }>;
  getSavedScans(): Promise<{ scans: SavedScan[] }>;
  deleteScan(options: { scanId: string }): Promise<{ success: boolean }>;
  createTexturedModel(options: { scanId: string }): Promise<TexturedModelResult>;
  processTexturedModel(options: { scanId: string }): Promise<TexturedModelResult>;
  generateFloorPlan(options: FloorPlanOptions): Promise<FloorPlanResult>;
  exportFloorPlanPDF(options: FloorPlanExportOptions): Promise<FloorPlanPDFResult>;
  exportFloorPlanPNG(options: FloorPlanPNGExportOptions): Promise<FloorPlanPNGResult>;
  saveFloorPlanToPhotos(options: { scanId: string }): Promise<SaveToPhotosResult>;
  refreshScanMetadata(options: { scanId: string }): Promise<RefreshMetadataResult>;
}

export interface SaveToPhotosResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface RefreshMetadataResult {
  success: boolean;
  objectCount?: number;
  message?: string;
  error?: string;
}

export interface TexturedModelResult {
  success: boolean;
  texturedModelPath?: string;
  photoCount?: number;
  error?: string;
}

// Floor Plan interfaces
export interface FloorPlanOptions {
  scanId: string;
  showMeasurements?: boolean;
  showGrid?: boolean;
  showObjects?: boolean;
}

export interface FloorPlanExportOptions {
  scanId: string;
  showMeasurements?: boolean;
}

export interface FloorPlanPNGExportOptions extends FloorPlanExportOptions {
  width?: number;
  height?: number;
}

export interface FloorPlanRoom {
  index: number;
  label: string;
  area: number;
  centerX: number;
  centerY: number;
}

export interface FloorPlanResult {
  success: boolean;
  imagePath?: string;
  imageBase64?: string;
  totalArea?: number;
  wallCount?: number;
  doorCount?: number;
  windowCount?: number;
  objectCount?: number;
  ceilingHeight?: number;
  roomName?: string;
  rooms?: FloorPlanRoom[];
  error?: string;
}

export interface FloorPlanPDFResult {
  success: boolean;
  pdfPath?: string;
  fileName?: string;
  error?: string;
}

export interface FloorPlanPNGResult {
  success: boolean;
  pngPath?: string;
  fileName?: string;
  imageBase64?: string;
  error?: string;
}

export interface SavedScan {
  id: string;
  fileName: string;
  modelPath: string;
  createdAt: string;
  fileSize: number;
  metadata: RoomScanResult & {
    photoCount?: number;
    hasPoses?: boolean;
    texturedModelPath?: string;
  };
}

export interface LiDARSupportResult {
  hasLiDAR: boolean;
  hasRoomPlan: boolean;
  iosVersion: string;
  deviceModel: string;
  error?: string;
}

export interface WallData {
  width: number;
  height: number;
  depth: number;
  area: number;
  category: 'wall';
}

export interface FloorData {
  width: number;
  length: number;
  area: number;
  category: 'floor';
}

export interface DoorData {
  width: number;
  height: number;
  category: 'door';
}

export interface WindowData {
  width: number;
  height: number;
  category: 'window';
}

export interface OpeningData {
  width: number;
  height: number;
  category: 'opening';
}

export interface RoomSummary {
  wallCount: number;
  floorCount: number;
  doorCount: number;
  windowCount: number;
  openingCount: number;
  objectCount: number;
  totalWallAreaSqFt: number;
  totalFloorAreaSqFt: number;
  totalWallAreaSqM: number;
  totalFloorAreaSqM: number;
}

export interface RoomScanResult {
  success: boolean;
  walls: WallData[];
  floors: FloorData[];
  doors: DoorData[];
  windows: WindowData[];
  openings: OpeningData[];
  summary: RoomSummary;
  timestamp: string;
  scanId?: string;
  modelPath?: string;
}

export interface QuickMeasureResult {
  status: string;
  supported: boolean;
}

// Register the plugin
const LiDARScanner = registerPlugin<LiDARScannerPlugin>('LiDARScanner', {
  web: () => import('./lidarScannerWeb').then(m => new m.LiDARScannerWeb()),
});

export default LiDARScanner;

// Helper function to check if running on a supported device
export async function isLiDARSupported(): Promise<boolean> {
  try {
    const result = await LiDARScanner.checkLiDARSupport();
    return result.hasLiDAR && result.hasRoomPlan;
  } catch (error) {
    console.error('Error checking LiDAR support:', error);
    return false;
  }
}

// Helper function to create textured model from scan
export async function createTexturedModelFromScan(
  scanId: string,
  onProgress?: (status: string) => void
): Promise<TexturedModelResult> {
  try {
    onProgress?.('Processing textures...');

    // Try the custom texture mapper first (works on iOS 16+)
    const result = await LiDARScanner.processTexturedModel({ scanId });

    if (result.success) {
      onProgress?.('Textured model created!');
      return result;
    }

    // Fallback to Apple's photogrammetry (iOS 17+ only)
    onProgress?.('Trying alternative method...');
    const fallbackResult = await LiDARScanner.createTexturedModel({ scanId });
    return fallbackResult;
  } catch (error: any) {
    console.error('Error creating textured model:', error);
    return {
      success: false,
      error: error.message || 'Failed to create textured model'
    };
  }
}

// Helper function to convert scan results to estimate-friendly format
export function scanToEstimateData(scan: RoomScanResult): EstimateFromScan {
  let floorArea = scan.summary.totalFloorAreaSqFt;
  const wallArea = scan.summary.totalWallAreaSqFt;

  // If floor area is 0 or very small, estimate from wall area
  // Wall Area = Perimeter * Height
  // For typical 8.5ft ceiling: Perimeter = WallArea / 8.5
  // For roughly square room: Side = Perimeter / 4, FloorArea = Side^2
  if (floorArea < 10 && wallArea > 50) {
    const avgCeilingHeight = 8.5; // feet - typical ceiling height
    const estimatedPerimeter = wallArea / avgCeilingHeight;
    const estimatedSide = estimatedPerimeter / 4;
    floorArea = estimatedSide * estimatedSide;
    console.log(`Floor area estimated from wall area: ${floorArea.toFixed(0)} sq ft (wall area: ${wallArea} sq ft)`);
  }

  return {
    floorAreaSqFt: Math.round(floorArea * 100) / 100,
    wallAreaSqFt: Math.round(wallArea * 100) / 100,
    doorCount: scan.summary.doorCount,
    windowCount: scan.summary.windowCount,
    roomCount: scan.floors.length || 1,

    // Suggested materials based on scan
    suggestedMaterials: {
      flooring: {
        sqFt: Math.ceil(floorArea * 1.1), // 10% waste factor
        description: `Flooring for ${Math.round(floorArea)} sq ft room`
      },
      paint: {
        sqFt: Math.ceil(wallArea),
        gallons: Math.ceil(wallArea / 350), // ~350 sq ft per gallon
        description: `Paint for ${Math.round(wallArea)} sq ft of walls`
      },
      baseboards: {
        linearFt: Math.ceil(Math.sqrt(floorArea) * 4 * 1.1), // Perimeter estimate + 10%
        description: 'Baseboard trim'
      },
      drywall: {
        sheets: Math.ceil(wallArea / 32), // 4x8 sheets = 32 sq ft
        description: `Drywall for ${Math.round(wallArea)} sq ft of walls`
      }
    },

    rawScanData: scan
  };
}

export interface EstimateFromScan {
  floorAreaSqFt: number;
  wallAreaSqFt: number;
  doorCount: number;
  windowCount: number;
  roomCount: number;
  suggestedMaterials: {
    flooring: {
      sqFt: number;
      description: string;
    };
    paint: {
      sqFt: number;
      gallons: number;
      description: string;
    };
    baseboards: {
      linearFt: number;
      description: string;
    };
    drywall: {
      sheets: number;
      description: string;
    };
  };
  rawScanData: RoomScanResult;
}

// Floor Plan helper functions

// Generate floor plan from a saved scan
export async function generateFloorPlanFromScan(
  scanId: string,
  options?: { showMeasurements?: boolean; showGrid?: boolean; showObjects?: boolean }
): Promise<FloorPlanResult> {
  try {
    const result = await LiDARScanner.generateFloorPlan({
      scanId,
      showMeasurements: options?.showMeasurements ?? true,
      showGrid: options?.showGrid ?? true,
      showObjects: options?.showObjects ?? false
    });
    return result;
  } catch (error: any) {
    console.error('Error generating floor plan:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate floor plan'
    };
  }
}

// Export floor plan as PDF
export async function exportFloorPlanAsPDF(
  scanId: string,
  showMeasurements: boolean = true
): Promise<FloorPlanPDFResult> {
  try {
    const result = await LiDARScanner.exportFloorPlanPDF({
      scanId,
      showMeasurements
    });
    return result;
  } catch (error: any) {
    console.error('Error exporting floor plan PDF:', error);
    return {
      success: false,
      error: error.message || 'Failed to export floor plan as PDF'
    };
  }
}

// Export floor plan as PNG image
export async function exportFloorPlanAsPNG(
  scanId: string,
  options?: { showMeasurements?: boolean; width?: number; height?: number }
): Promise<FloorPlanPNGResult> {
  try {
    const result = await LiDARScanner.exportFloorPlanPNG({
      scanId,
      showMeasurements: options?.showMeasurements ?? true,
      width: options?.width,
      height: options?.height
    });
    return result;
  } catch (error: any) {
    console.error('Error exporting floor plan PNG:', error);
    return {
      success: false,
      error: error.message || 'Failed to export floor plan as PNG'
    };
  }
}

// Save floor plan to Photos library
export async function saveFloorPlanToPhotos(scanId: string): Promise<SaveToPhotosResult> {
  try {
    const result = await LiDARScanner.saveFloorPlanToPhotos({ scanId });
    return result;
  } catch (error: any) {
    console.error('Error saving floor plan to Photos:', error);
    return {
      success: false,
      error: error.message || 'Failed to save floor plan to Photos'
    };
  }
}

// Refresh scan metadata - re-extract objects from USDZ model (iOS 17+ only)
export async function refreshScanMetadata(scanId: string): Promise<RefreshMetadataResult> {
  try {
    const result = await LiDARScanner.refreshScanMetadata({ scanId });
    return result;
  } catch (error: any) {
    console.error('Error refreshing scan metadata:', error);
    return {
      success: false,
      error: error.message || 'Failed to refresh scan metadata'
    };
  }
}
