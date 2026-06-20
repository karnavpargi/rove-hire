"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interviewerNameSchema = exports.feedbackSchema = exports.interviewNotesSchema = void 0;
exports.validateInterviewNotes = validateInterviewNotes;
exports.validateFeedback = validateFeedback;
exports.validateInterviewerName = validateInterviewerName;
const zod_1 = require("zod");
exports.interviewNotesSchema = zod_1.z
    .string()
    .max(1000, 'Interview notes must not exceed 1000 characters');
exports.feedbackSchema = zod_1.z
    .string()
    .min(1, 'Feedback is required')
    .max(2000, 'Feedback must not exceed 2000 characters');
exports.interviewerNameSchema = zod_1.z
    .string()
    .min(1, 'Interviewer name is required')
    .max(100, 'Interviewer name must not exceed 100 characters');
function validateInterviewNotes(input) {
    const result = exports.interviewNotesSchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
function validateFeedback(input) {
    const result = exports.feedbackSchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
function validateInterviewerName(input) {
    const result = exports.interviewerNameSchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
//# sourceMappingURL=interview.js.map