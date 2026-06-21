"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectionReasonSchema = exports.candidateNameSchema = void 0;
exports.validateCandidateName = validateCandidateName;
exports.validateRejectionReason = validateRejectionReason;
const zod_1 = require("zod");
exports.candidateNameSchema = zod_1.z
    .string()
    .min(1, 'Candidate name is required')
    .max(100, 'Candidate name must not exceed 100 characters');
exports.rejectionReasonSchema = zod_1.z
    .string()
    .min(5, 'Rejection reason must be at least 5 characters')
    .max(500, 'Rejection reason must not exceed 500 characters');
function validateCandidateName(input) {
    const result = exports.candidateNameSchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
function validateRejectionReason(input) {
    const result = exports.rejectionReasonSchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
//# sourceMappingURL=candidate.js.map