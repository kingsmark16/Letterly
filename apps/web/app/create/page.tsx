import { createPageRequestSchema } from "@letterly/contracts/pages";
import { notFound } from "next/navigation";
import { CreateLetter } from "../../src/features/pages/components/create-letter";

type CreatePageProps = {
  searchParams: Promise<{ templateVersionId?: string }>;
};

export const metadata = {
  title: "Create a letter | Letterly",
  description: "Start a private Letterly draft.",
};

export default async function CreatePage({
  searchParams,
}: CreatePageProps): Promise<React.JSX.Element> {
  const { templateVersionId } = await searchParams;
  const parsed =
    createPageRequestSchema.shape.templateVersionId.safeParse(
      templateVersionId,
    );

  if (!parsed.success) {
    notFound();
  }

  return <CreateLetter templateVersionId={parsed.data} />;
}
