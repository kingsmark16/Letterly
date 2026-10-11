import { getCategories } from "../../src/features/catalog/server/catalog";
import { WorkspaceFrame } from "../../src/features/pages/dashboard/dashboard-shell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const categories = await getCategories().catch(() => []);
  return <WorkspaceFrame categories={categories}>{children}</WorkspaceFrame>;
}
