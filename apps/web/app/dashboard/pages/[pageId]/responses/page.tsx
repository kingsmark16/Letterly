import { ResponseDashboard } from "../../../../../src/features/pages/components/response-dashboard";

type ResponsePageProps = {
  params: Promise<{ pageId: string }>;
};

export const metadata = {
  title: "Private responses | Letterly",
  description: "Read private responses to your Letterly page.",
};

export default async function ResponsesPage({
  params,
}: ResponsePageProps): Promise<React.JSX.Element> {
  const { pageId } = await params;
  return <ResponseDashboard pageId={pageId} />;
}
