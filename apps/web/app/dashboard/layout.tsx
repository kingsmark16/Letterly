import { getCategories } from "../../lib/catalog";
import { DashboardShell } from "../../src/features/pages/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const categories = await getCategories().catch(() => []);
  return <DashboardShell categories={categories}>{children}</DashboardShell>;
}
