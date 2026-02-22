import { WebPlugin } from '@capacitor/core';
import type { AutoMileageTrackerPlugin, TrackingStatus, CurrentTripInfo } from './autoMileageService';

export class AutoMileageTrackerWeb extends WebPlugin implements AutoMileageTrackerPlugin {
  async startTracking(): Promise<{ success: boolean; status: string }> {
    console.warn('Auto mileage tracking is only available on iOS');
    return { success: false, status: 'unsupported' };
  }

  async stopTracking(): Promise<{ success: boolean }> {
    return { success: false };
  }

  async getTrackingStatus(): Promise<TrackingStatus> {
    return { isTracking: false, isInTrip: false, permissionStatus: 'notDetermined' };
  }

  async getCurrentTrip(): Promise<CurrentTripInfo> {
    return { active: false };
  }

  async getCompletedTrips(): Promise<{ trips: never[] }> {
    return { trips: [] };
  }

  async clearCompletedTrips(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async requestAlwaysPermission(): Promise<{ status: string }> {
    return { status: 'unsupported' };
  }

  async getPermissionStatus(): Promise<{ status: string }> {
    return { status: 'unsupported' };
  }
}
