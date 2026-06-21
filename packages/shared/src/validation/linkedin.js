"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalLinkedinUrlSchema = exports.linkedinUrlSchema = void 0;
exports.validateLinkedinUrl = validateLinkedinUrl;
const zod_1 = require("zod");
exports.linkedinUrlSchema = zod_1.z
    .string()
    .min(1, 'LinkedIn URL is required')
    .max(255, 'LinkedIn URL must not exceed 255 characters')
    .refine((val) => val.startsWith('https://linkedin.com/') || val.startsWith('https://www.linkedin.com/'), { message: 'LinkedIn URL must start with https://linkedin.com/ or https://www.linkedin.com/' });
exports.optionalLinkedinUrlSchema = zod_1.z
    .string()
    .max(255, 'LinkedIn URL must not exceed 255 characters')
    .refine((val) => val === '' ||
    val.startsWith('https://linkedin.com/') ||
    val.startsWith('https://www.linkedin.com/'), { message: 'LinkedIn URL must start with https://linkedin.com/ or https://www.linkedin.com/' })
    .optional()
    .nullable();
function validateLinkedinUrl(input) {
    const result = exports.linkedinUrlSchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
//# sourceMappingURL=linkedin.js.map