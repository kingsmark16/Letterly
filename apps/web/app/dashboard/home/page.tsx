import { getCatalog } from "../../../lib/catalog";
import { DashboardHome } from "../../../src/features/pages/components/dashboard-home";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Home | Letterly",
  description: "Your private Letterly workspace.",
};

export default async function DashboardHomePage(): Promise<React.JSX.Element> {
  try {
    const catalog = await getCatalog();

    return <DashboardHome catalog={catalog} />;
  } catch {
    return <DashboardHome catalog={null} catalogError />;
  }
}
