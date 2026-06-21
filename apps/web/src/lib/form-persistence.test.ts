import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveFormData,
  restoreFormData,
  clearFormData,
  cleanupExpiredFormData,
} from './form-persistence';

describe('form-persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('saveFormData', () => {
    it('saves form data to localStorage with path key', () => {
      saveFormData('/candidates/new', { name: 'John', email: 'john@test.com' });

      const raw = localStorage.getItem('rove_form_/candidates/new');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.data).toEqual({ name: 'John', email: 'john@test.com' });
      expect(parsed.path).toBe('/candidates/new');
      expect(parsed.savedAt).toBeTypeOf('number');
    });

    it('handles localStorage errors gracefully', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw
      expect(() => saveFormData('/path', { data: 'value' })).not.toThrow();

      spy.mockRestore();
    });
  });

  describe('restoreFormData', () => {
    it('restores saved form data', () => {
      const path = '/candidates/new';
      const data = { name: 'Jane' };
      saveFormData(path, data);
      const result = restoreFormData(path);
      expect(result).toEqual(data);
    });

    it('returns null for non-existent path', () => {
      expect(restoreFormData('/nonexistent')).toBeNull();
    });

    it('returns null and removes data older than 24 hours', () => {
      saveFormData('/old-path', { old: 'data' });

      // Advance time by 25 hours
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);

      expect(restoreFormData('/old-path')).toBeNull();
      expect(localStorage.getItem('rove_form_/old-path')).toBeNull();
    });

    it('returns data within 24 hours', () => {
      saveFormData('/recent', { fresh: 'data' });

      // Advance time by 23 hours (within limit)
      vi.advanceTimersByTime(23 * 60 * 60 * 1000);

      expect(restoreFormData('/recent')).toEqual({ fresh: 'data' });
    });
  });

  describe('clearFormData', () => {
    it('removes persisted data for path', () => {
      saveFormData('/path', { value: 'test' });
      clearFormData('/path');
      expect(restoreFormData('/path')).toBeNull();
    });
  });

  describe('cleanupExpiredFormData', () => {
    it('removes all expired entries', () => {
      // Save two entries that will expire
      saveFormData('/path1', { a: 1 });
      saveFormData('/path2', { b: 2 });

      // Advance past expiry
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);

      // Save a fresh one after advancing time
      saveFormData('/path3', { c: 3 });

      // Verify all three are in storage before cleanup
      expect(localStorage.getItem('rove_form_/path1')).not.toBeNull();
      expect(localStorage.getItem('rove_form_/path2')).not.toBeNull();
      expect(localStorage.getItem('rove_form_/path3')).not.toBeNull();

      cleanupExpiredFormData();

      // Expired entries should be removed
      expect(localStorage.getItem('rove_form_/path1')).toBeNull();
      expect(localStorage.getItem('rove_form_/path2')).toBeNull();
      // Fresh entry should remain
      expect(localStorage.getItem('rove_form_/path3')).not.toBeNull();
    });
  });
});
