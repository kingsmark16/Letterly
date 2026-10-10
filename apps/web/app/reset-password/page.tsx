import { AuthRecoveryPage } from "../../src/features/auth/components/auth-recovery-page";
import { PrivacyDocument } from "../../src/features/legal/privacy-document";
import { TermsDocument } from "../../src/features/legal/terms-document";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export const metadata = {
  title: "Reset password | Letterly",
  description: "Choose a new password for your Letterly account.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const hasError = Boolean(params.error);

  return (
    <AuthRecoveryPage
      hasError={hasError}
      mode="reset-form"
      privacyContent={<PrivacyDocument />}
      termsContent={<TermsDocument />}
    />
  );
}
