import type { TemplateCatalogItem } from "@letterly/contracts/catalog";
import { Link as UiLink } from "@repo/ui/link";
import { Status } from "@repo/ui/status";
import Image from "next/image";
import Link from "next/link";
import type { Viewport } from "next";
import type { CSSProperties } from "react";
import appFavicon from "../assets/images/app-favicon.png";
import appLogo from "../assets/images/app-logo.png";
import { getLandingCatalog } from "../lib/catalog";
import BlurText from "../src/components/BlurText";
import { TemplatePreviewDialog } from "../src/components/template-preview-dialog";
import { LegalPolicyDialog } from "../src/components/legal-policy-dialog";
import { Button } from "../src/components/ui/button";
import { frequentlyAskedQuestions } from "../src/content/letterly-information";
import { LandingEffects } from "../src/features/landing/components/landing-effects";
import { HowItWorksProgress } from "../src/features/landing/components/how-it-works-progress";
import { TemplateScrollStack } from "../src/features/landing/components/template-scroll-stack";
import { createTemplateStartPath } from "../src/lib/return-path";
import Loading from "./loading-state";
import { PrivacyDocument } from "./privacy/page";
import { TermsDocument } from "./terms/page";
import styles from "./page.module.css";

type LandingCatalog = Awaited<ReturnType<typeof getLandingCatalog>>;

type HomeProps = {
  searchParams: Promise<{ uiFixture?: string }>;
};

type TemplateCardProps = {
  position: number;
  template: TemplateCatalogItem;
};

type HeroContextIconName = "note" | "question" | "memory";

const heroContextMoments = [
  { icon: "note", label: "A note they can reread" },
  { icon: "question", label: "A question worth answering" },
  { icon: "memory", label: "A memory worth keeping" },
] as const satisfies ReadonlyArray<{
  icon: HeroContextIconName;
  label: string;
}>;

const heroContextConnectorLinePath = "M 18 70 H 442 M 558 70 H 982";
const heroContextConnectorLeftPath = "M 18 70 H 442";
const heroContextConnectorRightPath = "M 982 70 H 558";
const heroContextConnectorHeartPath =
  "M 500 130 C 489 118 451 89 436 66 C 423 46 427 26 441 16 C 454 6 474 10 487 21 C 493 26 497 32 500 38 C 504 31 509 24 515 19 C 528 8 548 7 561 18 C 574 30 579 49 568 68 C 553 91 516 118 500 130 Z";

const floatingLetterItems = [
  { kind: "quote", text: "dear you", color: "#a84d5a" },
  { kind: "quote", text: "keep this close", color: "#8f3443" },
  { kind: "quote", text: "with love", color: "#d45d68" },
  { kind: "quote", text: "just because", color: "#a86f60" },
  { kind: "quote", text: "open when ready", color: "#b94756" },
  { kind: "quote", text: "a little note", color: "#c26672" },
  { kind: "quote", text: "from the heart", color: "#9f5360" },
  { kind: "quote", text: "for your someday", color: "#b56f62" },
  { kind: "quote", text: "say what matters", color: "#d45d68" },
  { kind: "quote", text: "words worth keeping", color: "#8f3443" },
  { kind: "quote", text: "to remember", color: "#a84d5a" },
  { kind: "quote", text: "save this feeling", color: "#c26672" },
  { kind: "quote", text: "always and forever", color: "#9f5360" },
  { kind: "quote", text: "a note for later", color: "#b56f62" },
  { kind: "quote", text: "you are loved", color: "#d45d68" },
  { kind: "quote", text: "hold onto this", color: "#8f3443" },
  { kind: "quote", text: "thank you", color: "#a86f60" },
  { kind: "quote", text: "one day at a time", color: "#b94756" },
  { kind: "quote", text: "your story matters", color: "#c26672" },
  { kind: "quote", text: "written with care", color: "#a84d5a" },
  { kind: "quote", text: "for the quiet moments", color: "#8f3443" },
  { kind: "quote", text: "read this slowly", color: "#b56f62" },
  { kind: "quote", text: "a place for us", color: "#d45d68" },
  { kind: "quote", text: "you make life brighter", color: "#a86f60" },
  { kind: "quote", text: "keep choosing joy", color: "#c26672" },
  { kind: "quote", text: "remember this day", color: "#a84d5a" },
  { kind: "quote", text: "all my gratitude", color: "#b94756" },
  { kind: "quote", text: "the little things", color: "#9f5360" },
  { kind: "quote", text: "for whenever you need it", color: "#8f3443" },
  { kind: "quote", text: "you matter here", color: "#d45d68" },
  { kind: "quote", text: "a soft place to land", color: "#b56f62" },
  { kind: "quote", text: "made for you", color: "#c26672" },
  { kind: "quote", text: "let this stay", color: "#a84d5a" },
  { kind: "quote", text: "the words between us", color: "#a86f60" },
  { kind: "quote", text: "always in my thoughts", color: "#b94756" },
  { kind: "quote", text: "a promise in ink", color: "#9f5360" },
  { kind: "quote", text: "more than a message", color: "#d45d68" },
  { kind: "quote", text: "keep the good close", color: "#8f3443" },
  { kind: "quote", text: "for your heart", color: "#c26672" },
  { kind: "quote", text: "a moment to keep", color: "#a84d5a" },
] as const;

function shuffleFloatingLetters<T>(items: readonly T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentItem = shuffled[index];
    const swapItem = shuffled[swapIndex];

    if (currentItem === undefined || swapItem === undefined) {
      continue;
    }

    shuffled[index] = swapItem;
    shuffled[swapIndex] = currentItem;
  }

  return shuffled;
}

function randomFloatingValue(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function FloatingLetterField(): React.JSX.Element {
  const shuffledItems = shuffleFloatingLetters(floatingLetterItems);
  const floatingSlotCount = Math.ceil(shuffledItems.length / 2);
  const floatingSlotStep = 92 / floatingSlotCount;

  return (
    <div className={styles.floatingLetterField} aria-hidden="true">
      {shuffledItems.map((item, index) => {
        const isRightGutter = index % 2 === 1;
        const slotIndex = Math.floor(index / 2);
        const slotTop = 4 + (slotIndex + 0.5) * floatingSlotStep;
        const left = isRightGutter
          ? randomFloatingValue(78, 93)
          : randomFloatingValue(7, 22);
        const top = Math.min(
          97,
          Math.max(
            3,
            slotTop +
              randomFloatingValue(
                -floatingSlotStep * 0.22,
                floatingSlotStep * 0.22,
              ),
          ),
        );

        return (
          <span
            className={`${styles.floatingLetter} ${styles.floatingLetterQuote}`}
            key={`${item.kind}-${index}`}
            style={
              {
                "--letter-left": `${left}%`,
                "--letter-top": `${top}%`,
                "--letter-rotation": `${randomFloatingValue(-8, 8)}deg`,
                "--letter-delay": `${randomFloatingValue(-12, -1)}s`,
                "--letter-duration": `${randomFloatingValue(10, 17)}s`,
                "--letter-color": item.color,
              } as CSSProperties
            }
          >
            {`“${item.text}”`}
          </span>
        );
      })}
    </div>
  );
}

const howItWorksSteps = [
  {
    number: "1",
    label: "Choose",
    title: "Start with the right template.",
    description:
      "Browse the gallery and choose a format that fits the mood, moment, and person you have in mind.",
    visual: "choose",
    visualLabel: "Template library",
    visualTitle: "Pick a place to begin",
  },
  {
    number: "2",
    label: "Write",
    title: "Build around your message.",
    description:
      "Add the main content and complete the sections that belong to the selected template.",
    visual: "write",
    visualLabel: "Page editor",
    visualTitle: "Write what matters",
  },
  {
    number: "3",
    label: "Preview",
    title: "See the finished experience.",
    description:
      "Review the page as a recipient will see it, including the layout and any template specific interactions.",
    visual: "preview",
    visualLabel: "Preview mode",
    visualTitle: "See it as they will",
  },
  {
    number: "4",
    label: "Publish",
    title: "Share it when ready.",
    description:
      "Keep the draft private while you work, then publish and send the finished page when the moment feels right.",
    visual: "share",
    visualLabel: "Published page",
    visualTitle: "Ready to share",
  },
] as const;

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
          audioCapability: "optional",
          capabilities: [
            "capability-with-a-long-unbroken-token-abcdefghijklmnopqrstuvwxyz",
          ],
        },
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      categoryKey: "confession",
      key: "choose-your-heart",
      name: "Choose Your Heart",
      description:
        "Turn a heartfelt question into an interactive journey with private answers.",
      displayOrder: 1,
      versions: [
        {
          id: "00000000-0000-4000-8000-000000000004",
          version: 1,
          audioCapability: "hidden",
          capabilities: ["questions", "visitorMessage"],
        },
      ],
    },
  ],
};

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#fff7f5",
};

function BrandLogo({
  compact = false,
  priority = false,
}: {
  compact?: boolean;
  priority?: boolean;
} = {}): React.JSX.Element {
  return (
    <Image
      className={compact ? styles.brandIcon : styles.brandLogo}
      src={compact ? appFavicon : appLogo}
      alt=""
      aria-hidden="true"
      sizes={compact ? "2.25rem" : "(max-width: 48rem) 6.75rem, 8.25rem"}
      priority={priority}
    />
  );
}

function Arrow(): React.JSX.Element {
  return <span aria-hidden="true">↗</span>;
}

function HeroContextIcon({
  name,
}: {
  name: HeroContextIconName;
}): React.JSX.Element {
  return (
    <svg
      className={styles.heroContextIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "note" ? (
        <>
          <path d="M6.5 3.75h8l3 3v13.5h-11z" />
          <path d="M14.5 3.75v3h3M9 11h6M9 14.5h6M9 18h3" />
        </>
      ) : name === "question" ? (
        <>
          <circle cx="12" cy="12" r="8.25" />
          <path d="M9.75 9.75a2.25 2.25 0 1 1 3.74 1.7c-.68.53-1.49.93-1.49 2.05M12 16.75h.01" />
        </>
      ) : (
        <path d="M12 19.5s-6.7-3.98-7.5-8.55C3.9 7.55 6.1 5 8.75 5c1.43 0 2.58.7 3.25 1.75C12.67 5.7 13.82 5 15.25 5 17.9 5 20.1 7.55 19.5 10.95 18.7 15.52 12 19.5 12 19.5Z" />
      )}
    </svg>
  );
}

function HeroContextConnector(): React.JSX.Element {
  return (
    <div className={styles.heroContextConnector} aria-hidden="true">
      <svg viewBox="0 0 1000 140" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient
            id="hero-context-connector-gradient"
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop offset="0%" stopColor="var(--landing-orange-soft)" />
            <stop offset="50%" stopColor="var(--landing-orange)" />
            <stop offset="100%" stopColor="var(--landing-orange-soft)" />
          </linearGradient>
          <radialGradient id="hero-context-connector-orb-gradient">
            <stop offset="0%" stopColor="#fffdfc" stopOpacity="0.98" />
            <stop
              offset="35%"
              stopColor="var(--landing-orange)"
              stopOpacity="0.92"
            />
            <stop
              offset="100%"
              stopColor="var(--landing-orange)"
              stopOpacity="0"
            />
          </radialGradient>
          <linearGradient
            id="hero-context-heart-base-gradient"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="#ff7188" />
            <stop offset="34%" stopColor="#f45170" />
            <stop offset="68%" stopColor="#d33861" />
            <stop offset="100%" stopColor="#8d244b" />
          </linearGradient>
          <clipPath id="hero-context-connector-line-clip">
            <rect x="0" y="0" width="438" height="140" />
            <rect x="562" y="0" width="438" height="140" />
          </clipPath>
        </defs>
        <g clipPath="url(#hero-context-connector-line-clip)">
          <path
            className={styles.heroContextConnectorAura}
            d={heroContextConnectorLinePath}
          />
          <path
            className={styles.heroContextConnectorBase}
            d={heroContextConnectorLinePath}
          />
          <path
            className={styles.heroContextConnectorSweep}
            d={heroContextConnectorLeftPath}
            pathLength={1}
          />
          <path
            className={styles.heroContextConnectorSweep}
            d={heroContextConnectorRightPath}
            pathLength={1}
          />
        </g>
        <path
          className={styles.heroContextConnectorHeartCover}
          d={heroContextConnectorHeartPath}
        />
        <path
          className={styles.heroContextConnectorHeartFill}
          d={heroContextConnectorHeartPath}
        />
        <path
          className={styles.heroContextConnectorHeartBase}
          d={heroContextConnectorHeartPath}
        />
        <path
          className={styles.heroContextConnectorHeartHighlight}
          d="M 450 25 C 442 31 438 42 440 52"
        />
        <path
          className={styles.heroContextConnectorHeartFillGlow}
          d={heroContextConnectorHeartPath}
        />
        <path
          className={styles.heroContextConnectorHeartGlow}
          d={heroContextConnectorHeartPath}
          pathLength={1}
        />
        <circle
          className={styles.heroContextConnectorOrb}
          cx="18"
          cy="70"
          r="9"
          fill="url(#hero-context-connector-orb-gradient)"
        >
          <animate
            attributeName="cx"
            values="18;500;500"
            keyTimes="0;0.64;1"
            keySplines="0.65 0 0.35 1; 0 0 1 1"
            calcMode="spline"
            dur="12s"
            begin="0s"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          className={styles.heroContextConnectorOrb}
          cx="982"
          cy="70"
          r="9"
          fill="url(#hero-context-connector-orb-gradient)"
        >
          <animate
            attributeName="cx"
            values="982;500;500"
            keyTimes="0;0.64;1"
            keySplines="0.65 0 0.35 1; 0 0 1 1"
            calcMode="spline"
            dur="12s"
            begin="0s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
}

function HeroContextSection(): React.JSX.Element {
  return (
    <section
      className={styles.heroContextSection}
      aria-label="Letterly moments"
    >
      <HeroContextConnector />
      <ul className={styles.heroContextList}>
        {heroContextMoments.map((moment) => (
          <li
            key={moment.label}
            className={styles.heroContextCard}
            data-reveal="right"
          >
            <span className={styles.heroContextIconFrame}>
              <HeroContextIcon name={moment.icon} />
            </span>
            <span className={styles.heroContextItemLabel}>{moment.label}</span>
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

  return (
    <div
      className={`${styles.templateArtwork} ${
        isJourney ? styles.journeyArtwork : styles.letterArtwork
      }`}
      data-template-key={template.key}
      aria-hidden="true"
    >
      <div className={styles.artPaperBack} />
      <div className={styles.artPaper}>
        <span>{isJourney ? "A question for you" : "For someone special"}</span>
        <strong>
          {isJourney ? "Choose with your heart" : "Open when ready"}
        </strong>
        <i />
        <i />
        {isJourney ? (
          <span className={styles.artChoices}>
            <b>A</b>
            <b>B</b>
            <b>C</b>
          </span>
        ) : (
          <span className={styles.artSeal}>L</span>
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  position,
  template,
}: TemplateCardProps): React.JSX.Element {
  const capabilities = template.versions.at(-1)?.capabilities ?? [];
  const templateVersionId = template.versions.at(-1)?.id;
  const startHref = templateVersionId
    ? createTemplateStartPath(templateVersionId)
    : "/sign-in";

  return (
    <li
      id={`template-${template.key}`}
      style={{ "--template-index": position - 1 } as CSSProperties}
    >
      <article className={styles.templateCard} data-reveal>
        <TemplateArtwork template={template} />
        <div className={styles.templateCardContent}>
          <h3>
            <a
              className={styles.templateCardTitleLink}
              href={`#template-${template.key}`}
            >
              {template.name}
            </a>
          </h3>
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
            <Link className={styles.templateUseLink} href={startHref}>
              Use this template <Arrow />
            </Link>
          </div>
        </div>
      </article>
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
        <UiLink className={styles.inlineLink} href="/">
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

function TemplateShowcase({
  catalog,
  catalogError,
}: {
  catalog: LandingCatalog | null;
  catalogError: boolean;
}): React.JSX.Element {
  const templates = catalog?.templates ?? [];
  const categories = catalog?.categories ?? [];

  return (
    <section
      className={styles.templateSection}
      id="templates"
      aria-labelledby="templates-title"
    >
      <div className={styles.templateGallery}>
        <div className={styles.templateGalleryIntro} data-reveal="left">
          <p className={styles.eyebrow}>Pick a feeling. Find your words.</p>
          <h2 id="templates-title" className={styles.templateGalleryTitle}>
            Template gallery
          </h2>
          <p className={styles.templateSubcopy}>
            Start with a little inspiration. Begin with what matters.
          </p>
        </div>

        <div className={styles.templateBrowseBar} data-reveal="right">
          <nav aria-label="Browse template categories">
            <ul className={styles.templateCategories}>
              <li>
                <Link
                  className={`${styles.templateCategory} ${styles.templateCategoryActive}`}
                  href="/templates"
                >
                  All categories
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.key}>
                  <Link
                    className={styles.templateCategory}
                    href={`/templates?category=${encodeURIComponent(category.key)}`}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={styles.templateStage}>
          {catalogError ? (
            <CatalogUnavailable />
          ) : templates.length === 0 ? (
            <EmptyCatalog />
          ) : (
            <TemplateScrollStack
              ariaLabel="Available Letterly templates"
              className={styles.templateGrid}
            >
              {templates.map((template, index) => (
                <TemplateCard
                  key={template.id}
                  position={index + 1}
                  template={template}
                />
              ))}
            </TemplateScrollStack>
          )}
        </div>
      </div>
    </section>
  );
}

function HowLetterlyWorks(): React.JSX.Element {
  return (
    <section
      className={styles.howItWorksSection}
      id="how-it-works"
      aria-labelledby="how-it-works-title"
    >
      <div className={styles.howItWorksHeader} data-reveal="left">
        <p className={styles.eyebrow}>From feeling to page</p>
        <h2 id="how-it-works-title">How Letterly works</h2>
        <p>
          Every template has its own layout and capabilities. Letterly keeps the
          process clear from your first choice to the final share.
        </p>
      </div>

      <HowItWorksProgress className={styles.howItWorksRail}>
        <span className={styles.howItWorksRailLine} aria-hidden="true" />
        <span
          className={styles.howItWorksRailFill}
          data-scroll-progress-fill
          aria-hidden="true"
        />
        <ol
          className={styles.howItWorksSteps}
          aria-label="Letterly creation steps"
        >
          {howItWorksSteps.map((step, index) => {
            const headingId = `how-it-works-step-${step.number}`;

            return (
              <li
                key={step.number}
                className={styles.howItWorksItem}
                data-reveal={index % 2 === 0 ? "left" : "right"}
                data-scroll-progress-item
              >
                <span
                  className={styles.howItWorksMarker}
                  data-scroll-progress-marker
                  aria-hidden="true"
                >
                  {step.number}
                </span>
                <article
                  className={styles.howItWorksCard}
                  data-spotlight
                  aria-labelledby={headingId}
                >
                  <div
                    className={styles.howItWorksVisual}
                    data-step-visual={step.visual}
                    aria-hidden="true"
                  >
                    <span className={styles.howItWorksVisualBack} />
                    <span className={styles.howItWorksVisualSheet}>
                      <small>{step.visualLabel}</small>
                      <strong>{step.visualTitle}</strong>
                      <span className={styles.howItWorksVisualRules}>
                        <i />
                        <i />
                        <i />
                      </span>
                    </span>
                  </div>

                  <div className={styles.howItWorksCopy}>
                    <p className={styles.howItWorksLabel}>{step.label}</p>
                    <h3 id={headingId}>{step.title}</h3>
                    <p className={styles.howItWorksDescription}>
                      {step.description}
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </HowItWorksProgress>
    </section>
  );
}

function FrequentlyAskedQuestions(): React.JSX.Element {
  return (
    <section className={styles.faqSection} id="faq" aria-labelledby="faq-title">
      <div className={styles.faqIntro} data-reveal="left">
        <p className={styles.eyebrow}>FAQ</p>
        <h2 id="faq-title">Frequently asked questions</h2>
      </div>
      <div className={styles.faqList} data-reveal="right">
        {frequentlyAskedQuestions.map((item) => (
          <details key={item.question}>
            <summary>
              {item.question}
              <span aria-hidden="true">＋</span>
            </summary>
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

  return (
    <div className={styles.page} data-landing-root>
      <LandingEffects />
      <FloatingLetterField />
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>

      <aside className={styles.announcement} aria-label="Letterly note">
        <span>A private place for the words that matter.</span>
        <UiLink href="#templates">
          Find your template <span aria-hidden="true">›</span>
        </UiLink>
      </aside>

      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="Letterly home">
          <BrandLogo priority />
        </Link>

        <div className={styles.headerActions}>
          <UiLink className={styles.signInLink} href="/sign-in">
            Sign in
          </UiLink>
          <UiLink className={styles.headerCta} href="/sign-in">
            Sign up
          </UiLink>
        </div>
      </header>

      <main id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroGrid} aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <span key={index} />
            ))}
          </div>

          <div className={styles.heroContent} data-reveal>
            <h1 id="hero-title" className={styles.heroTitle}>
              <span className={styles.heroTitleAccessible}>
                Say what your heart has been holding.
              </span>
              <span className={styles.heroTitleVisual} aria-hidden="true">
                <BlurText
                  as="span"
                  text="Say what your heart"
                  className={styles.heroTitleLine}
                  animateBy="words"
                  direction="bottom"
                  delay={75}
                  stepDuration={0.28}
                  threshold={0.2}
                  aria-hidden
                />
                <BlurText
                  as="span"
                  text="has been holding."
                  className={`${styles.heroTitleLine} ${styles.heroTitleAccent}`}
                  animateBy="words"
                  direction="bottom"
                  delay={95}
                  stepDuration={0.32}
                  threshold={0.2}
                  aria-hidden
                />
              </span>
            </h1>
            <p className={styles.heroDescription}>
              Create a personal page for the words, memories, and questions that
              deserve more than an ordinary message.
            </p>
            <div className={styles.heroActions}>
              <Button
                asChild
                size="lg"
                className={`${styles.primaryButton} !h-auto !min-h-[2.875rem] !rounded-full !px-5 !text-[0.78rem] !font-semibold uppercase tracking-[0.08em]`}
              >
                <UiLink href="/sign-in" data-magnetic>
                  Get started <Arrow />
                </UiLink>
              </Button>
            </div>
            <UiLink
              className={styles.startPrompt}
              href="#templates"
              data-magnetic
              data-spotlight
            >
              <span>
                <BrandLogo compact />
                Start with a template
              </span>
              <strong>Find the right shape for your story</strong>
              <Arrow />
            </UiLink>
          </div>
        </section>

        <HeroContextSection />
        <TemplateShowcase catalog={catalog} catalogError={catalogError} />
        <HowLetterlyWorks />
        <FrequentlyAskedQuestions />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerLead}>
          <Link className={styles.wordmark} href="/" aria-label="Letterly home">
            <BrandLogo />
          </Link>
          <p>A place for the words that matter.</p>
        </div>

        <nav className={styles.footerLinks} aria-label="Footer navigation">
          <UiLink href="#templates">Templates</UiLink>
          <UiLink href="#how-it-works">How it works</UiLink>
          <UiLink href="#faq">FAQ</UiLink>
          <LegalPolicyDialog
            privacyContent={<PrivacyDocument />}
            termsContent={<TermsDocument />}
          />
          <UiLink href="/sign-in">Sign in</UiLink>
        </nav>

        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Letterly</span>
        </div>
      </footer>
    </div>
  );
}
