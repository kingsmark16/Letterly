"use client";

import type {
  CategoryCatalogItem,
  TemplateCatalogItem,
} from "@letterly/contracts/catalog";
import type { PageListResponse } from "@letterly/contracts/pages";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { authClient } from "../../../lib/auth-client";
import { listPages } from "../../../lib/api-client";
import { createSignInPath } from "../../../lib/return-path";
import { DashboardHeader } from "./dashboard-header";
import {
  capabilityFlow,
  creatorPath,
  frequentlyAskedQuestions,
  visitorPath,
} from "../../../content/letterly-information";
import styles from "./dashboard-home.module.css";

type DashboardCatalog = {
  categories: CategoryCatalogItem[];
  templates: TemplateCatalogItem[];
};

type DashboardHomeProps = {
  catalog: DashboardCatalog | null;
  catalogError?: boolean;
};

export function DashboardHome({
  catalog,
  catalogError = false,
}: DashboardHomeProps): React.JSX.Element {
  const session = authClient.useSession();
  const creatorId = session.data?.user.id ?? null;
  const pagesQuery = useQuery<PageListResponse>({
    queryKey: ["dashboard-home", creatorId],
    queryFn: () => listPages({ size: 4 }),
    enabled: Boolean(creatorId),
  });

  if (session.isPending) {
    return (
      <main className={styles.page} aria-busy="true">
        <DashboardHeader />
        <div className={styles.shell}>
          <section className={styles.loadingPanel} aria-live="polite">
            <p className={styles.eyebrow}>Your Letterly workspace</p>
            <h1>Opening your desk...</h1>
            <p>Checking your secure session.</p>
          </section>
        </div>
      </main>
    );
  }

  if (!session.data) {
    return (
      <main className={styles.page}>
        <DashboardHeader />
        <div className={styles.shell}>
          <section className={styles.loadingPanel}>
            <p className={styles.eyebrow}>Your Letterly workspace</p>
            <h1>A private place for your next page.</h1>
            <p>
              Sign in to keep drafts, choose templates, and continue writing.
            </p>
            <Link
              className={styles.primaryButton}
              href={createSignInPath("/dashboard/home")}
            >
              Continue to sign in
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const displayName = session.data.user.name.split(/\s+/u)[0] || "there";
  const categories = catalog?.categories ?? [];
  const templates = catalog?.templates ?? [];
  const recentLetters = pagesQuery.data?.items ?? [];

  return (
    <main className={styles.page} id="main-content">
      <DashboardHeader />
      <div className={styles.shell}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Your private workspace</p>
            <h1 id="home-title">Good to see you, {displayName}.</h1>
            <p>
              This is your quiet place to start something meaningful, pick up a
              draft, or find a better shape for what you want to say.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/templates">
                Start with a template
              </Link>
              <Link className={styles.secondaryButton} href="/dashboard">
                Open my letters
              </Link>
            </div>
          </div>
          <aside
            className={styles.heroCard}
            aria-label="Your Letterly at a glance"
          >
            <span>At a glance</span>
            <strong>{recentLetters.length}</strong>
            <p>
              recent letter{recentLetters.length === 1 ? "" : "s"} ready to
              revisit
            </p>
            <Link href="/dashboard">See all my letters ↗</Link>
          </aside>
        </section>

        <section className={styles.stats} aria-label="Letterly catalog summary">
          <div>
            <strong>{categories.length}</strong>
            <span>categories to explore</span>
          </div>
          <div>
            <strong>{templates.length}</strong>
            <span>templates available</span>
          </div>
          <div>
            <strong>Private</strong>
            <span>until you choose to publish</span>
          </div>
        </section>

        <section
          className={styles.workspaceGrid}
          aria-label="Workspace overview"
        >
          <section
            className={styles.recentPanel}
            aria-labelledby="recent-title"
          >
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Keep going</p>
                <h2 id="recent-title">Your recent letters.</h2>
              </div>
              <Link href="/dashboard">View all</Link>
            </div>

            {pagesQuery.isPending ? (
              <p className={styles.mutedText}>Finding your latest letters...</p>
            ) : pagesQuery.isError ? (
              <p className={styles.errorText} role="alert">
                Your recent letters are unavailable right now. Open My letters
                to try again.
              </p>
            ) : recentLetters.length === 0 ? (
              <div className={styles.emptyPanel}>
                <h3>Your first page is waiting.</h3>
                <p>Choose a template and give the words somewhere to land.</p>
                <Link className={styles.textLink} href="/templates">
                  Browse templates ↗
                </Link>
              </div>
            ) : (
              <ul className={styles.recentList}>
                {recentLetters.slice(0, 3).map((letter) => (
                  <li key={letter.id}>
                    <div>
                      <span>{letter.template.name}</span>
                      <h3>{letter.recipientLabel}</h3>
                    </div>
                    <Link href={`/dashboard/letters/${letter.id}/edit`}>
                      Open ↗
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className={styles.safetyCard} aria-labelledby="safety-title">
            <p className={styles.eyebrow}>Before you share</p>
            <h2 id="safety-title">Your words stay in your hands.</h2>
            <ul>
              <li>Drafts are private while you create.</li>
              <li>Preview the page before publishing.</li>
              <li>Add a password when the template supports it.</li>
            </ul>
            <Link className={styles.textLink} href="#privacy">
              Learn about privacy ↗
            </Link>
          </aside>
        </section>

        <section
          className={styles.categorySection}
          aria-labelledby="category-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Find your starting point</p>
              <h2 id="category-title">What kind of page feels right?</h2>
            </div>
            <Link href="/templates">See all templates ↗</Link>
          </div>

          {catalogError ? (
            <p className={styles.errorText} role="alert">
              We could not load the template collection. Try again from the
              Templates page.
            </p>
          ) : categories.length === 0 ? (
            <p className={styles.mutedText}>New categories are on their way.</p>
          ) : (
            <div className={styles.categoryGrid}>
              {categories.map((category) => {
                const templateCount = templates.filter(
                  (template) => template.categoryKey === category.key,
                ).length;

                return (
                  <Link
                    className={styles.categoryCard}
                    href={`/templates?category=${encodeURIComponent(category.key)}`}
                    key={category.key}
                  >
                    <span>{category.name}</span>
                    <strong>{templateCount} templates</strong>
                    <p>{category.description ?? "A place to begin."}</p>
                    <span aria-hidden="true">Explore ↗</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section
          className={styles.capabilitySection}
          id="features"
          aria-labelledby="capability-title"
        >
          <div className={styles.sectionIntroCompact}>
            <p className={styles.eyebrow}>What can I create?</p>
            <h2 id="capability-title">
              A private space for the words that matter.
            </h2>
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

        <section className={styles.howSection} id="how-it-works" aria-labelledby="how-title">
          <div>
            <p className={styles.eyebrow}>A simple beginning</p>
            <h2 id="how-title">Two paths. One meaningful connection.</h2>
            <p className={styles.sectionDescription}>Different steps, same purpose.</p>
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

        <section
          className={styles.privacySection}
          id="privacy"
          aria-labelledby="privacy-title"
        >
          <div className={styles.privacyCopy}>
            <p className={styles.eyebrow}>Privacy, by design.</p>
            <h2 id="privacy-title">Your story stays yours.</h2>
            <p>
              You control who can access the page and when. Change it anytime,
              keep it simple, and let the words stay at the center.
            </p>
            <Link className={styles.textLink} href="#faq">
              Learn more about privacy <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className={styles.privacyGrid}>
            <article>
              <span className={styles.privacyIcon} aria-hidden="true">
                ⌁
              </span>
              <h3>You&apos;re in control</h3>
              <p>Choose who can access your page and when it becomes shareable.</p>
            </article>
            <article>
              <span className={styles.privacyIcon} aria-hidden="true">
                ○
              </span>
              <h3>Replies stay private</h3>
              <p>Messages from visitors are visible only to the creator.</p>
            </article>
            <article>
              <span className={styles.privacyIcon} aria-hidden="true">
                □
              </span>
              <h3>Clear and simple</h3>
              <p>We keep things minimal so your story stays the focus.</p>
            </article>
          </div>
        </section>

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
      </div>
    </main>
  );
}
