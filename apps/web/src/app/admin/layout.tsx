import { AdminShell } from "@/features/admin/admin-shell";
import { AdminAccessNotice } from "@/features/admin/admin-access-notice";
import { getAdminAccessState } from "@/lib/server-admin-auth";
import styles from "@/features/admin/admin-theme.module.css";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const access = await getAdminAccessState();
  return (
    <div data-admin-root className={styles.root}>
      {access === "allowed" ? (
        <AdminShell>{children}</AdminShell>
      ) : (
        <AdminAccessNotice access={access} />
      )}
    </div>
  );
}
