export * from './pipeline';
export * from './limits';
export declare const SUPPORTED_CURRENCIES: readonly ["USD", "EUR", "GBP", "INR", "AED"];
export declare const FILE_CONSTRAINTS: {
    readonly MAX_SIZE_BYTES: number;
    readonly ALLOWED_MIME_TYPES: readonly ["application/pdf"];
};
export declare const MAGIC_LINK_CONSTRAINTS: {
    readonly EXPIRY_DAYS: 14;
    readonly TOKEN_BYTES: 32;
};
export declare const SESSION_CONSTRAINTS: {
    readonly MAX_LIFETIME_HOURS: 8;
    readonly RATE_LIMIT_ATTEMPTS: 5;
    readonly RATE_LIMIT_WINDOW_MINUTES: 15;
    readonly RATE_LIMIT_PER_IP_PER_MINUTE: 10;
};
