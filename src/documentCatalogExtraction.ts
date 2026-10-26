import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker } from 'tesseract.js';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type CatalogRow = Record<string, string>;

function parseDelimited(text: string): CatalogRow[] {
  const first = text.split(/\r?\n/).find(line => line.trim()) || '';
  const delimiter = [',', '\t', ';', '|'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const matrix: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (c === '"' && quoted && next === '"') { cell += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === delimiter && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && next === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) matrix.push(row);
      row = []; cell = '';
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) matrix.push(row);
  if (matrix.length < 2) return [];
  const headers = matrix[0].map((value, index) => value || `Column ${index + 1}`);
  return matrix.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function rowsFromText(text: string): CatalogRow[] {
  const cleaned = text.replace(/\u0000/g, '').replace(/\r/g, '');
  const firstLine = cleaned.split('\n').find(line => line.trim()) || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  if (firstLine.includes('\\t') || /[;|]/.test(firstLine) || commaCount >= 2) {
    const delimited = parseDelimited(cleaned);
    if (delimited.length) return delimited;
  }
  const lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const splitLines = lines.map(line => line.split(/\t+|\s{2,}/).map(value => value.trim()).filter(Boolean));
  const widest = Math.max(...splitLines.slice(0, Math.min(20, splitLines.length)).map(line => line.length));
  if (widest >= 2) {
    const headers = splitLines[0].map((value, index) => value || `Column ${index + 1}`);
    const data = splitLines.slice(1).filter(line => line.length >= 2);
    if (data.length) return data.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
  }
  const pricePattern = /(?:₦|NGN\s*)?\d[\d,]*(?:\.\d{1,2})?(?:\s*(?:NGN|naira))?\s*$/i;
  const parsed = lines.map(line => {
    const match = line.match(pricePattern);
    if (!match) return null;
    const price = match[0].replace(/\s*(?:NGN|naira)$/i, '').trim();
    const product = line.slice(0, match.index).replace(/[|:–—-]+\s*$/, '').trim();
    return product ? { 'Product Name': product, Price: price } : null;
  }).filter((row): row is CatalogRow => Boolean(row));
  return parsed;
}

async function ocrImage(image: HTMLCanvasElement | HTMLImageElement | ImageBitmap): Promise<string> {
  const worker = await createWorker('eng');
  try {
    const result = await worker.recognize(image);
    return result.data.text || '';
  } finally {
    await worker.terminate();
  }
}

export async function extractCatalogRows(file: File): Promise<CatalogRow[]> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (['csv', 'tsv', 'txt'].includes(extension)) {
    return parseDelimited(await file.text());
  }
  if (['xls', 'xlsx', 'xlsm', 'ods'].includes(extension)) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const rows = parseDelimited(XLSX.utils.sheet_to_csv(sheet));
      if (rows.length) return rows;
      const text = XLSX.utils.sheet_to_txt(sheet);
      const inferred = rowsFromText(text);
      if (inferred.length) return inferred;
    }
    return [];
  }
  if (['docx'].includes(extension)) {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return rowsFromText(result.value);
  }
  if (extension === 'pdf') {
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    if (pdf.numPages > 50) throw new Error('PDFs are limited to 50 pages per upload. Split this document and try again.');
    const pageTexts: string[] = [];
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const line = content.items.map(item => ('str' in item ? item.str : '')).join(' ');
      pageTexts.push(line);
    }
    const extracted = rowsFromText(pageTexts.join('\n'));
    if (extracted.length) return extracted;
    const worker = await createWorker('eng');
    const ocrTexts: string[] = [];
    try {
      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
        const page = await pdf.getPage(pageNo);
        const viewport = page.getViewport({ scale: 1.6 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d');
        if (!context) continue;
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const result = await worker.recognize(canvas);
        ocrTexts.push(result.data.text || '');
        canvas.width = 0;
        canvas.height = 0;
      }
    } finally {
      await worker.terminate();
    }
    return rowsFromText(ocrTexts.join('\n'));
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff'].includes(extension)) {
    const bitmap = await createImageBitmap(file);
    try { return rowsFromText(await ocrImage(bitmap)); }
    finally { bitmap.close(); }
  }
  throw new Error('Unsupported file type. Upload Excel, Word (.docx), PDF, CSV, TSV, TXT or an image of a product list.');
}
