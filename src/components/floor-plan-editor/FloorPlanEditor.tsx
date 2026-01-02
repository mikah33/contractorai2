// Floor Plan Editor - Enhanced with all features
// Mobile-first with touch gestures, snapping, furniture, measurements, multi-floor, export
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Circle, Transformer, Arrow } from 'react-konva';
import Konva from 'konva';
import { jsPDF } from 'jspdf';
import {
  X,
  Save,
  Plus,
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  DoorOpen,
  Square,
  Sofa,
  Ruler,
  Download,
  Layers,
  ChevronDown,
  RotateCw,
  Hexagon,
  StickyNote,
} from 'lucide-react';
import { useFloorPlanStore } from './store';
import {
  RoomType,
  ROOM_TEMPLATES,
  getTotalArea,
  Room,
  Door,
  Window as FloorWindow,
  FurnitureItem,
  FURNITURE_CATALOG,
  FurnitureCategory,
  MeasurementLine,
  distance,
  L_SHAPE_PRESETS,
} from './types';

interface FloorPlanEditorProps {
  scanId?: string;
  onSave?: (data: any) => void;
  onClose?: () => void;
  initialData?: any;
}

// Scale: 20 pixels per foot
const SCALE = 20;
// Minimum touch target size (44px as per iOS guidelines)
const MIN_TOUCH_TARGET = 44;
// Grid size in feet
const GRID_SIZE = 5;

export const FloorPlanEditor: React.FC<FloorPlanEditorProps> = ({
  onSave,
  onClose,
  initialData,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const {
    rooms,
    doors,
    windows,
    furniture,
    measurements,
    floors,
    currentFloorId,
    planName,
    defaultCeilingHeight,
    selectedId,
    selectedType,
    mode,
    hasUnsavedChanges,
    snapEnabled,
    measurementStart,
    addRoom,
    moveRoom,
    moveRoomWithSnap,
    resizeRoom,
    addDoor,
    addWindow,
    updateDoor,
    updateWindow,
    addFurniture,
    moveFurniture,
    rotateFurniture,
    deleteFurniture,
    addMeasurement,
    setMeasurementStart,
    deleteMeasurement,
    deleteSelected,
    select,
    setMode,
    setSnapEnabled,
    setCanvasSize,
    canvasSize,
    loadPlan,
    exportPlan,
    reset,
    addFloor,
    setCurrentFloor,
  } = useFloorPlanStore();

  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [showDoorPicker, setShowDoorPicker] = useState(false);
  const [showWindowPicker, setShowWindowPicker] = useState(false);
  const [showFurniturePicker, setShowFurniturePicker] = useState(false);
  const [showFloorPicker, setShowFloorPicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [pendingRoom, setPendingRoom] = useState<{ width: number; height: number; label: string; shape?: 'rectangle' | 'l-shape'; lShapeConfig?: { corner: string; cutWidth: number; cutHeight: number } } | null>(null);
  const [pendingDoor, setPendingDoor] = useState<{ width: number } | null>(null);
  const [pendingWindow, setPendingWindow] = useState<{ width: number; height: number } | null>(null);
  const [pendingFurniture, setPendingFurniture] = useState<string | null>(null);
  const [measurementPreview, setMeasurementPreview] = useState<{ x: number; y: number } | null>(null);

  // Stage position and scale for pan/zoom
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);

  // Track last pinch distance for zoom
  const lastDist = useRef(0);
  const lastCenter = useRef({ x: 0, y: 0 });

  // Initialize
  useEffect(() => {
    if (initialData) {
      loadPlan(initialData);
    }
    return () => reset();
  }, []);

  // Update canvas size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
        setStagePos({ x: rect.width / 2, y: rect.height / 2 });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const stage = stageRef.current;
      if (selectedId && selectedType === 'room') {
        const node = stage.findOne(`#${selectedId}`);
        if (node) {
          transformerRef.current.nodes([node]);
          transformerRef.current.getLayer()?.batchDraw();
        }
      } else {
        transformerRef.current.nodes([]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedId, selectedType, rooms]);

  // Helper: get distance between two points
  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  // Helper: get center of two points
  const getCenter = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  };

  // Handle touch start for pinch zoom
  const handleTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && touch2) {
      const p1 = { x: touch1.clientX, y: touch1.clientY };
      const p2 = { x: touch2.clientX, y: touch2.clientY };
      lastDist.current = getDistance(p1, p2);
      lastCenter.current = getCenter(p1, p2);
    }
  };

  // Handle touch move for pinch zoom
  const handleTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && touch2 && stageRef.current) {
      e.evt.preventDefault();

      const p1 = { x: touch1.clientX, y: touch1.clientY };
      const p2 = { x: touch2.clientX, y: touch2.clientY };
      const newDist = getDistance(p1, p2);
      const newCenter = getCenter(p1, p2);

      if (lastDist.current > 0) {
        const stage = stageRef.current;
        const oldScale = stageScale;
        const scaleBy = newDist / lastDist.current;
        let newScale = oldScale * scaleBy;
        newScale = Math.max(0.25, Math.min(4, newScale));

        const pointer = stage.getPointerPosition() || newCenter;
        const mousePointTo = {
          x: (pointer.x - stagePos.x) / oldScale,
          y: (pointer.y - stagePos.y) / oldScale,
        };

        const newPos = {
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        };

        setStageScale(newScale);
        setStagePos(newPos);
      }

      lastDist.current = newDist;
      lastCenter.current = newCenter;
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    lastDist.current = 0;
  };

  // Handle wheel zoom
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.25, Math.min(4, newScale));

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    setStageScale(clampedScale);
    setStagePos(newPos);
  };

  // Get world coordinates from pointer
  const getWorldCoords = (pointer: { x: number; y: number }) => {
    return {
      x: (pointer.x - stagePos.x) / stageScale / SCALE,
      y: (pointer.y - stagePos.y) / stageScale / SCALE,
    };
  };

  // Handle stage click
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const worldCoords = getWorldCoords(pointer);
      const snappedX = Math.round(worldCoords.x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(worldCoords.y / GRID_SIZE) * GRID_SIZE;

      if (mode === 'add-room' && pendingRoom) {
        addRoom('other', { x: snappedX, y: snappedY }, pendingRoom.width, pendingRoom.height, pendingRoom.label, pendingRoom.shape || 'rectangle', undefined, pendingRoom.lShapeConfig);
        setPendingRoom(null);
        setMode('select');
      } else if (mode === 'add-furniture' && pendingFurniture) {
        addFurniture(pendingFurniture, { x: snappedX, y: snappedY });
        setPendingFurniture(null);
        setMode('select');
      } else if (mode === 'add-measurement') {
        if (!measurementStart) {
          setMeasurementStart({ x: snappedX, y: snappedY });
        } else {
          addMeasurement(measurementStart, { x: snappedX, y: snappedY });
          setMode('select');
        }
      } else {
        select(null, null);
      }
    }
  };

  // Handle stage mouse move for measurement preview
  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (mode === 'add-measurement' && measurementStart) {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldCoords = getWorldCoords(pointer);
      setMeasurementPreview({ x: worldCoords.x, y: worldCoords.y });
    } else {
      setMeasurementPreview(null);
    }
  };

  // Handle room drag end with snapping
  const handleRoomDragEnd = (e: Konva.KonvaEventObject<DragEvent>, roomId: string) => {
    const node = e.target;
    const newX = node.x() / SCALE;
    const newY = node.y() / SCALE;

    // Use snap-enabled move
    const finalPos = moveRoomWithSnap(roomId, { x: newX, y: newY });

    // Snap to grid as fallback
    const snappedX = Math.round(finalPos.x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(finalPos.y / GRID_SIZE) * GRID_SIZE;

    if (snappedX !== finalPos.x || snappedY !== finalPos.y) {
      moveRoom(roomId, { x: snappedX, y: snappedY });
    }

    // Update node position
    node.x(snappedX * SCALE);
    node.y(snappedY * SCALE);
  };

  // Handle room transform end (resize)
  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, roomId: string) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const newWidth = Math.max(4, room.size.width * scaleX);
    const newHeight = Math.max(4, room.size.height * scaleY);

    const snappedWidth = Math.round(newWidth / GRID_SIZE) * GRID_SIZE || GRID_SIZE;
    const snappedHeight = Math.round(newHeight / GRID_SIZE) * GRID_SIZE || GRID_SIZE;

    node.scaleX(1);
    node.scaleY(1);

    const newX = Math.round(node.x() / SCALE / GRID_SIZE) * GRID_SIZE;
    const newY = Math.round(node.y() / SCALE / GRID_SIZE) * GRID_SIZE;

    moveRoom(roomId, { x: newX, y: newY });
    resizeRoom(roomId, { width: snappedWidth, height: snappedHeight });
  };

  // Reset view
  const handleResetView = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setStagePos({ x: rect.width / 2, y: rect.height / 2 });
      setStageScale(1);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setStageScale(Math.min(4, stageScale * 1.25));
  const handleZoomOut = () => setStageScale(Math.max(0.25, stageScale * 0.8));

  // Export to PNG
  const handleExportPNG = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const dataURL = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `${planName.replace(/\s+/g, '-')}.png`;
    link.href = dataURL;
    link.click();
    setShowExportMenu(false);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const dataURL = stage.toDataURL({ pixelRatio: 2 });
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const imgWidth = 280;
    const imgHeight = (stage.height() / stage.width()) * imgWidth;

    pdf.setFontSize(16);
    pdf.text(planName, 14, 15);
    pdf.setFontSize(10);
    pdf.text(`Total Area: ${getTotalArea(rooms).toFixed(0)} sq ft`, 14, 22);
    pdf.text(`Rooms: ${rooms.length}`, 80, 22);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 140, 22);

    pdf.addImage(dataURL, 'PNG', 10, 30, imgWidth, imgHeight);

    pdf.save(`${planName.replace(/\s+/g, '-')}.pdf`);
    setShowExportMenu(false);
  };

  // Save handler
  const handleSave = useCallback(() => {
    const data = exportPlan();
    onSave?.(data);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
  }, [exportPlan, onSave]);

  // Close handler
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Discard them?')) {
        reset();
        onClose?.();
      }
    } else {
      reset();
      onClose?.();
    }
  }, [hasUnsavedChanges, reset, onClose]);

  const totalArea = getTotalArea(rooms);
  const currentFloor = floors.find(f => f.id === currentFloorId);

  // Generate grid lines
  const gridLines: JSX.Element[] = [];
  const gridRange = 40;
  for (let i = -gridRange; i <= gridRange; i++) {
    const pos = i * GRID_SIZE * SCALE;
    const isMajor = i % 2 === 0;
    const minPos = -gridRange * GRID_SIZE * SCALE;
    const maxPos = gridRange * GRID_SIZE * SCALE;

    gridLines.push(
      <Line key={`v${i}`} points={[pos, minPos, pos, maxPos]} stroke={isMajor ? '#d1d5db' : '#e5e7eb'} strokeWidth={isMajor ? 1 : 0.5} />
    );
    gridLines.push(
      <Line key={`h${i}`} points={[minPos, pos, maxPos, pos]} stroke={isMajor ? '#d1d5db' : '#e5e7eb'} strokeWidth={isMajor ? 1 : 0.5} />
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <button onClick={handleClose} className="p-2 -ml-2 text-gray-500 active:bg-gray-100 rounded-lg">
          <X className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[180px]">{planName}</h1>
          {/* Floor selector */}
          <button
            onClick={() => setShowFloorPicker(true)}
            className="flex items-center gap-1 text-xs text-gray-500"
          >
            <Layers className="w-3 h-3" />
            {currentFloor?.name || 'Ground Floor'}
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowExportMenu(true)} className="p-2 rounded-lg text-gray-500">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={handleSave} className={`p-2 rounded-lg ${hasUnsavedChanges ? 'bg-blue-500 text-white' : 'text-gray-500'}`}>
            <Save className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 overflow-x-auto">
        <ToolButton active={mode === 'add-room'} icon={<Plus className="w-5 h-5" />} label="Room" onClick={() => setShowRoomPicker(true)} />
        <ToolButton active={mode === 'add-door'} icon={<DoorOpen className="w-5 h-5" />} label="Door" onClick={() => setShowDoorPicker(true)} />
        <ToolButton active={mode === 'add-window'} icon={<Square className="w-5 h-5" />} label="Window" onClick={() => setShowWindowPicker(true)} />
        <ToolButton active={mode === 'add-furniture'} icon={<Sofa className="w-5 h-5" />} label="Furniture" onClick={() => setShowFurniturePicker(true)} />
        <ToolButton active={mode === 'add-measurement'} icon={<Ruler className="w-5 h-5" />} label="Measure" onClick={() => setMode('add-measurement')} />
        <div className="w-px h-10 bg-gray-200 mx-1" />
        {selectedId && (
          <ToolButton active={false} icon={<Trash2 className="w-5 h-5" />} label="Delete" onClick={deleteSelected} danger />
        )}
        {selectedId && selectedType === 'furniture' && (
          <ToolButton
            active={false}
            icon={<RotateCw className="w-5 h-5" />}
            label="Rotate"
            onClick={() => {
              const item = furniture.find(f => f.id === selectedId);
              if (item) rotateFurniture(selectedId, (item.rotation + 90) % 360);
            }}
          />
        )}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white">
        <Stage
          ref={stageRef}
          width={canvasSize.width}
          height={canvasSize.height}
          x={stagePos.x}
          y={stagePos.y}
          scaleX={stageScale}
          scaleY={stageScale}
          draggable={mode === 'select' || mode === 'view'}
          onDragEnd={(e) => {
            if (e.target === e.target.getStage()) {
              setStagePos({ x: e.target.x(), y: e.target.y() });
            }
          }}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleStageClick}
          onTap={handleStageClick}
          onMouseMove={handleStageMouseMove}
        >
          {/* Grid Layer */}
          <Layer listening={false}>
            {gridLines}
            <Circle x={0} y={0} radius={4} fill="#9ca3af" />
            <Text x={8} y={-16} text="0,0" fontSize={10} fill="#9ca3af" />
          </Layer>

          {/* Main Layer */}
          <Layer>
            {/* Rooms */}
            {rooms.map((room) => (
              <RoomShape
                key={room.id}
                room={room}
                isSelected={selectedId === room.id && selectedType === 'room'}
                mode={mode}
                onSelect={() => select(room.id, 'room')}
                onDragEnd={(e) => handleRoomDragEnd(e, room.id)}
                onTransformEnd={(e) => handleTransformEnd(e, room.id)}
                onWallClick={(wall, position) => {
                  if (mode === 'add-door' && pendingDoor) {
                    addDoor(room.id, wall, position, pendingDoor.width);
                    setPendingDoor(null);
                    setMode('select');
                  } else if (mode === 'add-window' && pendingWindow) {
                    addWindow(room.id, wall, position, pendingWindow.width, pendingWindow.height);
                    setPendingWindow(null);
                    setMode('select');
                  }
                }}
              />
            ))}

            {/* Doors */}
            {doors.map((door) => {
              const room = rooms.find(r => r.id === door.roomId);
              if (!room) return null;
              return (
                <DoorShape
                  key={door.id}
                  door={door}
                  room={room}
                  isSelected={selectedId === door.id && selectedType === 'door'}
                  onSelect={() => select(door.id, 'door')}
                />
              );
            })}

            {/* Windows */}
            {windows.map((window) => {
              const room = rooms.find(r => r.id === window.roomId);
              if (!room) return null;
              return (
                <WindowShape
                  key={window.id}
                  window={window}
                  room={room}
                  isSelected={selectedId === window.id && selectedType === 'window'}
                  onSelect={() => select(window.id, 'window')}
                />
              );
            })}

            {/* Furniture */}
            {furniture.map((item) => (
              <FurnitureShape
                key={item.id}
                item={item}
                isSelected={selectedId === item.id && selectedType === 'furniture'}
                onSelect={() => select(item.id, 'furniture')}
                onDragEnd={(pos) => moveFurniture(item.id, pos)}
              />
            ))}

            {/* Measurements */}
            {measurements.map((m) => (
              <MeasurementShape
                key={m.id}
                measurement={m}
                isSelected={selectedId === m.id && selectedType === 'measurement'}
                onSelect={() => select(m.id, 'measurement')}
              />
            ))}

            {/* Measurement preview */}
            {mode === 'add-measurement' && measurementStart && measurementPreview && (
              <MeasurementShape
                measurement={{ id: 'preview', start: measurementStart, end: measurementPreview }}
                isSelected={false}
                onSelect={() => {}}
                isPreview
              />
            )}

            {/* Transformer */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                const minSize = GRID_SIZE * SCALE;
                if (newBox.width < minSize || newBox.height < minSize) {
                  return oldBox;
                }
                return newBox;
              }}
              rotateEnabled={false}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
              anchorSize={24}
              anchorCornerRadius={12}
              anchorFill="#2563eb"
              anchorStroke="white"
              anchorStrokeWidth={2}
              borderStroke="#2563eb"
              borderStrokeWidth={2}
            />
          </Layer>
        </Stage>

        {/* View controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <ViewButton icon={<Maximize2 className="w-5 h-5" />} onClick={handleResetView} />
          <ViewButton icon={<ZoomIn className="w-5 h-5" />} onClick={handleZoomIn} />
          <ViewButton icon={<ZoomOut className="w-5 h-5" />} onClick={handleZoomOut} />
        </div>

        {/* Snap toggle */}
        <button
          onClick={() => setSnapEnabled(!snapEnabled)}
          className={`absolute top-3 left-3 px-2 py-1 text-xs rounded z-10 ${snapEnabled ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}
        >
          Snap {snapEnabled ? 'ON' : 'OFF'}
        </button>

        {/* Zoom indicator */}
        <div className="absolute top-12 left-3 px-2 py-1 bg-black/50 text-white text-xs rounded z-10">
          {Math.round(stageScale * 100)}%
        </div>

        {/* Instructions */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 text-white text-xs rounded-full whitespace-nowrap z-10">
          {mode === 'add-room' && pendingRoom && `Tap to place ${pendingRoom.label} (${pendingRoom.width}'×${pendingRoom.height}')`}
          {mode === 'add-door' && pendingDoor && `Tap wall to place door (${pendingDoor.width}' wide)`}
          {mode === 'add-window' && pendingWindow && `Tap wall to place window (${pendingWindow.width}'×${pendingWindow.height}')`}
          {mode === 'add-furniture' && pendingFurniture && `Tap to place ${FURNITURE_CATALOG[pendingFurniture]?.label}`}
          {mode === 'add-measurement' && !measurementStart && 'Tap to set start point'}
          {mode === 'add-measurement' && measurementStart && 'Tap to set end point'}
          {mode === 'select' && !selectedId && 'Tap to select • Drag to pan • Pinch to zoom'}
          {mode === 'select' && selectedId && 'Drag to move • Corners to resize'}
        </div>
      </div>

      {/* Properties panels */}
      {selectedId && selectedType === 'door' && <DoorPropertiesPanel />}
      {selectedId && selectedType === 'window' && <WindowPropertiesPanel />}
      {selectedId && selectedType === 'furniture' && <FurniturePropertiesPanel />}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <strong>{totalArea.toFixed(0)}</strong> sq ft • {rooms.length} room{rooms.length !== 1 ? 's' : ''}
        </div>
        <div className="text-sm text-gray-500">
          Ceiling: {defaultCeilingHeight}'
        </div>
      </div>

      {/* Modals */}
      {showRoomPicker && (
        <RoomPickerModal
          onSelect={(type, width, height, label, shape, lShapeConfig) => {
            setPendingRoom({ width, height, label, shape, lShapeConfig });
            setMode('add-room');
            setShowRoomPicker(false);
          }}
          onClose={() => setShowRoomPicker(false)}
        />
      )}

      {showDoorPicker && (
        <DoorPickerModal
          onSelect={(width) => {
            setPendingDoor({ width });
            setMode('add-door');
            setShowDoorPicker(false);
          }}
          onClose={() => setShowDoorPicker(false)}
        />
      )}

      {showWindowPicker && (
        <WindowPickerModal
          onSelect={(width, height) => {
            setPendingWindow({ width, height });
            setMode('add-window');
            setShowWindowPicker(false);
          }}
          onClose={() => setShowWindowPicker(false)}
        />
      )}

      {showFurniturePicker && (
        <FurniturePickerModal
          onSelect={(type) => {
            setPendingFurniture(type);
            setMode('add-furniture');
            setShowFurniturePicker(false);
          }}
          onClose={() => setShowFurniturePicker(false)}
        />
      )}

      {showFloorPicker && (
        <FloorPickerModal
          floors={floors}
          currentFloorId={currentFloorId}
          onSelect={(id) => {
            setCurrentFloor(id);
            setShowFloorPicker(false);
          }}
          onAddFloor={(name, level) => {
            addFloor(name, level);
          }}
          onClose={() => setShowFloorPicker(false)}
        />
      )}

      {showExportMenu && (
        <ExportMenu
          onExportPNG={handleExportPNG}
          onExportPDF={handleExportPDF}
          onClose={() => setShowExportMenu(false)}
        />
      )}

      {showSaveToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-800 text-white rounded-lg shadow-lg z-50">
          Plan saved
        </div>
      )}
    </div>
  );
};

// ============ Shape Components ============

const RoomShape: React.FC<{
  room: Room;
  isSelected: boolean;
  mode: string;
  onSelect: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  onWallClick: (wall: 'top' | 'right' | 'bottom' | 'left', position: number) => void;
}> = ({ room, isSelected, mode, onSelect, onDragEnd, onTransformEnd, onWallClick }) => {
  const x = room.position.x * SCALE;
  const y = room.position.y * SCALE;
  const w = room.size.width * SCALE;
  const h = room.size.height * SCALE;
  const wallClickable = mode === 'add-door' || mode === 'add-window';
  const wallThickness = 20;

  // Check if this is an L-shaped room with points
  const isLShape = room.shape === 'l-shape' && room.points && room.points.length >= 6;

  // Calculate area based on shape
  let area: number;
  if (isLShape && room.points) {
    // Shoelace formula for polygon area
    let sum = 0;
    const pts = room.points;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      sum += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    area = Math.abs(sum / 2);
  } else {
    area = room.size.width * room.size.height;
  }

  const handleWallClick = (wall: 'top' | 'right' | 'bottom' | 'left', e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!wallClickable) return;
    e.cancelBubble = true;

    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const group = e.target.getParent();
    if (!group) return;

    const groupPos = group.getAbsolutePosition();
    const scale = stage.scaleX();

    const localX = (pointer.x - groupPos.x) / scale;
    const localY = (pointer.y - groupPos.y) / scale;

    let position = 0.5;
    if (wall === 'top' || wall === 'bottom') {
      position = Math.max(0.1, Math.min(0.9, localX / w));
    } else {
      position = Math.max(0.1, Math.min(0.9, localY / h));
    }

    onWallClick(wall, position);
  };

  // L-shape rendering
  if (isLShape && room.points) {
    const scaledPoints = room.points.flatMap(p => [p.x * SCALE, p.y * SCALE]);
    // Calculate centroid for label placement
    const cx = room.points.reduce((sum, p) => sum + p.x, 0) / room.points.length * SCALE;
    const cy = room.points.reduce((sum, p) => sum + p.y, 0) / room.points.length * SCALE;

    return (
      <Group
        id={room.id}
        x={x}
        y={y}
        draggable={!wallClickable}
        onClick={wallClickable ? undefined : onSelect}
        onTap={wallClickable ? undefined : onSelect}
        onDragEnd={onDragEnd}
      >
        <Line
          points={scaledPoints}
          closed
          fill={room.color}
          stroke={isSelected ? '#2563eb' : '#374151'}
          strokeWidth={isSelected ? 3 : 2}
        />
        {/* Label background */}
        <Rect x={cx - 45} y={cy - 20} width={90} height={40} fill="white" cornerRadius={6} opacity={0.95} />
        <Text x={cx} y={cy - 14} text={room.label} fontSize={13} fill="#111827" fontStyle="bold" align="center" width={90} offsetX={45} />
        <Text x={cx} y={cy + 4} text={`${area.toFixed(0)} sq ft`} fontSize={11} fill="#6b7280" align="center" width={90} offsetX={45} />
      </Group>
    );
  }

  // Rectangle rendering
  return (
    <Group
      id={room.id}
      x={x}
      y={y}
      draggable={!wallClickable}
      onClick={wallClickable ? undefined : onSelect}
      onTap={wallClickable ? undefined : onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      <Rect width={w} height={h} fill={room.color} stroke={isSelected ? '#2563eb' : '#374151'} strokeWidth={isSelected ? 3 : 2} />

      {wallClickable && (
        <>
          <Rect x={wallThickness} y={-wallThickness / 2} width={w - wallThickness * 2} height={wallThickness} fill="#3b82f6" opacity={0.3} cornerRadius={4} onClick={(e) => handleWallClick('top', e)} onTap={(e) => handleWallClick('top', e)} />
          <Rect x={wallThickness} y={h - wallThickness / 2} width={w - wallThickness * 2} height={wallThickness} fill="#3b82f6" opacity={0.3} cornerRadius={4} onClick={(e) => handleWallClick('bottom', e)} onTap={(e) => handleWallClick('bottom', e)} />
          <Rect x={-wallThickness / 2} y={wallThickness} width={wallThickness} height={h - wallThickness * 2} fill="#3b82f6" opacity={0.3} cornerRadius={4} onClick={(e) => handleWallClick('left', e)} onTap={(e) => handleWallClick('left', e)} />
          <Rect x={w - wallThickness / 2} y={wallThickness} width={wallThickness} height={h - wallThickness * 2} fill="#3b82f6" opacity={0.3} cornerRadius={4} onClick={(e) => handleWallClick('right', e)} onTap={(e) => handleWallClick('right', e)} />
        </>
      )}

      <Text x={w / 2} y={-25} text={`${room.size.width.toFixed(0)}'`} fontSize={14} fill="#374151" fontStyle="bold" align="center" offsetX={15} />
      <Text x={-25} y={h / 2} text={`${room.size.height.toFixed(0)}'`} fontSize={14} fill="#374151" fontStyle="bold" rotation={-90} offsetY={10} />

      <Rect x={w / 2 - 45} y={h / 2 - 20} width={90} height={40} fill="white" cornerRadius={6} opacity={0.95} />
      <Text x={w / 2} y={h / 2 - 14} text={room.label} fontSize={13} fill="#111827" fontStyle="bold" align="center" width={90} offsetX={45} />
      <Text x={w / 2} y={h / 2 + 4} text={`${area.toFixed(0)} sq ft`} fontSize={11} fill="#6b7280" align="center" width={90} offsetX={45} />
    </Group>
  );
};

const DoorShape: React.FC<{ door: Door; room: Room; isSelected: boolean; onSelect: () => void }> = ({ door, room, isSelected, onSelect }) => {
  const roomX = room.position.x * SCALE;
  const roomY = room.position.y * SCALE;
  const roomW = room.size.width * SCALE;
  const roomH = room.size.height * SCALE;
  const doorW = door.width * SCALE;

  let x = 0, y = 0;
  let width = doorW, height = 10;
  const isVertical = door.wall === 'left' || door.wall === 'right';

  if (isVertical) { width = 10; height = doorW; }

  switch (door.wall) {
    case 'top': x = roomX + roomW * door.position - doorW / 2; y = roomY - 5; break;
    case 'bottom': x = roomX + roomW * door.position - doorW / 2; y = roomY + roomH - 5; break;
    case 'left': x = roomX - 5; y = roomY + roomH * door.position - doorW / 2; break;
    case 'right': x = roomX + roomW - 5; y = roomY + roomH * door.position - doorW / 2; break;
  }

  const arcRadius = doorW * 0.8;
  let arcPoints: number[] = [];
  if (door.wall === 'top') arcPoints = [width / 2, height, width / 2 + arcRadius * 0.7, height + arcRadius];
  else if (door.wall === 'bottom') arcPoints = [width / 2, 0, width / 2 + arcRadius * 0.7, -arcRadius];
  else if (door.wall === 'left') arcPoints = [width, height / 2, width + arcRadius, height / 2 + arcRadius * 0.7];
  else arcPoints = [0, height / 2, -arcRadius, height / 2 + arcRadius * 0.7];

  return (
    <Group x={x} y={y} onClick={onSelect} onTap={onSelect}>
      <Rect width={width} height={height} fill="white" stroke={isSelected ? '#2563eb' : '#854d0e'} strokeWidth={isSelected ? 3 : 2} />
      <Line points={arcPoints} stroke={isSelected ? '#2563eb' : '#854d0e'} strokeWidth={2} dash={[4, 4]} />
    </Group>
  );
};

const WindowShape: React.FC<{ window: FloorWindow; room: Room; isSelected: boolean; onSelect: () => void }> = ({ window, room, isSelected, onSelect }) => {
  const roomX = room.position.x * SCALE;
  const roomY = room.position.y * SCALE;
  const roomW = room.size.width * SCALE;
  const roomH = room.size.height * SCALE;
  const winW = window.width * SCALE;

  let x = 0, y = 0;
  let width = winW, height = 12;
  const isVertical = window.wall === 'left' || window.wall === 'right';

  if (isVertical) { width = 12; height = winW; }

  switch (window.wall) {
    case 'top': x = roomX + roomW * window.position - winW / 2; y = roomY - 6; break;
    case 'bottom': x = roomX + roomW * window.position - winW / 2; y = roomY + roomH - 6; break;
    case 'left': x = roomX - 6; y = roomY + roomH * window.position - winW / 2; break;
    case 'right': x = roomX + roomW - 6; y = roomY + roomH * window.position - winW / 2; break;
  }

  return (
    <Group x={x} y={y} onClick={onSelect} onTap={onSelect}>
      <Rect width={width} height={height} fill="#bfdbfe" stroke={isSelected ? '#2563eb' : '#0ea5e9'} strokeWidth={isSelected ? 3 : 2} />
      {isVertical ? (
        <>
          <Line points={[0, height / 3, width, height / 3]} stroke={isSelected ? '#2563eb' : '#0ea5e9'} strokeWidth={1} />
          <Line points={[0, height * 2 / 3, width, height * 2 / 3]} stroke={isSelected ? '#2563eb' : '#0ea5e9'} strokeWidth={1} />
        </>
      ) : (
        <>
          <Line points={[width / 3, 0, width / 3, height]} stroke={isSelected ? '#2563eb' : '#0ea5e9'} strokeWidth={1} />
          <Line points={[width * 2 / 3, 0, width * 2 / 3, height]} stroke={isSelected ? '#2563eb' : '#0ea5e9'} strokeWidth={1} />
        </>
      )}
    </Group>
  );
};

const FurnitureShape: React.FC<{ item: FurnitureItem; isSelected: boolean; onSelect: () => void; onDragEnd: (pos: { x: number; y: number }) => void }> = ({ item, isSelected, onSelect, onDragEnd }) => {
  const x = item.position.x * SCALE;
  const y = item.position.y * SCALE;
  const w = item.size.width * SCALE;
  const h = item.size.height * SCALE;

  return (
    <Group
      x={x}
      y={y}
      rotation={item.rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        const newX = e.target.x() / SCALE;
        const newY = e.target.y() / SCALE;
        onDragEnd({ x: Math.round(newX * 2) / 2, y: Math.round(newY * 2) / 2 });
      }}
    >
      <Rect
        width={w}
        height={h}
        offsetX={w / 2}
        offsetY={h / 2}
        fill={item.color}
        stroke={isSelected ? '#2563eb' : '#475569'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={4}
      />
      <Text
        text={item.label}
        fontSize={10}
        fill="#1e293b"
        width={w}
        offsetX={w / 2}
        offsetY={h / 2 + 2}
        align="center"
      />
      {/* Dimensions */}
      <Text
        text={`${item.size.width}'×${item.size.height}'`}
        fontSize={8}
        fill="#64748b"
        width={w}
        offsetX={w / 2}
        offsetY={h / 2 - 10}
        align="center"
      />
    </Group>
  );
};

const MeasurementShape: React.FC<{ measurement: MeasurementLine; isSelected: boolean; onSelect: () => void; isPreview?: boolean }> = ({ measurement, isSelected, onSelect, isPreview }) => {
  const startX = measurement.start.x * SCALE;
  const startY = measurement.start.y * SCALE;
  const endX = measurement.end.x * SCALE;
  const endY = measurement.end.y * SCALE;

  const length = distance(measurement.start, measurement.end);
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const color = isPreview ? '#9ca3af' : isSelected ? '#2563eb' : '#dc2626';

  return (
    <Group onClick={onSelect} onTap={onSelect}>
      <Line
        points={[startX, startY, endX, endY]}
        stroke={color}
        strokeWidth={2}
        dash={isPreview ? [8, 4] : undefined}
      />
      <Circle x={startX} y={startY} radius={4} fill={color} />
      <Circle x={endX} y={endY} radius={4} fill={color} />
      <Rect x={midX - 25} y={midY - 10} width={50} height={20} fill="white" cornerRadius={4} />
      <Text x={midX} y={midY - 6} text={`${length.toFixed(1)}'`} fontSize={12} fill={color} fontStyle="bold" align="center" offsetX={20} width={40} />
    </Group>
  );
};

// ============ UI Components ============

const ToolButton: React.FC<{ active: boolean; icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }> = ({ active, icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center min-w-[56px] h-14 rounded-xl transition-colors ${
      active ? 'bg-blue-100 text-blue-600 border-2 border-blue-500' : danger ? 'bg-white text-red-500 border border-gray-200' : 'bg-white text-gray-600 border border-gray-200'
    }`}
    style={{ minHeight: MIN_TOUCH_TARGET }}
  >
    {icon}
    <span className="text-[10px] mt-0.5">{label}</span>
  </button>
);

const ViewButton: React.FC<{ icon: React.ReactNode; onClick: () => void }> = ({ icon, onClick }) => (
  <button onClick={onClick} className="w-11 h-11 bg-white rounded-xl shadow-md flex items-center justify-center text-gray-600 active:bg-gray-100" style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET }}>
    {icon}
  </button>
);

// ============ Property Panels ============

const DoorPropertiesPanel: React.FC = () => {
  const { selectedId, doors, updateDoor, deleteSelected } = useFloorPlanStore();
  const door = doors.find(d => d.id === selectedId);
  if (!door) return null;

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Door Width</span>
        <span className="text-xs text-gray-500">feet</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={door.width}
          onChange={(e) => updateDoor(selectedId!, { width: Math.max(1, parseFloat(e.target.value) || 3) })}
          min="1" max="20" step="0.5"
          className="flex-1 px-3 py-2 text-lg font-semibold text-center text-gray-900 bg-white border border-gray-300 rounded-lg"
        />
        <button onClick={deleteSelected} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg"><Trash2 className="w-5 h-5" /></button>
      </div>
    </div>
  );
};

const WindowPropertiesPanel: React.FC = () => {
  const { selectedId, windows, updateWindow, deleteSelected } = useFloorPlanStore();
  const window = windows.find(w => w.id === selectedId);
  if (!window) return null;

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Window Size</span>
        <span className="text-xs text-gray-500">feet</span>
      </div>
      <div className="flex items-center gap-2">
        <input type="number" value={window.width} onChange={(e) => updateWindow(selectedId!, { width: Math.max(1, parseFloat(e.target.value) || 4) })} min="1" max="15" step="0.5" className="flex-1 px-3 py-2 text-lg font-semibold text-center text-gray-900 bg-white border border-gray-300 rounded-lg" />
        <span className="text-xl text-gray-400">×</span>
        <input type="number" value={window.height} onChange={(e) => updateWindow(selectedId!, { height: Math.max(1, parseFloat(e.target.value) || 4) })} min="1" max="10" step="0.5" className="flex-1 px-3 py-2 text-lg font-semibold text-center text-gray-900 bg-white border border-gray-300 rounded-lg" />
        <button onClick={deleteSelected} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg"><Trash2 className="w-5 h-5" /></button>
      </div>
    </div>
  );
};

const FurniturePropertiesPanel: React.FC = () => {
  const { selectedId, furniture, rotateFurniture, deleteSelected } = useFloorPlanStore();
  const item = furniture.find(f => f.id === selectedId);
  if (!item) return null;

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-gray-700">{item.label}</span>
          <p className="text-xs text-gray-500">{item.size.width}' × {item.size.height}' • {item.rotation}°</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => rotateFurniture(selectedId!, (item.rotation + 90) % 360)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg"><RotateCw className="w-5 h-5" /></button>
          <button onClick={deleteSelected} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg"><Trash2 className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
};

// ============ Modal Components ============

// L-shape corner options
type LShapeCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

interface LShapeConfig {
  corner: LShapeCorner;
  cutWidth: number;  // percentage 0-100
  cutHeight: number; // percentage 0-100
}

const RoomPickerModal: React.FC<{ onSelect: (type: RoomType, w: number, h: number, label: string, shape?: 'rectangle' | 'l-shape', lShapeConfig?: LShapeConfig) => void; onClose: () => void }> = ({ onSelect, onClose }) => {
  const [width, setWidth] = useState('15');
  const [height, setHeight] = useState('15');
  const [label, setLabel] = useState('Room');
  const [shape, setShape] = useState<'rectangle' | 'l-shape'>('rectangle');

  // L-shape configuration
  const [lCorner, setLCorner] = useState<LShapeCorner>('bottom-right');
  const [lCutWidth, setLCutWidth] = useState(40); // percentage
  const [lCutHeight, setLCutHeight] = useState(40); // percentage

  const quickLabels = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 'Office', 'Garage', 'Closet', 'Hallway', 'Laundry'];

  // Calculate actual L-shape area
  const w = parseFloat(width) || 15;
  const h = parseFloat(height) || 15;
  const cutW = w * (lCutWidth / 100);
  const cutH = h * (lCutHeight / 100);
  const lArea = (w * h) - (cutW * cutH);
  const rectArea = w * h;

  // L-shape preview SVG
  const LShapePreview = () => {
    const svgW = 80;
    const svgH = 80;
    const scale = Math.min(svgW / w, svgH / h) * 0.8;
    const sw = w * scale;
    const sh = h * scale;
    const scw = cutW * scale;
    const sch = cutH * scale;
    const ox = (svgW - sw) / 2;
    const oy = (svgH - sh) / 2;

    let path = '';
    switch (lCorner) {
      case 'bottom-right':
        path = `M${ox},${oy} L${ox + sw},${oy} L${ox + sw},${oy + sh - sch} L${ox + sw - scw},${oy + sh - sch} L${ox + sw - scw},${oy + sh} L${ox},${oy + sh} Z`;
        break;
      case 'bottom-left':
        path = `M${ox},${oy} L${ox + sw},${oy} L${ox + sw},${oy + sh} L${ox + scw},${oy + sh} L${ox + scw},${oy + sh - sch} L${ox},${oy + sh - sch} Z`;
        break;
      case 'top-right':
        path = `M${ox},${oy} L${ox + sw - scw},${oy} L${ox + sw - scw},${oy + sch} L${ox + sw},${oy + sch} L${ox + sw},${oy + sh} L${ox},${oy + sh} Z`;
        break;
      case 'top-left':
        path = `M${ox + scw},${oy} L${ox + sw},${oy} L${ox + sw},${oy + sh} L${ox},${oy + sh} L${ox},${oy + sch} L${ox + scw},${oy + sch} Z`;
        break;
    }

    return (
      <svg width={svgW} height={svgH} className="mx-auto">
        <path d={path} fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Add Room</h3>
          <button onClick={onClose} className="p-2 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          {/* Shape Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Room Shape</label>
            <div className="flex gap-2">
              <button onClick={() => setShape('rectangle')} className={`flex-1 py-3 rounded-lg border ${shape === 'rectangle' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300'}`}>
                <Square className="w-5 h-5 mx-auto mb-1" />Rectangle
              </button>
              <button onClick={() => setShape('l-shape')} className={`flex-1 py-3 rounded-lg border ${shape === 'l-shape' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300'}`}>
                <Hexagon className="w-5 h-5 mx-auto mb-1" />L-Shape
              </button>
            </div>
          </div>

          {/* L-Shape Configuration */}
          {shape === 'l-shape' && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">L-Shape Preview</span>
                <LShapePreview />
              </div>

              {/* Corner Selection */}
              <div>
                <label className="block text-xs text-gray-500 mb-2">Cut Corner</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as LShapeCorner[]).map((corner) => (
                    <button
                      key={corner}
                      onClick={() => setLCorner(corner)}
                      className={`py-2 px-3 text-xs rounded-lg border ${lCorner === corner ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600'}`}
                    >
                      {corner.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cut Size Sliders */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Cut Width</span>
                    <span>{lCutWidth}% ({cutW.toFixed(1)}')</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={lCutWidth}
                    onChange={(e) => setLCutWidth(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Cut Height</span>
                    <span>{lCutHeight}% ({cutH.toFixed(1)}')</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={lCutHeight}
                    onChange={(e) => setLCutHeight(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Room Name</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full px-4 py-3 text-lg text-gray-900 bg-white border border-gray-300 rounded-xl" />
          </div>
          <div className="flex flex-wrap gap-2">
            {quickLabels.map((l) => (
              <button key={l} onClick={() => setLabel(l)} className={`px-3 py-1.5 text-sm rounded-full border ${label === l ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600'}`}>{l}</button>
            ))}
          </div>

          {/* Dimensions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Overall Dimensions (feet)</label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Width</label>
                <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} min="1" max="100" className="w-full px-4 py-3 text-xl font-semibold text-center text-gray-900 bg-white border border-gray-300 rounded-xl" />
              </div>
              <span className="text-2xl text-gray-400 mt-4">×</span>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Length</label>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} min="1" max="100" className="w-full px-4 py-3 text-xl font-semibold text-center text-gray-900 bg-white border border-gray-300 rounded-xl" />
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              Area: <strong className="text-gray-900">{(shape === 'l-shape' ? lArea : rectArea).toFixed(0)} sq ft</strong>
            </p>
          </div>

          <button
            onClick={() => onSelect(
              'other',
              w,
              h,
              label || 'Room',
              shape,
              shape === 'l-shape' ? { corner: lCorner, cutWidth: lCutWidth, cutHeight: lCutHeight } : undefined
            )}
            className="w-full py-4 bg-blue-500 text-white text-lg font-semibold rounded-xl"
          >
            Add Room
          </button>
        </div>
      </div>
    </div>
  );
};

const DoorPickerModal: React.FC<{ onSelect: (w: number) => void; onClose: () => void }> = ({ onSelect, onClose }) => {
  const [width, setWidth] = useState('3');
  const presets = [{ label: "Standard (3')", value: 3 }, { label: "Wide (3'6\")", value: 3.5 }, { label: "Double (6')", value: 6 }, { label: "Garage (8')", value: 8 }];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Add Door</h3>
          <button onClick={onClose} className="p-2 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button key={p.label} onClick={() => setWidth(p.value.toString())} className={`px-3 py-2 text-sm rounded-lg border ${parseFloat(width) === p.value ? 'bg-amber-100 border-amber-500 text-amber-800' : 'border-gray-300'}`}>{p.label}</button>
            ))}
          </div>
          <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} min="1" max="20" step="0.5" className="w-full px-4 py-3 text-xl font-semibold text-center text-gray-900 bg-white border border-gray-300 rounded-xl" />
          <button onClick={() => onSelect(parseFloat(width) || 3)} className="w-full py-4 bg-amber-500 text-white text-lg font-semibold rounded-xl">Add Door</button>
        </div>
      </div>
    </div>
  );
};

const WindowPickerModal: React.FC<{ onSelect: (w: number, h: number) => void; onClose: () => void }> = ({ onSelect, onClose }) => {
  const [width, setWidth] = useState('4');
  const [height, setHeight] = useState('4');
  const presets = [{ label: "Small (2'×2')", w: 2, h: 2 }, { label: "Standard (3'×4')", w: 3, h: 4 }, { label: "Large (4'×5')", w: 4, h: 5 }, { label: "Picture (6'×4')", w: 6, h: 4 }];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Add Window</h3>
          <button onClick={onClose} className="p-2 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button key={p.label} onClick={() => { setWidth(p.w.toString()); setHeight(p.h.toString()); }} className={`px-3 py-2 text-sm rounded-lg border ${parseFloat(width) === p.w && parseFloat(height) === p.h ? 'bg-sky-100 border-sky-500 text-sky-800' : 'border-gray-300'}`}>{p.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} min="1" max="15" step="0.5" className="flex-1 px-4 py-3 text-xl font-semibold text-center text-gray-900 bg-white border border-gray-300 rounded-xl" />
            <span className="text-2xl text-gray-400">×</span>
            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} min="1" max="10" step="0.5" className="flex-1 px-4 py-3 text-xl font-semibold text-center text-gray-900 bg-white border border-gray-300 rounded-xl" />
          </div>
          <button onClick={() => onSelect(parseFloat(width) || 4, parseFloat(height) || 4)} className="w-full py-4 bg-sky-500 text-white text-lg font-semibold rounded-xl">Add Window</button>
        </div>
      </div>
    </div>
  );
};

const FurniturePickerModal: React.FC<{ onSelect: (type: string) => void; onClose: () => void }> = ({ onSelect, onClose }) => {
  const [category, setCategory] = useState<FurnitureCategory>('seating');
  const categories: { key: FurnitureCategory; label: string }[] = [
    { key: 'seating', label: 'Seating' }, { key: 'tables', label: 'Tables' }, { key: 'beds', label: 'Beds' },
    { key: 'storage', label: 'Storage' }, { key: 'appliances', label: 'Appliances' }, { key: 'bathroom', label: 'Bathroom' },
  ];

  const items = Object.entries(FURNITURE_CATALOG).filter(([_, v]) => v.category === category);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Add Furniture</h3>
          <button onClick={onClose} className="p-2 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b">
          {categories.map((c) => (
            <button key={c.key} onClick={() => setCategory(c.key)} className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${category === c.key ? 'bg-purple-100 text-purple-700' : 'text-gray-600'}`}>{c.label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
          {items.map(([key, item]) => (
            <button key={key} onClick={() => onSelect(key)} className="flex flex-col items-center p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
              <div className="w-12 h-12 rounded-lg mb-2" style={{ backgroundColor: item.color }} />
              <span className="text-sm font-medium text-gray-900">{item.label}</span>
              <span className="text-xs text-gray-500">{item.size.width}' × {item.size.height}'</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const FloorPickerModal: React.FC<{ floors: any[]; currentFloorId: string; onSelect: (id: string) => void; onAddFloor: (name: string, level: number) => void; onClose: () => void }> = ({ floors, currentFloorId, onSelect, onAddFloor, onClose }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState(1);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Floors</h3>
          <button onClick={onClose} className="p-2 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-2">
          {floors.sort((a, b) => b.level - a.level).map((floor) => (
            <button key={floor.id} onClick={() => onSelect(floor.id)} className={`w-full p-3 text-left rounded-lg border ${floor.id === currentFloorId ? 'bg-blue-50 border-blue-500' : 'border-gray-200'}`}>
              <div className="font-medium text-gray-900">{floor.name}</div>
              <div className="text-xs text-gray-500">Level {floor.level}</div>
            </button>
          ))}
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} className="w-full p-3 text-center text-blue-600 border border-dashed border-blue-300 rounded-lg">
              <Plus className="w-5 h-5 mx-auto mb-1" />Add Floor
            </button>
          ) : (
            <div className="p-3 border border-gray-200 rounded-lg space-y-2">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Floor name" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              <div className="flex gap-2">
                <select value={newLevel} onChange={(e) => setNewLevel(parseInt(e.target.value))} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg">
                  <option value={-1}>Basement (-1)</option>
                  <option value={0}>Ground (0)</option>
                  <option value={1}>Second (1)</option>
                  <option value={2}>Third (2)</option>
                </select>
                <button onClick={() => { onAddFloor(newName || 'New Floor', newLevel); setShowAdd(false); setNewName(''); }} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Add</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ExportMenu: React.FC<{ onExportPNG: () => void; onExportPDF: () => void; onClose: () => void }> = ({ onExportPNG, onExportPDF, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className="relative w-full max-w-lg bg-white rounded-t-2xl">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Export</h3>
        <button onClick={onClose} className="p-2 text-gray-400"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-4 space-y-3">
        <button onClick={onExportPNG} className="w-full p-4 flex items-center gap-4 rounded-xl border border-gray-200 hover:bg-gray-50">
          <Download className="w-8 h-8 text-green-500" />
          <div className="text-left">
            <div className="font-medium text-gray-900">Export as PNG</div>
            <div className="text-sm text-gray-500">High-resolution image</div>
          </div>
        </button>
        <button onClick={onExportPDF} className="w-full p-4 flex items-center gap-4 rounded-xl border border-gray-200 hover:bg-gray-50">
          <Download className="w-8 h-8 text-red-500" />
          <div className="text-left">
            <div className="font-medium text-gray-900">Export as PDF</div>
            <div className="text-sm text-gray-500">Print-ready document</div>
          </div>
        </button>
      </div>
    </div>
  </div>
);

// Modal wrapper
export const FloorPlanEditorModal: React.FC<FloorPlanEditorProps & { isOpen: boolean }> = ({ isOpen, onClose, ...props }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-gray-100">
      <FloorPlanEditor onClose={onClose} {...props} />
    </div>
  );
};

export default FloorPlanEditor;
