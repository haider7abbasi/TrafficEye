/**
 * Ordered field list for the future challan PDF template (data binding).
 * Keys are stable for layout engines / i18n.
 */

export type ChallanPdfFieldSource = 'system' | 'officer' | 'profile' | 'firestore_ref' | 'computed';

export type ChallanPdfFieldKey =
  | 'challan_id'
  | 'issued_at'
  | 'expires_at'
  | 'officer_name'
  | 'officer_badge'
  | 'officer_department'
  | 'violation_type_labels'
  | 'vehicle_plate_canonical'
  | 'vehicle_plate_display'
  | 'location_text'
  | 'evidence_image_ref'
  | 'plate_crop_image_ref'
  | 'roboflow_session_meta'
  | 'signature_placeholder';

export const CHALLAN_PDF_FIELDS: readonly {
  key: ChallanPdfFieldKey;
  label: string;
  source: ChallanPdfFieldSource;
  notes?: string;
}[] = [
  { key: 'challan_id', label: 'Challan reference', source: 'system', notes: 'Unique id at confirm time.' },
  { key: 'issued_at', label: 'Issue date & time', source: 'system', notes: 'Typically confirmation timestamp.' },
  { key: 'expires_at', label: 'Retention expiry', source: 'computed', notes: 'e.g. issued_at + 7 days per policy.' },
  { key: 'officer_name', label: 'Confirming officer name', source: 'profile' },
  { key: 'officer_badge', label: 'Badge number', source: 'profile' },
  { key: 'officer_department', label: 'Department / unit', source: 'profile' },
  {
    key: 'violation_type_labels',
    label: 'Violation type(s)',
    source: 'computed',
    notes: 'Human-readable labels from spec violation ids for this frame.',
  },
  {
    key: 'vehicle_plate_display',
    label: 'Registration (display)',
    source: 'officer',
    notes: 'After normalizePlateForDisplay.',
  },
  {
    key: 'vehicle_plate_canonical',
    label: 'Registration (canonical)',
    source: 'computed',
    notes: 'normalizePlateCanonical for search / dedup.',
  },
  { key: 'location_text', label: 'Location / beat', source: 'officer' },
  { key: 'evidence_image_ref', label: 'Full-frame evidence', source: 'firestore_ref', notes: 'Storage path or download URL.' },
  { key: 'plate_crop_image_ref', label: 'Cropped plate image', source: 'firestore_ref' },
  {
    key: 'roboflow_session_meta',
    label: 'Model run metadata',
    source: 'computed',
    notes: 'Optional: project versions, confidence summary (audit).',
  },
  { key: 'signature_placeholder', label: 'Officer signature line', source: 'system', notes: 'Empty line or captured signature if added later.' },
];
