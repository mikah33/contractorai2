import { WebPlugin } from '@capacitor/core';
import type { LiDARScannerPlugin, LiDARSupportResult, RoomScanResult, QuickMeasureResult } from './lidarScannerService';

export class LiDARScannerWeb extends WebPlugin implements LiDARScannerPlugin {
  async checkLiDARSupport(): Promise<LiDARSupportResult> {
    return {
      hasLiDAR: false,
      hasRoomPlan: false,
      iosVersion: 'N/A',
      deviceModel: 'Web Browser',
      error: 'LiDAR scanning is only available on iOS devices with LiDAR sensors (iPhone 12 Pro and newer, iPad Pro)'
    };
  }

  async startRoomScan(): Promise<RoomScanResult> {
    throw new Error('Room scanning is only available on iOS devices with LiDAR sensors');
  }

  async startQuickMeasure(): Promise<QuickMeasureResult> {
    throw new Error('Quick measure is only available on iOS devices with LiDAR sensors');
  }
}
