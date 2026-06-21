"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginFormSchema = exports.passwordSchema = void 0;
exports.validatePassword = validatePassword;
exports.validateLoginForm = validateLoginForm;
const zod_1 = require("zod");
const email_1 = require("./email");
exports.passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters');
exports.loginFormSchema = zod_1.z.object({
    email: email_1.emailSchema,
    password: exports.passwordSchema,
});
function validatePassword(input) {
    const result = exports.passwordSchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
function validateLoginForm(input) {
    const result = exports.loginFormSchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
//# sourceMappingURL=auth.js.map