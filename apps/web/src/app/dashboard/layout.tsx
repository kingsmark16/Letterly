import { getCategories } from "@/features/catalog/server/catalog";
import { DashboardShell } from "@/features/pages/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const categories = await getCategories().catch(() => []);
  return <DashboardShell categories={categories}>{children}</DashboardShell>;
}
