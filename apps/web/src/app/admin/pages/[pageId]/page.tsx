import { AdminOperationDetail } from "@/features/admin/admin-operation-detail";
export const metadata = { title: "Page details | Letterly administration" };
export default async function AdminPageDetail({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  return <AdminOperationDetail kind="page" id={(await params).pageId} />;
}
