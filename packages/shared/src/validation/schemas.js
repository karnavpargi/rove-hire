"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchQuerySchema = exports.locationSchema = exports.reportingManagerSchema = exports.loginFormSchema = exports.passwordSchema = exports.interviewerNameSchema = exports.feedbackSchema = exports.interviewNotesSchema = exports.rejectionReasonSchema = exports.candidateNameSchema = exports.skillsTagsSchema = exports.jobTitleSchema = exports.optionalLinkedinUrlSchema = exports.linkedinUrlSchema = exports.salaryInputSchema = exports.currencySchema = exports.salaryAmountSchema = exports.phoneSchema = exports.emailSchema = void 0;
var email_1 = require("./email");
Object.defineProperty(exports, "emailSchema", { enumerable: true, get: function () { return email_1.emailSchema; } });
var phone_1 = require("./phone");
Object.defineProperty(exports, "phoneSchema", { enumerable: true, get: function () { return phone_1.phoneSchema; } });
var salary_1 = require("./salary");
Object.defineProperty(exports, "salaryAmountSchema", { enumerable: true, get: function () { return salary_1.salaryAmountSchema; } });
Object.defineProperty(exports, "currencySchema", { enumerable: true, get: function () { return salary_1.currencySchema; } });
Object.defineProperty(exports, "salaryInputSchema", { enumerable: true, get: function () { return salary_1.salaryInputSchema; } });
var linkedin_1 = require("./linkedin");
Object.defineProperty(exports, "linkedinUrlSchema", { enumerable: true, get: function () { return linkedin_1.linkedinUrlSchema; } });
Object.defineProperty(exports, "optionalLinkedinUrlSchema", { enumerable: true, get: function () { return linkedin_1.optionalLinkedinUrlSchema; } });
var job_1 = require("./job");
Object.defineProperty(exports, "jobTitleSchema", { enumerable: true, get: function () { return job_1.jobTitleSchema; } });
Object.defineProperty(exports, "skillsTagsSchema", { enumerable: true, get: function () { return job_1.skillsTagsSchema; } });
var candidate_1 = require("./candidate");
Object.defineProperty(exports, "candidateNameSchema", { enumerable: true, get: function () { return candidate_1.candidateNameSchema; } });
Object.defineProperty(exports, "rejectionReasonSchema", { enumerable: true, get: function () { return candidate_1.rejectionReasonSchema; } });
var interview_1 = require("./interview");
Object.defineProperty(exports, "interviewNotesSchema", { enumerable: true, get: function () { return interview_1.interviewNotesSchema; } });
Object.defineProperty(exports, "feedbackSchema", { enumerable: true, get: function () { return interview_1.feedbackSchema; } });
Object.defineProperty(exports, "interviewerNameSchema", { enumerable: true, get: function () { return interview_1.interviewerNameSchema; } });
var auth_1 = require("./auth");
Object.defineProperty(exports, "passwordSchema", { enumerable: true, get: function () { return auth_1.passwordSchema; } });
Object.defineProperty(exports, "loginFormSchema", { enumerable: true, get: function () { return auth_1.loginFormSchema; } });
const zod_1 = require("zod");
exports.reportingManagerSchema = zod_1.z
    .string()
    .min(1, 'Reporting manager name is required')
    .max(100, 'Reporting manager name must not exceed 100 characters');
exports.locationSchema = zod_1.z
    .string()
    .min(1, 'Location is required')
    .max(200, 'Location must not exceed 200 characters');
exports.searchQuerySchema = zod_1.z
    .string()
    .min(2, 'Search query must be at least 2 characters')
    .max(100, 'Search query must not exceed 100 characters');
//# sourceMappingURL=schemas.js.map