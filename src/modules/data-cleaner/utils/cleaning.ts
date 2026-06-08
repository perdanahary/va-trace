import { ExcelRow } from '../types';

export const trimAllCells = (data: ExcelRow[]): ExcelRow[] => {
  return data.map(row => {
    const newRow: ExcelRow = { ...row };
    Object.keys(newRow).forEach(key => {
      if (typeof newRow[key] === 'string') {
        newRow[key] = (newRow[key] as string).trim();
      }
    });
    return newRow;
  });
};

export const getDuplicateIndices = (data: ExcelRow[]): Set<number> => {
  const seen = new Set<string>();
  const duplicates = new Set<number>();

  data.forEach((row, index) => {
    const stringified = JSON.stringify(row);
    if (seen.has(stringified)) {
      duplicates.add(index);
    } else {
      seen.add(stringified);
    }
  });

  return duplicates;
};

export const removeDuplicates = (data: ExcelRow[]): ExcelRow[] => {
  const seen = new Set<string>();
  return data.filter(row => {
    const stringified = JSON.stringify(row);
    if (seen.has(stringified)) {
      return false;
    }
    seen.add(stringified);
    return true;
  });
};

export const isRowEmpty = (row: ExcelRow): boolean => {
  return Object.values(row).every(val => val === null || val === undefined || val === '');
};

export const removeEmptyRows = (data: ExcelRow[]): ExcelRow[] => {
  return data.filter(row => !isRowEmpty(row));
};
