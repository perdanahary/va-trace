import * as XLSX from 'xlsx';
import { ExcelRow, ColumnMeta } from '../types';

export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

export const detectColumnType = (values: unknown[]): ColumnMeta['detectedType'] => {
  if (values.length === 0) return 'empty';
  
  const types = new Set<string>();
  
  for (const val of values) {
    if (val === null || val === undefined || val === '') continue;
    
    if (val instanceof Date) {
      types.add('date');
    } else if (typeof val === 'number') {
      types.add('number');
    } else if (typeof val === 'boolean') {
      types.add('boolean');
    } else if (typeof val === 'string') {
      // Try to parse date or number from string? 
      // For now, keep it simple as per plan.
      types.add('string');
    }
  }

  if (types.size === 0) return 'empty';
  if (types.size > 1) return 'mixed';
  return Array.from(types)[0] as ColumnMeta['detectedType'];
};

export const getColumnMeta = (data: ExcelRow[], keys: string[]): ColumnMeta[] => {
  return keys.map(key => {
    const values = data.map(row => row[key]);
    const nonNullableValues = values.filter(v => v !== null && v !== undefined && v !== '');
    
    return {
      key,
      label: key,
      detectedType: detectColumnType(values),
      emptyCount: values.length - nonNullableValues.length,
      uniqueCount: new Set(nonNullableValues).size
    };
  });
};

export const sampleColumnValues = (data: ExcelRow[], column: string, count: number = 3): unknown[] => {
  return data
    .slice(0, 100) // Sample from first 100 rows
    .map(row => row[column])
    .filter(v => v !== null && v !== undefined && v !== '')
    .slice(0, count);
};
