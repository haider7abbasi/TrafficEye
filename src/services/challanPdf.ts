import type { SpecViolationId } from '../rules/specViolationMapping';
import { specViolationLabel } from '../rules/specViolationMapping';

export type ChallanPdfPayload = {
  challanId: string;
  confirmedAtIso: string;
  expiresAtIso: string;
  officerName: string;
  officerBadge?: string;
  officerDepartment?: string;
  plateDisplay: string;
  plateCanonical: string;
  locationText?: string;
  violationTypes: SpecViolationId[];
};

function escapePdfText(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Very small PDF generator for challan documents.
 * Generates a single-page text PDF without external dependencies.
 */
export function buildChallanPdfBase64(payload: ChallanPdfPayload): string {
  const lines = [
    'TrafficEye Challan',
    `Reference: ${payload.challanId}`,
    `Issued: ${payload.confirmedAtIso}`,
    `Expires: ${payload.expiresAtIso}`,
    `Officer: ${payload.officerName}`,
    `Badge: ${payload.officerBadge || '-'}`,
    `Department: ${payload.officerDepartment || '-'}`,
    `Plate: ${payload.plateDisplay} (${payload.plateCanonical})`,
    `Location: ${payload.locationText || '-'}`,
    `Violations: ${payload.violationTypes.map(specViolationLabel).join(', ') || '-'}`,
  ];

  const textOps = lines
    .map((line, idx) => {
      const y = 760 - idx * 20;
      return `BT /F1 12 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
    })
    .join('\n');

  const content = `${textOps}\n`;
  const contentLength = content.length;

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${contentLength} >>
stream
${content}endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000062 00000 n 
0000000120 00000 n 
0000000246 00000 n 
0000000316 00000 n 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
${316 + contentLength + 37}
%%EOF`;

  const maybeBuffer = (globalThis as { Buffer?: { from: (s: string, e: string) => { toString: (e: string) => string } } }).Buffer;
  if (maybeBuffer) {
    return maybeBuffer.from(pdf, 'utf8').toString('base64');
  }
  const withBtoa = globalThis as { btoa?: (data: string) => string };
  if (typeof withBtoa.btoa === 'function') {
    return withBtoa.btoa(pdf);
  }
  throw new Error('No base64 encoder available in this runtime.');
}
