import { buildChallanPdfBase64 } from '../src/services/challanPdf';

describe('challanPdf', () => {
  it('builds a non-empty base64 payload', () => {
    const out = buildChallanPdfBase64({
      challanId: 'chal-1',
      confirmedAtIso: new Date('2026-05-10T00:00:00.000Z').toISOString(),
      expiresAtIso: new Date('2026-05-17T00:00:00.000Z').toISOString(),
      officerName: 'Officer A',
      officerBadge: 'B-001',
      officerDepartment: 'Traffic',
      plateDisplay: 'ABC 123',
      plateCanonical: 'ABC123',
      locationText: 'Main Street',
      violationTypes: ['no_seatbelt'],
    });
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(100);
  });
});
