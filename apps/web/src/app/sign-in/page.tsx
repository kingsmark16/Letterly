import { PrivacyDocument } from "@/features/legal/privacy-document";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { parseSafeReturnPath } from "@/lib/return-path";
import { TermsDocument } from "@/features/legal/terms-document";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    returnTo?: string | string[];
  }>;
};

export const metadata = {
  title: "Sign in | Letterly",
  description: "Sign in to create and manage your private Letterly pages.",
};

export default async function SignInPage({
  searchParams,
}: SignInPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const errorValues = Array.isArray(params.error)
    ? params.error
    : [params.error];
  const returnTo = Array.isArray(params.returnTo)
    ? params.returnTo.at(-1)
    : params.returnTo;
  const safeReturnTo = returnTo ? parseSafeReturnPath(returnTo) : "/templates";

  return (
    <SignInForm
      initialError={errorValues.some(Boolean)}
      returnTo={safeReturnTo}
      privacyContent={<PrivacyDocument />}
      termsContent={<TermsDocument />}
    />
  );
}
