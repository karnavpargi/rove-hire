"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailSchema = void 0;
exports.validateEmail = validateEmail;
const zod_1 = require("zod");
exports.emailSchema = zod_1.z
    .string()
    .min(1, 'Email is required')
    .max(254, 'Email must not exceed 254 characters')
    .email('Email must be a valid email address');
function validateEmail(input) {
    const result = exports.emailSchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
//# sourceMappingURL=email.js.map