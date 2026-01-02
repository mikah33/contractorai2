// Floor Plan Editor Store - Enhanced with all features
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  Room,
  Door,
  Window,
  Annotation,
  Point,
  Size,
  RoomType,
  ROOM_TEMPLATES,
  generateId,
  InteractionMode,
  FurnitureItem,
  FurnitureCategory,
  FURNITURE_CATALOG,
  MeasurementLine,
  Floor,
  findSnapPosition,
  RoomShape,
} from './types';

interface FloorPlanStore {
  // Multi-floor support
  floors: Floor[];
  currentFloorId: string;

  // Computed current floor data (for convenience)
  rooms: Room[];
  doors: Door[];
  windows: Window[];
  furniture: FurnitureItem[];
  annotations: Annotation[];
  measurements: MeasurementLine[];

  // Plan info
  planName: string;
  defaultCeilingHeight: number;

  // Selection
  selectedId: string | null;
  selectedType: 'room' | 'door' | 'window' | 'annotation' | 'furniture' | 'measurement' | null;

  // View
  zoom: number;
  pan: Point;
  canvasSize: Size;

  // Interaction
  mode: InteractionMode;
  pendingRoomType: RoomType | null;
  pendingFurnitureType: string | null;

  // Snapping
  snapEnabled: boolean;
  showSnapGuides: boolean;
  snapGuides: { type: 'horizontal' | 'vertical'; position: number }[];

  // Dimension editing
  editingDimension: { roomId: string; dimension: 'width' | 'height' } | null;

  // Measurement drawing
  measurementStart: Point | null;

  // Unsaved changes
  hasUnsavedChanges: boolean;

  // Floor actions
  addFloor: (name: string, level: number) => void;
  deleteFloor: (id: string) => void;
  setCurrentFloor: (id: string) => void;
  updateFloorName: (id: string, name: string) => void;

  // Room actions
  addRoom: (type: RoomType, position: Point, customWidth?: number, customHeight?: number, customLabel?: string, shape?: RoomShape, points?: Point[], lShapeConfig?: { corner: string; cutWidth: number; cutHeight: number }) => void;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  moveRoom: (id: string, position: Point) => void;
  moveRoomWithSnap: (id: string, position: Point) => Point; // Returns snapped position
  resizeRoom: (id: string, size: Size) => void;

  // Door actions
  addDoor: (roomId: string, wall: Door['wall'], position: number, width?: number) => void;
  updateDoor: (id: string, updates: Partial<Door>) => void;
  deleteDoor: (id: string) => void;

  // Window actions
  addWindow: (roomId: string, wall: Window['wall'], position: number, width?: number, height?: number) => void;
  updateWindow: (id: string, updates: Partial<Window>) => void;
  deleteWindow: (id: string) => void;

  // Furniture actions
  addFurniture: (type: string, position: Point) => void;
  updateFurniture: (id: string, updates: Partial<FurnitureItem>) => void;
  deleteFurniture: (id: string) => void;
  moveFurniture: (id: string, position: Point) => void;
  rotateFurniture: (id: string, rotation: number) => void;

  // Annotation actions
  addAnnotation: (position: Point, text: string, type: Annotation['type']) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;

  // Measurement actions
  addMeasurement: (start: Point, end: Point, label?: string) => void;
  updateMeasurement: (id: string, updates: Partial<MeasurementLine>) => void;
  deleteMeasurement: (id: string) => void;
  setMeasurementStart: (point: Point | null) => void;

  // Selection
  select: (id: string | null, type: 'room' | 'door' | 'window' | 'annotation' | 'furniture' | 'measurement' | null) => void;
  deleteSelected: () => void;

  // Mode
  setMode: (mode: InteractionMode) => void;
  setPendingRoomType: (type: RoomType | null) => void;
  setPendingFurnitureType: (type: string | null) => void;

  // Snapping
  setSnapEnabled: (enabled: boolean) => void;
  setSnapGuides: (guides: { type: 'horizontal' | 'vertical'; position: number }[]) => void;

  // View
  setZoom: (zoom: number) => void;
  setPan: (pan: Point) => void;
  setCanvasSize: (size: Size) => void;
  resetView: () => void;

  // Other
  setEditingDimension: (editing: { roomId: string; dimension: 'width' | 'height' } | null) => void;
  setPlanName: (name: string) => void;
  setDefaultCeilingHeight: (height: number) => void;

  // Load/Save
  loadPlan: (data: any) => void;
  exportPlan: () => any;
  reset: () => void;
}

// Create initial floor
const createInitialFloor = (): Floor => ({
  id: generateId(),
  name: 'Ground Floor',
  level: 0,
  rooms: [],
  doors: [],
  windows: [],
  furniture: [],
  annotations: [],
  measurements: [],
});

const initialFloor = createInitialFloor();

const initialState = {
  floors: [initialFloor] as Floor[],
  currentFloorId: initialFloor.id,
  rooms: [] as Room[],
  doors: [] as Door[],
  windows: [] as Window[],
  furniture: [] as FurnitureItem[],
  annotations: [] as Annotation[],
  measurements: [] as MeasurementLine[],
  planName: 'New Floor Plan',
  defaultCeilingHeight: 9,
  selectedId: null as string | null,
  selectedType: null as 'room' | 'door' | 'window' | 'annotation' | 'furniture' | 'measurement' | null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  canvasSize: { width: 400, height: 600 },
  mode: 'select' as InteractionMode,
  pendingRoomType: null as RoomType | null,
  pendingFurnitureType: null as string | null,
  snapEnabled: true,
  showSnapGuides: true,
  snapGuides: [] as { type: 'horizontal' | 'vertical'; position: number }[],
  editingDimension: null as { roomId: string; dimension: 'width' | 'height' } | null,
  measurementStart: null as Point | null,
  hasUnsavedChanges: false,
};

// Helper to get current floor
const getCurrentFloor = (state: typeof initialState): Floor | undefined => {
  return state.floors.find(f => f.id === state.currentFloorId);
};

// Helper to sync computed fields from current floor
const syncFromCurrentFloor = (state: typeof initialState) => {
  const floor = getCurrentFloor(state);
  if (floor) {
    state.rooms = floor.rooms;
    state.doors = floor.doors;
    state.windows = floor.windows;
    state.furniture = floor.furniture;
    state.annotations = floor.annotations;
    state.measurements = floor.measurements;
  }
};

export const useFloorPlanStore = create<FloorPlanStore>()(
  immer((set, get) => ({
    ...initialState,

    // Floor actions
    addFloor: (name, level) => {
      const floor: Floor = {
        id: generateId(),
        name,
        level,
        rooms: [],
        doors: [],
        windows: [],
        furniture: [],
        annotations: [],
        measurements: [],
      };
      set((state) => {
        state.floors.push(floor);
        state.hasUnsavedChanges = true;
      });
    },

    deleteFloor: (id) => {
      set((state) => {
        if (state.floors.length <= 1) return; // Can't delete last floor
        state.floors = state.floors.filter(f => f.id !== id);
        if (state.currentFloorId === id) {
          state.currentFloorId = state.floors[0].id;
          syncFromCurrentFloor(state);
        }
        state.hasUnsavedChanges = true;
      });
    },

    setCurrentFloor: (id) => {
      set((state) => {
        state.currentFloorId = id;
        syncFromCurrentFloor(state);
        state.selectedId = null;
        state.selectedType = null;
      });
    },

    updateFloorName: (id, name) => {
      set((state) => {
        const floor = state.floors.find(f => f.id === id);
        if (floor) {
          floor.name = name;
          state.hasUnsavedChanges = true;
        }
      });
    },

    // Room actions
    addRoom: (type, position, customWidth, customHeight, customLabel, shape = 'rectangle', points, lShapeConfig) => {
      const template = ROOM_TEMPLATES[type];
      const width = customWidth || template.size.width;
      const height = customHeight || template.size.height;

      // Generate L-shape points if shape is l-shape and no points provided
      let roomPoints = points;
      if (shape === 'l-shape' && !roomPoints) {
        // Use config or defaults
        const corner = lShapeConfig?.corner || 'bottom-right';
        const cutWidthPct = lShapeConfig?.cutWidth || 40;
        const cutHeightPct = lShapeConfig?.cutHeight || 40;
        const cutW = width * (cutWidthPct / 100);
        const cutH = height * (cutHeightPct / 100);

        // Generate points based on which corner is cut
        switch (corner) {
          case 'bottom-right':
            roomPoints = [
              { x: 0, y: 0 },
              { x: width, y: 0 },
              { x: width, y: height - cutH },
              { x: width - cutW, y: height - cutH },
              { x: width - cutW, y: height },
              { x: 0, y: height },
            ];
            break;
          case 'bottom-left':
            roomPoints = [
              { x: 0, y: 0 },
              { x: width, y: 0 },
              { x: width, y: height },
              { x: cutW, y: height },
              { x: cutW, y: height - cutH },
              { x: 0, y: height - cutH },
            ];
            break;
          case 'top-right':
            roomPoints = [
              { x: 0, y: 0 },
              { x: width - cutW, y: 0 },
              { x: width - cutW, y: cutH },
              { x: width, y: cutH },
              { x: width, y: height },
              { x: 0, y: height },
            ];
            break;
          case 'top-left':
            roomPoints = [
              { x: cutW, y: 0 },
              { x: width, y: 0 },
              { x: width, y: height },
              { x: 0, y: height },
              { x: 0, y: cutH },
              { x: cutW, y: cutH },
            ];
            break;
          default:
            // Default to bottom-right if unknown
            roomPoints = [
              { x: 0, y: 0 },
              { x: width, y: 0 },
              { x: width, y: height - cutH },
              { x: width - cutW, y: height - cutH },
              { x: width - cutW, y: height },
              { x: 0, y: height },
            ];
        }
      }

      const room: Room = {
        id: generateId(),
        type,
        label: customLabel || template.label,
        position,
        size: {
          width,
          height,
        },
        ceilingHeight: get().defaultCeilingHeight,
        color: template.color,
        shape,
        points: roomPoints,
      };
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          floor.rooms.push(room);
          syncFromCurrentFloor(state);
        }
        state.selectedId = room.id;
        state.selectedType = 'room';
        state.mode = 'select';
        state.pendingRoomType = null;
        state.hasUnsavedChanges = true;
      });
    },

    updateRoom: (id, updates) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          const room = floor.rooms.find((r) => r.id === id);
          if (room) {
            Object.assign(room, updates);
            syncFromCurrentFloor(state);
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    deleteRoom: (id) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          floor.rooms = floor.rooms.filter((r) => r.id !== id);
          floor.doors = floor.doors.filter((d) => d.roomId !== id);
          floor.windows = floor.windows.filter((w) => w.roomId !== id);
          syncFromCurrentFloor(state);
        }
        if (state.selectedId === id) {
          state.selectedId = null;
          state.selectedType = null;
        }
        state.hasUnsavedChanges = true;
      });
    },

    moveRoom: (id, position) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          const room = floor.rooms.find((r) => r.id === id);
          if (room) {
            room.position = position;
            syncFromCurrentFloor(state);
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    moveRoomWithSnap: (id, position) => {
      const { rooms, snapEnabled } = get();
      const room = rooms.find(r => r.id === id);
      if (!room) return position;

      // Create temp room at new position
      const tempRoom: Room = { ...room, position };

      // Find snap position if snapping is enabled
      let finalPosition = position;
      if (snapEnabled) {
        const snapPos = findSnapPosition(tempRoom, rooms, 1); // 1 foot threshold
        if (snapPos) {
          finalPosition = snapPos;
        }
      }

      // Update the room position
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          const r = floor.rooms.find((r) => r.id === id);
          if (r) {
            r.position = finalPosition;
            syncFromCurrentFloor(state);
            state.hasUnsavedChanges = true;
          }
        }
      });

      return finalPosition;
    },

    resizeRoom: (id, size) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          const room = floor.rooms.find((r) => r.id === id);
          if (room) {
            room.size = size;
            syncFromCurrentFloor(state);
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    // Door actions
    addDoor: (roomId, wall, position, width = 3) => {
      const door: Door = {
        id: generateId(),
        roomId,
        wall,
        position,
        width,
        swingDirection: 'inward-left',
      };
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          floor.doors.push(door);
          syncFromCurrentFloor(state);
        }
        state.selectedId = door.id;
        state.selectedType = 'door';
        state.mode = 'select';
        state.hasUnsavedChanges = true;
      });
    },

    updateDoor: (id, updates) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          const door = floor.doors.find((d) => d.id === id);
          if (door) {
            Object.assign(door, updates);
            syncFromCurrentFloor(state);
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    deleteDoor: (id) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          floor.doors = floor.doors.filter((d) => d.id !== id);
          syncFromCurrentFloor(state);
        }
        if (state.selectedId === id) {
          state.selectedId = null;
          state.selectedType = null;
        }
        state.hasUnsavedChanges = true;
      });
    },

    // Window actions
    addWindow: (roomId, wall, position, width = 4, height = 4) => {
      const window: Window = {
        id: generateId(),
        roomId,
        wall,
        position,
        width,
        height,
      };
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          floor.windows.push(window);
          syncFromCurrentFloor(state);
        }
        state.selectedId = window.id;
        state.selectedType = 'window';
        state.mode = 'select';
        state.hasUnsavedChanges = true;
      });
    },

    updateWindow: (id, updates) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          const window = floor.windows.find((w) => w.id === id);
          if (window) {
            Object.assign(window, updates);
            syncFromCurrentFloor(state);
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    deleteWindow: (id) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          floor.windows = floor.windows.filter((w) => w.id !== id);
          syncFromCurrentFloor(state);
        }
        if (state.selectedId === id) {
          state.selectedId = null;
          state.selectedType = null;
        }
        state.hasUnsavedChanges = true;
      });
    },

    // Furniture actions
    addFurniture: (type, position) => {
      const template = FURNITURE_CATALOG[type];
      if (!template) return;

      const item: FurnitureItem = {
        id: generateId(),
        type,
        category: template.category,
        label: template.label,
        position,
        size: { ...template.size },
        rotation: 0,
        color: template.color,
      };
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          floor.furniture.push(item);
          syncFromCurrentFloor(state);
        }
        state.selectedId = item.id;
        state.selectedType = 'furniture';
        state.mode = 'select';
        state.pendingFurnitureType = null;
        state.hasUnsavedChanges = true;
      });
    },

    updateFurniture: (id, updates) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          const item = floor.furniture.find((f) => f.id === id);
          if (item) {
            Object.assign(item, updates);
            syncFromCurrentFloor(state);
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    deleteFurniture: (id) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          floor.furniture = floor.furniture.filter((f) => f.id !== id);
          syncFromCurrentFloor(state);
        }
        if (state.selectedId === id) {
          state.selectedId = null;
          state.selectedType = null;
        }
        state.hasUnsavedChanges = true;
      });
    },

    moveFurniture: (id, position) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          const item = floor.furniture.find((f) => f.id === id);
          if (item) {
            item.position = position;
            syncFromCurrentFloor(state);
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    rotateFurniture: (id, rotation) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          const item = floor.furniture.find((f) => f.id === id);
          if (item) {
            item.rotation = rotation % 360;
            syncFromCurrentFloor(state);
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    // Annotation actions
    addAnnotation: (position, text, type) => {
      const annotation: Annotation = {
        id: generateId(),
        position,
        text,
        type,
      };
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          floor.annotations.push(annotation);
          syncFromCurrentFloor(state);
        }
        state.selectedId = annotation.id;
        state.selectedType = 'annotation';
        state.hasUnsavedChanges = true;
      });
    },

    updateAnnotation: (id, updates) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          const ann = floor.annotations.find((a) => a.id === id);
          if (ann) {
            Object.assign(ann, updates);
            syncFromCurrentFloor(state);
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    deleteAnnotation: (id) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          floor.annotations = floor.annotations.filter((a) => a.id !== id);
          syncFromCurrentFloor(state);
        }
        if (state.selectedId === id) {
          state.selectedId = null;
          state.selectedType = null;
        }
        state.hasUnsavedChanges = true;
      });
    },

    // Measurement actions
    addMeasurement: (start, end, label) => {
      const measurement: MeasurementLine = {
        id: generateId(),
        start,
        end,
        label,
      };
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          floor.measurements.push(measurement);
          syncFromCurrentFloor(state);
        }
        state.selectedId = measurement.id;
        state.selectedType = 'measurement';
        state.measurementStart = null;
        state.hasUnsavedChanges = true;
      });
    },

    updateMeasurement: (id, updates) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          const m = floor.measurements.find((m) => m.id === id);
          if (m) {
            Object.assign(m, updates);
            syncFromCurrentFloor(state);
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    deleteMeasurement: (id) => {
      set((state) => {
        const floor = getCurrentFloor(state);
        if (floor) {
          floor.measurements = floor.measurements.filter((m) => m.id !== id);
          syncFromCurrentFloor(state);
        }
        if (state.selectedId === id) {
          state.selectedId = null;
          state.selectedType = null;
        }
        state.hasUnsavedChanges = true;
      });
    },

    setMeasurementStart: (point) => {
      set((state) => {
        state.measurementStart = point;
      });
    },

    // Selection
    select: (id, type) => {
      set((state) => {
        state.selectedId = id;
        state.selectedType = type;
        state.editingDimension = null;
      });
    },

    deleteSelected: () => {
      const { selectedId, selectedType } = get();
      if (!selectedId || !selectedType) return;

      switch (selectedType) {
        case 'room':
          get().deleteRoom(selectedId);
          break;
        case 'door':
          get().deleteDoor(selectedId);
          break;
        case 'window':
          get().deleteWindow(selectedId);
          break;
        case 'annotation':
          get().deleteAnnotation(selectedId);
          break;
        case 'furniture':
          get().deleteFurniture(selectedId);
          break;
        case 'measurement':
          get().deleteMeasurement(selectedId);
          break;
      }
    },

    // Mode
    setMode: (mode) => {
      set((state) => {
        state.mode = mode;
        if (mode !== 'add-room') {
          state.pendingRoomType = null;
        }
        if (mode !== 'add-furniture') {
          state.pendingFurnitureType = null;
        }
        if (mode !== 'add-measurement') {
          state.measurementStart = null;
        }
      });
    },

    setPendingRoomType: (type) => {
      set((state) => {
        state.pendingRoomType = type;
        state.mode = type ? 'add-room' : 'select';
      });
    },

    setPendingFurnitureType: (type) => {
      set((state) => {
        state.pendingFurnitureType = type;
        state.mode = type ? 'add-furniture' : 'select';
      });
    },

    // Snapping
    setSnapEnabled: (enabled) => {
      set((state) => {
        state.snapEnabled = enabled;
      });
    },

    setSnapGuides: (guides) => {
      set((state) => {
        state.snapGuides = guides;
      });
    },

    // View
    setZoom: (zoom) => {
      set((state) => {
        state.zoom = Math.max(0.25, Math.min(4, zoom));
      });
    },

    setPan: (pan) => {
      set((state) => {
        state.pan = pan;
      });
    },

    setCanvasSize: (size) => {
      set((state) => {
        state.canvasSize = size;
      });
    },

    resetView: () => {
      const { rooms, canvasSize } = get();
      if (rooms.length === 0) {
        set((state) => {
          state.zoom = 1;
          state.pan = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
        });
        return;
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      rooms.forEach((room) => {
        minX = Math.min(minX, room.position.x);
        minY = Math.min(minY, room.position.y);
        maxX = Math.max(maxX, room.position.x + room.size.width);
        maxY = Math.max(maxY, room.position.y + room.size.height);
      });

      const contentWidth = (maxX - minX) * 20;
      const contentHeight = (maxY - minY) * 20;
      const centerX = (minX + maxX) / 2 * 20;
      const centerY = (minY + maxY) / 2 * 20;

      const zoomX = canvasSize.width / (contentWidth + 100);
      const zoomY = canvasSize.height / (contentHeight + 100);
      const fitZoom = Math.min(zoomX, zoomY, 1.5);

      set((state) => {
        state.zoom = fitZoom;
        state.pan = {
          x: canvasSize.width / 2 - centerX * fitZoom,
          y: canvasSize.height / 2 - centerY * fitZoom,
        };
      });
    },

    // Other
    setEditingDimension: (editing) => {
      set((state) => {
        state.editingDimension = editing;
      });
    },

    setPlanName: (name) => {
      set((state) => {
        state.planName = name;
        state.hasUnsavedChanges = true;
      });
    },

    setDefaultCeilingHeight: (height) => {
      set((state) => {
        state.defaultCeilingHeight = height;
        state.hasUnsavedChanges = true;
      });
    },

    // Load/Save
    loadPlan: (data) => {
      set((state) => {
        // Support legacy format (single floor)
        if (data.rooms && !data.floors) {
          const floor: Floor = {
            id: generateId(),
            name: 'Ground Floor',
            level: 0,
            rooms: data.rooms || [],
            doors: data.doors || [],
            windows: data.windows || [],
            furniture: data.furniture || [],
            annotations: data.annotations || [],
            measurements: data.measurements || [],
          };
          state.floors = [floor];
          state.currentFloorId = floor.id;
        } else if (data.floors) {
          state.floors = data.floors;
          state.currentFloorId = data.currentFloorId || data.floors[0]?.id;
        }

        if (data.planName) state.planName = data.planName;
        if (data.defaultCeilingHeight) state.defaultCeilingHeight = data.defaultCeilingHeight;

        syncFromCurrentFloor(state);
        state.hasUnsavedChanges = false;
      });
      setTimeout(() => get().resetView(), 0);
    },

    exportPlan: () => {
      const { floors, currentFloorId, planName, defaultCeilingHeight } = get();
      return { floors, currentFloorId, planName, defaultCeilingHeight };
    },

    reset: () => {
      const newFloor = createInitialFloor();
      set({
        ...initialState,
        floors: [newFloor],
        currentFloorId: newFloor.id,
      });
    },
  }))
);

export default useFloorPlanStore;
