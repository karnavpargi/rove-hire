export declare const AUTH: {
    readonly EMAIL_MAX_LENGTH: 254;
    readonly PASSWORD_MIN_LENGTH: 8;
    readonly PASSWORD_MAX_LENGTH: 128;
    readonly SESSION_MAX_HOURS: 8;
    readonly MAX_LOGIN_ATTEMPTS: 5;
    readonly LOCKOUT_MINUTES: 15;
    readonly RATE_LIMIT_REQUESTS: 10;
    readonly RATE_LIMIT_WINDOW_SECONDS: 60;
};
export declare const CANDIDATE: {
    readonly NAME_MAX_LENGTH: 100;
    readonly EMAIL_MAX_LENGTH: 254;
    readonly PHONE_MAX_LENGTH: 20;
    readonly LOCATION_MAX_LENGTH: 100;
    readonly CURRENT_ROLE_MAX_LENGTH: 100;
    readonly NOTICE_PERIOD_MAX_LENGTH: 50;
    readonly SALARY_EXPECTATION_MAX_LENGTH: 50;
    readonly LINKEDIN_URL_MAX_LENGTH: 255;
    readonly REJECTION_REASON_MIN_LENGTH: 5;
    readonly REJECTION_REASON_MAX_LENGTH: 500;
};
export declare const JOB_OPENING: {
    readonly TITLE_MAX_LENGTH: 200;
    readonly DESCRIPTION_MAX_LENGTH: 5000;
    readonly SKILLS_MIN_COUNT: 1;
    readonly SKILLS_MAX_COUNT: 20;
    readonly SKILL_TAG_MAX_LENGTH: 50;
};
export declare const INTERVIEW: {
    readonly INTERVIEWER_NAME_MAX_LENGTH: 100;
    readonly NOTES_MAX_LENGTH: 1000;
    readonly FEEDBACK_MIN_LENGTH: 1;
    readonly FEEDBACK_MAX_LENGTH: 2000;
};
export declare const OFFER: {
    readonly SALARY_MIN: 0.01;
    readonly SALARY_MAX: 9999999.99;
    readonly SALARY_DECIMAL_PLACES: 2;
};
export declare const FILE_UPLOAD: {
    readonly MAX_SIZE_BYTES: number;
    readonly ALLOWED_MIME_TYPES: readonly ["application/pdf"];
};
export declare const MAGIC_LINK: {
    readonly EXPIRY_DAYS: 14;
    readonly TOKEN_BYTES: 32;
};
export declare const PAGINATION: {
    readonly DEFAULT_PAGE_SIZE: 20;
    readonly SEARCH_MIN_LENGTH: 2;
    readonly SEARCH_MAX_LENGTH: 100;
    readonly SEARCH_DEBOUNCE_MS: 300;
    readonly TIMELINE_MAX_EVENTS: 50;
};
