import type { Metadata } from "next";
import { WorkspaceHome } from "../../../src/features/pages/components/workspace-home";

export const metadata: Metadata = {
  title: "Home | Letterly",
  description: "Create and share a thoughtful Letterly page.",
};

export default function DashboardHomePage(): React.JSX.Element {
  return <WorkspaceHome />;
}
