import { registerPlugin } from '@capacitor/core';

export interface DocumentScannerPlugin {
  scanDocument(): Promise<ScanResult>;
  isAvailable(): Promise<{ available: boolean }>;
}

export interface ScanResult {
  pageCount: number;
  vendor: string;
  amount: number;
  date: string;
  taxAmount: number;
  subtotal: number;
  receiptNumber: string;
  rawText: string;
  imagePath: string;
  pages: ScanPage[];
}

export interface ScanPage {
  pageIndex: number;
  imagePath: string;
  rawText: string;
  vendor?: string;
  amount?: number;
  date?: string;
  taxAmount?: number;
  subtotal?: number;
  receiptNumber?: string;
}

const DocumentScanner = registerPlugin<DocumentScannerPlugin>('DocumentScanner', {
  web: () => import('./documentScannerWeb').then(m => new m.DocumentScannerWeb()),
});

export default DocumentScanner;
