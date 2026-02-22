import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera } from 'lucide-react';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
}

const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({ isOpen, onClose, onCapture }) => {
  const [streamActive, setStreamActive] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  }, []);

  const startStream = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreamActive(true);
    } catch {
      setStreamActive(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, startStream, stopStream]);

  const handleClose = () => {
    stopStream();
    onClose();
  };

  const handleCapture = () => {
    if (!streamActive || !videoRef.current || !canvasRef.current) return;

    // Flash effect
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      stopStream();
      onCapture(file, url);
    }, 'image/jpeg', 0.92);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        <span className="text-white font-semibold text-lg">Scan Receipt</span>
        <div className="w-10" />
      </div>

      {/* Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Receipt Frame Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Dark overlay with transparent cutout */}
        <svg className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <mask id="receipt-cutout">
              <rect width="100%" height="100%" fill="white" />
              <rect x="10%" y="15%" width="80%" height="55%" rx="12" fill="black" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#receipt-cutout)" />
        </svg>

        {/* Corner brackets */}
        <div className="absolute" style={{ left: '10%', top: '15%' }}>
          <div className="w-8 h-8 border-t-3 border-l-3 border-white rounded-tl-xl" style={{ borderWidth: '3px 0 0 3px' }} />
        </div>
        <div className="absolute" style={{ right: '10%', top: '15%' }}>
          <div className="w-8 h-8 border-t-3 border-r-3 border-white rounded-tr-xl ml-auto" style={{ borderWidth: '3px 3px 0 0' }} />
        </div>
        <div className="absolute" style={{ left: '10%', top: '70%', transform: 'translateY(-100%)' }}>
          <div className="w-8 h-8 border-b-3 border-l-3 border-white rounded-bl-xl" style={{ borderWidth: '0 0 3px 3px' }} />
        </div>
        <div className="absolute" style={{ right: '10%', top: '70%', transform: 'translateY(-100%)' }}>
          <div className="w-8 h-8 border-b-3 border-r-3 border-white rounded-br-xl ml-auto" style={{ borderWidth: '0 3px 3px 0' }} />
        </div>

        {/* Scanning animation line */}
        <div
          className="absolute left-[12%] right-[12%] h-0.5 bg-[#043d6b] opacity-80"
          style={{
            top: '15%',
            animation: 'scanLine 2.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Instructions */}
      <div className="absolute z-20 left-0 right-0" style={{ top: '72%' }}>
        <p className="text-white/80 text-center text-base font-medium">
          Position receipt within the frame
        </p>
        <p className="text-white/50 text-center text-sm mt-1">
          Tap the button below to capture
        </p>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-6 flex justify-center">
        {/* Shutter Button */}
        <button
          onClick={handleCapture}
          disabled={!streamActive}
          className="w-20 h-20 rounded-full border-[5px] border-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
        >
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
            <Camera className="w-7 h-7 text-black" />
          </div>
        </button>
      </div>

      {/* Flash Effect */}
      {showFlash && (
        <div className="absolute inset-0 z-50 bg-white animate-pulse" />
      )}

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Scan line animation */}
      <style>{`
        @keyframes scanLine {
          0% { top: 16%; opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { top: 69%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ReceiptScannerModal;
