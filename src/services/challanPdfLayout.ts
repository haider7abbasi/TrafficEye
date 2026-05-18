import type { SpecViolationId } from '../rules/specViolationMapping';
import { specViolationLabel } from '../rules/specViolationMapping';
import type { ChallanPdfPayload } from './challanPdf';
import { MinimalPdfWriter, type PdfRgb } from './pdf/minimalPdfWriter';

const BRAND_BLUE: PdfRgb = { r: 0, g: 87, b: 184 };
const BRAND_BLUE_DEEP: PdfRgb = { r: 0, g: 58, b: 122 };
const INK: PdfRgb = { r: 18, g: 32, b: 52 };
const MUTED: PdfRgb = { r: 92, g: 108, b: 128 };
const PANEL: PdfRgb = { r: 244, g: 247, b: 252 };
const BORDER: PdfRgb = { r: 210, g: 220, b: 234 };
const WHITE: PdfRgb = { r: 255, g: 255, b: 255 };
const ACCENT: PdfRgb = { r: 198, g: 228, b: 255 };

const VIOLATION_CODE: Record<SpecViolationId, string> = {
  no_seatbelt: 'TV-01',
  no_helmet: 'TV-02',
  mobile_phone_use: 'TV-03',
};

function formatPdfDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return 'Not recorded';
  }
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatPdfDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return 'Not recorded';
  }
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function retentionDays(issuedIso: string, expiresIso: string): number {
  const issued = new Date(issuedIso).getTime();
  const expires = new Date(expiresIso).getTime();
  if (Number.isNaN(issued) || Number.isNaN(expires) || expires <= issued) {
    return 7;
  }
  return Math.max(1, Math.round((expires - issued) / (24 * 60 * 60 * 1000)));
}

function shortRef(path?: string): string {
  if (!path?.trim()) {
    return 'Not attached';
  }
  const trimmed = path.trim();
  if (trimmed.length <= 56) {
    return trimmed;
  }
  return `…${trimmed.slice(-53)}`;
}

function statusLabel(status?: string): string {
  const s = (status ?? 'confirmed').toLowerCase();
  if (s === 'confirmed' || s === 'issued') {
    return 'ISSUED';
  }
  return s.toUpperCase();
}

export function renderChallanPdfContent(payload: ChallanPdfPayload): MinimalPdfWriter {
  const pdf = new MinimalPdfWriter(595, 842);
  const margin = 42;
  const contentW = pdf.pageWidth - margin * 2;
  let y = pdf.pageHeight - margin;

  pdf.filledRect(0, pdf.pageHeight - 108, pdf.pageWidth, 108, BRAND_BLUE);
  pdf.filledRect(0, pdf.pageHeight - 112, pdf.pageWidth, 4, BRAND_BLUE_DEEP);

  pdf.text(margin, y - 28, 'TRAFFICEYE', { size: 11, font: 'bold', color: ACCENT });
  pdf.text(margin, y - 50, 'Electronic Traffic Violation Challan', {
    size: 20,
    font: 'bold',
    color: WHITE,
  });
  pdf.text(margin, y - 72, 'Official notice of detected violation — for enforcement records', {
    size: 9,
    color: ACCENT,
  });
  pdf.textRight(pdf.pageWidth - margin, y - 28, 'Document v2.0', {
    size: 9,
    color: WHITE,
  });
  pdf.textRight(pdf.pageWidth - margin, y - 44, formatPdfDate(payload.confirmedAtIso), {
    size: 9,
    color: ACCENT,
  });

  y -= 128;

  const drawPanel = (height: number): number => {
    const bottom = y - height;
    pdf.filledRect(margin, bottom, contentW, height, WHITE);
    pdf.strokedRect(margin, bottom, contentW, height, BORDER);
    y = bottom;
    return bottom + height;
  };

  const sectionTitle = (title: string) => {
    pdf.text(margin, y, title, { size: 9, font: 'bold', color: BRAND_BLUE });
    y -= 14;
  };

  const drawField = (x: number, baseline: number, label: string, value: string, maxChars: number) => {
    pdf.text(x, baseline, label, { size: 7, font: 'bold', color: MUTED });
    const lines = pdf.wrapTextLines(value || '—', maxChars);
    lines.slice(0, 2).forEach((line, idx) => {
      pdf.text(x, baseline - 14 - idx * 12, line, {
        size: 10,
        font: idx === 0 ? 'bold' : 'regular',
        color: INK,
      });
    });
  };

  const metaH = 52;
  pdf.filledRect(margin, y - metaH, contentW, metaH, PANEL);
  pdf.strokedRect(margin, y - metaH, contentW, metaH, BORDER);
  const colW = contentW / 3;
  const metaLabels = ['CHALLAN REFERENCE', 'DATE & TIME ISSUED', 'STATUS'];
  const metaValues = [
    payload.challanId,
    formatPdfDateTime(payload.confirmedAtIso),
    statusLabel(payload.status),
  ];
  metaLabels.forEach((label, i) => {
    const x = margin + 12 + i * colW;
    pdf.text(x, y - 18, label, { size: 7, font: 'bold', color: MUTED });
    pdf.text(x, y - 34, metaValues[i], { size: 10, font: 'bold', color: INK });
  });
  y -= metaH + 20;

  sectionTitle('1. VIOLATION SUMMARY');
  const violationRows =
    payload.violationTypes.length > 0
      ? payload.violationTypes
      : null;
  const rowCount = violationRows ? violationRows.length : 1;
  const violationH = 28 + rowCount * 22;
  const vTop = drawPanel(violationH);
  pdf.filledRect(margin + 1, vTop - 26, contentW - 2, 22, PANEL);
  pdf.text(margin + 12, vTop - 12, 'CODE', { size: 7, font: 'bold', color: MUTED });
  pdf.text(margin + 72, vTop - 12, 'OFFENCE DESCRIPTION', { size: 7, font: 'bold', color: MUTED });
  if (violationRows) {
    violationRows.forEach((id, idx) => {
      const rowY = vTop - 48 - idx * 22;
      pdf.text(margin + 12, rowY, VIOLATION_CODE[id] ?? 'TV-XX', { size: 9, font: 'bold', color: BRAND_BLUE });
      pdf.text(margin + 72, rowY, specViolationLabel(id), { size: 10, color: INK });
    });
  } else {
    pdf.text(margin + 12, vTop - 48, '—', { size: 9, color: MUTED });
    pdf.text(margin + 72, vTop - 48, 'No violation types recorded', { size: 10, color: INK });
  }
  y -= 10;

  sectionTitle('2. VEHICLE & LOCATION');
  const vehicleH = 72;
  const vehTop = drawPanel(vehicleH);
  const half = (contentW - 24) / 2;
  drawField(margin + 12, vehTop - 18, 'REGISTRATION (DISPLAY)', payload.plateDisplay, Math.floor(half / 5.2));
  drawField(
    margin + 12 + half,
    vehTop - 18,
    'REGISTRATION (CANONICAL)',
    payload.plateCanonical,
    Math.floor(half / 5.2),
  );
  drawField(
    margin + 12,
    vehTop - 54,
    'LOCATION / BEAT',
    payload.locationText?.trim() || 'Not recorded',
    Math.floor((contentW - 24) / 5.2),
  );
  y -= 10;

  sectionTitle('3. ISSUING OFFICER');
  const officerH = 88;
  const offTop = drawPanel(officerH);
  const third = (contentW - 24) / 3;
  drawField(margin + 12, offTop - 18, 'OFFICER NAME', payload.officerName, Math.floor(third / 5.2));
  drawField(
    margin + 12 + third,
    offTop - 18,
    'BADGE NUMBER',
    payload.officerBadge?.trim() || '—',
    Math.floor(third / 5.2),
  );
  drawField(
    margin + 12 + third * 2,
    offTop - 18,
    'DEPARTMENT / UNIT',
    payload.officerDepartment?.trim() || '—',
    Math.floor(third / 5.2),
  );
  pdf.text(margin + 12, offTop - officerH + 22, 'Officer signature', { size: 8, color: MUTED });
  pdf.line(margin + 12, offTop - officerH + 14, margin + 240, offTop - officerH + 14, INK, 0.8);
  y -= 10;

  sectionTitle('4. DIGITAL EVIDENCE (STORED SECURELY)');
  const evidenceH = payload.candidateId ? 92 : 78;
  const evTop = drawPanel(evidenceH);
  drawField(
    margin + 12,
    evTop - 18,
    'FULL-FRAME EVIDENCE',
    shortRef(payload.evidenceImageRef),
    Math.floor((contentW - 24) / 5.2),
  );
  drawField(
    margin + 12,
    evTop - 46,
    'PLATE CROP',
    shortRef(payload.plateCropRef),
    Math.floor((contentW - 24) / 5.2),
  );
  if (payload.candidateId) {
    pdf.text(margin + 12, evTop - evidenceH + 12, `Source candidate: ${payload.candidateId}`, {
      size: 7,
      color: MUTED,
    });
  }
  y -= 10;

  sectionTitle('5. RECORD RETENTION & NOTICE');
  const noticeH = 100;
  const nTop = drawPanel(noticeH);
  const days = retentionDays(payload.confirmedAtIso, payload.expiresAtIso);
  const noticeLines = pdf.wrapTextLines(
    `This challan was generated electronically by TrafficEye upon officer verification of AI-assisted detection. ` +
      `It is valid for enforcement workflow and audit purposes. Original evidence files remain available in secure storage until ` +
      `${formatPdfDate(payload.expiresAtIso)} (${days}-day retention from issue date). ` +
      `Tampering with or misusing this document may constitute an offence under applicable traffic and information laws.`,
    92,
  );
  noticeLines.slice(0, 5).forEach((line, idx) => {
    pdf.text(margin + 12, nTop - 18 - idx * 12, line, { size: 8.5, color: INK });
  });
  pdf.text(margin + 12, nTop - noticeH + 12, `Retention expiry: ${formatPdfDateTime(payload.expiresAtIso)}`, {
    size: 8,
    font: 'bold',
    color: BRAND_BLUE,
  });
  y -= 14;

  pdf.line(margin, y, pdf.pageWidth - margin, y, BORDER);
  pdf.text(margin, y - 14, 'TrafficEye — Smart Traffic Enforcement Platform', {
    size: 8,
    color: MUTED,
  });
  pdf.textRight(pdf.pageWidth - margin, y - 14, `Challan ${payload.challanId}`, {
    size: 8,
    color: MUTED,
  });
  pdf.text(
    margin,
    y - 28,
    'Computer-generated document. Digital issuance does not require a wet signature when officer verification is on record.',
    { size: 7, color: MUTED },
  );

  return pdf;
}
