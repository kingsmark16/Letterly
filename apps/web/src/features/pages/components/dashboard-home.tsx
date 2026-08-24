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
            <Link className={styles.textLink} href="/#privacy">
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

        <section className={styles.howSection} aria-labelledby="how-title">
          <div>
            <p className={styles.eyebrow}>A gentle process</p>
            <h2 id="how-title">Make it yours, one small choice at a time.</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <strong>Choose a shape</strong>
              <p>Start with the template that fits the feeling.</p>
            </li>
            <li>
              <span>02</span>
              <strong>Build the moment</strong>
              <p>Add words, memories, music, or questions.</p>
            </li>
            <li>
              <span>03</span>
              <strong>Share with care</strong>
              <p>Preview, protect, and publish when you are ready.</p>
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}
