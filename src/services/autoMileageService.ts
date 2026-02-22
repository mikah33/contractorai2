import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface AutoMileageTrackerPlugin {
  startTracking(): Promise<{ success: boolean; status: string }>;
  stopTracking(): Promise<{ success: boolean }>;
  getTrackingStatus(): Promise<TrackingStatus>;
  getCurrentTrip(): Promise<CurrentTripInfo>;
  getCompletedTrips(): Promise<{ trips: CompletedTrip[] }>;
  clearCompletedTrips(): Promise<{ success: boolean }>;
  requestAlwaysPermission(): Promise<{ status: string }>;
  getPermissionStatus(): Promise<{ status: string }>;
  addListener(
    eventName: 'tripCompleted',
    listenerFunc: (trip: CompletedTrip) => void
  ): Promise<PluginListenerHandle>;
}

export interface TrackingStatus {
  isTracking: boolean;
  isInTrip: boolean;
  permissionStatus: 'notDetermined' | 'authorizedWhenInUse' | 'authorizedAlways' | 'denied' | 'restricted';
}

export interface CurrentTripInfo {
  active: boolean;
  startTime?: string;
  elapsedSeconds?: number;
  currentMiles?: number;
  pointCount?: number;
}

export interface CompletedTrip {
  id: string;
  startTime: string;
  endTime: string;
  startAddress: string;
  endAddress: string;
  totalMiles: number;
  durationSeconds: number;
  pointCount: number;
}

const AutoMileageTracker = registerPlugin<AutoMileageTrackerPlugin>('AutoMileageTracker', {
  web: () => import('./autoMileageWeb').then(m => new m.AutoMileageTrackerWeb()),
});

export default AutoMileageTracker;

const STORAGE_KEY = 'autoMileageEnabled';

export function getAutoTrackPreference(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setAutoTrackPreference(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}
