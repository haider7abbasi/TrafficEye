export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  subtitle: string;
  updated: string;
  sections: LegalSection[];
};

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  subtitle: 'How TrafficEye handles personal and operational data',
  updated: 'May 2026',
  sections: [
    {
      title: 'Overview',
      paragraphs: [
        'TrafficEye is a traffic enforcement support application used by authorised officers. This policy describes what information the app processes, why it is processed, and how long it is kept.',
        'Your department remains the data controller for enforcement records. TrafficEye provides capture, review, and challan workflow tools only.',
      ],
    },
    {
      title: 'Information we process',
      paragraphs: ['Depending on how your organisation configures Firebase and device settings, the app may process:'],
      bullets: [
        'Officer account details (name, email, badge, department) from your sign-in profile.',
        'Photos and video frames captured for violation review, including vehicle plates when entered or detected.',
        'Inference metadata from AI models (class labels, confidence scores, session identifiers).',
        'Challan records, evidence storage paths, location text, and confirmation timestamps.',
        'Local device preferences stored in AsyncStorage (notifications, display thresholds, theme flags).',
      ],
    },
    {
      title: 'How information is used',
      paragraphs: [
        'Data is used solely to support lawful traffic enforcement workflows: detection assistance, officer verification, challan issuance, audit trails, and departmental reporting.',
        'Automated detections are advisory. A trained officer must verify evidence before a challan is issued.',
      ],
    },
    {
      title: 'Sharing & processors',
      paragraphs: [
        'Operational data is stored in your organisation’s Firebase project (Authentication, Firestore, Cloud Storage). Third-party inference (e.g. Roboflow) may receive image data sent for analysis when that feature is enabled.',
        'TrafficEye does not sell personal data. Access is limited by Firebase security rules and assigned roles (officer, administrator).',
      ],
    },
    {
      title: 'Retention',
      paragraphs: [
        'Confirmed challan bundles and linked evidence are subject to the retention period configured for your deployment (typically seven days from officer confirmation unless your administrator sets a different policy).',
        'Expired records should be removed by automated cleanup jobs. Local caches on the device may persist until cleared by the user or app reinstall.',
      ],
    },
    {
      title: 'Your responsibilities',
      paragraphs: [
        'Officers must capture only what is necessary for enforcement, avoid misuse of credentials, and follow departmental guidance on filming in public spaces and consent where required.',
        'Administrators are responsible for account approvals, access reviews, and aligning app use with local privacy and traffic laws.',
      ],
    },
    {
      title: 'Contact',
      paragraphs: [
        'For access requests, corrections, or privacy questions, contact your traffic command or IT administrator. Institutional data-protection officers may apply where relevant.',
      ],
    },
  ],
};

export const TERMS_POLICY: LegalDocument = {
  title: 'Terms & Usage Policy',
  subtitle: 'Acceptable use of TrafficEye on authorised devices',
  updated: 'May 2026',
  sections: [
    {
      title: 'Acceptance',
      paragraphs: [
        'By signing in and using TrafficEye you confirm that you are an authorised user (officer or administrator) acting within your official duties or approved demonstration scope.',
        'If you do not agree with these terms, do not use the application and sign out immediately.',
      ],
    },
    {
      title: 'Permitted use',
      bullets: [
        'Record and review traffic scenes for enforcement or approved training demos.',
        'Confirm challans only after personally verifying evidence on screen.',
        'Access records permitted by your role (own challans for officers; broader access for administrators per security rules).',
        'Follow departmental SOPs for live capture, vehicle stops, and public filming.',
      ],
      paragraphs: [],
    },
    {
      title: 'Prohibited use',
      bullets: [
        'Sharing login credentials or bypassing role-based access controls.',
        'Issuing challans without adequate verification or tampering with evidence.',
        'Uploading illegal content, unrelated personal media, or data outside enforcement purpose.',
        'Operating the app while driving or in any manner that violates road-safety law.',
        'Attempting to reverse engineer, disrupt, or exfiltrate data outside authorised channels.',
      ],
      paragraphs: [],
    },
    {
      title: 'AI-assisted detection',
      paragraphs: [
        'Model outputs are probabilistic and may be incomplete or incorrect. TrafficEye highlights candidates for review; they are not automatic convictions or fines.',
        'Officers remain accountable for final decisions. Non-violation frames may be discarded without cloud retention per configured policy.',
      ],
    },
    {
      title: 'Account & security',
      paragraphs: [
        'Accounts are provisioned and approved by administrators. You must protect your device and session; report lost devices or suspected compromise promptly.',
        'Administrators may suspend or remove accounts that violate policy or pose a security risk.',
      ],
    },
    {
      title: 'Service availability',
      paragraphs: [
        'Features depend on network connectivity, Firebase services, and third-party APIs. The app may degrade gracefully when offline; critical actions requiring sync may be unavailable until connectivity returns.',
      ],
    },
    {
      title: 'Liability',
      paragraphs: [
        'TrafficEye is provided as an operational tool without warranty of uninterrupted or error-free service. Your organisation remains responsible for compliance with applicable laws and for decisions taken using the system.',
      ],
    },
    {
      title: 'Changes',
      paragraphs: [
        'These terms may be updated as the product evolves. Continued use after updates constitutes acceptance of the revised policy displayed in the app.',
      ],
    },
  ],
};
