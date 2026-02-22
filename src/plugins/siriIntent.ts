import { registerPlugin } from '@capacitor/core';

export interface SiriIntentPlugin {
  syncAuthToken(options: {
    accessToken: string;
    refreshToken: string;
    userId?: string;
  }): Promise<{ success: boolean }>;

  clearAuthToken(): Promise<{ success: boolean }>;

  hasAuthToken(): Promise<{ hasToken: boolean }>;
}

export const SiriIntent = registerPlugin<SiriIntentPlugin>('SiriIntent');
