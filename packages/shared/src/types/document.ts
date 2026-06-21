/**
 * Document types shared between frontend and backend.
 */

/** Types of documents (PascalCase to match Prisma enum) */
export enum DocumentType {
  Resume = 'Resume',
  OfferLetter = 'OfferLetter',
  Nda = 'Nda',
}

/** Supported currencies for offer letters */
export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  INR = 'INR',
  AED = 'AED',
}

/** Core document data */
export interface Document {
  id: string;
  candidateId: string;
  type: DocumentType;
  s3Key: string;
  originalFilename?: string | null;
  fileSizeBytes?: number | null;
  createdAt: string;
}

/** Input for generating offer documents (offer letter + NDA) */
export interface OfferDetailsInput {
  roleTitle: string;
  salaryCurrency: Currency;
  salaryAmount: number;
  startDate: string;
  reportingManager: string;
  location: string;
}

/** Result of offer document generation */
export interface OfferDocumentsResult {
  offerLetterUrl: string;
  ndaUrl: string;
  offerLetterId: string;
  ndaId: string;
}
