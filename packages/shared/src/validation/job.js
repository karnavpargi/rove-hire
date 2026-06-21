"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillsTagsSchema = exports.jobTitleSchema = void 0;
exports.validateJobTitle = validateJobTitle;
exports.validateSkillsTags = validateSkillsTags;
const zod_1 = require("zod");
exports.jobTitleSchema = zod_1.z
    .string()
    .min(1, 'Job title is required')
    .max(200, 'Job title must not exceed 200 characters');
exports.skillsTagsSchema = zod_1.z
    .array(zod_1.z
    .string()
    .min(1, 'Skill tag must not be empty')
    .max(50, 'Each skill tag must not exceed 50 characters'))
    .min(1, 'At least 1 skill tag is required')
    .max(20, 'Must not exceed 20 skill tags');
function validateJobTitle(input) {
    const result = exports.jobTitleSchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
function validateSkillsTags(input) {
    const result = exports.skillsTagsSchema.safeParse(input);
    if (result.success) {
        return { valid: true, success: true, data: result.data, errors: [] };
    }
    const errors = result.error.issues.map((i) => i.message);
    return { valid: false, success: false, error: errors[0], errors };
}
//# sourceMappingURL=job.js.map