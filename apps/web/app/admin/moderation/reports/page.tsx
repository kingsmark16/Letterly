import { AdminReportConsole } from "../../../../src/features/admin/admin-report-console";
import { getAdminAccessState } from "../../../../src/lib/server-admin-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Moderation reports | Letterly",
  robots: { index: false, follow: false },
};

export default async function AdminReportsPage(): Promise<React.JSX.Element> {
  const access = await getAdminAccessState();
  if (access !== "allowed") {
    return (
      <main className="min-h-screen bg-canvas px-5 py-9 text-ink">
        <section className="mx-auto max-w-xl rounded-large border border-border bg-surface p-8 shadow-low" role="alert">
          <h1 className="font-display text-3xl font-semibold">Administration is unavailable</h1>
          <p className="mt-3 text-body text-ink-muted">
            {access === "unauthenticated"
              ? "Sign in with an administrator account to continue."
              : access === "forbidden"
                ? "You do not have permission to view this area."
                : "We could not verify administrator access right now."}
          </p>
        </section>
      </main>
    );
  }
  return <AdminReportConsole />;
}
