import { AdminReportConsole } from "../../../../../src/features/admin/admin-report-console";

type AdminReportDetailPageProps = { params: Promise<{ reportId: string }> };

export const dynamic = "force-dynamic";

export default async function AdminReportDetailPage({ params }: AdminReportDetailPageProps): Promise<React.JSX.Element> {
  return <AdminReportConsole reportId={(await params).reportId} />;
}
