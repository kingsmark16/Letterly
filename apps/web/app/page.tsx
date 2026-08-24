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
import Loading from "./loading-state";
import styles from "./page.module.css";

type LandingCatalog = Awaited<ReturnType<typeof getLandingCatalog>>;

type HomeProps = {
  searchParams: Promise<{ uiFixture?: string }>;
};

const fixtureCatalog: LandingCatalog = {
  categories: [
    {
      key: "confession",
      name: "Confession",
      description:
        "A deliberately long category description that should wrap without clipping across the tablet and narrow viewport layouts.",
      displayOrder: 0,
    },
  ],
  templates: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      categoryKey: "confession",
      key: "secret-letter",
      name: "Secret Letter",
      description:
        "A deliberately long template description with an unbroken token fixture-long-content-should-wrap-instead-of-overflowing-abcdefghijklmnopqrstuvwxyz.",
      displayOrder: 0,
      versions: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          version: 1,
          capabilities: [
            "capability-with-a-long-unbroken-token-abcdefghijklmnopqrstuvwxyz",
          ],
        },
      ],
    },
  ],
};

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
  "choose-your-heart":
    "Turn a heartfelt question into an interactive journey.",
};

const trustPoints = [
  {
    label: "Private while you create",
    description: "Your draft stays yours until you choose to publish.",
  },
  {
    label: "Publish only when ready",
    description: "Take your time, then share one intentional link.",
  },
  {
    label: "Optional password protection",
    description: "Add another layer before anyone reads the page.",
  },
  {
    label: "No account needed to visit",
    description: "Recipients can open and respond without signing up.",
  },
  {
    label: "Private replies",
    description: "Visitor messages go only to the page creator.",
  },
  {
    label: "Report tools for public pages",
    description: "Visitors can report content that needs attention.",
  },
];

const capabilityFlow = [
  {
    label: "Create",
    title: "Start with the words",
    description: "Write the message, name the recipient, and shape the opening.",
  },
  {
    label: "Personalize",
    title: "Add what makes it yours",
    description: "Bring in images, music, questions, and optional sections.",
  },
  {
    label: "Protect",
    title: "Choose who can open it",
    description: "Keep it private or add a password before sharing.",
  },
  {
    label: "Share",
    title: "Publish one meaningful link",
    description: "Preview your page first, then share it when it feels ready.",
  },
  {
    label: "Receive",
    title: "Make room for a response",
    description: "Let visitors answer your questions or leave a private message.",
  },
  {
    label: "Read responses",
    title: "Keep their thoughts close",
    description: "Read private responses from your creator dashboard.",
  },
];

const creatorPath = [
  "Choose a template",
  "Write and customize",
  "Preview the page",
  "Publish and share",
];

const visitorPath = [
  "Open the page",
  "Read the story",
  "Answer the moment",
  "Leave a private message",
];

const frequentlyAskedQuestions = [
  {
    question: "Do visitors need an account to view my page?",
    answer:
      "No. A recipient can open a shared page without creating a Letterly account. A password may still be required when the creator enables protection.",
  },
  {
    question: "How do private replies work?",
    answer:
      "A visitor can send a separate private message when the creator enables responses. Only the creator of that page can read it.",
  },
  {
    question: "Can I edit my page after publishing it?",
    answer:
      "Yes. The creator controls the page lifecycle and can return to edit, preview, publish, unpublish, or remove a page through the creator flow.",
  },
  {
    question: "Can I add a password to my page?",
    answer:
      "Yes, when the selected template supports password protection. Visitors must unlock the page before private content is shown.",
  },
  {
    question: "What can I add to a Letterly page?",
    answer:
      "Available options depend on the selected template. The catalog shows whether a template supports images, music, questions, private replies, or password protection.",
  },
  {
    question: "Is my data private?",
    answer:
      "Drafts are private by default. You choose when a page is published, who receives the link, and whether it needs a password. Visitor responses stay private to the creator.",
  },
];

function StoryStudioPreview(): React.JSX.Element {
  return (
    <figure className={styles.storyPreview}>
      <figcaption className={styles.previewCaption}>
        <span>You&apos;re creating</span>
        <span>They&apos;re reading</span>
      </figcaption>

      <div className={styles.editorWindow}>
        <div className={styles.editorRail}>
          <p className={styles.previewBrand}>Letterly</p>
          <span className={styles.activeRailItem}>Secret Letter</span>
          <span>Content</span>
          <span>Settings</span>
          <span>Preview</span>
          <p className={styles.railNote}>Add what matters ↗</p>
        </div>

        <div className={styles.editorCanvas}>
          <p className={styles.previewKicker}>Your page</p>
          <h2>To the friend who gets it.</h2>
          <p className={styles.previewBody}>
            Some things are hard to say out loud. This is for the ones that
            matter.
          </p>
          <div className={styles.previewPhoto} aria-hidden="true">
            <span>Memory</span>
          </div>
          <div className={styles.audioRow}>
            <span className={styles.playButton} aria-hidden="true">
              ▶
            </span>
            <span>A song that says it</span>
            <span>00:35</span>
          </div>
          <div className={styles.questionBlock}>
            <span aria-hidden="true">?</span>
            <span>What&apos;s something you&apos;ve always wanted to tell me?</span>
          </div>
          <span className={styles.addBlock}>＋ Add block</span>
        </div>
      </div>

      <div className={styles.recipientWindow}>
        <p className={styles.recipientKicker}>A Letterly page</p>
        <h2>To the friend who gets it.</h2>
        <p>Some things are hard to say out loud. This is for the ones that matter.</p>
        <div className={styles.recipientPhoto} aria-hidden="true" />
        <div className={styles.audioRow}>
          <span className={styles.playButton} aria-hidden="true">
            ▶
          </span>
          <span>A song that says it</span>
          <span>00:35</span>
        </div>
        <div className={styles.recipientQuestion}>
          <p>What&apos;s something you&apos;ve always wanted to tell me?</p>
          <span className={styles.recipientReplyButton} aria-hidden="true">
            Leave a private reply
          </span>
        </div>
        <p className={styles.recipientPrivacy}>
          ◉ This is a private page by the creator. Your reply is visible only to them.
        </p>
      </div>

      <span className={styles.previewConnector} aria-hidden="true">
        ↔
      </span>
    </figure>
  );
}

function TrustStrip(): React.JSX.Element {
  return (
    <section className={styles.trustStrip} aria-label="Letterly principles">
      <ul>
        {trustPoints.map((point) => (
          <li key={point.label}>
            <span className={styles.trustIcon} aria-hidden="true" />
            <span>
              <strong>{point.label}</strong>
              <small>{point.description}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TemplateArtwork({
  template,
}: {
  template: TemplateCatalogItem;
}): React.JSX.Element {
  const isJourney = template.key === "choose-your-heart";
  const isLetter = template.key === "secret-letter";

  return (
    <div
      className={[styles.templateArtwork, isJourney ? styles.journeyArtwork : "", isLetter ? styles.letterArtwork : ""]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <div className={styles.artPaperBack} />
      <div className={styles.artPaper}>
        <span className={styles.artKicker}>{template.name}</span>
        <strong>
          {isJourney ? "Questions for you" : isLetter ? "For someone special" : template.name}
        </strong>
        <span className={styles.artLine} />
        <span className={styles.artLineShort} />
        {isJourney ? (
          <span className={styles.artQuestion}>? What do you remember?</span>
        ) : (
          <span className={styles.artImage}>Memory</span>
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  categoryName,
}: {
  template: TemplateCatalogItem;
  categoryName: string;
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
        <TemplateArtwork template={template} />

        <div className={styles.templateCardContent}>
          <div className={styles.templateCardTopline}>
            <span className={styles.templateCategory}>{categoryName}</span>
            <span className={styles.templateType}>Template</span>
          </div>

          <h3>{template.name}</h3>
          <p>{intro}</p>

          <ul
            className={styles.capabilityList}
            aria-label={`Capabilities for ${template.name}`}
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

function CapabilityTimeline(): React.JSX.Element {
  return (
    <section
      className={styles.capabilitySection}
      id="features"
      aria-labelledby="capability-title"
    >
      <div className={styles.sectionIntroCompact}>
        <p className={styles.eyebrow}>What can I create?</p>
        <h2 id="capability-title">A private space for the words that matter.</h2>
        <p>Build only what belongs in your story, then share it with care.</p>
      </div>

      <ol className={styles.capabilityTimeline}>
        {capabilityFlow.map((step, index) => (
          <li key={step.label}>
            <span className={styles.timelineNode}>{index + 1}</span>
            <div className={styles.capabilityPaper}>
              <span>{step.label}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function JourneyPaths(): React.JSX.Element {
  return (
    <section
      className={styles.journeySection}
      aria-labelledby="journey-title"
    >
      <div className={styles.journeyIntro}>
        <p className={styles.eyebrow}>Two paths. One meaningful connection.</p>
        <h2 id="journey-title">Different steps, same purpose.</h2>
        <p>Letterly gives the person writing and the person reading room to be present.</p>
      </div>

      <div className={styles.journeyPaths}>
        <div className={styles.journeyPath}>
          <h3>Creator path</h3>
          <ol>
            {creatorPath.map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div className={styles.journeyPath}>
          <h3>Visitor path</h3>
          <ol>
            {visitorPath.map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function PrivacySection(): React.JSX.Element {
  return (
    <section
      className={styles.privacySection}
      id="privacy"
      aria-labelledby="privacy-title"
    >
      <div className={styles.privacyCopy}>
        <p className={styles.eyebrow}>Privacy, by design.</p>
        <h2 id="privacy-title">Your story stays yours.</h2>
        <p>
          You control who can access the page and when. Change it anytime, keep
          it simple, and let the words stay at the center.
        </p>
        <UiLink className={styles.textLink} href="#faq">
          Learn more about privacy <span aria-hidden="true">→</span>
        </UiLink>
      </div>

      <div className={styles.privacyGrid}>
        <article>
          <span className={styles.privacyIcon} aria-hidden="true">⌁</span>
          <h3>You&apos;re in control</h3>
          <p>Choose who can access your page and when it becomes shareable.</p>
        </article>
        <article>
          <span className={styles.privacyIcon} aria-hidden="true">○</span>
          <h3>Replies stay private</h3>
          <p>Messages from visitors are visible only to the creator.</p>
        </article>
        <article>
          <span className={styles.privacyIcon} aria-hidden="true">□</span>
          <h3>Clear and simple</h3>
          <p>We keep things minimal so your story stays the focus.</p>
        </article>
      </div>
    </section>
  );
}

function FrequentlyAskedQuestions(): React.JSX.Element {
  return (
    <section className={styles.faqSection} id="faq" aria-labelledby="faq-title">
      <div className={styles.faqIntro}>
        <p className={styles.eyebrow}>Learn more</p>
        <h2 id="faq-title">Frequently asked questions.</h2>
      </div>

      <div className={styles.faqList}>
        {frequentlyAskedQuestions.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default async function Home({
  searchParams,
}: HomeProps): Promise<React.JSX.Element> {
  return LandingContent({ searchParams });
}

async function LandingContent({
  searchParams,
}: HomeProps): Promise<React.JSX.Element> {
  const { uiFixture } = await searchParams;
  const fixture =
    process.env.LETTERLY_UI_TEST_FIXTURES === "1" ? uiFixture : undefined;

  if (fixture === "loading") {
    return <Loading />;
  }

  let catalog: LandingCatalog | null = null;
  let catalogError = fixture === "error";

  if (fixture === "empty") {
    catalog = { categories: [], templates: [] };
  } else if (fixture === "long") {
    catalog = fixtureCatalog;
  } else if (!catalogError) {
    try {
      catalog = await getLandingCatalog();
    } catch {
      catalogError = true;
    }
  }

  const categoryByKey = new Map(
    (catalog?.categories ?? []).map((category) => [category.key, category]),
  );
  const confessionCategory: CategoryCatalogItem | undefined =
    categoryByKey.get("confession");
  const templates = catalog?.templates ?? [];

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>

      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="Letterly home">
          Letterly
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
              <UiLink href="#features">Features</UiLink>
            </li>
            <li>
              <UiLink href="#privacy">Privacy and safety</UiLink>
            </li>
            <li>
              <UiLink href="#faq">Learn more</UiLink>
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
            <p className={styles.eyebrow}>Letterly Story Studio</p>
            <h1 id="hero-title">Give important words a place of their own.</h1>
            <p className={styles.heroDescription}>
              Create a personal Letterly page for the words, memories, and
              questions that deserve more than an ordinary message.
            </p>

            <div className={styles.heroActions}>
              <UiLink className={styles.primaryButton} href="#create">
                Create a page
              </UiLink>
              <UiLink className={styles.secondaryButton} href="#templates">
                Explore templates
              </UiLink>
            </div>

            <UiLink className={styles.learnLink} href="#how-it-works">
              See how it works <span aria-hidden="true">→</span>
            </UiLink>
          </div>

          <StoryStudioPreview />
        </section>

        <TrustStrip />

        <section
          className={styles.catalogSection}
          id="templates"
          aria-labelledby="templates-title"
        >
          <div className={styles.catalogIntro}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>
                {confessionCategory?.name ?? "Confession"}
              </p>
              <h2 id="templates-title">Stories, shaped your way.</h2>
              <p>
                {confessionCategory?.description ??
                  "Choose a template that fits your story and make it unmistakably yours."}
              </p>
            </div>
            <UiLink className={styles.textLink} href="#templates-grid">
              Explore all templates <span aria-hidden="true">→</span>
            </UiLink>
          </div>

          {catalogError ? (
            <CatalogUnavailable />
          ) : templates.length === 0 ? (
            <EmptyCatalog />
          ) : (
            <ul className={styles.templateGrid} id="templates-grid">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  categoryName={
                    categoryByKey.get(template.categoryKey)?.name ??
                    template.categoryKey
                  }
                  template={template}
                />
              ))}
            </ul>
          )}
        </section>

        <CapabilityTimeline />

        <section
          className={styles.howItWorksSection}
          id="how-it-works"
          aria-labelledby="how-it-works-title"
        >
          <div className={styles.howItWorksIntro}>
            <p className={styles.eyebrow}>A simple beginning</p>
            <h2 id="how-it-works-title">Two paths. One meaningful connection.</h2>
            <p>Different steps, same purpose.</p>
          </div>
          <JourneyPaths />
        </section>

        <PrivacySection />
        <FrequentlyAskedQuestions />

        <section className={styles.finalAction} id="create" aria-labelledby="final-title">
          <div>
            <p className={styles.eyebrow}>When it feels ready</p>
            <h2 id="final-title">Some words deserve their own place.</h2>
          </div>
          <div className={styles.finalActionCopy}>
            <p>Start privately. Shape it slowly. Share it when it feels ready.</p>
            <div className={styles.finalActionButtons}>
              <UiLink className={styles.primaryButton} href="/sign-in">
                Create a page
              </UiLink>
              <UiLink className={styles.secondaryButton} href="#templates">
                Explore templates
              </UiLink>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Link className={styles.wordmark} href="/" aria-label="Letterly home">
            Letterly
          </Link>
          <p>A place for the words that matter.</p>
        </div>

        <nav aria-label="Footer navigation">
          <UiLink href="#templates">Templates</UiLink>
          <UiLink href="#how-it-works">How it works</UiLink>
          <UiLink href="#features">Features</UiLink>
          <UiLink href="#privacy">Privacy and safety</UiLink>
          <UiLink href="#faq">Learn more</UiLink>
        </nav>

        <div className={styles.footerActions}>
          <UiLink href="/sign-in">Sign in</UiLink>
          <UiLink className={styles.primaryButton} href="/sign-in">
            Create a page
          </UiLink>
        </div>
      </footer>
    </div>
  );
}
