import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCookie } from '@/utils/cookies';

describe('cookies util', () => {
  const originalDocument = global.document;

  beforeEach(() => {
    // Setup a mock document for testing cookies
    Object.defineProperty(global, 'document', {
      writable: true,
      value: { cookie: '' },
    });
  });

  afterEach(() => {
    // Restore the original document
    global.document = originalDocument;
  });

  it('should return null if the cookie does not exist', () => {
    global.document.cookie = 'other=value';
    expect(getCookie('missing')).toBeNull();
  });

  it('should return the cookie value if it exists', () => {
    global.document.cookie = 'nubo:referral=grupo; other=value';
    expect(getCookie('nubo:referral')).toBe('grupo');
  });

  it('should decode the cookie value correctly', () => {
    global.document.cookie = 'nubo:referral=teste%20espa%C3%A7o; other=value';
    expect(getCookie('nubo:referral')).toBe('teste espaço');
  });

  it('should return null in SSR (document undefined)', () => {
    global.document = undefined as any;
    expect(getCookie('nubo:referral')).toBeNull();
  });
});
