import type { Metadata } from "next";
import { Link } from "@repo/ui/link";
import type { CategoryCatalogItem } from "@letterly/contracts/catalog";
import {
  getCategories,
  getTemplateCatalogItem,
} from "../../../src/features/catalog/server/catalog";
import { TemplatePreviewContent } from "../../../src/features/catalog/preview/template-preview-content";
import { WorkspaceFrame } from "../../../src/features/pages/dashboard/dashboard-shell";
import { parseSafeReturnPath } from "../../../src/lib/return-path";
import {
  getWebTemplate,
  hasWebTemplateFamily,
} from "../../../src/templates/registration";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Design preview | Letterly",
  description: "Preview a Letterly design before you make it yours.",
};

type TemplatePreviewPageProps = {
  params: Promise<{ templateKey: string }>;
  searchParams: Promise<{
    start?: string;
    category?: string;
    version?: string;
  }>;
};

export default async function TemplatePreviewPage({
  params,
  searchParams,
}: TemplatePreviewPageProps): Promise<React.JSX.Element> {
  const { templateKey } = await params;
  const { start, category, version: requestedVersion } = await searchParams;
  const categories = await getCategories().catch(() => []);

  try {
    const decodedTemplateKey = decodeURIComponent(templateKey);
    const version =
      requestedVersion === undefined ? undefined : Number(requestedVersion);
    if (
      requestedVersion !== undefined &&
      (!/^\d+$/.test(requestedVersion) ||
        !Number.isSafeInteger(version) ||
        (version ?? 0) < 1)
    ) {
      return <UnavailablePreview categories={categories} />;
    }
    const identity = {
      templateKey: decodedTemplateKey,
      ...(category !== undefined ? { categoryKey: category } : {}),
      ...(requestedVersion !== undefined ? { version } : {}),
    };
    const registration = getWebTemplate(identity);
    if (!registration && hasWebTemplateFamily(decodedTemplateKey)) {
      return <UnavailablePreview categories={categories} />;
    }
    const catalogTemplate = registration
      ? undefined
      : await getTemplateCatalogItem(decodedTemplateKey, category).catch(
          () => undefined,
        );
    const catalogVersion =
      requestedVersion === undefined
        ? catalogTemplate?.versions.at(-1)
        : catalogTemplate?.versions.find((entry) => entry.version === version);
    const template = registration
      ? {
          name: registration.name,
          description: registration.previewDescription,
          capabilities: registration.capabilities,
        }
      : catalogTemplate && catalogVersion
        ? {
            name: catalogTemplate.name,
            description:
              catalogTemplate.description ??
              "A personal way to say what matters.",
            capabilities: catalogVersion.capabilities,
          }
        : undefined;

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
                categoryKey={category}
                version={version}
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
