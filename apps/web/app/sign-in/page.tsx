import { SignInForm } from "../../src/features/auth/components/sign-in-form";

export const metadata = {
  title: "Sign in | Letterly",
  description: "Sign in to create and manage your private Letterly pages.",
};

export default function SignInPage(): React.JSX.Element {
  return <SignInForm />;
}
