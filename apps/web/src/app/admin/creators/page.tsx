import { AdminDirectory } from "@/features/admin/admin-directory";

export const metadata = { title: "Creators | Letterly administration" };

export default function AdminCreatorsPage() {
  return <AdminDirectory kind="creators" />;
}
