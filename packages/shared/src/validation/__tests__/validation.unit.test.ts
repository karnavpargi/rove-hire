/**
 * Unit tests for shared validation schemas.
 * Verifies all validators work correctly for task 2.2.
 */

import { describe, expect, it } from 'vitest';
import {
  candidateNameSchema,
  currencySchema,
  emailSchema,
  feedbackSchema,
  interviewNotesSchema,
  jobTitleSchema,
  loginFormSchema,
  optionalLinkedinUrlSchema,
  passwordSchema,
  phoneSchema,
  rejectionReasonSchema,
  salaryAmountSchema,
  skillsTagsSchema,
  validateCandidateName,
  validateCurrency,
  validateEmail,
  validateFeedback,
  validateInterviewNotes,
  validateInterviewerName,
  validateJobTitle,
  validateLinkedinUrl,
  validateLoginForm,
  validatePassword,
  validatePhone,
  validateRejectionReason,
  validateSalaryAmount,
  validateSalaryInput,
  validateSkillsTags,
} from '../index';

// ===================== Email Validation =====================
describe('Email Validation (RFC 5322, max 254 chars)', () => {
  it('accepts valid email addresses', () => {
    const r1 = validateEmail('user@example.com');
    expect(r1.valid).toBe(true);
    expect(r1.success).toBe(true);
    expect(r1.errors).toEqual([]);
    expect(r1.data).toBe('user@example.com');

    expect(validateEmail('a@b.co').valid).toBe(true);
    expect(validateEmail('user.name+tag@domain.org').valid).toBe(true);
    expect(validateEmail('test@sub.domain.com').valid).toBe(true);
  });

  it('rejects emails exceeding 254 characters', () => {
    const longLocal = 'a'.repeat(243);
    const longEmail = `${longLocal}@example.com`; // 255 chars
    const result = validateEmail(longEmail);
    expect(result.valid).toBe(false);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.error).toContain('254');
  });

  it('rejects invalid email formats', () => {
    expect(validateEmail('not-an-email').valid).toBe(false);
    expect(validateEmail('@missing-local.com').valid).toBe(false);
    expect(validateEmail('missing@').valid).toBe(false);
    expect(validateEmail('').valid).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(validateEmail(123).valid).toBe(false);
    expect(validateEmail(null).valid).toBe(false);
    expect(validateEmail(undefined).valid).toBe(false);
  });

  it('schema parses valid emails', () => {
    expect(emailSchema.parse('test@example.com')).toBe('test@example.com');
  });
});

// ===================== Phone Validation =====================
describe('Phone Validation (digits/spaces/hyphens/parens/+, 7-20 chars)', () => {
  it('accepts valid phone numbers', () => {
    const r = validatePhone('1234567');
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(validatePhone('+1 (555) 123-4567').valid).toBe(true);
    expect(validatePhone('+91 98765 43210').valid).toBe(true);
    expect(validatePhone('(02) 9876 5432').valid).toBe(true);
  });

  it('rejects phone numbers shorter than 7 chars', () => {
    const r = validatePhone('123456');
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(validatePhone('12345').valid).toBe(false);
    expect(validatePhone('').valid).toBe(false);
  });

  it('rejects phone numbers longer than 20 chars', () => {
    expect(validatePhone('1'.repeat(21)).valid).toBe(false);
  });

  it('rejects phone numbers with invalid characters', () => {
    expect(validatePhone('123-456-abcd').valid).toBe(false);
    expect(validatePhone('123@456#789').valid).toBe(false);
    expect(validatePhone('phone: 1234567').valid).toBe(false);
  });

  it('allows + only at beginning', () => {
    expect(validatePhone('+1234567890').valid).toBe(true);
    // + in middle is invalid per regex ^\+?[\d\s\-()]+$
    expect(validatePhone('123+4567890').valid).toBe(false);
  });

  it('schema parses valid phones', () => {
    expect(phoneSchema.parse('+1 555 1234567')).toBe('+1 555 1234567');
  });
});

// ===================== Salary Validation =====================
describe('Salary Validation (0.01–9,999,999.99, max 2 decimals)', () => {
  it('accepts valid salary amounts', () => {
    expect(validateSalaryAmount(0.01).valid).toBe(true);
    expect(validateSalaryAmount(50000).valid).toBe(true);
    expect(validateSalaryAmount(9999999.99).valid).toBe(true);
    expect(validateSalaryAmount(100.5).valid).toBe(true);
  });

  it('rejects amounts below 0.01', () => {
    expect(validateSalaryAmount(0).valid).toBe(false);
    expect(validateSalaryAmount(0.001).valid).toBe(false);
    expect(validateSalaryAmount(-1).valid).toBe(false);
  });

  it('rejects amounts above 9,999,999.99', () => {
    expect(validateSalaryAmount(10000000).valid).toBe(false);
    expect(validateSalaryAmount(9999999.999).valid).toBe(false);
  });

  it('rejects amounts with more than 2 decimal places', () => {
    expect(validateSalaryAmount(100.123).valid).toBe(false);
    expect(validateSalaryAmount(50.999).valid).toBe(false);
  });

  it('validates currency values', () => {
    expect(validateCurrency('USD').valid).toBe(true);
    expect(validateCurrency('EUR').valid).toBe(true);
    expect(validateCurrency('GBP').valid).toBe(true);
    expect(validateCurrency('INR').valid).toBe(true);
    expect(validateCurrency('AED').valid).toBe(true);
    expect(validateCurrency('JPY').valid).toBe(false);
    expect(validateCurrency('INVALID').valid).toBe(false);
  });

  it('validates composite salary input', () => {
    expect(validateSalaryInput({ amount: 50000, currency: 'USD' }).valid).toBe(true);
    expect(validateSalaryInput({ amount: 0, currency: 'USD' }).valid).toBe(false);
    expect(validateSalaryInput({ amount: 50000, currency: 'JPY' }).valid).toBe(false);
  });

  it('schema parses valid salary', () => {
    expect(salaryAmountSchema.parse(100.5)).toBe(100.5);
    expect(currencySchema.parse('USD')).toBe('USD');
  });
});

// ===================== LinkedIn URL Validation =====================
describe('LinkedIn URL Validation (https://linkedin.com/ or https://www.linkedin.com/ prefix)', () => {
  it('accepts valid LinkedIn URLs', () => {
    expect(validateLinkedinUrl('https://linkedin.com/in/johndoe').valid).toBe(true);
    expect(validateLinkedinUrl('https://www.linkedin.com/in/janedoe').valid).toBe(true);
    expect(validateLinkedinUrl('https://linkedin.com/company/acme').valid).toBe(true);
  });

  it('rejects URLs without correct prefix', () => {
    expect(validateLinkedinUrl('http://linkedin.com/in/johndoe').valid).toBe(false);
    expect(validateLinkedinUrl('https://facebook.com/user').valid).toBe(false);
    expect(validateLinkedinUrl('linkedin.com/in/user').valid).toBe(false);
    expect(validateLinkedinUrl('https://linked.in/user').valid).toBe(false);
  });

  it('rejects empty LinkedIn URL (required schema)', () => {
    expect(validateLinkedinUrl('').valid).toBe(false);
  });

  it('rejects URLs exceeding 255 chars', () => {
    const longUrl = 'https://linkedin.com/in/' + 'a'.repeat(232); // > 255 total
    expect(validateLinkedinUrl(longUrl).valid).toBe(false);
  });

  it('optional schema accepts empty string, null, undefined', () => {
    expect(optionalLinkedinUrlSchema.safeParse('').success).toBe(true);
    expect(optionalLinkedinUrlSchema.safeParse(undefined).success).toBe(true);
    expect(optionalLinkedinUrlSchema.safeParse(null).success).toBe(true);
  });

  it('optional schema still validates format when non-empty', () => {
    expect(optionalLinkedinUrlSchema.safeParse('https://linkedin.com/in/user').success).toBe(true);
    expect(optionalLinkedinUrlSchema.safeParse('http://invalid.com').success).toBe(false);
  });
});

// ===================== Job Title Validation =====================
describe('Job Title Validation (1-200 chars)', () => {
  it('accepts valid job titles', () => {
    expect(validateJobTitle('Software Engineer').valid).toBe(true);
    expect(validateJobTitle('A').valid).toBe(true);
    expect(validateJobTitle('a'.repeat(200)).valid).toBe(true);
  });

  it('rejects empty job titles', () => {
    expect(validateJobTitle('').valid).toBe(false);
  });

  it('rejects titles exceeding 200 chars', () => {
    expect(validateJobTitle('a'.repeat(201)).valid).toBe(false);
  });

  it('schema parses valid title', () => {
    expect(jobTitleSchema.parse('Senior Developer')).toBe('Senior Developer');
  });
});

// ===================== Skills Tags Validation =====================
describe('Skills Tags Validation (1-20 items, each max 50 chars)', () => {
  it('accepts valid skills arrays', () => {
    expect(validateSkillsTags(['TypeScript']).valid).toBe(true);
    expect(validateSkillsTags(['JS', 'TS', 'React']).valid).toBe(true);
    expect(validateSkillsTags(Array(20).fill('Skill')).valid).toBe(true);
  });

  it('rejects empty arrays', () => {
    expect(validateSkillsTags([]).valid).toBe(false);
  });

  it('rejects arrays with more than 20 items', () => {
    expect(validateSkillsTags(Array(21).fill('Skill')).valid).toBe(false);
  });

  it('rejects tags exceeding 50 chars', () => {
    expect(validateSkillsTags(['a'.repeat(51)]).valid).toBe(false);
  });

  it('rejects empty tag strings', () => {
    expect(validateSkillsTags(['']).valid).toBe(false);
  });

  it('accepts tag exactly 50 chars', () => {
    expect(validateSkillsTags(['a'.repeat(50)]).valid).toBe(true);
  });

  it('schema parses valid skills', () => {
    expect(skillsTagsSchema.parse(['Node.js', 'Docker'])).toEqual(['Node.js', 'Docker']);
  });
});

// ===================== Password Validation =====================
describe('Password Validation (8-128 chars)', () => {
  it('accepts valid passwords', () => {
    expect(validatePassword('12345678').valid).toBe(true);
    expect(validatePassword('a'.repeat(128)).valid).toBe(true);
    expect(validatePassword('P@ssw0rd!').valid).toBe(true);
  });

  it('rejects passwords shorter than 8 chars', () => {
    expect(validatePassword('1234567').valid).toBe(false);
    expect(validatePassword('').valid).toBe(false);
  });

  it('rejects passwords exceeding 128 chars', () => {
    expect(validatePassword('a'.repeat(129)).valid).toBe(false);
  });

  it('schema parses valid password', () => {
    expect(passwordSchema.parse('securepass')).toBe('securepass');
  });
});

// ===================== Candidate Name Validation =====================
describe('Candidate Name Validation (max 100 chars)', () => {
  it('accepts valid candidate names', () => {
    expect(validateCandidateName('John Doe').valid).toBe(true);
    expect(validateCandidateName('A').valid).toBe(true);
    expect(validateCandidateName('a'.repeat(100)).valid).toBe(true);
  });

  it('rejects empty names', () => {
    expect(validateCandidateName('').valid).toBe(false);
  });

  it('rejects names exceeding 100 chars', () => {
    expect(validateCandidateName('a'.repeat(101)).valid).toBe(false);
  });

  it('schema parses valid name', () => {
    expect(candidateNameSchema.parse('Jane Smith')).toBe('Jane Smith');
  });
});

// ===================== Rejection Reason Validation =====================
describe('Rejection Reason Validation (5-500 chars)', () => {
  it('accepts valid rejection reasons', () => {
    expect(validateRejectionReason('Not a good fit for the role').valid).toBe(true);
    expect(validateRejectionReason('abcde').valid).toBe(true); // exactly 5
    expect(validateRejectionReason('a'.repeat(500)).valid).toBe(true); // exactly 500
  });

  it('rejects reasons shorter than 5 chars', () => {
    expect(validateRejectionReason('abcd').valid).toBe(false);
    expect(validateRejectionReason('').valid).toBe(false);
  });

  it('rejects reasons exceeding 500 chars', () => {
    expect(validateRejectionReason('a'.repeat(501)).valid).toBe(false);
  });

  it('schema parses valid reason', () => {
    expect(rejectionReasonSchema.parse('Does not meet requirements')).toBe(
      'Does not meet requirements',
    );
  });
});

// ===================== Interview Notes Validation =====================
describe('Interview Notes Validation (max 1000 chars)', () => {
  it('accepts valid interview notes', () => {
    expect(validateInterviewNotes('Great candidate, very enthusiastic').valid).toBe(true);
    expect(validateInterviewNotes('').valid).toBe(true); // optional — empty is valid
    expect(validateInterviewNotes('a'.repeat(1000)).valid).toBe(true);
  });

  it('rejects notes exceeding 1000 chars', () => {
    expect(validateInterviewNotes('a'.repeat(1001)).valid).toBe(false);
  });

  it('schema parses valid notes', () => {
    expect(interviewNotesSchema.parse('Some notes')).toBe('Some notes');
  });
});

// ===================== Feedback Validation =====================
describe('Feedback Validation (1-2000 chars)', () => {
  it('accepts valid feedback', () => {
    expect(validateFeedback('Good communication skills').valid).toBe(true);
    expect(validateFeedback('A').valid).toBe(true); // exactly 1
    expect(validateFeedback('a'.repeat(2000)).valid).toBe(true); // exactly 2000
  });

  it('rejects empty feedback', () => {
    expect(validateFeedback('').valid).toBe(false);
  });

  it('rejects feedback exceeding 2000 chars', () => {
    expect(validateFeedback('a'.repeat(2001)).valid).toBe(false);
  });

  it('schema parses valid feedback', () => {
    expect(feedbackSchema.parse('Excellent performance')).toBe('Excellent performance');
  });
});

// ===================== Interviewer Name Validation =====================
describe('Interviewer Name Validation (1-100 chars)', () => {
  it('accepts valid interviewer names', () => {
    expect(validateInterviewerName('Sarah Connor').valid).toBe(true);
    expect(validateInterviewerName('A').valid).toBe(true);
    expect(validateInterviewerName('a'.repeat(100)).valid).toBe(true);
  });

  it('rejects empty names', () => {
    expect(validateInterviewerName('').valid).toBe(false);
  });

  it('rejects names exceeding 100 chars', () => {
    expect(validateInterviewerName('a'.repeat(101)).valid).toBe(false);
  });
});

// ===================== Login Form Validation =====================
describe('Login Form Validation (email + password)', () => {
  it('accepts valid login form input', () => {
    const result = validateLoginForm({ email: 'hr@rove.com', password: 'secure123' });
    expect(result.valid).toBe(true);
    expect(result.data).toEqual({ email: 'hr@rove.com', password: 'secure123' });
    expect(result.errors).toEqual([]);
  });

  it('rejects invalid email in form', () => {
    const r = validateLoginForm({ email: 'invalid', password: 'secure123' });
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('rejects short password in form', () => {
    expect(validateLoginForm({ email: 'hr@rove.com', password: 'short' }).valid).toBe(false);
  });

  it('schema parses valid form', () => {
    const result = loginFormSchema.parse({ email: 'test@test.com', password: '12345678' });
    expect(result.email).toBe('test@test.com');
    expect(result.password).toBe('12345678');
  });
});
