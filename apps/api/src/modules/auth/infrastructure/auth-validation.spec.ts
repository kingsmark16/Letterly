import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  emailOnlyAuthRequestSchema,
  resetPasswordFormSchema,
  signInEmailRequestSchema,
  signUpEmailRequestSchema,
} from '@letterly/contracts';

describe('email/password auth validation', () => {
  it('normalizes a valid sign-up name and email at the boundary', () => {
    const result = signUpEmailRequestSchema.safeParse({
      name: '  Letterly Creator  ',
      email: '  CREATOR@Example.COM ',
      password: 'a secure passphrase',
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toEqual({
      name: 'Letterly Creator',
      email: 'creator@example.com',
      password: 'a secure passphrase',
    });
  });

  it('rejects a sign-up without a meaningful name', () => {
    const result = signUpEmailRequestSchema.safeParse({
      name: '   ',
      email: 'creator@example.com',
      password: 'a secure passphrase',
    });

    expect(result.success).toBe(false);
  });

  it('rejects passwords shorter than the configured minimum', () => {
    const result = signInEmailRequestSchema.safeParse({
      email: 'creator@example.com',
      password: 'a'.repeat(AUTH_PASSWORD_MIN_LENGTH - 1),
    });

    expect(result.success).toBe(false);
  });

  it('rejects passwords longer than the configured maximum', () => {
    const result = signInEmailRequestSchema.safeParse({
      email: 'creator@example.com',
      password: 'a'.repeat(AUTH_PASSWORD_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });

  it('accepts passwords at both configured boundaries without trimming them', () => {
    const minimum = ' '.repeat(1) + 'a'.repeat(AUTH_PASSWORD_MIN_LENGTH - 1);
    const maximum = 'a'.repeat(AUTH_PASSWORD_MAX_LENGTH);

    const minimumResult = signInEmailRequestSchema.safeParse({
      email: 'creator@example.com',
      password: minimum,
    });
    const maximumResult = signInEmailRequestSchema.safeParse({
      email: 'creator@example.com',
      password: maximum,
    });

    expect(minimumResult.success).toBe(true);
    expect(maximumResult.success).toBe(true);
    if (!minimumResult.success || !maximumResult.success) {
      return;
    }

    expect(minimumResult.data.password).toBe(minimum);
    expect(maximumResult.data.password).toBe(maximum);
  });

  it('normalizes email-only recovery input and enforces the email boundary', () => {
    const normalized = emailOnlyAuthRequestSchema.safeParse({
      email: '  CREATOR@Example.COM ',
    });
    const tooLong = emailOnlyAuthRequestSchema.safeParse({
      email: `${'a'.repeat(250)}@example.com`,
    });

    expect(normalized).toEqual({
      success: true,
      data: { email: 'creator@example.com' },
    });
    expect(tooLong.success).toBe(false);
  });

  it('rejects empty and overlong display names', () => {
    const empty = signUpEmailRequestSchema.safeParse({
      name: '   ',
      email: 'creator@example.com',
      password: 'secure',
    });
    const overlong = signUpEmailRequestSchema.safeParse({
      name: 'a'.repeat(81),
      email: 'creator@example.com',
      password: 'secure',
    });

    expect(empty.success).toBe(false);
    expect(overlong.success).toBe(false);
  });

  it('requires an exact password confirmation for reset forms', () => {
    const matching = resetPasswordFormSchema.safeParse({
      newPassword: 'secure',
      passwordConfirmation: 'secure',
    });
    const mismatched = resetPasswordFormSchema.safeParse({
      newPassword: 'secure',
      passwordConfirmation: 'Secure',
    });

    expect(matching.success).toBe(true);
    expect(mismatched.success).toBe(false);
    if (mismatched.success) {
      return;
    }

    expect(mismatched.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['passwordConfirmation'],
          message: 'Passwords must match',
        }),
      ]),
    );
  });

  it('rejects malformed email addresses without exposing credentials', () => {
    const result = signInEmailRequestSchema.safeParse({
      email: 'not-an-email',
      password: 'a secure passphrase',
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain('a secure passphrase');
  });
});
