/**
 * Core type definitions for the Excel Data Cleaner module.
 */

export type ExcelRow = Record<string, unknown>;

export interface ColumnMeta {
  key: string;
  label: string;
  detectedType: 'string' | 'number' | 'date' | 'boolean' | 'mixed' | 'empty';
  emptyCount: number;
  uniqueCount: number;
}

export interface CleaningOperation {
  type: 'trim' | 'remove-duplicates' | 'remove-rows' | 'initial';
  description: string;
  previousData: ExcelRow[];
  timestamp: number;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string | null;
}

export interface TargetField {
  key: string;
  label: string;
  required?: boolean;
  type?: 'string' | 'number' | 'date';
}

export interface DataCleanerProps {
  onDataReady?: (data: ExcelRow[], mappings: ColumnMapping[]) => void;
  onCancel?: () => void;
  targetFields?: TargetField[];  // For column mapping step
  maxRows?: number;              // Default: 5000
  maxColumns?: number;           // Default: 50
  className?: string;
}

export type WizardStep = 'upload' | 'sheet-select' | 'preview-clean' | 'map-columns' | 'confirm-export';

export interface WizardState {
  currentStep: WizardStep;
  file: File | null;
  workbook: any | null; // SheetJS WorkBook
  sheetNames: string[];
  selectedSheet: string | null;
  rawData: ExcelRow[];
  data: ExcelRow[];
  columns: ColumnMeta[];
  mappings: ColumnMapping[];
  history: CleaningOperation[];
  historyIndex: number;
}
