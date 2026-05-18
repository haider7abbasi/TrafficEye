export type ChallanRecord = {
  id: string;
  officerId: string;
  officerName: string;
  officerBadge: string;
  officerDepartment: string;
  confirmedAt: string;
  expiresAt: string;
  plateDisplay: string;
  plateCanonical: string;
  violationTypeIds: string[];
  violationLabels: string[];
  locationText: string;
  status: string;
  challanPdfRef?: string;
  evidenceImageRef?: string;
  plateCropRef?: string;
  createdFromCandidateId?: string;
};
