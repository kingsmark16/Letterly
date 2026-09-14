import { DraftDashboard } from "../../../src/features/pages/components/draft-dashboard";

export const metadata = {
  title: "My pages | Letterly",
  description: "Manage your private Letterly pages.",
};

export default function DashboardPagesPage(): React.JSX.Element {
  return <DraftDashboard />;
}
