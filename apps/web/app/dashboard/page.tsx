import { getCatalog } from "../../lib/catalog";
import { DashboardHome } from "../../src/features/pages/components/dashboard-home";

export const metadata = {
  title: "Overview | Letterly",
  description: "Your private Letterly workspace.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage(): Promise<React.JSX.Element> {
  try {
    const catalog = await getCatalog();

    return <DashboardHome catalog={catalog} />;
  } catch {
    return <DashboardHome catalog={null} catalogError />;
  }
}
