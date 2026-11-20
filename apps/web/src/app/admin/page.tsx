import { redirect } from "next/navigation";
import { getAdminAccessState } from "@/lib/server-admin-auth";

export default async function AdminIndexPage() {
  if ((await getAdminAccessState()) === "allowed") redirect("/admin/overview");
  return null;
}
