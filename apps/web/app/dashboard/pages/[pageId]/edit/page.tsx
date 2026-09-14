import { DraftEditor } from "../../../../../src/features/pages/components/draft-editor";

type EditPageProps = {
  params: Promise<{ pageId: string }>;
};

export const metadata = {
  title: "Edit your page | Letterly",
  description: "Write and save your private Letterly page.",
};

export default async function EditPage({
  params,
}: EditPageProps): Promise<React.JSX.Element> {
  const { pageId } = await params;

  return <DraftEditor pageId={pageId} />;
}
