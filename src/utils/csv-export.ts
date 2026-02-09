/**
 * CSV Export/Import utilities
 */

export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  formatter?: (value: any, row: T) => string;
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  if (data.length === 0) {
    throw new Error('Nenhum dado para exportar');
  }

  // Build header row
  const headerRow = columns.map(col => `"${col.header}"`).join(',');

  // Build data rows
  const dataRows = data.map(row => {
    return columns.map(col => {
      const keys = (col.key as string).split('.');
      let value: any = row;
      for (const key of keys) {
        value = value?.[key];
      }

      if (col.formatter) {
        value = col.formatter(value, row);
      }

      // Handle nulls/undefined
      if (value === null || value === undefined) {
        return '""';
      }

      // Escape double quotes and wrap in quotes
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  });

  // Combine and create blob
  const csvContent = [headerRow, ...dataRows].join('\n');
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCSV<T>(
  csvText: string,
  columnMap: Record<string, keyof T>
): Partial<T>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV vazio ou sem dados');
  }

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  // Map headers to keys
  const headerKeyMap: (keyof T | null)[] = headers.map(h => {
    const cleanHeader = h.toLowerCase().trim();
    for (const [csvHeader, key] of Object.entries(columnMap)) {
      if (csvHeader.toLowerCase() === cleanHeader) {
        return key;
      }
    }
    return null;
  });

  // Parse data rows
  const results: Partial<T>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Partial<T> = {};

    headerKeyMap.forEach((key, idx) => {
      if (key && values[idx] !== undefined) {
        (row as any)[key] = values[idx];
      }
    });

    if (Object.keys(row).length > 0) {
      results.push(row);
    }
  }

  return results;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

export function downloadTemplate(columns: string[], filename: string): void {
  const headerRow = columns.map(col => `"${col}"`).join(',');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + headerRow + '\n'], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
