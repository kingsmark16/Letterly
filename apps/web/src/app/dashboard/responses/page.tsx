import type { Metadata } from "next";
import { ResponsePagePicker } from "@/features/pages/responses/response-page-picker";

export const metadata: Metadata = {
  title: "Responses | Letterly",
  description: "Choose a page to open its private response inbox.",
};

export default function DashboardResponsesPage(): React.JSX.Element {
  return <ResponsePagePicker />;
}
