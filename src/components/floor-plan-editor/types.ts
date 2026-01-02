// Floor Plan Editor Types - Enhanced with all features
// Based on research from Cedreo, MagicPlan, Home Design 3D

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;  // in feet
  height: number; // in feet
}

// Room shape - supports rectangles and L-shapes
export type RoomShape = 'rectangle' | 'l-shape' | 'custom';

// Rooms can be rectangles or polygons
export interface Room {
  id: string;
  type: RoomType;
  label: string;
  position: Point;      // top-left corner position (for rectangles)
  size: Size;           // width and height in feet (for rectangles)
  ceilingHeight: number;
  color: string;
  shape: RoomShape;
  // For L-shaped and custom rooms - polygon points relative to position
  points?: Point[];
}

export type RoomType =
  | 'living-room'
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'dining-room'
  | 'office'
  | 'garage'
  | 'closet'
  | 'hallway'
  | 'laundry'
  | 'other';

// Room templates with default sizes
export const ROOM_TEMPLATES: Record<RoomType, { label: string; size: Size; color: string }> = {
  'living-room': { label: 'Living Room', size: { width: 20, height: 15 }, color: '#dbeafe' },
  'bedroom': { label: 'Bedroom', size: { width: 12, height: 12 }, color: '#fce7f3' },
  'kitchen': { label: 'Kitchen', size: { width: 12, height: 10 }, color: '#fef3c7' },
  'bathroom': { label: 'Bathroom', size: { width: 8, height: 6 }, color: '#d1fae5' },
  'dining-room': { label: 'Dining Room', size: { width: 12, height: 12 }, color: '#e0e7ff' },
  'office': { label: 'Office', size: { width: 10, height: 10 }, color: '#f3e8ff' },
  'garage': { label: 'Garage', size: { width: 20, height: 20 }, color: '#e5e7eb' },
  'closet': { label: 'Closet', size: { width: 6, height: 4 }, color: '#fef9c3' },
  'hallway': { label: 'Hallway', size: { width: 10, height: 4 }, color: '#f5f5f4' },
  'laundry': { label: 'Laundry', size: { width: 8, height: 6 }, color: '#cffafe' },
  'other': { label: 'Room', size: { width: 10, height: 10 }, color: '#f9fafb' },
};

// Doors snap to room edges
export interface Door {
  id: string;
  roomId: string;
  wall: 'top' | 'right' | 'bottom' | 'left';
  position: number;     // 0-1 position along the wall
  width: number;
  swingDirection: 'inward-left' | 'inward-right' | 'outward-left' | 'outward-right';
}

// Windows snap to room edges
export interface Window {
  id: string;
  roomId: string;
  wall: 'top' | 'right' | 'bottom' | 'left';
  position: number;
  width: number;
  height: number;
}

// Furniture/Fixtures
export type FurnitureCategory = 'seating' | 'tables' | 'beds' | 'storage' | 'appliances' | 'bathroom' | 'other';

export interface FurnitureItem {
  id: string;
  type: string;
  category: FurnitureCategory;
  label: string;
  position: Point;
  size: Size;
  rotation: number; // degrees
  color: string;
  icon?: string;
}

// Furniture catalog
export const FURNITURE_CATALOG: Record<string, { label: string; size: Size; color: string; category: FurnitureCategory }> = {
  // Seating
  'sofa-3seat': { label: '3-Seat Sofa', size: { width: 7, height: 3 }, color: '#94a3b8', category: 'seating' },
  'sofa-2seat': { label: '2-Seat Sofa', size: { width: 5, height: 3 }, color: '#94a3b8', category: 'seating' },
  'armchair': { label: 'Armchair', size: { width: 3, height: 3 }, color: '#94a3b8', category: 'seating' },
  'dining-chair': { label: 'Dining Chair', size: { width: 1.5, height: 1.5 }, color: '#a78bfa', category: 'seating' },
  'office-chair': { label: 'Office Chair', size: { width: 2, height: 2 }, color: '#64748b', category: 'seating' },

  // Tables
  'dining-table-6': { label: 'Dining Table (6)', size: { width: 6, height: 3.5 }, color: '#d4a574', category: 'tables' },
  'dining-table-4': { label: 'Dining Table (4)', size: { width: 4, height: 3 }, color: '#d4a574', category: 'tables' },
  'coffee-table': { label: 'Coffee Table', size: { width: 4, height: 2 }, color: '#d4a574', category: 'tables' },
  'desk': { label: 'Desk', size: { width: 5, height: 2.5 }, color: '#d4a574', category: 'tables' },
  'nightstand': { label: 'Nightstand', size: { width: 2, height: 2 }, color: '#d4a574', category: 'tables' },

  // Beds
  'bed-king': { label: 'King Bed', size: { width: 6.5, height: 7 }, color: '#e2e8f0', category: 'beds' },
  'bed-queen': { label: 'Queen Bed', size: { width: 5, height: 6.5 }, color: '#e2e8f0', category: 'beds' },
  'bed-full': { label: 'Full Bed', size: { width: 4.5, height: 6.5 }, color: '#e2e8f0', category: 'beds' },
  'bed-twin': { label: 'Twin Bed', size: { width: 3.5, height: 6.5 }, color: '#e2e8f0', category: 'beds' },

  // Storage
  'wardrobe': { label: 'Wardrobe', size: { width: 6, height: 2 }, color: '#a1887f', category: 'storage' },
  'dresser': { label: 'Dresser', size: { width: 5, height: 1.5 }, color: '#a1887f', category: 'storage' },
  'bookshelf': { label: 'Bookshelf', size: { width: 3, height: 1 }, color: '#a1887f', category: 'storage' },
  'tv-stand': { label: 'TV Stand', size: { width: 5, height: 1.5 }, color: '#64748b', category: 'storage' },

  // Appliances
  'refrigerator': { label: 'Refrigerator', size: { width: 3, height: 3 }, color: '#cbd5e1', category: 'appliances' },
  'stove': { label: 'Stove/Oven', size: { width: 2.5, height: 2.5 }, color: '#cbd5e1', category: 'appliances' },
  'dishwasher': { label: 'Dishwasher', size: { width: 2, height: 2 }, color: '#cbd5e1', category: 'appliances' },
  'washer': { label: 'Washer', size: { width: 2.5, height: 2.5 }, color: '#cbd5e1', category: 'appliances' },
  'dryer': { label: 'Dryer', size: { width: 2.5, height: 2.5 }, color: '#cbd5e1', category: 'appliances' },
  'sink-kitchen': { label: 'Kitchen Sink', size: { width: 3, height: 2 }, color: '#94a3b8', category: 'appliances' },

  // Bathroom
  'toilet': { label: 'Toilet', size: { width: 1.5, height: 2.5 }, color: '#f1f5f9', category: 'bathroom' },
  'bathtub': { label: 'Bathtub', size: { width: 5, height: 2.5 }, color: '#f1f5f9', category: 'bathroom' },
  'shower': { label: 'Shower', size: { width: 3, height: 3 }, color: '#bae6fd', category: 'bathroom' },
  'sink-bathroom': { label: 'Bathroom Sink', size: { width: 2, height: 1.5 }, color: '#f1f5f9', category: 'bathroom' },
  'vanity': { label: 'Vanity', size: { width: 4, height: 2 }, color: '#d4a574', category: 'bathroom' },
};

// Measurement annotation
export interface MeasurementLine {
  id: string;
  start: Point;
  end: Point;
  label?: string; // Override auto-calculated length
}

// Text/marker annotations
export interface Annotation {
  id: string;
  position: Point;
  text: string;
  type: 'note' | 'measurement' | 'repair' | 'electrical' | 'plumbing';
}

// Floor for multi-floor support
export interface Floor {
  id: string;
  name: string;
  level: number; // 0 = ground floor, 1 = second floor, -1 = basement
  rooms: Room[];
  doors: Door[];
  windows: Window[];
  furniture: FurnitureItem[];
  annotations: Annotation[];
  measurements: MeasurementLine[];
}

// Editor state
export interface EditorState {
  floors: Floor[];
  currentFloorId: string;

  // Selection
  selectedId: string | null;
  selectedType: 'room' | 'door' | 'window' | 'annotation' | 'furniture' | 'measurement' | null;

  // View
  zoom: number;
  pan: Point;

  // Editing
  editingDimension: { roomId: string; dimension: 'width' | 'height' } | null;

  // Plan info
  planName: string;
  defaultCeilingHeight: number;
}

// Interaction modes
export type InteractionMode =
  | 'view'           // pan and zoom only
  | 'select'         // tap to select, drag to move selected
  | 'add-room'       // adding a new room
  | 'add-door'       // placing a door
  | 'add-window'     // placing a window
  | 'add-furniture'  // placing furniture
  | 'add-measurement'// drawing measurement line
  | 'add-annotation' // placing annotation
  | 'draw-room';     // drawing custom room shape

// Snap settings
export const SNAP_THRESHOLD = 2; // feet - how close before snapping (increased for better UX)

// Utility functions
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateRoomArea(room: Room): number {
  if (room.shape === 'rectangle') {
    return room.size.width * room.size.height;
  }
  // For polygon rooms, calculate area using shoelace formula
  if (room.points && room.points.length >= 3) {
    let area = 0;
    const n = room.points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += room.points[i].x * room.points[j].y;
      area -= room.points[j].x * room.points[i].y;
    }
    return Math.abs(area / 2);
  }
  return 0;
}

export function getTotalArea(rooms: Room[]): number {
  return rooms.reduce((sum, room) => sum + calculateRoomArea(room), 0);
}

// Get room edges for snapping
export interface Edge {
  start: Point;
  end: Point;
  type: 'top' | 'right' | 'bottom' | 'left';
}

export function getRoomEdges(room: Room): Edge[] {
  const { x, y } = room.position;
  const { width, height } = room.size;

  return [
    { start: { x, y }, end: { x: x + width, y }, type: 'top' },
    { start: { x: x + width, y }, end: { x: x + width, y: y + height }, type: 'right' },
    { start: { x, y: y + height }, end: { x: x + width, y: y + height }, type: 'bottom' },
    { start: { x, y }, end: { x, y: y + height }, type: 'left' },
  ];
}

// Calculate distance between two points
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Find snap position for a room being dragged
export function findSnapPosition(
  movingRoom: Room,
  otherRooms: Room[],
  threshold: number = SNAP_THRESHOLD
): Point | null {
  const movingEdges = getRoomEdges(movingRoom);
  let bestSnap: { position: Point; distance: number } | null = null;

  for (const otherRoom of otherRooms) {
    if (otherRoom.id === movingRoom.id) continue;

    const otherEdges = getRoomEdges(otherRoom);

    // Check each edge combination for potential snap
    for (const movingEdge of movingEdges) {
      for (const otherEdge of otherEdges) {
        // Check if edges are parallel and close
        const snap = checkEdgeSnap(movingRoom, movingEdge, otherEdge, threshold);
        if (snap && (!bestSnap || snap.distance < bestSnap.distance)) {
          bestSnap = snap;
        }
      }
    }
  }

  return bestSnap?.position || null;
}

function checkEdgeSnap(
  room: Room,
  movingEdge: Edge,
  targetEdge: Edge,
  threshold: number
): { position: Point; distance: number } | null {
  // Horizontal edges (top/bottom) - snap to same Y level OR adjacent (one's bottom to other's top)
  const movingIsHorizontal = movingEdge.type === 'top' || movingEdge.type === 'bottom';
  const targetIsHorizontal = targetEdge.type === 'top' || targetEdge.type === 'bottom';

  if (movingIsHorizontal && targetIsHorizontal) {
    const yDiff = Math.abs(movingEdge.start.y - targetEdge.start.y);
    if (yDiff < threshold) {
      // Check if there's ANY horizontal proximity (not just overlap)
      const movingMinX = movingEdge.start.x;
      const movingMaxX = movingEdge.end.x;
      const targetMinX = targetEdge.start.x;
      const targetMaxX = targetEdge.end.x;

      // Allow snap if edges are within threshold distance horizontally too
      const horizontalGap = Math.max(0, Math.max(movingMinX - targetMaxX, targetMinX - movingMaxX));
      if (horizontalGap < threshold * 2) {
        const snapY = targetEdge.start.y - (movingEdge.type === 'bottom' ? room.size.height : 0);
        return {
          position: { x: room.position.x, y: snapY },
          distance: yDiff,
        };
      }
    }
  }

  // Vertical edges (left/right) - snap to same X level OR adjacent
  const movingIsVertical = movingEdge.type === 'left' || movingEdge.type === 'right';
  const targetIsVertical = targetEdge.type === 'left' || targetEdge.type === 'right';

  if (movingIsVertical && targetIsVertical) {
    const xDiff = Math.abs(movingEdge.start.x - targetEdge.start.x);
    if (xDiff < threshold) {
      // Check if there's ANY vertical proximity
      const movingMinY = movingEdge.start.y;
      const movingMaxY = movingEdge.end.y;
      const targetMinY = targetEdge.start.y;
      const targetMaxY = targetEdge.end.y;

      const verticalGap = Math.max(0, Math.max(movingMinY - targetMaxY, targetMinY - movingMaxY));
      if (verticalGap < threshold * 2) {
        const snapX = targetEdge.start.x - (movingEdge.type === 'right' ? room.size.width : 0);
        return {
          position: { x: snapX, y: room.position.y },
          distance: xDiff,
        };
      }
    }
  }

  return null;
}

// Get the world position of a door based on its room
export function getDoorPosition(door: Door, room: Room): Point {
  const { position: roomPos, size } = room;

  switch (door.wall) {
    case 'top':
      return { x: roomPos.x + size.width * door.position, y: roomPos.y };
    case 'bottom':
      return { x: roomPos.x + size.width * door.position, y: roomPos.y + size.height };
    case 'left':
      return { x: roomPos.x, y: roomPos.y + size.height * door.position };
    case 'right':
      return { x: roomPos.x + size.width, y: roomPos.y + size.height * door.position };
  }
}

// Get the world position of a window based on its room
export function getWindowPosition(window: Window, room: Room): Point {
  const { position: roomPos, size } = room;

  switch (window.wall) {
    case 'top':
      return { x: roomPos.x + size.width * window.position, y: roomPos.y };
    case 'bottom':
      return { x: roomPos.x + size.width * window.position, y: roomPos.y + size.height };
    case 'left':
      return { x: roomPos.x, y: roomPos.y + size.height * window.position };
    case 'right':
      return { x: roomPos.x + size.width, y: roomPos.y + size.height * window.position };
  }
}

// L-shape room presets
export const L_SHAPE_PRESETS = {
  'l-shape-small': {
    label: 'L-Shape Small',
    // Points define the polygon clockwise from top-left
    points: [
      { x: 0, y: 0 },
      { x: 15, y: 0 },
      { x: 15, y: 10 },
      { x: 8, y: 10 },
      { x: 8, y: 15 },
      { x: 0, y: 15 },
    ],
  },
  'l-shape-large': {
    label: 'L-Shape Large',
    points: [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 12 },
      { x: 10, y: 12 },
      { x: 10, y: 20 },
      { x: 0, y: 20 },
    ],
  },
};
