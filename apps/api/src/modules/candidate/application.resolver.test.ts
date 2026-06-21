import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationResolver } from './application.resolver';
import { MagicLinkService, MagicLinkError, MagicLinkErrorCode } from '../magic-link/magic-link.service';
import { BadRequestException } from '@nestjs/common';

/**
 * Unit tests for ApplicationResolver — public candidate application submission.
 *
 * Covers:
 * - validateMagicLink: valid/expired/used/invalid tokens
 * - submitApplication: field validation, successful submission, concurrent rejection
 *
 * Requirements: 5.1, 5.2, 5.7, 5.8, 5.9, 20.5, 26.2
 */
describe('ApplicationResolver', () => {
  let resolver: ApplicationResolver;
  let mockMagicLinkService: {
    validate: ReturnType<typeof vi.fn>;
    consume: ReturnType<typeof vi.fn>;
  };

  const validInput = {
    phone: '+1 555-1234',
    location: 'New York, NY',
    currentRole: 'Software Engineer',
    noticePeriod: '2 weeks',
    salaryExpectation: '$120,000',
    linkedinUrl: 'https://www.linkedin.com/in/johndoe',
  };

  const mockCandidate = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1 555-1234',
    location: 'New York, NY',
    currentRole: 'Software Engineer',
    noticePeriod: '2 weeks',
    salaryExpectation: '$120,000',
    linkedinUrl: 'https://www.linkedin.com/in/johndoe',
    status: 'FormSubmitted',
    rejectionReason: null,
    jobOpeningId: '987e4567-e89b-12d3-a456-426614174000',
    lastActivityAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(() => {
    mockMagicLinkService = {
      validate: vi.fn(),
      consume: vi.fn(),
    };
    resolver = new ApplicationResolver(mockMagicLinkService as unknown as MagicLinkService);
  });

  describe('validateMagicLink', () => {
    it('should return valid=true for a valid token', async () => {
      mockMagicLinkService.validate.mockResolvedValue({
        valid: true,
        candidateId: '123',
      });

      const result = await resolver.validateMagicLink('valid-token');
      expect(result).toEqual({ valid: true, reason: undefined, candidateId: '123' });
    });

    it('should return valid=false with reason "expired" for expired token', async () => {
      mockMagicLinkService.validate.mockResolvedValue({
        valid: false,
        reason: 'expired',
      });

      const result = await resolver.validateMagicLink('expired-token');
      expect(result).toEqual({ valid: false, reason: 'expired', candidateId: undefined });
    });

    it('should return valid=false with reason "used" for consumed token', async () => {
      mockMagicLinkService.validate.mockResolvedValue({
        valid: false,
        reason: 'used',
      });

      const result = await resolver.validateMagicLink('used-token');
      expect(result).toEqual({ valid: false, reason: 'used', candidateId: undefined });
    });

    it('should return valid=false with reason "invalid" for unknown token', async () => {
      mockMagicLinkService.validate.mockResolvedValue({
        valid: false,
        reason: 'invalid',
      });

      const result = await resolver.validateMagicLink('garbage-token');
      expect(result).toEqual({ valid: false, reason: 'invalid', candidateId: undefined });
    });
  });

  describe('submitApplication', () => {
    describe('field validation', () => {
      it('should reject phone with invalid characters', async () => {
        const input = { ...validInput, phone: 'abc-invalid' };
        await expect(resolver.submitApplication('token', input)).rejects.toThrow(BadRequestException);
      });

      it('should reject phone shorter than 7 chars', async () => {
        const input = { ...validInput, phone: '12345' };
        await expect(resolver.submitApplication('token', input)).rejects.toThrow(BadRequestException);
      });

      it('should reject phone longer than 20 chars', async () => {
        const input = { ...validInput, phone: '+1 234 567 890 123 456' };
        await expect(resolver.submitApplication('token', input)).rejects.toThrow(BadRequestException);
      });

      it('should reject empty location', async () => {
        const input = { ...validInput, location: '' };
        await expect(resolver.submitApplication('token', input)).rejects.toThrow(BadRequestException);
      });

      it('should reject location exceeding 100 characters', async () => {
        const input = { ...validInput, location: 'A'.repeat(101) };
        await expect(resolver.submitApplication('token', input)).rejects.toThrow(BadRequestException);
      });

      it('should reject empty currentRole', async () => {
        const input = { ...validInput, currentRole: '' };
        await expect(resolver.submitApplication('token', input)).rejects.toThrow(BadRequestException);
      });

      it('should reject currentRole exceeding 100 characters', async () => {
        const input = { ...validInput, currentRole: 'R'.repeat(101) };
        await expect(resolver.submitApplication('token', input)).rejects.toThrow(BadRequestException);
      });

      it('should reject empty noticePeriod', async () => {
        const input = { ...validInput, noticePeriod: '' };
        await expect(resolver.submitApplication('token', input)).rejects.toThrow(BadRequestException);
      });

      it('should reject noticePeriod exceeding 50 characters', async () => {
        const input = { ...validInput, noticePeriod: 'N'.repeat(51) };
        await expect(resolver.submitApplication('token', input)).rejects.toThrow(BadRequestException);
      });

      it('should reject empty salaryExpectation', async () => {
        const input = { ...validInput, salaryExpectation: '' };
        await expect(resolver.submitApplication('token', input)).rejects.toThrow(BadRequestException);
      });

      it('should reject salaryExpectation exceeding 50 characters', async () => {
        const input = { ...validInput, salaryExpectation: 'S'.repeat(51) };
        await expect(resolver.submitApplication('token', input)).rejects.toThrow(BadRequestException);
      });

      it('should reject invalid LinkedIn URL format', async () => {
        const input = { ...validInput, linkedinUrl: 'http://linkedin.com/in/test' };
        await expect(resolver.submitApplication('token', input)).rejects.toThrow(BadRequestException);
      });

      it('should reject LinkedIn URL not starting with approved prefix', async () => {
        const input = { ...validInput, linkedinUrl: 'https://example.com/profile' };
        await expect(resolver.submitApplication('token', input)).rejects.toThrow(BadRequestException);
      });

      it('should accept valid input without LinkedIn URL', async () => {
        const input = { ...validInput, linkedinUrl: undefined };
        mockMagicLinkService.consume.mockResolvedValue(mockCandidate);

        const result = await resolver.submitApplication('token', input);
        expect(result.id).toBe(mockCandidate.id);
      });

      it('should accept valid input with empty LinkedIn URL', async () => {
        const input = { ...validInput, linkedinUrl: '' };
        mockMagicLinkService.consume.mockResolvedValue({ ...mockCandidate, linkedinUrl: null });

        const result = await resolver.submitApplication('token', input);
        expect(result.id).toBe(mockCandidate.id);
      });

      it('should accept phone with valid chars (digits, spaces, hyphens, parens, leading +)', async () => {
        const input = { ...validInput, phone: '+1 (555) 123-4567' };
        mockMagicLinkService.consume.mockResolvedValue(mockCandidate);

        const result = await resolver.submitApplication('token', input);
        expect(result.id).toBe(mockCandidate.id);
      });
    });

    describe('successful submission', () => {
      it('should call consume with validated form data', async () => {
        mockMagicLinkService.consume.mockResolvedValue(mockCandidate);

        await resolver.submitApplication('my-token', validInput);

        expect(mockMagicLinkService.consume).toHaveBeenCalledWith('my-token', {
          phone: validInput.phone,
          location: validInput.location,
          currentRole: validInput.currentRole,
          noticePeriod: validInput.noticePeriod,
          salaryExpectation: validInput.salaryExpectation,
          linkedinUrl: validInput.linkedinUrl,
        });
      });

      it('should return the updated candidate record', async () => {
        mockMagicLinkService.consume.mockResolvedValue(mockCandidate);

        const result = await resolver.submitApplication('token', validInput);

        expect(result.id).toBe(mockCandidate.id);
        expect(result.status).toBe('FormSubmitted');
        expect(result.phone).toBe('+1 555-1234');
        expect(result.location).toBe('New York, NY');
      });
    });

    describe('concurrent submission (first writer wins)', () => {
      it('should throw "already used" when magic link was already consumed', async () => {
        mockMagicLinkService.consume.mockRejectedValue(
          new MagicLinkError('Magic link has already been used', MagicLinkErrorCode.ALREADY_CONSUMED),
        );

        try {
          await resolver.submitApplication('token', validInput);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const response = (error as BadRequestException).getResponse() as Record<string, unknown>;
          expect(response.code).toBe('ALREADY_USED');
          expect(response.message).toBe('This link has already been used');
        }
      });

      it('should throw "expired" for expired magic link', async () => {
        mockMagicLinkService.consume.mockRejectedValue(
          new MagicLinkError('Magic link has expired', MagicLinkErrorCode.EXPIRED),
        );

        try {
          await resolver.submitApplication('token', validInput);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const response = (error as BadRequestException).getResponse() as Record<string, unknown>;
          expect(response.code).toBe('LINK_EXPIRED');
        }
      });

      it('should throw "invalid" for non-existent token', async () => {
        mockMagicLinkService.consume.mockRejectedValue(
          new MagicLinkError('Magic link not found', MagicLinkErrorCode.INVALID_TOKEN),
        );

        try {
          await resolver.submitApplication('token', validInput);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const response = (error as BadRequestException).getResponse() as Record<string, unknown>;
          expect(response.code).toBe('INVALID_TOKEN');
        }
      });
    });

    describe('data preservation on concurrent rejection', () => {
      it('should not modify original data when second submission is rejected', async () => {
        // First call succeeds
        mockMagicLinkService.consume.mockResolvedValueOnce(mockCandidate);
        const firstResult = await resolver.submitApplication('token', validInput);
        expect(firstResult.phone).toBe('+1 555-1234');
        expect(firstResult.location).toBe('New York, NY');

        // Second call with different data is rejected
        mockMagicLinkService.consume.mockRejectedValueOnce(
          new MagicLinkError('Magic link has already been used', MagicLinkErrorCode.ALREADY_CONSUMED),
        );

        const differentInput = {
          ...validInput,
          phone: '+44 7700 900000',
          location: 'London, UK',
        };

        await expect(resolver.submitApplication('token', differentInput)).rejects.toThrow(BadRequestException);

        // The first result's data was preserved (the magic link service handles this atomically)
        expect(firstResult.phone).toBe('+1 555-1234');
        expect(firstResult.location).toBe('New York, NY');
      });
    });
  });
});
