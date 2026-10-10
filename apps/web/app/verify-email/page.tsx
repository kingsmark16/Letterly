import { AuthRecoveryPage } from "../../src/features/auth/components/auth-recovery-page";
import { PrivacyDocument } from "../../src/features/legal/privacy-document";
import { TermsDocument } from "../../src/features/legal/terms-document";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export const metadata = {
  title: "Verify email | Letterly",
  description: "Confirm your Letterly email address.",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;

  return (
    <AuthRecoveryPage
      hasError={Boolean(params.error)}
      mode="verification-result"
      privacyContent={<PrivacyDocument />}
      termsContent={<TermsDocument />}
    />
  );
}
