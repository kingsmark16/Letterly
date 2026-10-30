import { redirect } from "next/navigation";
import { SignUpForm } from "@/features/auth/components/sign-in-form";
import { parseSafeReturnPath } from "@/lib/return-path";
import { PrivacyDocument } from "@/features/legal/privacy-document";
import { TermsDocument } from "@/features/legal/terms-document";
import { isServerAuthenticated } from "@/lib/server-auth";

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

  if (await isServerAuthenticated()) {
    redirect(safeReturnTo);
  }

  return (
    <SignUpForm
      initialError={errorValues.some(Boolean)}
      returnTo={safeReturnTo}
      privacyContent={<PrivacyDocument />}
      termsContent={<TermsDocument />}
    />
  );
}
