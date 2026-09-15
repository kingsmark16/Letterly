import { getCatalog } from "../../lib/catalog";
import { DashboardHome } from "../../src/features/pages/components/dashboard-home";

export const metadata = {
  title: "Overview | Letterly",
  description: "Your private Letterly workspace.",
};

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{ uiFixture?: string | string[] }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const requestedFixture = Array.isArray(params.uiFixture)
    ? params.uiFixture.at(-1)
    : params.uiFixture;
  const fixture =
    process.env.LETTERLY_UI_TEST_FIXTURES === "1"
      ? requestedFixture
      : undefined;

  if (fixture === "empty") {
    return <DashboardHome catalog={{ categories: [], templates: [] }} />;
  }

  if (fixture === "error") {
    return <DashboardHome catalog={null} catalogError />;
  }

  try {
    const catalog = await getCatalog();

    return <DashboardHome catalog={catalog} />;
  } catch {
    return <DashboardHome catalog={null} catalogError />;
  }
}
