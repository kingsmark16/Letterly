import { AdminDeletionDetail } from "@/features/admin/admin-deletions-console";
export const metadata = { title: "Deletion job | Letterly administration" };
export default async function DeletionJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  return <AdminDeletionDetail id={(await params).jobId} />;
}
