import type {
  CategoryCatalogItem,
  TemplateCatalogItem,
} from "@letterly/contracts/catalog";
import { Card } from "@repo/ui/card";
import { Link as UiLink } from "@repo/ui/link";
import { Status } from "@repo/ui/status";
import Link from "next/link";
import { getLandingCatalog } from "../lib/catalog";
import { TemplatePreviewDialog } from "../src/components/template-preview-dialog";
import { createTemplateStartPath } from "../src/lib/return-path";
import styles from "./page.module.css";

type LandingCatalog = Awaited<ReturnType<typeof getLandingCatalog>>;

export const dynamic = "force-dynamic";

const capabilityLabels: Record<string, string> = {
  images: "Images",
  audio: "Music",
  questions: "Questions",
  visitorMessage: "Private replies",
  passwordProtection: "Password protection",
};

const templateIntroByKey: Record<string, string> = {
  "secret-letter": "For the words you want someone to keep.",
  "choose-your-heart": "Turn a heartfelt question into an interactive journey.",
};

const howItWorks = [
  {
    title: "Choose a template",
    description: "Start with a shape that suits the feeling you want to share.",
  },
  {
    title: "Make it yours",
    description:
      "Add only the words, memories, music, and questions that belong to your story.",
  },
  {
    title: "Preview and share",
    description:
      "Read it first, then publish when the page feels ready to become yours.",
  },
];

function HeroPreview(): React.JSX.Element {
  return (
    <figure className={styles.heroPreview}>
      <figcaption className={styles.previewCaption}>
        A Secret Letter preview
      </figcaption>

      <div className={styles.envelope}>
        <p className={styles.previewLabel}>A letter for someone special</p>
        <p className={styles.previewRecipient}>For you</p>
        <span className={styles.waxSeal} aria-hidden="true">
          L
        </span>
        <p className={styles.previewHint}>Open when you are ready</p>
      </div>
    </figure>
  );
}

function TemplateCard({
  template,
}: {
  template: TemplateCatalogItem;
}): React.JSX.Element {
  const capabilities = template.versions.at(-1)?.capabilities ?? [];
  const intro =
    templateIntroByKey[template.key] ??
    template.description ??
    "A personal way to say what matters.";
  const templateVersionId = template.versions.at(-1)?.id;
  const startHref = templateVersionId
    ? createTemplateStartPath(templateVersionId)
    : "/sign-in";

  return (
    <li>
      <Card className={styles.templateCard}>
        <div className={styles.templateCardTopline}>
          <span className={styles.templateCategory}>
            {template.categoryKey}
          </span>
          <span className={styles.templateVersion}>
            Version {template.versions.at(-1)?.version ?? 1}
          </span>
        </div>

        <h3>{template.name}</h3>
        <p>{intro}</p>

        <ul
          className={styles.capabilityList}
          aria-label="Template capabilities"
        >
          {capabilities.map((capability) => (
            <li key={capability}>
              {capabilityLabels[capability] ?? capability}
            </li>
          ))}
        </ul>

        <div className={styles.cardActions}>
          <TemplatePreviewDialog
            capabilities={capabilities}
            description={
              template.description ?? "A personal way to say what matters."
            }
            templateKey={template.key}
            templateName={template.name}
            startHref={startHref}
          />

          <UiLink className={styles.textLink} href={startHref}>
            Use this template
            <span aria-hidden="true">↗</span>
          </UiLink>
        </div>
      </Card>
    </li>
  );
}

function CatalogUnavailable(): React.JSX.Element {
  return (
    <Status
      className={styles.catalogState}
      error={
        <>
          <p className={styles.eyebrow}>Catalog unavailable</p>
          <h2>We are preparing the right words.</h2>
          <p>
            The template collection is temporarily unavailable. Please try again
            shortly.
          </p>
        </>
      }
      recovery={
        <UiLink className={styles.textLink} href="/">
          Try again
        </UiLink>
      }
      state="error"
    />
  );
}

function EmptyCatalog(): React.JSX.Element {
  return (
    <Status
      className={styles.catalogState}
      empty={
        <>
          <p className={styles.eyebrow}>Confession templates</p>
          <h2>Something thoughtful is on its way.</h2>
          <p>
            There are no published templates in this collection yet. Check back
            soon.
          </p>
        </>
      }
      state="empty"
    />
  );
}

export default async function Home(): Promise<React.JSX.Element> {
  let catalog: LandingCatalog | null = null;
  let catalogError = false;

  try {
    catalog = await getLandingCatalog();
  } catch {
    catalogError = true;
  }

  const confessionCategory: CategoryCatalogItem | undefined =
    catalog?.categories.find((category) => category.key === "confession");

  const templates = catalog?.templates ?? [];

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>

      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="Letterly home">
          letterly
        </Link>

        <nav aria-label="Primary navigation">
          <ul className={styles.navList}>
            <li>
              <UiLink href="#templates">Templates</UiLink>
            </li>
            <li>
              <UiLink href="#how-it-works">How it works</UiLink>
            </li>
            <li>
              <UiLink href="#privacy">Privacy and safety</UiLink>
            </li>
          </ul>
        </nav>

        <div className={styles.headerActions}>
          <UiLink className={styles.signInLink} href="/sign-in">
            Sign in
          </UiLink>
          <UiLink className={styles.primaryButton} href="#create">
            Create a page
          </UiLink>
        </div>
      </header>

      <main id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>A little more room for feeling</p>
            <h1 id="hero-title">Say what your heart has been holding.</h1>
            <p className={styles.heroDescription}>
              Create a personal page for the words, memories, and questions that
              deserve more than an ordinary message.
            </p>

            <div className={styles.heroActions}>
              <UiLink className={styles.primaryButton} href="#create">
                Create a letter
              </UiLink>
              <UiLink className={styles.secondaryButton} href="#templates">
                Explore templates
              </UiLink>
            </div>

            <p className={styles.trustStatement}>
              Private by default. Share only when you are ready.
            </p>
          </div>

          <HeroPreview />
        </section>

        <section
          className={styles.catalogSection}
          id="templates"
          aria-labelledby="templates-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>
              {confessionCategory?.name ?? "Confession"}
            </p>
            <h2 id="templates-title">Choose a shape for what you feel.</h2>
            <p>
              {confessionCategory?.description ??
                "Personal pages for heartfelt messages and meaningful moments."}
            </p>
          </div>

          {catalogError ? (
            <CatalogUnavailable />
          ) : templates.length === 0 ? (
            <EmptyCatalog />
          ) : (
            <ul className={styles.templateGrid}>
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </ul>
          )}
        </section>

        <section
          className={styles.howItWorksSection}
          id="how-it-works"
          aria-labelledby="how-it-works-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>A simple beginning</p>
            <h2 id="how-it-works-title">Make something worth opening.</h2>
          </div>

          <ol className={styles.stepsList}>
            {howItWorks.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepNumber}>0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          className={styles.privacySection}
          id="privacy"
          aria-labelledby="privacy-title"
        >
          <div>
            <p className={styles.eyebrow}>Privacy and safety</p>
            <h2 id="privacy-title">Your words stay yours.</h2>
          </div>

          <p>
            You control when a page is published, who receives the link, and
            whether it needs a password. Visitor replies are private and belong
            only to the creator of the page.
          </p>
        </section>

        <section className={styles.finalAction} id="create">
          <p className={styles.eyebrow}>When you are ready</p>
          <h2>Some words deserve their own place.</h2>
          <UiLink className={styles.primaryButton} href="/sign-in">
            Create your Letterly page
          </UiLink>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link className={styles.wordmark} href="/" aria-label="Letterly home">
          letterly
        </Link>

        <p>Personal pages for the words that matter.</p>

        <nav aria-label="Footer navigation">
          <UiLink href="#privacy">Privacy</UiLink>
          <UiLink href="#templates">Templates</UiLink>
        </nav>
      </footer>
    </div>
  );
}
