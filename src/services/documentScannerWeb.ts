import { WebPlugin } from '@capacitor/core';
import type { DocumentScannerPlugin, ScanResult } from './documentScannerService';

export class DocumentScannerWeb extends WebPlugin implements DocumentScannerPlugin {
  async scanDocument(): Promise<ScanResult> {
    throw new Error('Document scanning is only available on iOS');
  }

  async isAvailable(): Promise<{ available: boolean }> {
    return { available: false };
  }
}
