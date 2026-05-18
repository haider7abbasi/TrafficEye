import { buildChallanPdfBase64 } from '../src/services/challanPdf';
import { decodeBase64Pdf } from '../src/services/pdf/minimalPdfWriter';

const samplePayload = {
  challanId: 'chal-test-001',
  confirmedAtIso: new Date('2026-05-10T14:30:00.000Z').toISOString(),
  expiresAtIso: new Date('2026-05-17T14:30:00.000Z').toISOString(),
  officerName: 'Officer A',
  officerBadge: 'B-001',
  officerDepartment: 'Traffic Enforcement',
  plateDisplay: 'ABC 123',
  plateCanonical: 'ABC123',
  locationText: 'Main Boulevard, Sector 7',
  violationTypes: ['no_seatbelt', 'mobile_phone_use'] as const,
  status: 'confirmed',
  candidateId: 'cand-abc',
  evidenceImageRef: 'officers/u1/challans/chal-test-001/evidence.jpg',
  plateCropRef: 'officers/u1/challans/chal-test-001/plate.jpg',
};

describe('challanPdf', () => {
  it('builds a valid PDF with professional challan content', () => {
    const out = buildChallanPdfBase64(samplePayload);
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(500);

    const pdf = decodeBase64Pdf(out);
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('%%EOF');
    expect(pdf).toContain('Electronic Traffic Violation Challan');
    expect(pdf).toContain('chal-test-001');
    expect(pdf).toContain('TV-01');
    expect(pdf).toContain('TV-03');
    expect(pdf).toContain('Not wearing seatbelt');
    expect(pdf).toContain('Mobile phone use while driving');
    expect(pdf).toContain('ISSUING OFFICER');
    expect(pdf).toContain('RECORD RETENTION');
    expect(pdf).toContain('Helvetica-Bold');
  });

  it('includes evidence references when provided', () => {
    const pdf = decodeBase64Pdf(buildChallanPdfBase64(samplePayload));
    expect(pdf).toContain('evidence.jpg');
    expect(pdf).toContain('plate.jpg');
    expect(pdf).toContain('cand-abc');
  });
});
