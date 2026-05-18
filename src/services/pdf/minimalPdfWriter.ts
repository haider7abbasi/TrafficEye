/**
 * Minimal PDF 1.4 writer (single page, Helvetica) — no native dependencies.
 */

export type PdfRgb = { r: number; g: number; b: number };

export type PdfFont = 'regular' | 'bold';

function rgb01(c: PdfRgb): string {
  return `${(c.r / 255).toFixed(3)} ${(c.g / 255).toFixed(3)} ${(c.b / 255).toFixed(3)}`;
}

export class MinimalPdfWriter {
  private readonly width: number;
  private readonly height: number;
  private readonly commands: string[] = [];

  constructor(width = 595, height = 842) {
    this.width = width;
    this.height = height;
  }

  get pageWidth(): number {
    return this.width;
  }

  get pageHeight(): number {
    return this.height;
  }

  private fontResource(font: PdfFont): string {
    return font === 'bold' ? 'F2' : 'F1';
  }

  filledRect(x: number, y: number, w: number, h: number, color: PdfRgb): void {
    const c = rgb01(color);
    this.commands.push(`${c} rg`, `${x} ${y} ${w} ${h} re f`);
  }

  strokedRect(x: number, y: number, w: number, h: number, color: PdfRgb, lineWidth = 0.75): void {
    const c = rgb01(color);
    this.commands.push(`${lineWidth} w`, `${c} RG`, `${x} ${y} ${w} ${h} re S`);
  }

  line(x1: number, y1: number, x2: number, y2: number, color: PdfRgb, lineWidth = 0.5): void {
    const c = rgb01(color);
    this.commands.push(`${lineWidth} w`, `${c} RG`, `${x1} ${y1} m ${x2} ${y2} l S`);
  }

  text(
    x: number,
    y: number,
    value: string,
    options: { size?: number; font?: PdfFont; color?: PdfRgb } = {},
  ): void {
    const size = options.size ?? 10;
    const font = this.fontResource(options.font ?? 'regular');
    const escaped = escapePdfText(value);
    if (options.color) {
      const c = rgb01(options.color);
      this.commands.push(`${c} rg`);
    }
    this.commands.push(`BT ${font} ${size} Tf ${x} ${y} Td (${escaped}) Tj ET`);
  }

  textRight(
    rightX: number,
    y: number,
    value: string,
    options: { size?: number; font?: PdfFont; color?: PdfRgb } = {},
  ): void {
    const size = options.size ?? 10;
    const approxWidth = value.length * size * 0.52;
    this.text(rightX - approxWidth, y, value, options);
  }

  wrapTextLines(
    text: string,
    maxCharsPerLine: number,
  ): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return [''];
    }
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= maxCharsPerLine) {
        current = next;
      } else {
        if (current) {
          lines.push(current);
        }
        current = word.length > maxCharsPerLine ? word.slice(0, maxCharsPerLine) : word;
      }
    }
    if (current) {
      lines.push(current);
    }
    return lines;
  }

  buildBase64(): string {
    const stream = `${this.commands.join('\n')}\n`;
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
      `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    ];

    const header = '%PDF-1.4\n';
    let offset = header.length;
    const xref: number[] = [0];
    const bodyParts: string[] = [header];

    for (let i = 0; i < objects.length; i++) {
      xref.push(offset);
      const chunk = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
      offset += chunk.length;
      bodyParts.push(chunk);
    }

    const xrefStart = offset;
    let xrefTable = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) {
      xrefTable += `${String(xref[i]).padStart(10, '0')} 00000 n \n`;
    }
    const trailer = `trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefStart}\n%%EOF`;
    bodyParts.push(xrefTable, trailer);

    const pdf = bodyParts.join('');
    return encodeBase64(pdf);
  }
}

export function escapePdfText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?');
}

export function encodeBase64(pdf: string): string {
  const maybeBuffer = (globalThis as {
    Buffer?: { from: (s: string, e: string) => { toString: (e: string) => string } };
  }).Buffer;
  if (maybeBuffer) {
    return maybeBuffer.from(pdf, 'utf8').toString('base64');
  }
  const withBtoa = globalThis as { btoa?: (data: string) => string };
  if (typeof withBtoa.btoa === 'function') {
    return withBtoa.btoa(pdf);
  }
  throw new Error('No base64 encoder available in this runtime.');
}

export function decodeBase64Pdf(base64: string): string {
  const maybeBuffer = (globalThis as {
    Buffer?: { from: (s: string, e: string) => { toString: (e: string) => string } };
  }).Buffer;
  if (maybeBuffer) {
    return maybeBuffer.from(base64, 'base64').toString('utf8');
  }
  const atobFn = (globalThis as { atob?: (data: string) => string }).atob;
  if (typeof atobFn === 'function') {
    return atobFn(base64);
  }
  throw new Error('No base64 decoder available.');
}
