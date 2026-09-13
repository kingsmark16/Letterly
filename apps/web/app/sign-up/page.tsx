import { SignUpForm } from "../../src/features/auth/components/sign-in-form";
import { parseSafeReturnPath } from "../../src/lib/return-path";
import { PrivacyDocument } from "../privacy/page";
import { TermsDocument } from "../terms/page";

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    returnTo?: string | string[];
  }>;
};

export const metadata = {
  title: "Create an account | Letterly",
  description: "Create a Letterly account for private pages and drafts.",
};

export default async function SignUpPage({
  searchParams,
}: SignUpPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const errorValues = Array.isArray(params.error)
    ? params.error
    : [params.error];
  const returnTo = Array.isArray(params.returnTo)
    ? params.returnTo.at(-1)
    : params.returnTo;
  const safeReturnTo = returnTo
    ? parseSafeReturnPath(returnTo)
    : "/dashboard/home";

  return (
    <SignUpForm
      initialError={errorValues.some(Boolean)}
      returnTo={safeReturnTo}
      privacyContent={<PrivacyDocument />}
      termsContent={<TermsDocument />}
    />
  );
}
