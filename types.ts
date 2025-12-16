
export interface Column {
  key: string;
  label: string;
  subLabel?: string; // For things like units (ppm) or ranges (7.2-7.8)
  type: 'text' | 'number' | 'date' | 'time' | 'select' | 'status';
  width?: string;
  group?: string; // For grouped headers (e.g., "9:00 AM")
}

export interface TableTemplate {
  id: string;
  name: string;
  description: string;
  context: string; // The specific context string for the AI
  columns: Column[];
  defaultRows: number;
  aiRules: string; // Specific constraints for the AI prompt
}

export interface SimulationConfig {
  fillRate: number; // 0 to 100
  anomalyChance: number; // 0 to 100
  mode: 'compliant' | 'realistic' | 'chaos';
  targetMonth: string; // Format: YYYY-MM
}

export type RowData = Record<string, string | number | null>;

export interface GeneratedResponse {
  rows: RowData[];
  summary?: string;
}

export interface MaintenanceDocument {
  id: string;
  title: string;
  category: 'Hygiene' | 'Safety' | 'Equipment' | 'Structural' | 'General';
  lastUpdated: string;
  nextReview: string;
  status: 'Compliant' | 'Review Needed' | 'Draft';
  content: string;
  authority: string; // e.g., "Health Ministry", "Internal Policy"
}