import { redirect } from "next/navigation";

type EditPageProps = {
  params: Promise<{ pageId: string }>;
};

export default async function LegacyEditPage({
  params,
}: EditPageProps): Promise<never> {
  const { pageId } = await params;
  redirect(`/dashboard/pages/${pageId}/edit`);
}
