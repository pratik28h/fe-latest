import * as XLSX from 'xlsx';

export interface ParsedFileData {
  columns: string[];
  data: any[];
}

export function parseCSVFile(content: string): ParsedFileData {
  const lines = content.trim().split('\n');
  if (lines.length === 0) {
    return { columns: [], data: [] };
  }

  // Parse header
  const columns = lines[0].split(',').map((col) => col.trim());

  // Parse data rows
  const data = lines.slice(1).map((line) => {
    const values = line.split(',').map((val) => val.trim());
    const row: any = {};
    columns.forEach((col, index) => {
      row[col] = values[index] || '';
    });
    return row;
  });

  return { columns, data };
}

export function parseExcelFile(arrayBuffer: ArrayBuffer): ParsedFileData {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet);

  if (data.length === 0) {
    return { columns: [], data: [] };
  }

  const columns = Object.keys(data[0]);
  return { columns, data };
}

export async function parseFile(file: File): Promise<ParsedFileData> {
  const fileExt = file.name.split('.').pop()?.toLowerCase();

  if (fileExt === 'csv') {
    const content = await file.text();
    return parseCSVFile(content);
  } else if (['xlsx', 'xls'].includes(fileExt || '')) {
    const arrayBuffer = await file.arrayBuffer();
    return parseExcelFile(arrayBuffer);
  } else if (fileExt === 'json') {
    const content = await file.text();
    const jsonData = JSON.parse(content);
    const isArray = Array.isArray(jsonData);
    const dataArray = isArray ? jsonData : [jsonData];
    const columns = Object.keys(dataArray[0] || {});
    return { columns, data: dataArray };
  }

  throw new Error(`Unsupported file type: ${fileExt}`);
}