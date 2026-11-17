import { AdminDirectory } from "@/features/admin/admin-directory";
export const metadata = { title: "Pages | Letterly administration" };
export default function AdminPagesPage() {
  return <AdminDirectory kind="pages" />;
}
