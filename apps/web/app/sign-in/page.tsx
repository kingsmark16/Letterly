import { SignInForm } from "../../src/features/auth/components/sign-in-form";
import { parseSafeReturnPath } from "../../src/lib/return-path";

type SignInPageProps = {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
};

export const metadata = {
  title: "Sign in | Letterly",
  description: "Sign in to create and manage your private Letterly pages.",
};

export default async function SignInPage({
  searchParams,
}: SignInPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;

  return (
    <SignInForm
      initialError={params.error === "oauth"}
      returnTo={parseSafeReturnPath(params.returnTo)}
    />
  );
}
