/**
 * PHI Scrubber — unit tests
 *
 * Verifies that Protected Health Information is stripped from Sentry events
 * before they leave the server. Regression tests for HIPAA compliance.
 */

import { describe, it, expect } from 'vitest';
import {
  scrubObject,
  scrubString,
  isPhiKey,
  beforeSend,
  beforeSendTransaction,
} from '@/utils/monitoring/phi-scrubber';

// ── scrubObject ──────────────────────────────────────────────────

describe('scrubObject', () => {
  it('redacts known PHI keys', () => {
    const input = {
      patient_name: 'Jane Doe',
      patient_email: 'jane@example.com',
      patient_phone: '0412345678',
      patient_dob: '1990-01-15',
      status: 'confirmed',
    };
    const result = scrubObject(input) as Record<string, unknown>;
    expect(result.patient_name).toBe('[REDACTED]');
    expect(result.patient_email).toBe('[REDACTED]');
    expect(result.patient_phone).toBe('[REDACTED]');
    expect(result.patient_dob).toBe('[REDACTED]');
    expect(result.status).toBe('confirmed');
  });

  it('redacts auth/secret keys', () => {
    const input = {
      password: 'hunter2',
      newPassword: 'hunter3',
      mfa_secret: 'JBSWY3DPEHPK3PXP',
      token: 'abc123',
      api_key: 'sk-1234',
      encryption_key: 'deadbeef',
    };
    const result = scrubObject(input) as Record<string, unknown>;
    expect(result.password).toBe('[REDACTED]');
    expect(result.newPassword).toBe('[REDACTED]');
    expect(result.mfa_secret).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.api_key).toBe('[REDACTED]');
    expect(result.encryption_key).toBe('[REDACTED]');
  });

  it('handles nested objects recursively', () => {
    const input = {
      booking: {
        patient_name: 'Jane Doe',
        clinic: 'Test Clinic',
      },
    };
    const result = scrubObject(input) as Record<string, Record<string, unknown>>;
    expect(result.booking.patient_name).toBe('[REDACTED]');
    expect(result.booking.clinic).toBe('Test Clinic');
  });

  it('handles arrays', () => {
    const input = [
      { patient_email: 'a@b.com', id: 1 },
      { patient_email: 'c@d.com', id: 2 },
    ];
    const result = scrubObject(input) as Record<string, unknown>[];
    expect(result[0].patient_email).toBe('[REDACTED]');
    expect(result[0].id).toBe(1);
    expect(result[1].patient_email).toBe('[REDACTED]');
  });

  it('handles null and undefined gracefully', () => {
    expect(scrubObject(null)).toBeNull();
    expect(scrubObject(undefined)).toBeUndefined();
  });

  it('prevents infinite recursion on deeply nested objects', () => {
    // Create a deeply nested object (> 10 levels)
    let obj: Record<string, unknown> = { value: 'deep' };
    for (let i = 0; i < 15; i++) {
      obj = { nested: obj };
    }
    // Should not throw
    const result = scrubObject(obj);
    expect(result).toBeDefined();
  });

  it('does not mutate the original object', () => {
    const input = { patient_name: 'Jane Doe', safe: 'ok' };
    const original = { ...input };
    scrubObject(input);
    expect(input.patient_name).toBe(original.patient_name);
    expect(input.safe).toBe(original.safe);
  });
});

// ── scrubString ──────────────────────────────────────────────────

describe('scrubString', () => {
  it('redacts Australian phone numbers', () => {
    expect(scrubString('Call 0412345678 for info')).toBe('Call [REDACTED] for info');
    expect(scrubString('Phone: +61412345678')).toBe('Phone: [REDACTED]');
  });

  it('redacts email addresses', () => {
    expect(scrubString('Contact jane.doe@example.com')).toBe('Contact [REDACTED]');
  });

  it('redacts date patterns', () => {
    expect(scrubString('DOB: 15/01/1990')).toBe('DOB: [REDACTED]');
    expect(scrubString('Born 1990-01-15')).toBe('Born [REDACTED]');
  });

  it('leaves safe strings unchanged', () => {
    expect(scrubString('Booking confirmed for MRI scan')).toBe(
      'Booking confirmed for MRI scan'
    );
  });

  it('handles empty string', () => {
    expect(scrubString('')).toBe('');
  });

  it('redacts multiple PHI values in one string', () => {
    const input = 'Patient jane@test.com called from 0400000000 on 01/02/2025';
    const result = scrubString(input);
    expect(result).not.toContain('jane@test.com');
    expect(result).not.toContain('0400000000');
    expect(result).not.toContain('01/02/2025');
  });
});

// ── isPhiKey ─────────────────────────────────────────────────────

describe('isPhiKey', () => {
  it('matches known PHI key patterns', () => {
    expect(isPhiKey('patient_name')).toBe(true);
    expect(isPhiKey('patient_email')).toBe(true);
    expect(isPhiKey('patient_phone')).toBe(true);
    expect(isPhiKey('patient_dob')).toBe(true);
    expect(isPhiKey('full_name')).toBe(true);
    expect(isPhiKey('date_of_birth')).toBe(true);
    expect(isPhiKey('medicare')).toBe(true);
    expect(isPhiKey('password')).toBe(true);
    expect(isPhiKey('mfa_secret')).toBe(true);
    expect(isPhiKey('api_key')).toBe(true);
    expect(isPhiKey('session_token')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isPhiKey('PATIENT_NAME')).toBe(true);
    expect(isPhiKey('Patient_Email')).toBe(true);
  });

  it('does not match safe keys', () => {
    expect(isPhiKey('clinicId')).toBe(false);
    expect(isPhiKey('scanType')).toBe(false);
    expect(isPhiKey('status')).toBe(false);
    expect(isPhiKey('createdAt')).toBe(false);
  });
});

// ── beforeSend (Sentry event scrubbing) ──────────────────────────

describe('beforeSend', () => {
  it('scrubs exception values', () => {
    const event = {
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Failed for user jane@example.com with phone 0412345678',
          },
        ],
      },
    } as any;

    const result = beforeSend(event);
    expect(result).not.toBeNull();
    expect(result!.exception!.values![0].value).not.toContain('jane@example.com');
    expect(result!.exception!.values![0].value).not.toContain('0412345678');
  });

  it('scrubs stack frame variables', () => {
    const event = {
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Something broke',
            stacktrace: {
              frames: [
                {
                  filename: 'api/bookings.js',
                  vars: {
                    patient_name: 'Jane Doe',
                    clinicId: '123',
                  },
                },
              ],
            },
          },
        ],
      },
    } as any;

    const result = beforeSend(event);
    const vars = result!.exception!.values![0].stacktrace!.frames![0].vars!;
    expect(vars.patient_name).toBe('[REDACTED]');
    expect(vars.clinicId).toBe('123');
  });

  it('scrubs breadcrumb messages and data', () => {
    const event = {
      breadcrumbs: [
        {
          category: 'console',
          message: 'Booking for jane@test.com',
          data: { patient_phone: '0412345678' },
        },
      ],
    } as any;

    const result = beforeSend(event);
    expect(result!.breadcrumbs![0].message).not.toContain('jane@test.com');
    expect(result!.breadcrumbs![0].data!.patient_phone).toBe('[REDACTED]');
  });

  it('scrubs request headers', () => {
    const event = {
      request: {
        url: 'https://clearo.com.au/api/bookings',
        headers: {
          authorization: 'Bearer secret_token_123',
          cookie: 'session=abc123',
          'content-type': 'application/json',
        },
      },
    } as any;

    const result = beforeSend(event);
    expect(result!.request!.headers!.authorization).toBe('[REDACTED]');
    expect(result!.request!.headers!.cookie).toBe('[REDACTED]');
    expect(result!.request!.headers!['content-type']).toBe('application/json');
  });

  it('strips user PII — keeps only ID', () => {
    const event = {
      user: {
        id: 'user-uuid-123',
        email: 'jane@example.com',
        ip_address: '1.2.3.4',
        username: 'janedoe',
      },
    } as any;

    const result = beforeSend(event);
    expect(result!.user).toEqual({ id: 'user-uuid-123' });
  });

  it('scrubs extra and tags', () => {
    const event = {
      extra: { patient_email: 'x@y.com', action: 'book' },
      tags: { patient_name: 'Jane', route: '/api/bookings' },
    } as any;

    const result = beforeSend(event);
    expect(result!.extra!.patient_email).toBe('[REDACTED]');
    expect(result!.extra!.action).toBe('book');
    expect(result!.tags!.patient_name).toBe('[REDACTED]');
    expect(result!.tags!.route).toBe('/api/bookings');
  });

  it('handles minimal event without crashing', () => {
    const event = {} as any;
    const result = beforeSend(event);
    expect(result).toEqual({});
  });
});

// ── beforeSendTransaction ────────────────────────────────────────

describe('beforeSendTransaction', () => {
  it('scrubs transaction events the same as error events', () => {
    const event = {
      type: 'transaction' as const,
      extra: { patient_name: 'Jane Doe', duration: 120 },
    } as any;

    const result = beforeSendTransaction(event);
    expect(result).not.toBeNull();
    expect(result!.extra!.patient_name).toBe('[REDACTED]');
    expect(result!.extra!.duration).toBe(120);
  });
});
