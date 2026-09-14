import { DashboardShell } from "../../src/features/pages/components/dashboard-shell";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return <DashboardShell>{children}</DashboardShell>;
}
