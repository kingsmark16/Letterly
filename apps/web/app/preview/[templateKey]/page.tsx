import type { Metadata } from "next";
import { Link } from "@repo/ui/link";
import type { CategoryCatalogItem } from "@letterly/contracts/catalog";
import { getCategories, getTemplateCatalogItem } from "../../../lib/catalog";
import { TemplatePreviewContent } from "../../../src/components/template-preview-content";
import { WorkspaceFrame } from "../../../src/features/pages/components/dashboard-shell";
import { parseSafeReturnPath } from "../../../src/lib/return-path";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Design preview | Letterly",
  description: "Preview a Letterly design before you make it yours.",
};

type TemplatePreviewPageProps = {
  params: Promise<{ templateKey: string }>;
  searchParams: Promise<{ start?: string }>;
};

const previewDefaults = {
  "secret-letter": {
    name: "Secret Letter",
    description: "A romantic letter with optional interactive features.",
    capabilities: [
      "images",
      "audio",
      "questions",
      "visitorMessage",
      "passwordProtection",
    ],
  },
  "choose-your-heart": {
    name: "Choose Your Heart",
    description: "A thoughtful question led by your own words.",
    capabilities: ["questions", "visitorMessage"],
  },
} as const;

export default async function TemplatePreviewPage({
  params,
  searchParams,
}: TemplatePreviewPageProps): Promise<React.JSX.Element> {
  const { templateKey } = await params;
  const { start } = await searchParams;
  const categories = await getCategories().catch(() => []);

  try {
    const decodedTemplateKey = decodeURIComponent(templateKey);
    const fallbackTemplate =
      previewDefaults[decodedTemplateKey as keyof typeof previewDefaults];
    const catalogTemplate = fallbackTemplate
      ? undefined
      : await getTemplateCatalogItem(decodedTemplateKey).catch(() => undefined);
    const template = catalogTemplate
      ? {
          name: catalogTemplate.name,
          description:
            catalogTemplate.description ??
            "A personal way to say what matters.",
          capabilities: catalogTemplate.versions.at(-1)?.capabilities ?? [],
        }
      : fallbackTemplate;

    if (!template) {
      return <UnavailablePreview categories={categories} />;
    }

    return (
      <WorkspaceFrame categories={categories}>
        <main className={styles.page} id="main-content">
          <div className={styles.shell}>
            <Link className={styles.backLink} href="/templates">
              ← Return to categories
            </Link>
            <article className={styles.preview}>
              <p className={styles.eyebrow}>A Letterly design preview</p>
              <h1>{template.name}</h1>
              <p className={styles.description}>{template.description}</p>
              <TemplatePreviewContent
                capabilities={[...template.capabilities]}
                startHref={start ? parseSafeReturnPath(start) : "/sign-in"}
                templateKey={decodedTemplateKey}
                templateName={template.name}
              />
            </article>
          </div>
        </main>
      </WorkspaceFrame>
    );
  } catch {
    return <UnavailablePreview categories={categories} />;
  }
}

function UnavailablePreview({
  categories,
}: {
  categories: CategoryCatalogItem[];
}): React.JSX.Element {
  return (
    <WorkspaceFrame categories={categories}>
      <main className={styles.page} id="main-content">
        <div className={styles.shell}>
          <Link className={styles.backLink} href="/templates">
            ← Return to categories
          </Link>
          <section className={styles.state} role="status">
            <p className={styles.eyebrow}>Preview unavailable</p>
            <h1>We could not load this design preview.</h1>
            <p className={styles.description}>
              Return to the category gallery and try again shortly.
            </p>
          </section>
        </div>
      </main>
    </WorkspaceFrame>
  );
}
