import { AdminReportConsole } from "../../../../src/features/admin/admin-report-console";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Moderation reports | Letterly",
  robots: { index: false, follow: false },
};

export default function AdminReportsPage(): React.JSX.Element {
  return <AdminReportConsole />;
}
