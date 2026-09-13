import { AuthRecoveryPage } from "../../src/features/auth/components/auth-recovery-page";
import { PrivacyDocument } from "../privacy/page";
import { TermsDocument } from "../terms/page";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    mode?: string | string[];
  }>;
};

export const metadata = {
  title: "Account recovery | Letterly",
  description: "Recover access to your Letterly account.",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const mode =
    params.mode === "verification" ? "verification" : "password-reset";

  return (
    <AuthRecoveryPage
      mode={mode}
      privacyContent={<PrivacyDocument />}
      termsContent={<TermsDocument />}
    />
  );
}
