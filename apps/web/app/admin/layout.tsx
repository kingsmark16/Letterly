import { getCategories } from "../../lib/catalog";
import { WorkspaceFrame } from "../../src/features/pages/components/dashboard-shell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const categories = await getCategories().catch(() => []);
  return <WorkspaceFrame categories={categories}>{children}</WorkspaceFrame>;
}
