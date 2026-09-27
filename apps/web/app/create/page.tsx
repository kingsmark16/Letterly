import { createPageRequestSchema } from "@letterly/contracts/pages";
import { notFound, redirect } from "next/navigation";
import { createTemplateStartPath } from "../../src/lib/return-path";

type CreatePageProps = {
  searchParams: Promise<{ templateVersionId?: string }>;
};

export const metadata = {
  title: "Create a letter | Letterly",
  description: "Choose a Letterly template to begin a private draft.",
};

export default async function CreatePage({
  searchParams,
}: CreatePageProps): Promise<never> {
  const { templateVersionId } = await searchParams;
  const parsed =
    createPageRequestSchema.shape.templateVersionId.safeParse(
      templateVersionId,
    );

  if (!parsed.success) {
    notFound();
  }

  redirect(createTemplateStartPath(parsed.data));
}
