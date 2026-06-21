"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.phoneSchema = void 0;
exports.validatePhone = validatePhone;
const zod_1 = require("zod");
exports.phoneSchema = zod_1.z
    .string()
    .min(7, 'Phone number must be at least 7 characters')
    .max(20, 'Phone number must not exceed 20 characters')
    .regex(/^\+?[\d\s\-()]+$/, 'Phone number may only contain digits, spaces, hyphens, parentheses, or a leading plus sign');
function validatePhone(input) {
    const result = exports.phoneSchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
//# sourceMappingURL=phone.js.map