export declare enum GraphQLErrorCode {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
    NOT_FOUND = "NOT_FOUND",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    CONFLICT_ERROR = "CONFLICT_ERROR",
    RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR"
}
export interface GraphQLErrorExtensions {
    code: GraphQLErrorCode;
    field?: string;
    details?: string;
    validTransitions?: string[];
    retryAfter?: number;
}
