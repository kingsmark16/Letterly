import { AdminOperationDetail } from "@/features/admin/admin-operation-detail";
export const metadata = { title: "Appeal details | Letterly administration" };
export default async function AdminAppealDetail({
  params,
}: {
  params: Promise<{ appealId: string }>;
}) {
  return <AdminOperationDetail kind="appeal" id={(await params).appealId} />;
}
