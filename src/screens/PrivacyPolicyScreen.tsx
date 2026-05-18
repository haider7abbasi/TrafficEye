import React from 'react';
import { LegalDocumentView } from '../components/legal/LegalDocumentView';
import { PRIVACY_POLICY } from '../content/legalDocuments';

export function PrivacyPolicyScreen() {
  return <LegalDocumentView document={PRIVACY_POLICY} />;
}
