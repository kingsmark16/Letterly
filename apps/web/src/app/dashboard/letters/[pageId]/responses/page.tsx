import { redirect } from "next/navigation";

type ResponsePageProps = {
  params: Promise<{ pageId: string }>;
};

export default async function LegacyResponsesPage({
  params,
}: ResponsePageProps): Promise<never> {
  const { pageId } = await params;
  redirect(`/dashboard/pages/${pageId}/responses`);
}
