import { AdminAuditConsole } from "../../../../src/features/admin/admin-audit-console";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit history | Letterly",
  robots: { index: false, follow: false },
};

export default function AdminAuditPage(): React.JSX.Element {
  return <AdminAuditConsole />;
}
