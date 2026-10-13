import {
  isDatabaseAuthenticationError,
  isDatabaseUnavailableError,
  isTransientDatabaseError,
} from './prisma-recovery';

describe('database error classification', () => {
  it.each(['P1000', '28P01'])('recognizes authentication code %s', (code) => {
    expect(isDatabaseAuthenticationError({ code })).toBe(true);
  });

  it('recognizes authentication codes in nested causes', () => {
    expect(
      isDatabaseAuthenticationError({
        cause: { code: 'P1000' },
      }),
    ).toBe(true);
  });

  it('does not infer authentication errors from messages or unrelated codes', () => {
    expect(
      isDatabaseAuthenticationError({
        code: 'P1001',
        message: 'database authentication failed',
      }),
    ).toBe(false);
    expect(isDatabaseAuthenticationError({ code: 'P2002' })).toBe(false);
    expect(isDatabaseAuthenticationError(new Error('invalid password'))).toBe(
      false,
    );
  });

  it('keeps authentication errors outside transient recovery classification', () => {
    expect(isTransientDatabaseError({ code: 'P1000' })).toBe(false);
    expect(isTransientDatabaseError({ code: '28P01' })).toBe(false);
  });

  it('classifies database socket permission errors as unavailable without retry recovery', () => {
    expect(isDatabaseUnavailableError({ code: 'EACCES' })).toBe(true);
    expect(isDatabaseUnavailableError({ cause: { code: 'EACCES' } })).toBe(
      true,
    );
    expect(isTransientDatabaseError({ code: 'EACCES' })).toBe(false);
    expect(isDatabaseUnavailableError({ code: 'P1000' })).toBe(false);
  });
});
