import { registerPlugin } from '@capacitor/core';

export interface RecentLead {
  id: string;
  name: string;
  source: string;
  calculatorType?: string;
  estimatedValue?: number;
  createdAt: string;
}

export interface TimesheetEntry {
  employeeId: string;
  employeeName: string;
  startTime: string;
  isRunning: boolean;
  elapsedMinutes: number;
}

export interface WidgetDataPlugin {
  updateLeadsWidget(options: { newCount: number; recentLeads: RecentLead[] }): Promise<{ success: boolean }>;
  updateTimesheetWidget(options: { entries: TimesheetEntry[] }): Promise<{ success: boolean }>;
}

const WidgetData = registerPlugin<WidgetDataPlugin>('WidgetData');
export default WidgetData;
