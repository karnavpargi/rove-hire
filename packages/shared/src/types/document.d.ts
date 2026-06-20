export declare enum DocumentType {
    Resume = "Resume",
    OfferLetter = "OfferLetter",
    Nda = "Nda"
}
export declare enum Currency {
    USD = "USD",
    EUR = "EUR",
    GBP = "GBP",
    INR = "INR",
    AED = "AED"
}
export interface Document {
    id: string;
    candidateId: string;
    type: DocumentType;
    s3Key: string;
    originalFilename?: string | null;
    fileSizeBytes?: number | null;
    createdAt: string;
}
export interface OfferDetailsInput {
    roleTitle: string;
    salaryCurrency: Currency;
    salaryAmount: number;
    startDate: string;
    reportingManager: string;
    location: string;
}
export interface OfferDocumentsResult {
    offerLetterUrl: string;
    ndaUrl: string;
    offerLetterId: string;
    ndaId: string;
}
