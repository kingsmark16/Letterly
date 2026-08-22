import type { Metadata } from "next";
import { Link } from "@repo/ui/link";
import { getTemplateCatalogItem } from "../../../lib/catalog";
import { TemplatePreviewContent } from "../../../src/components/template-preview-content";
import { parseSafeReturnPath } from "../../../src/lib/return-path";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Template preview | Letterly",
  description: "Preview a Letterly template before you make it yours.",
};

type TemplatePreviewPageProps = {
  params: Promise<{ templateKey: string }>;
  searchParams: Promise<{ start?: string }>;
};

const previewDefaults = {
  "secret-letter": {
    name: "Secret Letter",
    description: "A romantic letter with optional interactive features.",
    capabilities: ["images", "audio", "questions", "visitorMessage"],
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

  try {
    const decodedTemplateKey = decodeURIComponent(templateKey);
    const fallbackTemplate =
      previewDefaults[decodedTemplateKey as keyof typeof previewDefaults];
    const catalogTemplate = fallbackTemplate
      ? undefined
      : await getTemplateCatalogItem(decodedTemplateKey).catch(
          () => undefined,
        );
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
      return <UnavailablePreview />;
    }

    return (
      <main className={styles.page} id="main-content">
        <div className={styles.shell}>
          <Link className={styles.backLink} href="/">
            ← Return to Letterly
          </Link>
          <article className={styles.preview}>
            <p className={styles.eyebrow}>A Letterly template preview</p>
            <h1>{template.name}</h1>
            <p className={styles.description}>
              {template.description}
            </p>
            <TemplatePreviewContent
              capabilities={[...template.capabilities]}
              startHref={start ? parseSafeReturnPath(start) : "/sign-in"}
            />
          </article>
        </div>
      </main>
    );
  } catch {
    return <UnavailablePreview />;
  }
}

function UnavailablePreview(): React.JSX.Element {
  return (
    <main className={styles.page} id="main-content">
      <div className={styles.shell}>
        <Link className={styles.backLink} href="/">
          ← Return to Letterly
        </Link>
        <section className={styles.state} role="status">
          <p className={styles.eyebrow}>Preview unavailable</p>
          <h1>We could not load this template preview.</h1>
          <p className={styles.description}>
            Return to the template collection and try again shortly.
          </p>
        </section>
      </div>
    </main>
  );
}
