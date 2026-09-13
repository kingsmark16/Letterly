import { z } from "zod";

export const AUTH_PASSWORD_MIN_LENGTH = 6;
export const AUTH_PASSWORD_MAX_LENGTH = 128;
export const AUTH_NAME_MAX_LENGTH = 80;
export const AUTH_EMAIL_MAX_LENGTH = 254;
export const AUTH_TOKEN_MAX_LENGTH = 256;

export const AUTH_RATE_LIMITS = {
  signIn: { max: 5, windowSeconds: 60 },
  signUp: { max: 3, windowSeconds: 60 },
  signOut: { max: 10, windowSeconds: 60 },
  verificationResend: { max: 3, windowSeconds: 60 * 60 },
  verificationLinkRequest: { max: 10, windowSeconds: 60 * 60 },
  passwordResetRequest: { max: 3, windowSeconds: 60 * 60 },
  passwordResetSubmission: { max: 5, windowSeconds: 60 * 60 },
} as const;

export const AUTH_PUBLIC_MESSAGES = {
  genericFailure: "We could not complete that request. Please try again.",
  signInFailure:
    "We could not sign you in. Check your email and password and try again.",
  signUpFailure:
    "We could not complete account setup. Check your details and try again.",
  emailActionRequested:
    "If an account matches that email, check your inbox for next steps.",
  invalidResetToken: "This password reset link is invalid or expired.",
  rateLimited: "Too many attempts. Please try again later.",
} as const;

export const authNameSchema = z
  .string()
  .trim()
  .min(1, "Enter your name")
  .max(AUTH_NAME_MAX_LENGTH, "Use a shorter name");

export const authEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(AUTH_EMAIL_MAX_LENGTH, "Enter a shorter email address");

export const authPasswordSchema = z
  .string()
  .min(
    AUTH_PASSWORD_MIN_LENGTH,
    `Use at least ${AUTH_PASSWORD_MIN_LENGTH} characters`,
  )
  .max(
    AUTH_PASSWORD_MAX_LENGTH,
    `Use no more than ${AUTH_PASSWORD_MAX_LENGTH} characters`,
  );

export const signUpEmailRequestSchema = z.object({
  name: authNameSchema,
  email: authEmailSchema,
  password: authPasswordSchema,
});

export const signInEmailRequestSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
});

export const emailOnlyAuthRequestSchema = z.object({
  email: authEmailSchema,
});

export const resetPasswordRequestSchema = z.object({
  newPassword: authPasswordSchema,
  token: z.string().trim().min(1).max(AUTH_TOKEN_MAX_LENGTH).optional(),
});

export const resetPasswordFormSchema = z
  .object({
    newPassword: authPasswordSchema,
    passwordConfirmation: z.string(),
  })
  .superRefine(({ newPassword, passwordConfirmation }, context) => {
    if (newPassword !== passwordConfirmation) {
      context.addIssue({
        code: "custom",
        path: ["passwordConfirmation"],
        message: "Passwords must match",
      });
    }
  });

export type SignUpEmailRequest = z.infer<typeof signUpEmailRequestSchema>;
export type SignInEmailRequest = z.infer<typeof signInEmailRequestSchema>;
export type EmailOnlyAuthRequest = z.infer<typeof emailOnlyAuthRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordFormSchema>;

export type AuthEmailType = "verification" | "password-reset";

export type AuthMailResult =
  | {
      ok: true;
      messageId: string | undefined;
    }
  | {
      ok: false;
      category: "disabled" | "transient" | "permanent" | "timeout" | "unknown";
      attempts: number;
    };

export interface AuthMailPort {
  send(input: {
    type: AuthEmailType;
    userId: string;
    recipient: string;
    url: string;
    token: string;
    requestId?: string;
    route?: string;
  }): Promise<AuthMailResult>;
}
