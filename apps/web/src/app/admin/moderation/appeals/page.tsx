import { AdminDirectory } from "@/features/admin/admin-directory";
export const metadata = { title: "Appeals | Letterly administration" };
export default function AdminAppealsPage() {
  return <AdminDirectory kind="appeals" />;
}
