import { WorkspaceFrame } from "../../src/features/pages/components/dashboard-shell";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return <WorkspaceFrame>{children}</WorkspaceFrame>;
}
