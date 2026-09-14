import { redirect } from "next/navigation";

export const metadata = {
  title: "Overview | Letterly",
  description: "Your private Letterly workspace.",
};

export default function DashboardHomePage(): never {
  redirect("/dashboard");
}
