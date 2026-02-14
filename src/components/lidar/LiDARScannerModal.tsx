import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Scan,
  AlertCircle,
  Loader2,
  CheckCircle,
  Box,
  Ruler,
  DoorOpen,
  Square,
  Sparkles,
  FileText,
  ChevronRight,
  Eye,
  Trash2,
  Clock,
  FolderOpen,
  Map as MapIcon,
  Download,
  Share2,
  Image,
  RefreshCw,
  Sofa,
  Cloud,
  Smartphone,
  Calculator,
  Home,
  ArrowUpDown,
  Pencil,
  Wand2
} from 'lucide-react';
import FloorPlanCustomizer from './FloorPlanCustomizer';
import { FloorPlanEditorModal } from '../floor-plan-editor';
import { useNavigate } from 'react-router-dom';
import LiDARScanner, {
  isLiDARSupported,
  scanToEstimateData,
  createTexturedModelFromScan,
  generateFloorPlanFromScan,
  exportFloorPlanAsPDF,
  exportFloorPlanAsPNG,
  saveFloorPlanToPhotos,
  refreshScanMetadata,
  RoomScanResult,
  EstimateFromScan,
  SavedScan,
  FloorPlanResult,
  FloorPlanRoom
} from '../../services/lidarScannerService';
import { useAuthStore } from '../../stores/authStore';
import {
  saveScanToCloud,
  getCloudScans,
  deleteCloudScan,
  saveFloorPlanToCloud,
  CloudScan
} from '../../services/scanService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

// Unified scan type for combined list
interface UnifiedScan {
  id: string;
  date: Date;
  storageType: 'local' | 'cloud' | 'both';
  localScan?: SavedScan;
  cloudScan?: CloudScan;
  summary?: {
    totalFloorAreaSqFt: number;
    totalWallAreaSqFt: number;
    wallCount: number;
    doorCount: number;
    windowCount: number;
    objectCount?: number;
  };
  hasFloorPlan: boolean;
  fileSize?: number;
}

interface LiDARScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  onScanComplete?: (scanData: EstimateFromScan) => void;
}

// Beta testing password
const BETA_PASSWORD = '$EasyMoney10';

const LiDARScannerModal: React.FC<LiDARScannerModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onScanComplete
}) => {
  const navigate = useNavigate();
  const { session } = useAuthStore();

  // Beta access state
  const [isBetaUnlocked, setIsBetaUnlocked] = useState(() => {
    // Check if already unlocked in this session
    return sessionStorage.getItem('planCreationBetaUnlocked') === 'true';
  });
  const [betaPassword, setBetaPassword] = useState('');
  const [betaError, setBetaError] = useState('');

  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<RoomScanResult | null>(null);
  const [estimateData, setEstimateData] = useState<EstimateFromScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingEstimate, setIsGeneratingEstimate] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<any>(null);
  const [showRenovationOptions, setShowRenovationOptions] = useState(false);
  const [selectedRenovations, setSelectedRenovations] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [savedScans, setSavedScans] = useState<SavedScan[]>([]);
  const [cloudScans, setCloudScans] = useState<CloudScan[]>([]);
  const [showSavedScans, setShowSavedScans] = useState(false);
  const [loadingSavedScans, setLoadingSavedScans] = useState(false);
  const [savingToCloud, setSavingToCloud] = useState(false);
  const [processingTextures, setProcessingTextures] = useState(false);
  const [textureStatus, setTextureStatus] = useState<string | null>(null);
  const [texturedModelPath, setTexturedModelPath] = useState<string | null>(null);

  // Floor plan state
  const [floorPlanData, setFloorPlanData] = useState<FloorPlanResult | null>(null);
  const [generatingFloorPlan, setGeneratingFloorPlan] = useState(false);
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [showObjects, setShowObjects] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingPNG, setExportingPNG] = useState(false);
  const [savingToPhotos, setSavingToPhotos] = useState(false);
  const [currentCloudScanId, setCurrentCloudScanId] = useState<string | null>(null);
  const [floorPlanSavedToCloud, setFloorPlanSavedToCloud] = useState(false);
  const [refreshingMetadata, setRefreshingMetadata] = useState(false);
  const [showMaterialCalculator, setShowMaterialCalculator] = useState(false);
  const [showRoomBreakdown, setShowRoomBreakdown] = useState(false);
  const [showFloorPlanCustomizer, setShowFloorPlanCustomizer] = useState(false);
  const [showFloorPlanEditor, setShowFloorPlanEditor] = useState(false);
  const [editorScanId, setEditorScanId] = useState<string | null>(null);

  // Selected saved scan for viewing details
  const [selectedSavedScan, setSelectedSavedScan] = useState<SavedScan | null>(null);
  const [selectedCloudScan, setSelectedCloudScan] = useState<CloudScan | null>(null);

  // Combine and dedupe scans
  const unifiedScans = useMemo((): UnifiedScan[] => {
    const scanMap = new Map<string, UnifiedScan>();

    // Add local scans
    savedScans.forEach(scan => {
      const scanId = scan.id;
      scanMap.set(scanId, {
        id: scanId,
        date: new Date(scan.createdAt),
        storageType: 'local',
        localScan: scan,
        summary: scan.metadata?.summary ? {
          totalFloorAreaSqFt: scan.metadata.summary.totalFloorAreaSqFt || 0,
          totalWallAreaSqFt: scan.metadata.summary.totalWallAreaSqFt || 0,
          wallCount: scan.metadata.summary.wallCount || 0,
          doorCount: scan.metadata.summary.doorCount || 0,
          windowCount: scan.metadata.summary.windowCount || 0,
          objectCount: scan.metadata.summary.objectCount || 0,
        } : undefined,
        hasFloorPlan: false,
        fileSize: scan.fileSize,
      });
    });

    // Add cloud scans, merging with local if same scanId
    cloudScans.forEach(scan => {
      const scanId = scan.scan_data?.scanId;
      if (scanId && scanMap.has(scanId)) {
        // Merge - scan exists locally
        const existing = scanMap.get(scanId)!;
        existing.storageType = 'both';
        existing.cloudScan = scan;
        existing.hasFloorPlan = !!scan.floor_plan_url;
      } else {
        // Cloud-only scan
        const id = scanId || scan.id;
        scanMap.set(id, {
          id,
          date: new Date(scan.created_at),
          storageType: 'cloud',
          cloudScan: scan,
          summary: scan.scan_data?.summary ? {
            totalFloorAreaSqFt: scan.scan_data.summary.totalFloorAreaSqFt || 0,
            totalWallAreaSqFt: scan.scan_data.summary.totalWallAreaSqFt || 0,
            wallCount: scan.scan_data.summary.wallCount || 0,
            doorCount: scan.scan_data.summary.doorCount || 0,
            windowCount: scan.scan_data.summary.windowCount || 0,
            objectCount: scan.scan_data.summary.objectCount || 0,
          } : undefined,
          hasFloorPlan: !!scan.floor_plan_url,
        });
      }
    });

    // Sort by date, newest first
    return Array.from(scanMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [savedScans, cloudScans]);

  // Open unified scan
  const openUnifiedScan = (scan: UnifiedScan) => {
    if (scan.localScan) {
      setSelectedSavedScan(scan.localScan);
      setSelectedCloudScan(scan.cloudScan || null);
    } else if (scan.cloudScan) {
      setSelectedCloudScan(scan.cloudScan);
      setSelectedSavedScan(null);
    }
    setShowSavedScans(false);
    setCurrentCloudScanId(scan.cloudScan?.id || null);
    setFloorPlanData(null);
    setShowFloorPlan(false);
    setFloorPlanSavedToCloud(!!scan.cloudScan?.floor_plan_url);
  };

  useEffect(() => {
    if (isOpen) {
      checkSupport();
    }
  }, [isOpen]);

  const checkSupport = async () => {
    try {
      // First check if we're on a native iOS platform
      const isNative = window.hasOwnProperty('Capacitor') &&
                       (window as any).Capacitor?.isNativePlatform?.() === true;

      if (!isNative) {
        setIsSupported(false);
        setError('LiDAR scanning is only available on iOS devices. Please use the ContractorAI iOS app on an iPhone 12 Pro or newer, or iPad Pro with LiDAR sensor.');
        return;
      }

      const supported = await isLiDARSupported();
      setIsSupported(supported);

      if (!supported) {
        try {
          const result = await LiDARScanner.checkLiDARSupport();
          if (result.error) {
            setError(result.error);
          } else if (!result.hasLiDAR) {
            setError(`LiDAR sensor not detected on your ${result.deviceModel}. This feature requires iPhone 12 Pro or newer, or iPad Pro (2020+) with LiDAR sensor.`);
          } else if (!result.hasRoomPlan) {
            setError(`RoomPlan is not available on iOS ${result.iosVersion}. Please update to iOS 16 or later.`);
          } else {
            setError('LiDAR scanning requires an iPhone 12 Pro or newer, or iPad Pro with LiDAR sensor.');
          }
        } catch (innerErr) {
          setError('LiDAR scanning requires an iPhone 12 Pro or newer, or iPad Pro with LiDAR sensor running iOS 16+.');
        }
      }
    } catch (err: any) {
      setIsSupported(false);
      // Provide more helpful error message
      const errorMessage = err?.message || '';
      if (errorMessage.includes('not implemented') || errorMessage.includes('not available')) {
        setError('LiDAR scanning is only available on iOS devices with LiDAR sensors. Please use the ContractorAI iOS app.');
      } else {
        setError('LiDAR scanning requires an iPhone 12 Pro or newer, or iPad Pro with LiDAR sensor running iOS 16+.');
      }
    }
  };

  const startScan = async () => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const result = await LiDARScanner.startRoomScan();
      setScanResult(result);

      // Convert to estimate-friendly format
      const estimateReady = scanToEstimateData(result);
      setEstimateData(estimateReady);

      // Save to cloud in background
      setSavingToCloud(true);
      saveScanToCloud(result, undefined, projectId).then((cloudScan) => {
        if (cloudScan) {
          console.log('Scan saved to cloud:', cloudScan.id);
          setCurrentCloudScanId(cloudScan.id);
        }
        setSavingToCloud(false);
      }).catch(() => setSavingToCloud(false));

      if (onScanComplete) {
        onScanComplete(estimateReady);
      }
    } catch (err: any) {
      if (err.message !== 'Scan cancelled by user') {
        setError(err.message || 'Failed to complete scan');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const loadSavedScans = async () => {
    setLoadingSavedScans(true);
    try {
      // Load local scans
      const result = await LiDARScanner.getSavedScans();
      setSavedScans(result.scans || []);

      // Load cloud scans
      const cloud = await getCloudScans(projectId);
      setCloudScans(cloud);
    } catch (err) {
      console.error('Failed to load saved scans:', err);
    } finally {
      setLoadingSavedScans(false);
    }
  };

  const view3DModel = async (modelPath: string) => {
    try {
      await LiDARScanner.viewModel({ modelPath });
    } catch (err: any) {
      setError(err.message || 'Failed to open 3D model');
    }
  };

  const deleteScan = async (scanId: string) => {
    try {
      await LiDARScanner.deleteScan({ scanId });
      setSavedScans(prev => prev.filter(s => s.id !== scanId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete scan');
    }
  };

  const processTexturedModel = async (scanId: string) => {
    setProcessingTextures(true);
    setTextureStatus('Initializing...');
    setError(null);

    try {
      const result = await createTexturedModelFromScan(scanId, (status) => {
        setTextureStatus(status);
      });

      if (result.success && result.texturedModelPath) {
        setTexturedModelPath(result.texturedModelPath);
        setTextureStatus(`Created textured model with ${result.photoCount || 0} photos`);
      } else {
        setError(result.error || 'Failed to create textured model');
        setTextureStatus(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process textures');
      setTextureStatus(null);
    } finally {
      setProcessingTextures(false);
    }
  };

  // Generate floor plan from scan
  const generateFloorPlan = async (scanId: string, cloudScanIdOverride?: string, withObjects?: boolean) => {
    setGeneratingFloorPlan(true);
    setError(null);
    setFloorPlanSavedToCloud(false);

    try {
      const result = await generateFloorPlanFromScan(scanId, {
        showMeasurements: true,
        showGrid: true,
        showObjects: withObjects ?? showObjects
      });

      if (result.success) {
        setFloorPlanData(result);
        setShowFloorPlan(true);

        // Auto-save floor plan to cloud if we have a cloud scan ID
        const cloudId = cloudScanIdOverride || currentCloudScanId;
        if (cloudId && result.imageBase64) {
          console.log('Saving floor plan to cloud...');
          saveFloorPlanToCloud(cloudId, result.imageBase64, 'png')
            .then((url) => {
              if (url) {
                console.log('Floor plan saved to cloud:', url);
                setFloorPlanSavedToCloud(true);
              }
            })
            .catch((err) => {
              console.error('Failed to save floor plan to cloud:', err);
            });
        }
      } else {
        setError(result.error || 'Failed to generate floor plan');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate floor plan');
    } finally {
      setGeneratingFloorPlan(false);
    }
  };

  // Export floor plan as PDF
  const handleExportPDF = async (scanId: string) => {
    setExportingPDF(true);
    try {
      const result = await exportFloorPlanAsPDF(scanId);
      if (result.success && result.pdfPath) {
        // On iOS, we can use the share sheet
        if ((window as any).Capacitor?.Plugins?.Share) {
          await (window as any).Capacitor.Plugins.Share.share({
            title: 'Floor Plan',
            url: `file://${result.pdfPath}`,
          });
        } else {
          alert(`PDF saved to: ${result.fileName}`);
        }
      } else {
        setError(result.error || 'Failed to export PDF');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  // Open saved scan details view
  const openSavedScanDetails = (scan: SavedScan) => {
    setSelectedSavedScan(scan);
    setSelectedCloudScan(null);
    setShowSavedScans(false);
    setFloorPlanData(null);
    setShowFloorPlan(false);
    setFloorPlanSavedToCloud(false);
  };

  // Open cloud scan details view
  const openCloudScanDetails = (scan: CloudScan) => {
    setSelectedCloudScan(scan);
    setSelectedSavedScan(null);
    setShowSavedScans(false);
    setCurrentCloudScanId(scan.id);
    setFloorPlanData(null);
    setShowFloorPlan(false);
    setFloorPlanSavedToCloud(scan.floor_plan_url ? true : false);
  };

  // Close saved scan details view
  const closeScanDetails = () => {
    setSelectedSavedScan(null);
    setSelectedCloudScan(null);
    setShowSavedScans(true);
    setFloorPlanData(null);
    setShowFloorPlan(false);
  };

  // Export floor plan as PNG
  const handleExportPNG = async (scanId: string) => {
    setExportingPNG(true);
    try {
      const result = await exportFloorPlanAsPNG(scanId);
      if (result.success && result.pngPath) {
        // On iOS, we can use the share sheet
        if ((window as any).Capacitor?.Plugins?.Share) {
          await (window as any).Capacitor.Plugins.Share.share({
            title: 'Floor Plan',
            url: `file://${result.pngPath}`,
          });
        } else {
          alert(`PNG saved to: ${result.fileName}`);
        }
      } else {
        setError(result.error || 'Failed to export PNG');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to export PNG');
    } finally {
      setExportingPNG(false);
    }
  };

  // Save floor plan to Photos
  const handleSaveToPhotos = async (scanId: string) => {
    setSavingToPhotos(true);
    try {
      const result = await saveFloorPlanToPhotos(scanId);
      if (result.success) {
        alert('Floor plan saved to Photos!');
      } else {
        setError(result.error || 'Failed to save to Photos');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save to Photos');
    } finally {
      setSavingToPhotos(false);
    }
  };

  // Refresh scan metadata to re-extract objects from USDZ (iOS 17+)
  const handleRefreshMetadata = async (scanId: string) => {
    setRefreshingMetadata(true);
    try {
      const result = await refreshScanMetadata(scanId);
      if (result.success) {
        alert(`Scan updated! Found ${result.objectCount || 0} objects.`);
        // Reload saved scans to reflect updated metadata
        loadSavedScans();
        // Regenerate floor plan if showing
        if (showFloorPlan) {
          await generateFloorPlan(scanId, undefined, showObjects);
        }
      } else {
        alert(result.error || 'Failed to refresh metadata');
      }
    } catch (error: any) {
      alert(error.message || 'Error refreshing metadata');
    } finally {
      setRefreshingMetadata(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const renovationOptions = [
    { id: 'flooring', label: 'Flooring', icon: '🪵' },
    { id: 'painting', label: 'Painting', icon: '🎨' },
    { id: 'drywall', label: 'Drywall', icon: '🧱' },
    { id: 'trim', label: 'Trim & Baseboards', icon: '📐' },
    { id: 'electrical', label: 'Electrical', icon: '⚡' },
    { id: 'plumbing', label: 'Plumbing', icon: '🚿' },
    { id: 'hvac', label: 'HVAC', icon: '❄️' },
    { id: 'windows', label: 'Windows', icon: '🪟' },
    { id: 'doors', label: 'Doors', icon: '🚪' },
    { id: 'cabinets', label: 'Cabinets', icon: '🗄️' },
    { id: 'countertops', label: 'Countertops', icon: '🔲' },
    { id: 'full_remodel', label: 'Full Remodel', icon: '🏠' },
  ];

  const toggleRenovation = (id: string) => {
    setSelectedRenovations(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const generateAIEstimate = async () => {
    if (!estimateData || !session?.access_token) return;

    setIsGeneratingEstimate(true);
    setShowRenovationOptions(false);

    const selectedLabels = selectedRenovations.map(id =>
      renovationOptions.find(o => o.id === id)?.label
    ).filter(Boolean).join(', ');

    try {
      // Send scan data to AI to generate a detailed estimate
      const response = await fetch(`${supabaseUrl}/functions/v1/contractor-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `I just scanned a room with LiDAR. Here are the measurements:

Floor Area: ${estimateData.floorAreaSqFt} sq ft
Wall Area: ${estimateData.wallAreaSqFt} sq ft
Doors: ${estimateData.doorCount}
Windows: ${estimateData.windowCount}

Renovation work needed: ${selectedLabels || 'General renovation'}
${customNotes ? `Additional notes: ${customNotes}` : ''}

Please create a detailed estimate for this specific work. Include:
- Materials needed with quantities
- Labor costs
- Any other relevant items

Use standard contractor pricing and break down by category.`
          }],
          mode: 'estimating',
          currentEstimate: []
        })
      });

      if (!response.ok) throw new Error('Failed to generate estimate');

      const data = await response.json();
      setAiEstimate(data);

    } catch (err: any) {
      setError(err.message || 'Failed to generate AI estimate');
    } finally {
      setIsGeneratingEstimate(false);
    }
  };

  const createEstimateFromScan = () => {
    if (!estimateData) return;

    // Create estimate items from scan data
    const items = [
      {
        id: crypto.randomUUID(),
        description: `Flooring - ${estimateData.suggestedMaterials.flooring.sqFt} sq ft`,
        quantity: estimateData.suggestedMaterials.flooring.sqFt,
        unit: 'sq ft',
        unitPrice: 4.50, // Default price, AI can adjust
        totalPrice: estimateData.suggestedMaterials.flooring.sqFt * 4.50,
        category: 'material'
      },
      {
        id: crypto.randomUUID(),
        description: `Interior Paint - ${estimateData.suggestedMaterials.paint.gallons} gallons`,
        quantity: estimateData.suggestedMaterials.paint.gallons,
        unit: 'gallons',
        unitPrice: 45.00,
        totalPrice: estimateData.suggestedMaterials.paint.gallons * 45.00,
        category: 'material'
      },
      {
        id: crypto.randomUUID(),
        description: `Baseboard Trim - ${estimateData.suggestedMaterials.baseboards.linearFt} linear ft`,
        quantity: estimateData.suggestedMaterials.baseboards.linearFt,
        unit: 'linear ft',
        unitPrice: 3.50,
        totalPrice: estimateData.suggestedMaterials.baseboards.linearFt * 3.50,
        category: 'material'
      }
    ];

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const newEstimate = {
      id: crypto.randomUUID(),
      title: 'LiDAR Room Scan Estimate',
      items,
      subtotal,
      taxRate: 0,
      taxAmount: 0,
      total: subtotal,
      notes: `Generated from LiDAR scan on ${new Date().toLocaleDateString()}\nFloor Area: ${estimateData.floorAreaSqFt} sq ft\nWall Area: ${estimateData.wallAreaSqFt} sq ft`,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onClose();
    navigate('/estimates', { state: { fromCalculator: true, calculatorData: newEstimate } });
  };

  if (!isOpen) return null;

  // Handle beta password submission
  const handleBetaUnlock = () => {
    if (betaPassword === BETA_PASSWORD) {
      setIsBetaUnlocked(true);
      sessionStorage.setItem('planCreationBetaUnlocked', 'true');
      setBetaError('');
    } else {
      setBetaError('Incorrect password. Please try again.');
    }
  };

  // Beta password screen
  if (!isBetaUnlocked) {
    return (
      <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="w-full max-w-md mx-4 bg-[#1A1A1A] rounded-2xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Beta Access</h2>
                <p className="text-sm text-zinc-400">Plan Creation Feature</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Beta info */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-200 font-medium text-sm">Beta Testing Only</p>
                <p className="text-amber-200/70 text-xs mt-1">
                  This feature is currently in beta testing. Enter the beta password to access the 3D room scanning and floor plan creation tools.
                </p>
              </div>
            </div>
          </div>

          {/* Password input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Beta Password
            </label>
            <input
              type="password"
              value={betaPassword}
              onChange={(e) => {
                setBetaPassword(e.target.value);
                setBetaError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleBetaUnlock();
              }}
              placeholder="Enter beta password..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            {betaError && (
              <p className="text-red-400 text-sm mt-2">{betaError}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            onClick={handleBetaUnlock}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-blue-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-blue-600 transition-colors"
          >
            Unlock Beta Access
          </button>

          <p className="text-center text-zinc-500 text-xs mt-4">
            Contact support if you need access to beta features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="w-full h-full max-w-2xl mx-auto flex flex-col bg-[#1A1A1A]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Scan className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Plan Creation</h2>
              <p className="text-xs text-zinc-400">Scan rooms or draw floor plans</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Checking support */}
          {isSupported === null && (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-zinc-400">Checking device capabilities...</p>
            </div>
          )}

          {/* Not supported */}
          {isSupported === false && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-20 h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">LiDAR Not Available</h3>
              <p className="text-zinc-400 mb-6">{error}</p>
              <p className="text-sm text-zinc-500">
                Supported devices: iPhone 12 Pro, iPhone 13 Pro, iPhone 14 Pro, iPhone 15 Pro, iPad Pro (2020+)
              </p>
            </div>
          )}

          {/* Ready to scan */}
          {isSupported && !scanResult && !isScanning && !showSavedScans && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl flex items-center justify-center mb-6">
                <Box className="w-12 h-12 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Ready to Scan</h3>
              <p className="text-zinc-400 mb-6 max-w-sm">
                Point your camera at the room and slowly pan around. The scanner will automatically detect walls, floors, doors, and windows.
              </p>

              <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-8">
                <div className="flex items-center gap-2 p-3 bg-[#2C2C2E] rounded-lg">
                  <Square className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-zinc-300">Walls</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-[#2C2C2E] rounded-lg">
                  <Ruler className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-zinc-300">Floors</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-[#2C2C2E] rounded-lg">
                  <DoorOpen className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-zinc-300">Doors</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-[#2C2C2E] rounded-lg">
                  <Square className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-zinc-300">Windows</span>
                </div>
              </div>

              <button
                onClick={startScan}
                className="w-full max-w-sm flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-4 px-6 rounded-xl active:scale-[0.98] transition-transform"
              >
                <Scan className="w-6 h-6" />
                Start Scanning
              </button>

              <button
                onClick={() => {
                  setShowSavedScans(true);
                  loadSavedScans();
                }}
                className="w-full max-w-sm flex items-center justify-center gap-2 bg-[#2C2C2E] text-zinc-300 font-semibold py-3 px-6 rounded-xl border border-white/10 hover:border-white/30 active:scale-[0.98] transition-all mt-3"
              >
                <FolderOpen className="w-5 h-5" />
                View Saved Scans
              </button>

              <button
                onClick={() => {
                  setEditorScanId(null);
                  setShowFloorPlanEditor(true);
                }}
                className="w-full max-w-sm flex items-center justify-center gap-2 bg-[#2C2C2E] text-emerald-400 font-semibold py-3 px-6 rounded-xl border border-emerald-500/30 hover:border-emerald-500/60 active:scale-[0.98] transition-all mt-3"
              >
                <Pencil className="w-5 h-5" />
                Draw New Plan
              </button>
            </div>
          )}

          {/* Saved Scans List - Unified */}
          {showSavedScans && !scanResult && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Saved Scans</h3>
                <button
                  onClick={() => setShowSavedScans(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingSavedScans ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : unifiedScans.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <FolderOpen className="w-16 h-16 text-zinc-600 mb-4" />
                  <p className="text-zinc-400">No saved scans yet</p>
                  <p className="text-sm text-zinc-500 mt-1">Complete a scan to save it here</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3">
                  {unifiedScans.map((scan) => (
                    <button
                      key={scan.id}
                      onClick={() => openUnifiedScan(scan)}
                      className={`w-full p-4 bg-[#2C2C2E] rounded-xl text-left active:scale-[0.98] transition-transform ${
                        scan.storageType === 'both' || scan.storageType === 'cloud' ? 'border border-cyan-500/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 text-zinc-400 text-xs flex-wrap">
                          <Clock className="w-3 h-3" />
                          {formatDate(scan.date.toISOString())}

                          {/* Storage indicators */}
                          {scan.storageType === 'both' && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 rounded text-[10px]">
                              <Cloud className="w-2.5 h-2.5" />
                              <Smartphone className="w-2.5 h-2.5" />
                              SYNCED
                            </span>
                          )}
                          {scan.storageType === 'cloud' && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px]">
                              <Cloud className="w-2.5 h-2.5" />
                              CLOUD
                            </span>
                          )}
                          {scan.storageType === 'local' && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-500/20 text-zinc-400 rounded text-[10px]">
                              <Smartphone className="w-2.5 h-2.5" />
                              LOCAL
                            </span>
                          )}

                          {/* Floor plan indicator */}
                          {scan.hasFloorPlan && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px]">
                              FLOOR PLAN
                            </span>
                          )}

                          {/* File size for local */}
                          {scan.fileSize && (
                            <span className="text-zinc-500">{formatFileSize(scan.fileSize)}</span>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      </div>

                      {scan.summary && (
                        <div className="grid grid-cols-5 gap-2 text-center">
                          <div>
                            <p className="text-lg font-bold text-white">
                              {Math.round(scan.summary.totalFloorAreaSqFt || 0)}
                            </p>
                            <p className="text-xs text-zinc-500">sq ft</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white">{scan.summary.wallCount || 0}</p>
                            <p className="text-xs text-zinc-500">walls</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white">{scan.summary.doorCount || 0}</p>
                            <p className="text-xs text-zinc-500">doors</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white">{scan.summary.windowCount || 0}</p>
                            <p className="text-xs text-zinc-500">windows</p>
                          </div>
                          <div>
                            <p className={`text-lg font-bold ${(scan.summary.objectCount || 0) > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                              {scan.summary.objectCount || 0}
                            </p>
                            <p className="text-xs text-zinc-500">objects</p>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowSavedScans(false)}
                className="w-full mt-4 py-3 bg-[#2C2C2E] text-white font-semibold rounded-xl"
              >
                Back to Scanner
              </button>
            </div>
          )}

          {/* Saved Scan Details View - Local Scan (may also have cloud) */}
          {selectedSavedScan && !selectedCloudScan && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 bg-[#2C2C2E] rounded-xl">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <Box className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white">Room Scan</h3>
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-500/20 text-zinc-400 rounded text-[10px]">
                      <Smartphone className="w-2.5 h-2.5" />
                      LOCAL
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">{formatDate(selectedSavedScan.createdAt)}</p>
                </div>
              </div>

              {/* Measurements */}
              {selectedSavedScan.metadata?.summary && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-[#2C2C2E] rounded-xl">
                      <p className="text-xs text-zinc-500 mb-1">Floor Area</p>
                      <p className="text-2xl font-bold text-white">
                        {Math.round(selectedSavedScan.metadata.summary.totalFloorAreaSqFt || 0)}
                      </p>
                      <p className="text-xs text-zinc-400">sq ft</p>
                    </div>
                    <div className="p-4 bg-[#2C2C2E] rounded-xl">
                      <p className="text-xs text-zinc-500 mb-1">Wall Area</p>
                      <p className="text-2xl font-bold text-white">
                        {Math.round(selectedSavedScan.metadata.summary.totalWallAreaSqFt || 0)}
                      </p>
                      <p className="text-xs text-zinc-400">sq ft</p>
                    </div>
                    <div className="p-4 bg-[#2C2C2E] rounded-xl">
                      <p className="text-xs text-zinc-500 mb-1">Doors</p>
                      <p className="text-2xl font-bold text-white">
                        {selectedSavedScan.metadata.summary.doorCount || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-[#2C2C2E] rounded-xl">
                      <p className="text-xs text-zinc-500 mb-1">Windows</p>
                      <p className="text-2xl font-bold text-white">
                        {selectedSavedScan.metadata.summary.windowCount || 0}
                      </p>
                    </div>
                  </div>

                  {/* Furniture/Objects detected */}
                  <div className="p-4 bg-[#2C2C2E] rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Sofa className="w-4 h-4 text-amber-400" />
                      <p className="text-xs text-zinc-500">Furniture Detected</p>
                    </div>
                    <p className={`text-2xl font-bold ${(selectedSavedScan.metadata.summary.objectCount || 0) > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                      {selectedSavedScan.metadata.summary.objectCount || 0}
                    </p>
                    {(selectedSavedScan.metadata.summary.objectCount || 0) === 0 && (
                      <p className="text-xs text-zinc-500 mt-2">
                        No furniture detected. RoomPlan works best with large items like beds, sofas, tables, and appliances in well-lit rooms.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => view3DModel(selectedSavedScan.metadata?.texturedModelPath || selectedSavedScan.modelPath)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform"
                >
                  <Eye className="w-5 h-5" />
                  View 3D Model in AR
                </button>

                {selectedSavedScan.metadata?.hasPoses && !selectedSavedScan.metadata?.texturedModelPath && (
                  <button
                    onClick={() => processTexturedModel(selectedSavedScan.id)}
                    disabled={processingTextures}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    {processingTextures ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {textureStatus || 'Processing...'}
                      </>
                    ) : (
                      <>
                        <Box className="w-5 h-5" />
                        Create Realistic 3D Model
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => generateFloorPlan(selectedSavedScan.id)}
                  disabled={generatingFloorPlan}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {generatingFloorPlan ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Floor Plan...
                    </>
                  ) : (
                    <>
                      <MapIcon className="w-5 h-5" />
                      Generate 2D Floor Plan
                    </>
                  )}
                </button>
              </div>

              {/* Floor Plan Viewer */}
              {showFloorPlan && floorPlanData && (
                <div className="p-4 bg-[#2C2C2E] rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapIcon className="w-5 h-5 text-emerald-500" />
                      <h4 className="font-semibold text-white">2D Floor Plan</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowObjects(!showObjects);
                          generateFloorPlan(selectedSavedScan.id, undefined, !showObjects);
                        }}
                        disabled={generatingFloorPlan}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                          showObjects
                            ? 'text-amber-400 bg-amber-500/20'
                            : 'text-zinc-400 hover:bg-zinc-500/20'
                        }`}
                        title={showObjects ? "Hide Furniture" : "Show Furniture"}
                      >
                        <Sofa className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => generateFloorPlan(selectedSavedScan.id)}
                        disabled={generatingFloorPlan}
                        className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Regenerate Floor Plan"
                      >
                        {generatingFloorPlan ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => setShowFloorPlan(false)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {floorPlanData.imageBase64 && (
                    <div className="relative rounded-lg overflow-hidden bg-white">
                      <img
                        src={floorPlanData.imageBase64}
                        alt="Floor Plan"
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-white">{Math.round(floorPlanData.totalArea || 0)}</p>
                      <p className="text-xs text-zinc-500">sq ft</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-cyan-400">{(floorPlanData.ceilingHeight || 8).toFixed(1)}'</p>
                      <p className="text-xs text-zinc-500">ceiling</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-white">{floorPlanData.wallCount || 0}</p>
                      <p className="text-xs text-zinc-500">walls</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-white">{floorPlanData.doorCount || 0}</p>
                      <p className="text-xs text-zinc-500">doors</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-white">{floorPlanData.windowCount || 0}</p>
                      <p className="text-xs text-zinc-500">windows</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className={`text-lg font-bold ${(floorPlanData.objectCount || 0) > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                        {floorPlanData.objectCount || 0}
                      </p>
                      <p className="text-xs text-zinc-500">objects</p>
                    </div>
                  </div>

                  {/* Material Calculator Button */}
                  <button
                    onClick={() => setShowMaterialCalculator(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-blue-500/20 to-amber-500/20 text-blue-400 font-medium rounded-lg"
                  >
                    <Calculator className="w-4 h-4" />
                    Material Calculator
                  </button>

                  {/* AI Customize Button */}
                  <button
                    onClick={() => setShowFloorPlanCustomizer(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-400 font-medium rounded-lg"
                  >
                    <Wand2 className="w-4 h-4" />
                    AI Customize Floor Plan
                  </button>

                  {/* Material Calculator Panel */}
                  {showMaterialCalculator && floorPlanData && (
                    <div className="p-4 bg-[#1A1A1A] rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-white flex items-center gap-2">
                          <Calculator className="w-4 h-4 text-blue-400" />
                          Material Estimates
                        </h5>
                        <button
                          onClick={() => setShowMaterialCalculator(false)}
                          className="text-zinc-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-zinc-300">
                          <span>Flooring</span>
                          <span className="text-white font-medium">
                            {Math.ceil((floorPlanData.totalArea || 0) * 1.1)} sq ft
                            <span className="text-zinc-500 text-xs ml-1">(+10% waste)</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span>Wall Paint</span>
                          <span className="text-white font-medium">
                            {Math.ceil(((floorPlanData.wallCount || 4) * (floorPlanData.totalArea || 100) * 0.4 * (floorPlanData.ceilingHeight || 8)) / 350)} gal
                            <span className="text-zinc-500 text-xs ml-1">(~350 sq ft/gal)</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span>Baseboard Trim</span>
                          <span className="text-white font-medium">
                            {Math.ceil(Math.sqrt(floorPlanData.totalArea || 0) * 4 * 1.1)} linear ft
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span>Crown Molding</span>
                          <span className="text-white font-medium">
                            {Math.ceil(Math.sqrt(floorPlanData.totalArea || 0) * 4 * 1.1)} linear ft
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span>Drywall Sheets</span>
                          <span className="text-white font-medium">
                            {Math.ceil(((floorPlanData.wallCount || 4) * Math.sqrt(floorPlanData.totalArea || 0) * (floorPlanData.ceilingHeight || 8)) / 32)} sheets
                            <span className="text-zinc-500 text-xs ml-1">(4×8 ft)</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span>Ceiling Paint</span>
                          <span className="text-white font-medium">
                            {Math.ceil((floorPlanData.totalArea || 0) / 350)} gal
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/10">
                        <p className="text-xs text-zinc-500">
                          * Estimates based on {Math.round(floorPlanData.totalArea || 0)} sq ft floor area and {(floorPlanData.ceilingHeight || 8).toFixed(1)}' ceiling height
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Per-Room Breakdown */}
                  {floorPlanData.rooms && floorPlanData.rooms.length > 0 && (
                    <button
                      onClick={() => setShowRoomBreakdown(!showRoomBreakdown)}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-purple-500/20 text-purple-400 font-medium rounded-lg"
                    >
                      <Home className="w-4 h-4" />
                      Room Breakdown ({floorPlanData.rooms.length})
                    </button>
                  )}

                  {showRoomBreakdown && floorPlanData.rooms && (
                    <div className="p-4 bg-[#1A1A1A] rounded-lg space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-white flex items-center gap-2">
                          <Home className="w-4 h-4 text-purple-400" />
                          Per-Room Areas
                        </h5>
                        <button
                          onClick={() => setShowRoomBreakdown(false)}
                          className="text-zinc-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {floorPlanData.rooms.map((room, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-zinc-300">{room.label || `Room ${index + 1}`}</span>
                          <span className="text-white font-medium">{Math.round(room.area)} sq ft</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No objects message */}
                  {(floorPlanData.objectCount || 0) === 0 && showObjects && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-xs text-amber-400">
                        <strong>No furniture detected.</strong> This scan was created before furniture detection was added. Create a new scan to detect furniture like beds, sofas, tables, and appliances.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExportPDF(selectedSavedScan.id)}
                      disabled={exportingPDF}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/20 text-red-400 font-medium rounded-lg disabled:opacity-50"
                    >
                      {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      PDF
                    </button>
                    <button
                      onClick={() => handleExportPNG(selectedSavedScan.id)}
                      disabled={exportingPNG}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500/20 text-blue-400 font-medium rounded-lg disabled:opacity-50"
                    >
                      {exportingPNG ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      PNG
                    </button>
                  </div>
                  <button
                    onClick={() => handleSaveToPhotos(selectedSavedScan.id)}
                    disabled={savingToPhotos}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 font-medium rounded-lg disabled:opacity-50"
                  >
                    {savingToPhotos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                    Save to Photos
                  </button>
                </div>
              )}

              {/* Delete and Back buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (confirm('Delete this scan?')) {
                      deleteScan(selectedSavedScan.id);
                      closeScanDetails();
                    }
                  }}
                  className="px-4 py-3 bg-red-500/20 text-red-400 font-semibold rounded-xl"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={closeScanDetails}
                  className="flex-1 py-3 bg-[#2C2C2E] text-white font-semibold rounded-xl"
                >
                  Back to Saved Scans
                </button>
              </div>
            </div>
          )}

          {/* Saved Scan Details View - Cloud or Both */}
          {selectedCloudScan && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 bg-[#2C2C2E] rounded-xl border border-cyan-500/20">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Box className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white">Room Scan</h3>
                    {selectedSavedScan ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 rounded text-[10px]">
                        <Cloud className="w-2.5 h-2.5" />
                        <Smartphone className="w-2.5 h-2.5" />
                        SYNCED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px]">
                        <Cloud className="w-2.5 h-2.5" />
                        CLOUD
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">{formatDate(selectedCloudScan.created_at)}</p>
                </div>
              </div>

              {/* Measurements */}
              {selectedCloudScan.scan_data?.summary && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-[#2C2C2E] rounded-xl">
                    <p className="text-xs text-zinc-500 mb-1">Floor Area</p>
                    <p className="text-2xl font-bold text-white">
                      {Math.round(selectedCloudScan.scan_data.summary.totalFloorAreaSqFt || 0)}
                    </p>
                    <p className="text-xs text-zinc-400">sq ft</p>
                  </div>
                  <div className="p-4 bg-[#2C2C2E] rounded-xl">
                    <p className="text-xs text-zinc-500 mb-1">Wall Area</p>
                    <p className="text-2xl font-bold text-white">
                      {Math.round(selectedCloudScan.scan_data.summary.totalWallAreaSqFt || 0)}
                    </p>
                    <p className="text-xs text-zinc-400">sq ft</p>
                  </div>
                  <div className="p-4 bg-[#2C2C2E] rounded-xl">
                    <p className="text-xs text-zinc-500 mb-1">Doors</p>
                    <p className="text-2xl font-bold text-white">
                      {selectedCloudScan.scan_data.summary.doorCount || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-[#2C2C2E] rounded-xl">
                    <p className="text-xs text-zinc-500 mb-1">Windows</p>
                    <p className="text-2xl font-bold text-white">
                      {selectedCloudScan.scan_data.summary.windowCount || 0}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* View 3D Model - prefer local if available for AR, else cloud link */}
                {selectedSavedScan ? (
                  <button
                    onClick={() => view3DModel(selectedSavedScan.metadata?.texturedModelPath || selectedSavedScan.modelPath)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform"
                  >
                    <Eye className="w-5 h-5" />
                    View 3D Model in AR
                  </button>
                ) : selectedCloudScan.model_url && (
                  <a
                    href={selectedCloudScan.model_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform"
                  >
                    <Eye className="w-5 h-5" />
                    View 3D Model
                  </a>
                )}

                {/* Create Realistic 3D Model - only if we have local scan with poses */}
                {selectedSavedScan?.metadata?.hasPoses && !selectedSavedScan.metadata?.texturedModelPath && (
                  <button
                    onClick={() => processTexturedModel(selectedSavedScan.id)}
                    disabled={processingTextures}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    {processingTextures ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {textureStatus || 'Processing...'}
                      </>
                    ) : (
                      <>
                        <Box className="w-5 h-5" />
                        Create Realistic 3D Model
                      </>
                    )}
                  </button>
                )}

                {/* Show existing floor plan or generate new one */}
                {selectedCloudScan.floor_plan_url && !showFloorPlan ? (
                  <button
                    onClick={() => {
                      setFloorPlanData({
                        success: true,
                        imageBase64: selectedCloudScan.floor_plan_url,
                        totalArea: selectedCloudScan.scan_data?.summary?.totalFloorAreaSqFt,
                        wallCount: selectedCloudScan.scan_data?.summary?.wallCount,
                        doorCount: selectedCloudScan.scan_data?.summary?.doorCount,
                        windowCount: selectedCloudScan.scan_data?.summary?.windowCount,
                      });
                      setShowFloorPlan(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform"
                  >
                    <MapIcon className="w-5 h-5" />
                    View Floor Plan
                  </button>
                ) : selectedCloudScan.scan_data?.scanId ? (
                  <button
                    onClick={() => generateFloorPlan(selectedCloudScan.scan_data.scanId!, selectedCloudScan.id)}
                    disabled={generatingFloorPlan}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    {generatingFloorPlan ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating Floor Plan...
                      </>
                    ) : (
                      <>
                        <MapIcon className="w-5 h-5" />
                        Generate 2D Floor Plan
                      </>
                    )}
                  </button>
                ) : null}
              </div>

              {/* Floor Plan Viewer */}
              {showFloorPlan && floorPlanData && (
                <div className="p-4 bg-[#2C2C2E] rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapIcon className="w-5 h-5 text-emerald-500" />
                      <h4 className="font-semibold text-white">2D Floor Plan</h4>
                      {floorPlanSavedToCloud && (
                        <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px]">SYNCED</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedCloudScan.scan_data?.scanId && (
                        <>
                          <button
                            onClick={() => {
                              setShowObjects(!showObjects);
                              generateFloorPlan(selectedCloudScan.scan_data.scanId!, selectedCloudScan.id, !showObjects);
                            }}
                            disabled={generatingFloorPlan}
                            className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                              showObjects
                                ? 'text-amber-400 bg-amber-500/20'
                                : 'text-zinc-400 hover:bg-zinc-500/20'
                            }`}
                            title={showObjects ? "Hide Furniture" : "Show Furniture"}
                          >
                            <Sofa className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => generateFloorPlan(selectedCloudScan.scan_data.scanId!, selectedCloudScan.id)}
                            disabled={generatingFloorPlan}
                            className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Regenerate Floor Plan"
                          >
                            {generatingFloorPlan ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-5 h-5" />
                            )}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setShowFloorPlan(false)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {(floorPlanData.imageBase64 || selectedCloudScan.floor_plan_url) && (
                    <div className="relative rounded-lg overflow-hidden bg-white">
                      <img
                        src={floorPlanData.imageBase64?.startsWith('data:') ? floorPlanData.imageBase64 : (floorPlanData.imageBase64 || selectedCloudScan.floor_plan_url)}
                        alt="Floor Plan"
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-white">{Math.round(floorPlanData.totalArea || 0)}</p>
                      <p className="text-xs text-zinc-500">sq ft</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-cyan-400">{(floorPlanData.ceilingHeight || 8).toFixed(1)}'</p>
                      <p className="text-xs text-zinc-500">ceiling</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-white">{floorPlanData.wallCount || 0}</p>
                      <p className="text-xs text-zinc-500">walls</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-white">{floorPlanData.doorCount || 0}</p>
                      <p className="text-xs text-zinc-500">doors</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-white">{floorPlanData.windowCount || 0}</p>
                      <p className="text-xs text-zinc-500">windows</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className={`text-lg font-bold ${(floorPlanData.objectCount || 0) > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                        {floorPlanData.objectCount || 0}
                      </p>
                      <p className="text-xs text-zinc-500">objects</p>
                    </div>
                  </div>

                  {/* Material Calculator Button */}
                  <button
                    onClick={() => setShowMaterialCalculator(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-blue-500/20 to-amber-500/20 text-blue-400 font-medium rounded-lg"
                  >
                    <Calculator className="w-4 h-4" />
                    Material Calculator
                  </button>

                  {/* AI Customize Button */}
                  <button
                    onClick={() => setShowFloorPlanCustomizer(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-400 font-medium rounded-lg"
                  >
                    <Wand2 className="w-4 h-4" />
                    AI Customize Floor Plan
                  </button>

                  {/* Material Calculator Panel */}
                  {showMaterialCalculator && floorPlanData && (
                    <div className="p-4 bg-[#1A1A1A] rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-white flex items-center gap-2">
                          <Calculator className="w-4 h-4 text-blue-400" />
                          Material Estimates
                        </h5>
                        <button
                          onClick={() => setShowMaterialCalculator(false)}
                          className="text-zinc-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-zinc-300">
                          <span>Flooring</span>
                          <span className="text-white font-medium">
                            {Math.ceil((floorPlanData.totalArea || 0) * 1.1)} sq ft
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span>Wall Paint</span>
                          <span className="text-white font-medium">
                            {Math.ceil(((floorPlanData.wallCount || 4) * (floorPlanData.totalArea || 100) * 0.4 * (floorPlanData.ceilingHeight || 8)) / 350)} gal
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span>Baseboard Trim</span>
                          <span className="text-white font-medium">
                            {Math.ceil(Math.sqrt(floorPlanData.totalArea || 0) * 4 * 1.1)} linear ft
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span>Drywall Sheets</span>
                          <span className="text-white font-medium">
                            {Math.ceil(((floorPlanData.wallCount || 4) * Math.sqrt(floorPlanData.totalArea || 0) * (floorPlanData.ceilingHeight || 8)) / 32)} sheets
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedCloudScan.scan_data?.scanId && (
                    <>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExportPDF(selectedCloudScan.scan_data.scanId!)}
                          disabled={exportingPDF}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/20 text-red-400 font-medium rounded-lg disabled:opacity-50"
                        >
                          {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          PDF
                        </button>
                        <button
                          onClick={() => handleExportPNG(selectedCloudScan.scan_data.scanId!)}
                          disabled={exportingPNG}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500/20 text-blue-400 font-medium rounded-lg disabled:opacity-50"
                        >
                          {exportingPNG ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          PNG
                        </button>
                      </div>
                      <button
                        onClick={() => handleSaveToPhotos(selectedCloudScan.scan_data.scanId!)}
                        disabled={savingToPhotos}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 font-medium rounded-lg disabled:opacity-50"
                      >
                        {savingToPhotos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                        Save to Photos
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Delete and Back buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (confirm('Delete this scan from cloud?')) {
                      deleteCloudScan(selectedCloudScan.id).then(() => {
                        setCloudScans(prev => prev.filter(s => s.id !== selectedCloudScan.id));
                        closeScanDetails();
                      });
                    }
                  }}
                  className="px-4 py-3 bg-red-500/20 text-red-400 font-semibold rounded-xl"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={closeScanDetails}
                  className="flex-1 py-3 bg-[#2C2C2E] text-white font-semibold rounded-xl"
                >
                  Back to Saved Scans
                </button>
              </div>
            </div>
          )}

          {/* Scanning in progress */}
          {isScanning && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Scanning Room...</h3>
              <p className="text-zinc-400">Slowly pan your camera around the room</p>
            </div>
          )}

          {/* Scan complete */}
          {scanResult && estimateData && (
            <div className="space-y-6">
              {/* Success header */}
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <h3 className="font-bold text-white">Scan Complete!</h3>
                  <p className="text-sm text-zinc-400">Room measurements captured</p>
                </div>
              </div>

              {/* Measurements summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-[#2C2C2E] rounded-xl">
                  <p className="text-xs text-zinc-500 mb-1">Floor Area</p>
                  <p className="text-2xl font-bold text-white">{estimateData.floorAreaSqFt.toFixed(0)}</p>
                  <p className="text-xs text-zinc-400">sq ft</p>
                </div>
                <div className="p-4 bg-[#2C2C2E] rounded-xl">
                  <p className="text-xs text-zinc-500 mb-1">Wall Area</p>
                  <p className="text-2xl font-bold text-white">{estimateData.wallAreaSqFt.toFixed(0)}</p>
                  <p className="text-xs text-zinc-400">sq ft</p>
                </div>
                <div className="p-4 bg-[#2C2C2E] rounded-xl">
                  <p className="text-xs text-zinc-500 mb-1">Doors</p>
                  <p className="text-2xl font-bold text-white">{estimateData.doorCount}</p>
                </div>
                <div className="p-4 bg-[#2C2C2E] rounded-xl">
                  <p className="text-xs text-zinc-500 mb-1">Windows</p>
                  <p className="text-2xl font-bold text-white">{estimateData.windowCount}</p>
                </div>
              </div>

              {/* View 3D Model Button */}
              {scanResult.modelPath && (
                <div className="space-y-2">
                  <button
                    onClick={() => view3DModel(texturedModelPath || scanResult.modelPath!)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform"
                  >
                    <Eye className="w-5 h-5" />
                    View 3D Model in AR
                  </button>

                  {/* Texture Processing */}
                  {scanResult.scanId && !texturedModelPath && (
                    <button
                      onClick={() => processTexturedModel(scanResult.scanId!)}
                      disabled={processingTextures}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
                    >
                      {processingTextures ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {textureStatus || 'Processing...'}
                        </>
                      ) : (
                        <>
                          <Box className="w-5 h-5" />
                          Create Realistic 3D Model
                        </>
                      )}
                    </button>
                  )}

                  {texturedModelPath && (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-green-400">Textured model ready!</span>
                    </div>
                  )}

                  {/* Floor Plan Generation */}
                  {scanResult.scanId && (
                    <button
                      onClick={() => generateFloorPlan(scanResult.scanId!)}
                      disabled={generatingFloorPlan}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
                    >
                      {generatingFloorPlan ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating Floor Plan...
                        </>
                      ) : (
                        <>
                          <MapIcon className="w-5 h-5" />
                          Generate 2D Floor Plan
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Floor Plan Viewer */}
              {showFloorPlan && floorPlanData && (
                <div className="p-4 bg-[#2C2C2E] rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapIcon className="w-5 h-5 text-emerald-500" />
                      <h4 className="font-semibold text-white">2D Floor Plan</h4>
                      {floorPlanSavedToCloud && (
                        <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px]">SYNCED</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {scanResult.scanId && (
                        <>
                          <button
                            onClick={() => {
                              setShowObjects(!showObjects);
                              generateFloorPlan(scanResult.scanId!, undefined, !showObjects);
                            }}
                            disabled={generatingFloorPlan}
                            className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                              showObjects
                                ? 'text-amber-400 bg-amber-500/20'
                                : 'text-zinc-400 hover:bg-zinc-500/20'
                            }`}
                            title={showObjects ? "Hide Furniture" : "Show Furniture"}
                          >
                            <Sofa className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => generateFloorPlan(scanResult.scanId!)}
                            disabled={generatingFloorPlan}
                            className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Regenerate Floor Plan"
                          >
                            {generatingFloorPlan ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-5 h-5" />
                            )}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setShowFloorPlan(false)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Floor Plan Image */}
                  {floorPlanData.imageBase64 && (
                    <div className="relative rounded-lg overflow-hidden bg-white">
                      <img
                        src={floorPlanData.imageBase64}
                        alt="Floor Plan"
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  {/* Floor Plan Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-white">{Math.round(floorPlanData.totalArea || 0)}</p>
                      <p className="text-xs text-zinc-500">sq ft</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-cyan-400">{(floorPlanData.ceilingHeight || 8).toFixed(1)}'</p>
                      <p className="text-xs text-zinc-500">ceiling</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-white">{floorPlanData.wallCount || 0}</p>
                      <p className="text-xs text-zinc-500">walls</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-white">{floorPlanData.doorCount || 0}</p>
                      <p className="text-xs text-zinc-500">doors</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className="text-lg font-bold text-white">{floorPlanData.windowCount || 0}</p>
                      <p className="text-xs text-zinc-500">windows</p>
                    </div>
                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                      <p className={`text-lg font-bold ${(floorPlanData.objectCount || 0) > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                        {floorPlanData.objectCount || 0}
                      </p>
                      <p className="text-xs text-zinc-500">objects</p>
                    </div>
                  </div>

                  {/* Material Calculator Button */}
                  <button
                    onClick={() => setShowMaterialCalculator(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-blue-500/20 to-amber-500/20 text-blue-400 font-medium rounded-lg"
                  >
                    <Calculator className="w-4 h-4" />
                    Material Calculator
                  </button>

                  {/* AI Customize Button */}
                  <button
                    onClick={() => setShowFloorPlanCustomizer(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-400 font-medium rounded-lg"
                  >
                    <Wand2 className="w-4 h-4" />
                    AI Customize Floor Plan
                  </button>

                  {/* Edit Plan Button */}
                  <button
                    onClick={() => {
                      if (scanResult?.scanId) {
                        setEditorScanId(scanResult.scanId);
                        setShowFloorPlanEditor(true);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 font-medium rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Plan
                  </button>

                  {/* Export Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExportPDF(scanResult.scanId!)}
                      disabled={exportingPDF}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/20 text-red-400 font-medium rounded-lg hover:bg-red-500/30 disabled:opacity-50"
                    >
                      {exportingPDF ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      PDF
                    </button>
                    <button
                      onClick={() => handleExportPNG(scanResult.scanId!)}
                      disabled={exportingPNG}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500/20 text-blue-400 font-medium rounded-lg hover:bg-blue-500/30 disabled:opacity-50"
                    >
                      {exportingPNG ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      PNG
                    </button>
                  </div>
                  <button
                    onClick={() => handleSaveToPhotos(scanResult.scanId!)}
                    disabled={savingToPhotos}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 font-medium rounded-lg disabled:opacity-50"
                  >
                    {savingToPhotos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                    Save to Photos
                  </button>
                </div>
              )}

              {/* Material suggestions */}
              <div className="p-4 bg-[#2C2C2E] rounded-xl">
                <h4 className="font-semibold text-white mb-3">Suggested Materials</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-zinc-300">
                    <span>Flooring</span>
                    <span>{estimateData.suggestedMaterials.flooring.sqFt} sq ft</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Paint</span>
                    <span>{estimateData.suggestedMaterials.paint.gallons} gallons</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Baseboards</span>
                    <span>{estimateData.suggestedMaterials.baseboards.linearFt} linear ft</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Drywall</span>
                    <span>{estimateData.suggestedMaterials.drywall.sheets} sheets</span>
                  </div>
                </div>
              </div>

              {/* AI Estimate section */}
              {aiEstimate && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    <h4 className="font-semibold text-white">AI Estimate</h4>
                  </div>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{aiEstimate.message}</p>
                </div>
              )}

              {/* Renovation Options Selection */}
              {showRenovationOptions && (
                <div className="p-4 bg-[#2C2C2E] rounded-xl space-y-4">
                  <h4 className="font-semibold text-white">What work do you need done?</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {renovationOptions.map(option => (
                      <button
                        key={option.id}
                        onClick={() => toggleRenovation(option.id)}
                        className={`p-3 rounded-lg text-center transition-all ${
                          selectedRenovations.includes(option.id)
                            ? 'bg-blue-500 text-white'
                            : 'bg-[#3C3C3E] text-zinc-300 hover:bg-[#4C4C4E]'
                        }`}
                      >
                        <div className="text-xl mb-1">{option.icon}</div>
                        <div className="text-xs">{option.label}</div>
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Additional details (optional)..."
                    className="w-full p-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-white placeholder-zinc-500 text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowRenovationOptions(false)}
                      className="flex-1 py-2 px-4 bg-[#3C3C3E] text-zinc-300 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={generateAIEstimate}
                      disabled={selectedRenovations.length === 0}
                      className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-500 to-amber-500 text-white font-semibold rounded-lg disabled:opacity-50"
                    >
                      Generate Estimate
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!showRenovationOptions && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowRenovationOptions(true)}
                  disabled={isGeneratingEstimate}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-amber-500 text-white font-semibold py-3 px-4 rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  {isGeneratingEstimate ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating AI Estimate...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate AI Estimate
                    </>
                  )}
                </button>

                <button
                  onClick={createEstimateFromScan}
                  className="w-full flex items-center justify-center gap-2 bg-[#2C2C2E] text-white font-semibold py-3 px-4 rounded-xl border border-white/10 hover:border-white/30 active:scale-[0.98] transition-all"
                >
                  <FileText className="w-5 h-5" />
                  Create Basic Estimate
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    setScanResult(null);
                    setEstimateData(null);
                    setAiEstimate(null);
                    setSelectedRenovations([]);
                    setCustomNotes('');
                    setTexturedModelPath(null);
                    setTextureStatus(null);
                    setFloorPlanData(null);
                    setShowFloorPlan(false);
                    setCurrentCloudScanId(null);
                    setFloorPlanSavedToCloud(false);
                  }}
                  className="w-full text-center text-zinc-400 py-2 hover:text-white transition-colors"
                >
                  Scan Another Room
                </button>
              </div>
              )}
            </div>
          )}

          {/* Error display */}
          {error && scanResult === null && isSupported && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Scan Error</h3>
              <p className="text-zinc-400 mb-4">{error}</p>
              <button
                onClick={() => setError(null)}
                className="px-6 py-2 bg-[#2C2C2E] text-white rounded-lg"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Safe area padding at bottom */}
        <div className="pb-safe" />
      </div>

      {/* Floor Plan Customizer Overlay */}
      {showFloorPlanCustomizer && floorPlanData && (
        <FloorPlanCustomizer
          floorPlanData={floorPlanData}
          onClose={() => setShowFloorPlanCustomizer(false)}
          onSaveEstimate={(items) => {
            // Calculate totals
            const totalMaterials = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
            const totalLabor = items.reduce((sum, item) => sum + (item.laborPrice || 0), 0);
            const grandTotal = totalMaterials + totalLabor;

            // Navigate to estimate page with customization data
            navigate('/estimate/new', {
              state: {
                fromFloorPlan: true,
                floorPlanData,
                customizations: items,
                totals: {
                  materials: totalMaterials,
                  labor: totalLabor,
                  grandTotal
                }
              }
            });
            setShowFloorPlanCustomizer(false);
          }}
        />
      )}

      {/* Floor Plan Editor Modal */}
      <FloorPlanEditorModal
        isOpen={showFloorPlanEditor}
        scanId={editorScanId || undefined}
        initialData={floorPlanData ? {
          walls: floorPlanData.walls?.map((w: any) => ({
            startPoint: { x: w.startX, y: w.startY },
            endPoint: { x: w.endX, y: w.endY },
            thickness: w.thickness || 0.5,
            height: w.height || floorPlanData.ceilingHeight || 8,
            length: w.length || 0,
          })) || [],
          doors: floorPlanData.doors?.map((d: any) => ({
            position: { x: d.positionX, y: d.positionY },
            width: d.width || 3,
            rotation: d.rotation || 0,
            swingDirection: d.swingDirection || 'left',
          })) || [],
          windows: floorPlanData.windows?.map((w: any) => ({
            position: { x: w.positionX, y: w.positionY },
            width: w.width || 3,
            height: w.height || 4,
            rotation: w.rotation || 0,
          })) || [],
          rooms: floorPlanData.rooms?.map((r: any, i: number) => ({
            corners: r.corners || [],
            center: r.center || { x: 0, y: 0 },
            area: r.area || 0,
            label: r.label || `Room ${i + 1}`,
            ceilingHeight: r.ceilingHeight || floorPlanData.ceilingHeight || 8,
          })) || [],
          totalArea: floorPlanData.totalArea || 0,
          defaultCeilingHeight: floorPlanData.ceilingHeight || 8,
          isFromScan: true,
        } : undefined}
        onClose={() => {
          setShowFloorPlanEditor(false);
          setEditorScanId(null);
        }}
        onSave={(editorState) => {
          console.log('Floor plan saved:', editorState);
          // Could regenerate floor plan image here
          setShowFloorPlanEditor(false);
        }}
      />
    </div>
  );
};

export default LiDARScannerModal;
