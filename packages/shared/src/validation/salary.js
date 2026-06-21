"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salaryInputSchema = exports.currencySchema = exports.salaryAmountSchema = void 0;
exports.validateSalaryAmount = validateSalaryAmount;
exports.validateCurrency = validateCurrency;
exports.validateSalaryInput = validateSalaryInput;
const zod_1 = require("zod");
exports.salaryAmountSchema = zod_1.z
    .number()
    .min(0.01, 'Salary must be at least 0.01')
    .max(9_999_999.99, 'Salary must not exceed 9,999,999.99')
    .refine((val) => {
    const parts = val.toString().split('.');
    return !parts[1] || parts[1].length <= 2;
}, { message: 'Salary must have at most 2 decimal places' });
exports.currencySchema = zod_1.z.enum(['USD', 'EUR', 'GBP', 'INR', 'AED'], {
    message: 'Currency must be one of: USD, EUR, GBP, INR, AED',
});
exports.salaryInputSchema = zod_1.z.object({
    amount: exports.salaryAmountSchema,
    currency: exports.currencySchema,
});
function validateSalaryAmount(input) {
    const result = exports.salaryAmountSchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
function validateCurrency(input) {
    const result = exports.currencySchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
function validateSalaryInput(input) {
    const result = exports.salaryInputSchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
//# sourceMappingURL=salary.js.map