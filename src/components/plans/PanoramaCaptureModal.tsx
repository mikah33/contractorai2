import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  Check,
  Loader2,
  RotateCcw,
  Compass
} from 'lucide-react';

interface PanoramaCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (panoramaUrl: string) => void;
  planName: string;
}

interface CapturePosition {
  id: number;
  label: string;
  zone: 'middle' | 'top' | 'bottom';
  azimuth: number;
  elevation: number;
  captured: boolean;
  imageData?: string;
}

const CAPTURE_POSITIONS: Omit<CapturePosition, 'captured' | 'imageData'>[] = [
  // Middle - 8 at eye level
  { id: 1, label: '1', zone: 'middle', azimuth: 0, elevation: 0 },
  { id: 2, label: '2', zone: 'middle', azimuth: 45, elevation: 0 },
  { id: 3, label: '3', zone: 'middle', azimuth: 90, elevation: 0 },
  { id: 4, label: '4', zone: 'middle', azimuth: 135, elevation: 0 },
  { id: 5, label: '5', zone: 'middle', azimuth: 180, elevation: 0 },
  { id: 6, label: '6', zone: 'middle', azimuth: 225, elevation: 0 },
  { id: 7, label: '7', zone: 'middle', azimuth: 270, elevation: 0 },
  { id: 8, label: '8', zone: 'middle', azimuth: 315, elevation: 0 },
  // Top - 4 pointing up
  { id: 9, label: '9', zone: 'top', azimuth: 0, elevation: 40 },
  { id: 10, label: '10', zone: 'top', azimuth: 90, elevation: 40 },
  { id: 11, label: '11', zone: 'top', azimuth: 180, elevation: 40 },
  { id: 12, label: '12', zone: 'top', azimuth: 270, elevation: 40 },
  // Bottom - 4 pointing down
  { id: 13, label: '13', zone: 'bottom', azimuth: 0, elevation: -40 },
  { id: 14, label: '14', zone: 'bottom', azimuth: 90, elevation: -40 },
  { id: 15, label: '15', zone: 'bottom', azimuth: 180, elevation: -40 },
  { id: 16, label: '16', zone: 'bottom', azimuth: 270, elevation: -40 },
];

const PanoramaCaptureModal: React.FC<PanoramaCaptureModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  planName
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [positions, setPositions] = useState<CapturePosition[]>(
    CAPTURE_POSITIONS.map(p => ({ ...p, captured: false }))
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRetakeConfirm, setShowRetakeConfirm] = useState<number | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Smoothed orientation using circular buffer
  const [currentAzimuth, setCurrentAzimuth] = useState(0);
  const [currentElevation, setCurrentElevation] = useState(0);
  const azimuthBufferRef = useRef<number[]>([]);
  const elevationBufferRef = useRef<number[]>([]);
  const initialAzimuthRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef(0);

  const BUFFER_SIZE = 15; // More samples = smoother but slower response
  const UPDATE_INTERVAL = 50; // ms between state updates (20fps)
  const HIGHLIGHT_THRESHOLD = 25; // degrees

  const capturedCount = positions.filter(p => p.captured).length;
  const allCaptured = capturedCount === 16;

  // Find highlighted position
  const highlightedPosition = positions.find(pos => {
    let deltaAz = pos.azimuth - currentAzimuth;
    while (deltaAz > 180) deltaAz -= 360;
    while (deltaAz < -180) deltaAz += 360;
    const deltaEl = pos.elevation - currentElevation;
    const dist = Math.sqrt(deltaAz * deltaAz + deltaEl * deltaEl);
    return dist < HIGHLIGHT_THRESHOLD;
  });

  // Average a circular buffer
  const averageBuffer = (buffer: number[], isAngle = false): number => {
    if (buffer.length === 0) return 0;
    if (!isAngle) {
      return buffer.reduce((a, b) => a + b, 0) / buffer.length;
    }
    // For angles, use vector averaging to handle wraparound
    let sinSum = 0, cosSum = 0;
    buffer.forEach(angle => {
      sinSum += Math.sin(angle * Math.PI / 180);
      cosSum += Math.cos(angle * Math.PI / 180);
    });
    return Math.atan2(sinSum, cosSum) * 180 / Math.PI;
  };

  // Handle device orientation with heavy smoothing
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // Get compass heading (prefer webkitCompassHeading on iOS)
    let heading = (event as any).webkitCompassHeading ?? event.alpha ?? 0;

    // Set initial reference
    if (initialAzimuthRef.current === null && heading !== 0) {
      initialAzimuthRef.current = heading;
    }

    // Calculate relative azimuth
    let azimuth = heading - (initialAzimuthRef.current ?? 0);
    while (azimuth < 0) azimuth += 360;
    while (azimuth >= 360) azimuth -= 360;

    // Calculate elevation from beta (phone tilt)
    // With rear camera: tilting up increases beta, tilting down decreases it
    const beta = event.beta ?? 90;
    let elevation = beta - 90;
    elevation = Math.max(-90, Math.min(90, elevation));

    // Add to circular buffers
    azimuthBufferRef.current.push(azimuth);
    elevationBufferRef.current.push(elevation);

    if (azimuthBufferRef.current.length > BUFFER_SIZE) {
      azimuthBufferRef.current.shift();
    }
    if (elevationBufferRef.current.length > BUFFER_SIZE) {
      elevationBufferRef.current.shift();
    }

    // Throttle state updates
    const now = Date.now();
    if (now - lastUpdateRef.current > UPDATE_INTERVAL) {
      lastUpdateRef.current = now;

      const smoothedAzimuth = averageBuffer(azimuthBufferRef.current, true);
      const smoothedElevation = averageBuffer(elevationBufferRef.current, false);

      // Normalize smoothed azimuth
      let normalizedAz = smoothedAzimuth;
      while (normalizedAz < 0) normalizedAz += 360;
      while (normalizedAz >= 360) normalizedAz -= 360;

      setCurrentAzimuth(normalizedAz);
      setCurrentElevation(smoothedElevation);
    }
  }, []);

  // Request permission
  const requestPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const perm = await (DeviceOrientationEvent as any).requestPermission();
        if (perm === 'granted') {
          setHasPermission(true);
          return true;
        }
      } catch (err) {
        console.error('Permission denied');
      }
      return false;
    }
    setHasPermission(true);
    return true;
  };

  // Reset calibration
  const resetCalibration = () => {
    initialAzimuthRef.current = null;
    azimuthBufferRef.current = [];
    elevationBufferRef.current = [];
  };

  // Calculate screen position for a dot
  const getScreenPosition = (pos: CapturePosition) => {
    let deltaAz = pos.azimuth - currentAzimuth;
    while (deltaAz > 180) deltaAz -= 360;
    while (deltaAz < -180) deltaAz += 360;

    const deltaEl = pos.elevation - currentElevation;

    const hFov = 70;
    const vFov = 100;

    const x = 50 + (deltaAz / hFov) * 100;
    const y = 50 - (deltaEl / vFov) * 100;

    const visible = Math.abs(deltaAz) < 55 && Math.abs(deltaEl) < 60;

    return { x, y, visible };
  };

  useEffect(() => {
    if (isOpen && !showInstructions) startCamera();
    return () => stopCamera();
  }, [isOpen, showInstructions]);

  useEffect(() => {
    if (hasPermission && !showInstructions) {
      window.addEventListener('deviceorientation', handleOrientation, true);
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation, true);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [hasPermission, showInstructions, handleOrientation]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch {
      setError('Unable to access camera.');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !highlightedPosition) return;

    if (highlightedPosition.captured) {
      setShowRetakeConfirm(highlightedPosition.id);
      return;
    }

    performCapture(highlightedPosition.id);
  };

  const performCapture = (posId: number) => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);

    setPositions(prev => prev.map(p =>
      p.id === posId ? { ...p, captured: true, imageData } : p
    ));

    setTimeout(() => {
      setIsCapturing(false);
      setShowRetakeConfirm(null);
    }, 200);
  };

  const confirmRetake = () => {
    if (showRetakeConfirm) performCapture(showRetakeConfirm);
  };

  const processPanorama = async () => {
    setIsProcessing(true);
    try {
      const panoramaUrl = positions.find(p => p.imageData)?.imageData || '';
      await new Promise(r => setTimeout(r, 2000));
      onComplete(panoramaUrl);
    } catch {
      setError('Failed to process.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStart = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShowInstructions(false);
    } else {
      setError('Motion sensor access required.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {isCapturing && <div className="absolute inset-0 bg-white/80" />}

      {error && (
        <div className="absolute top-24 left-4 right-4 p-3 bg-red-500 rounded-xl text-white text-center z-30">
          {error}
        </div>
      )}

      {/* AR Dots */}
      {!showInstructions && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {positions.map(pos => {
            const { x, y, visible } = getScreenPosition(pos);
            if (!visible) return null;

            const isHighlighted = highlightedPosition?.id === pos.id;
            const distFromCenter = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(y - 50, 2));
            const scale = isHighlighted ? 1.2 : Math.max(0.7, 1 - distFromCenter / 100);

            return (
              <div
                key={pos.id}
                className="absolute will-change-transform"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  transition: 'transform 0.1s ease-out',
                }}
              >
                <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-3 shadow-xl ${
                  pos.captured
                    ? 'bg-green-500 border-green-300'
                    : isHighlighted
                    ? 'bg-blue-500 border-blue-300'
                    : pos.zone === 'top'
                    ? 'bg-cyan-500/80 border-cyan-300'
                    : pos.zone === 'bottom'
                    ? 'bg-purple-500/80 border-purple-300'
                    : 'bg-white/90 border-white'
                }`}>
                  {pos.captured ? (
                    <Check className="w-7 h-7 text-white" strokeWidth={3} />
                  ) : (
                    <>
                      <span className={`text-lg font-bold ${pos.zone === 'middle' ? 'text-black' : 'text-white'}`}>
                        {pos.label}
                      </span>
                      {pos.zone !== 'middle' && (
                        <span className="text-[9px] text-white/90 -mt-1">
                          {pos.zone === 'top' ? '↑' : '↓'}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Center Target */}
      {!showInstructions && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-150 ${
            highlightedPosition
              ? highlightedPosition.captured
                ? 'border-green-400 bg-green-500/10'
                : 'border-blue-400 bg-blue-500/10'
              : 'border-white/30'
          }`}>
            <div className={`w-4 h-4 rounded-full ${highlightedPosition ? 'bg-blue-500' : 'bg-white/40'}`} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10"
           style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">{planName}</h2>
            <p className="text-white/70 text-sm">{capturedCount}/16 photos</p>
          </div>
          <div className="flex gap-2">
            {!showInstructions && (
              <button onClick={resetCalibration} className="p-2 bg-white/20 rounded-full" title="Recalibrate">
                <Compass className="w-5 h-5 text-white" />
              </button>
            )}
            <button onClick={onClose} className="p-2 bg-white/20 rounded-full">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
        {!showInstructions && (
          <div className="mt-3 flex gap-0.5">
            {positions.map(p => (
              <div key={p.id} className={`flex-1 h-1.5 rounded-full ${
                p.captured ? 'bg-green-500' : highlightedPosition?.id === p.id ? 'bg-blue-500' : 'bg-white/30'
              }`} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom */}
      {!showInstructions && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pb-safe z-10">
          <div className="text-center mb-3">
            {highlightedPosition ? (
              <p className="text-white font-medium">
                {highlightedPosition.captured ? (
                  <span className="text-green-400">✓ Position {highlightedPosition.label} - Tap to retake</span>
                ) : (
                  <>
                    Position {highlightedPosition.label} •
                    <span className={
                      highlightedPosition.zone === 'top' ? ' text-cyan-400' :
                      highlightedPosition.zone === 'bottom' ? ' text-purple-400' : ''
                    }>
                      {highlightedPosition.zone === 'middle' ? ' Eye level' :
                       highlightedPosition.zone === 'top' ? ' Point UP' : ' Point DOWN'}
                    </span>
                  </>
                )}
              </p>
            ) : (
              <p className="text-white/50">Move phone to find a dot</p>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={capturePhoto}
              disabled={isCapturing || !highlightedPosition}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                highlightedPosition
                  ? highlightedPosition.captured
                    ? 'bg-green-500 active:scale-95'
                    : 'bg-white active:scale-95'
                  : 'bg-white/30'
              }`}
            >
              {highlightedPosition?.captured ? (
                <RotateCcw className="w-8 h-8 text-white" />
              ) : (
                <Camera className={`w-8 h-8 ${highlightedPosition ? 'text-black' : 'text-white/40'}`} />
              )}
            </button>
          </div>

          {allCaptured && (
            <button
              onClick={processPanorama}
              disabled={isProcessing}
              className="w-full mt-4 py-3 bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {isProcessing ? 'Processing...' : 'Create 360° Panorama'}
            </button>
          )}
        </div>
      )}

      {/* Retake */}
      {showRetakeConfirm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <div className="bg-zinc-800 rounded-2xl p-6 mx-4 max-w-sm">
            <h3 className="text-white font-bold text-lg mb-2">Retake Photo?</h3>
            <p className="text-zinc-400 text-sm mb-4">Replace position {showRetakeConfirm}?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowRetakeConfirm(null)} className="flex-1 py-2 bg-zinc-700 text-white rounded-lg">Cancel</button>
              <button onClick={confirmRetake} className="flex-1 py-2 bg-blue-500 text-white rounded-lg">Retake</button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {showInstructions && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90">
          <div className="bg-zinc-800 rounded-2xl p-6 mx-4 max-w-sm text-center">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-white font-bold text-xl mb-3">360° Capture</h3>
            <div className="text-zinc-300 text-sm mb-6 text-left space-y-2">
              <p>• <strong className="text-white">Stand in one spot</strong></p>
              <p>• <strong className="text-white">White dots (1-8):</strong> Eye level</p>
              <p>• <strong className="text-cyan-400">Cyan dots (9-12):</strong> Point UP</p>
              <p>• <strong className="text-purple-400">Purple dots (13-16):</strong> Point DOWN</p>
              <p>• Point camera at dot → capture</p>
            </div>
            <button onClick={handleStart} className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold">
              Start Capturing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanoramaCaptureModal;
