import React from 'react';
import { LegalDocumentView } from '../components/legal/LegalDocumentView';
import { TERMS_POLICY } from '../content/legalDocuments';

export function TermsPolicyScreen() {
  return <LegalDocumentView document={TERMS_POLICY} />;
}
