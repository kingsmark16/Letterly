import { DraftDashboard } from "../../src/features/pages/components/draft-dashboard";

export const metadata = {
  title: "My letters | Letterly",
  description: "Manage your private Letterly drafts.",
};

export default function DashboardPage(): React.JSX.Element {
  return <DraftDashboard />;
}
