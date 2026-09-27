import { DraftDashboard } from "../../../src/features/pages/components/draft-dashboard";

export const metadata = {
  title: "Pages | Letterly",
  description: "Manage your private Letterly pages.",
};

export default async function DashboardPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}): Promise<React.JSX.Element> {
  const { status } = await searchParams;
  const initialStatus =
    status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED"
      ? status
      : "ALL";
  return <DraftDashboard key={initialStatus} initialStatus={initialStatus} />;
}
