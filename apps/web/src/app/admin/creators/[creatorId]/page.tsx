import { AdminCreatorConsole } from "@/features/admin/admin-creator-console";

export const metadata = { title: "Creator details | Letterly administration" };

export default async function AdminCreatorPage({
  params,
}: {
  params: Promise<{ creatorId: string }>;
}) {
  const { creatorId } = await params;
  return <AdminCreatorConsole creatorId={creatorId} />;
}
