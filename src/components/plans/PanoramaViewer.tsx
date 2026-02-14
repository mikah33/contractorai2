import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';

interface PanoramaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  beforeImageUrl: string;
  afterImageUrl?: string;
  title?: string;
}

const PanoramaViewer: React.FC<PanoramaViewerProps> = ({
  isOpen,
  onClose,
  beforeImageUrl,
  afterImageUrl,
  title = '360° View'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showAfter, setShowAfter] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouch, setLastTouch] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(75); // FOV in degrees

  const currentImageUrl = showAfter && afterImageUrl ? afterImageUrl : beforeImageUrl;

  // Handle mouse/touch drag for rotation
  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setLastTouch({ x: clientX, y: clientY });
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    const deltaX = clientX - lastTouch.x;
    const deltaY = clientY - lastTouch.y;

    setRotation(prev => ({
      x: Math.max(-85, Math.min(85, prev.x - deltaY * 0.3)),
      y: prev.y + deltaX * 0.3
    }));

    setLastTouch({ x: clientX, y: clientY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Reset view
  const resetView = () => {
    setRotation({ x: 0, y: 0 });
    setZoom(75);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle scroll for zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.max(30, Math.min(120, prev + e.deltaY * 0.05)));
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black">
      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {/* 360 Panorama using CSS 3D */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            perspective: '1000px',
            perspectiveOrigin: '50% 50%'
          }}
        >
          <div
            className="w-full h-full"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
            }}
          >
            {/* Sphere approximation using a large background image */}
            <div
              className="absolute"
              style={{
                width: '400%',
                height: '200%',
                left: '-150%',
                top: '-50%',
                backgroundImage: `url(${currentImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transform: `translateZ(-${500 - (zoom - 75) * 5}px)`,
                filter: 'brightness(1.05)'
              }}
            />
          </div>
        </div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">{title}</h2>
              <p className="text-white/70 text-sm">
                {showAfter && afterImageUrl ? 'AI Redesign' : 'Original'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent z-10">
          {/* Before/After Toggle */}
          {afterImageUrl && (
            <div className="flex justify-center mb-4">
              <div className="bg-black/50 backdrop-blur-sm rounded-full p-1 flex">
                <button
                  onClick={() => setShowAfter(false)}
                  className={`px-6 py-2 rounded-full font-medium transition-colors ${
                    !showAfter ? 'bg-orange-500 text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Before
                </button>
                <button
                  onClick={() => setShowAfter(true)}
                  className={`px-6 py-2 rounded-full font-medium transition-colors ${
                    showAfter ? 'bg-orange-500 text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  After
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={resetView}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              title="Reset view"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Instructions */}
          <p className="text-center text-white/50 text-xs mt-3">
            Drag to look around • Scroll to zoom
          </p>
        </div>

        {/* Navigation arrows for before/after */}
        {afterImageUrl && (
          <>
            <button
              onClick={() => setShowAfter(false)}
              className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all ${
                !showAfter ? 'bg-orange-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setShowAfter(true)}
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all ${
                showAfter ? 'bg-orange-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PanoramaViewer;
