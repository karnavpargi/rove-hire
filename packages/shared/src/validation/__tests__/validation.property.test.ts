/**
 * Property 9: Input Validation — Field Constraint Enforcement
 *
 * Property-based tests verifying that each field validator correctly
 * accepts valid inputs and rejects invalid inputs across the full
 * input space.
 *
 * **Validates: Requirements 1.8, 4.8, 5.7, 5.8, 25.1-25.5, 3.6, 3.8, 8.8**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateEmail } from '../email';
import { validatePhone } from '../phone';
import { validateSalaryAmount } from '../salary';
import { validateLinkedinUrl } from '../linkedin';
import { validateJobTitle } from '../job';
import { validateSkillsTags } from '../job';
import { validateRejectionReason } from '../candidate';

describe('Property 9: Input Validation — Field Constraint Enforcement', () => {
  // ─── Email Validation ────────────────────────────────────────────────
  describe('Email validation (Requirements 1.8, 4.8, 25.1)', () => {
    it('accepts valid emails <= 254 characters', () => {
      /**
       * **Validates: Requirements 1.8, 4.8, 25.1**
       */
      const validEmailArb = fc
        .tuple(
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,49}$/).filter((s) => s.length >= 1),
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{1,20}$/).filter((s) => s.length >= 2),
          fc.constantFrom('com', 'org', 'net', 'io', 'co.uk'),
        )
        .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)
        .filter((email) => email.length <= 254);

      fc.assert(
        fc.property(validEmailArb, (email) => {
          const result = validateEmail(email);
          expect(result.success).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    it('rejects strings without @ symbol', () => {
      /**
       * **Validates: Requirements 1.8, 4.8, 25.1**
       */
      const noAtArb = fc.string({ minLength: 1, maxLength: 254 }).filter((s) => !s.includes('@'));

      fc.assert(
        fc.property(noAtArb, (input) => {
          const result = validateEmail(input);
          expect(result.success).toBe(false);
        }),
        { numRuns: 200 },
      );
    });

    it('rejects strings exceeding 254 characters', () => {
      /**
       * **Validates: Requirements 1.8, 4.8, 25.1**
       */
      const longEmailArb = fc
        .string({ minLength: 200, maxLength: 300 })
        .map((_s) => {
          const local = 'a'.repeat(200);
          const domain = 'b'.repeat(50);
          return `${local}@${domain}.com`;
        })
        .filter((email) => email.length > 254);

      fc.assert(
        fc.property(longEmailArb, (email) => {
          const result = validateEmail(email);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ─── Phone Validation ────────────────────────────────────────────────
  describe('Phone validation (Requirements 5.7, 25.2)', () => {
    it('accepts valid phone strings of digits/spaces/hyphens/parens/+ between 7-20 chars', () => {
      /**
       * **Validates: Requirements 5.7, 25.2**
       */
      const validPhoneArb = fc
        .tuple(
          fc.constantFrom('', '+'),
          fc.array(
            fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '-', '(', ')'),
            { minLength: 6, maxLength: 19 },
          ),
        )
        .map(([prefix, chars]) => prefix + chars.join(''))
        .filter((phone) => phone.length >= 7 && phone.length <= 20)
        .filter((phone) => /^\+?[\d\s\-()]+$/.test(phone));

      fc.assert(
        fc.property(validPhoneArb, (phone) => {
          const result = validatePhone(phone);
          expect(result.success).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    it('rejects phone strings with invalid characters', () => {
      /**
       * **Validates: Requirements 5.7, 25.2**
       */
      const invalidCharPhoneArb = fc
        .tuple(
          fc.string({ minLength: 7, maxLength: 20 }),
          fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', 'a', 'z', 'A', 'Z'),
        )
        .map(([base, invalidChar]) => {
          const pos = Math.floor(base.length / 2);
          return base.slice(0, pos) + invalidChar + base.slice(pos + 1);
        })
        .filter((s) => s.length >= 7 && s.length <= 20)
        .filter((s) => !/^\+?[\d\s\-()]+$/.test(s));

      fc.assert(
        fc.property(invalidCharPhoneArb, (phone) => {
          const result = validatePhone(phone);
          expect(result.success).toBe(false);
        }),
        { numRuns: 200 },
      );
    });

    it('rejects phone strings outside length range (< 7 or > 20)', () => {
      /**
       * **Validates: Requirements 5.7, 25.2**
       */
      const tooShortArb = fc
        .array(fc.constantFrom('0', '1', '2', '3', '4', '5'), { minLength: 1, maxLength: 6 })
        .map((chars) => chars.join(''));

      const tooLongArb = fc
        .array(fc.constantFrom('0', '1', '2', '3', '4', '5'), { minLength: 21, maxLength: 40 })
        .map((chars) => chars.join(''));

      fc.assert(
        fc.property(tooShortArb, (phone) => {
          const result = validatePhone(phone);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );

      fc.assert(
        fc.property(tooLongArb, (phone) => {
          const result = validatePhone(phone);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ─── Salary Validation ───────────────────────────────────────────────
  describe('Salary validation (Requirements 8.8, 25.3)', () => {
    it('accepts numbers in [0.01, 9999999.99] with <= 2 decimal places', () => {
      /**
       * **Validates: Requirements 8.8, 25.3**
       */
      const validSalaryArb = fc.integer({ min: 1, max: 999999999 }).map((cents) => cents / 100);

      fc.assert(
        fc.property(validSalaryArb, (salary) => {
          const result = validateSalaryAmount(salary);
          expect(result.success).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    it('rejects numbers outside range [0.01, 9999999.99]', () => {
      /**
       * **Validates: Requirements 8.8, 25.3**
       */
      const tooLowArb = fc.double({ min: -1000000, max: 0, noNaN: true });
      const tooHighArb = fc.double({ min: 10000000, max: 99999999, noNaN: true });

      fc.assert(
        fc.property(tooLowArb, (salary) => {
          const result = validateSalaryAmount(salary);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );

      fc.assert(
        fc.property(tooHighArb, (salary) => {
          const result = validateSalaryAmount(salary);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('rejects numbers with more than 2 decimal places', () => {
      /**
       * **Validates: Requirements 8.8, 25.3**
       */
      const tooManyDecimalsArb = fc
        .tuple(fc.integer({ min: 1, max: 9999 }), fc.integer({ min: 100, max: 999 }))
        .map(([whole, frac]) => parseFloat(`${whole}.${frac}`))
        .filter((n) => {
          const parts = n.toString().split('.');
          return parts[1] !== undefined && parts[1].length > 2;
        });

      fc.assert(
        fc.property(tooManyDecimalsArb, (salary) => {
          const result = validateSalaryAmount(salary);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ─── LinkedIn URL Validation ─────────────────────────────────────────
  describe('LinkedIn URL validation (Requirements 5.8, 25.4)', () => {
    it('accepts URLs starting with https://linkedin.com/ or https://www.linkedin.com/', () => {
      /**
       * **Validates: Requirements 5.8, 25.4**
       */
      const validLinkedinArb = fc
        .tuple(
          fc.constantFrom('https://linkedin.com/', 'https://www.linkedin.com/'),
          fc.stringMatching(/^[a-zA-Z0-9\-/]{1,100}$/),
        )
        .map(([prefix, path]) => prefix + path)
        .filter((url) => url.length <= 255);

      fc.assert(
        fc.property(validLinkedinArb, (url) => {
          const result = validateLinkedinUrl(url);
          expect(result.success).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    it('rejects URLs with other prefixes', () => {
      /**
       * **Validates: Requirements 5.8, 25.4**
       */
      const invalidPrefixArb = fc
        .tuple(
          fc.constantFrom(
            'http://linkedin.com/',
            'https://linkedn.com/',
            'https://facebook.com/',
            'https://wwww.linkedin.com/',
            'ftp://linkedin.com/',
            'https://linkedin.org/',
          ),
          fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/),
        )
        .map(([prefix, path]) => prefix + path);

      fc.assert(
        fc.property(invalidPrefixArb, (url) => {
          const result = validateLinkedinUrl(url);
          expect(result.success).toBe(false);
        }),
        { numRuns: 200 },
      );
    });
  });

  // ─── Job Title Validation ────────────────────────────────────────────
  describe('Job title validation (Requirements 3.6, 25.5)', () => {
    it('accepts non-empty strings <= 200 characters', () => {
      /**
       * **Validates: Requirements 3.6, 25.5**
       */
      const validTitleArb = fc.string({ minLength: 1, maxLength: 200 });

      fc.assert(
        fc.property(validTitleArb, (title) => {
          const result = validateJobTitle(title);
          expect(result.success).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    it('rejects empty strings', () => {
      /**
       * **Validates: Requirements 3.6, 25.5**
       */
      const result = validateJobTitle('');
      expect(result.success).toBe(false);
    });

    it('rejects strings > 200 characters', () => {
      /**
       * **Validates: Requirements 3.6, 25.5**
       */
      const tooLongArb = fc.string({ minLength: 201, maxLength: 400 });

      fc.assert(
        fc.property(tooLongArb, (title) => {
          const result = validateJobTitle(title);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ─── Skills Tags Validation ──────────────────────────────────────────
  describe('Skills tags validation (Requirements 3.8, 25.5)', () => {
    it('accepts arrays of 1-20 non-empty strings each <= 50 chars', () => {
      /**
       * **Validates: Requirements 3.8, 25.5**
       */
      const validSkillsArb = fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
        minLength: 1,
        maxLength: 20,
      });

      fc.assert(
        fc.property(validSkillsArb, (skills) => {
          const result = validateSkillsTags(skills);
          expect(result.success).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    it('rejects empty arrays (0 items)', () => {
      /**
       * **Validates: Requirements 3.8, 25.5**
       */
      const result = validateSkillsTags([]);
      expect(result.success).toBe(false);
    });

    it('rejects arrays with > 20 items', () => {
      /**
       * **Validates: Requirements 3.8, 25.5**
       */
      const tooManyArb = fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
        minLength: 21,
        maxLength: 30,
      });

      fc.assert(
        fc.property(tooManyArb, (skills) => {
          const result = validateSkillsTags(skills);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('rejects arrays containing items > 50 chars', () => {
      /**
       * **Validates: Requirements 3.8, 25.5**
       */
      const longTagArb = fc
        .tuple(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
          fc.string({ minLength: 51, maxLength: 100 }),
        )
        .map(([validTags, longTag]) => [...validTags, longTag]);

      fc.assert(
        fc.property(longTagArb, (skills) => {
          const result = validateSkillsTags(skills);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ─── Rejection Reason Validation ─────────────────────────────────────
  describe('Rejection reason validation (Requirements 9.3, 9.4)', () => {
    it('accepts strings of 5-500 characters', () => {
      /**
       * **Validates: Requirements 9.3, 9.4**
       */
      const validReasonArb = fc.string({ minLength: 5, maxLength: 500 });

      fc.assert(
        fc.property(validReasonArb, (reason) => {
          const result = validateRejectionReason(reason);
          expect(result.success).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    it('rejects strings shorter than 5 characters', () => {
      /**
       * **Validates: Requirements 9.3, 9.4**
       */
      const tooShortArb = fc.string({ minLength: 0, maxLength: 4 });

      fc.assert(
        fc.property(tooShortArb, (reason) => {
          const result = validateRejectionReason(reason);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('rejects strings longer than 500 characters', () => {
      /**
       * **Validates: Requirements 9.3, 9.4**
       */
      const tooLongArb = fc.string({ minLength: 501, maxLength: 700 });

      fc.assert(
        fc.property(tooLongArb, (reason) => {
          const result = validateRejectionReason(reason);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });
});
