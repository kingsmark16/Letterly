import type { Metadata } from "next";
import { Status } from "@repo/ui/status";
import Link from "next/link";
import { SecretLetterRenderer } from "../../../src/templates/secret-letter";
import { LockedLetter } from "../../../src/features/pages/components/locked-letter";
import { VisitorResponseForm } from "../../../src/features/pages/components/visitor-response-form";
import { PublicReportForm } from "../../../src/features/pages/components/public-report-form";
import { ChooseYourHeartRenderer } from "../../../src/features/pages/components/choose-your-heart-renderer";
import {
  getPublicPage,
  PublicPageUnavailableError,
} from "../../../src/lib/public-page";
import { getServerConfig } from "../../../src/lib/server-config";

type PublicPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PublicPageProps): Promise<Metadata> {
  try {
    const page = await getPublicPage((await params).slug);

    const isChooseYourHeart = page.template.key === "choose-your-heart";
    const title = isChooseYourHeart
      ? "Choose Your Heart"
      : "A Secret Letter on Letterly";
    const description = isChooseYourHeart
      ? "A guided heart journey shared through Letterly."
      : "A personal letter shared through Letterly.";
    return {
      title,
      description,
      robots: { index: false, follow: false, noarchive: true },
      alternates: { canonical: page.canonicalUrl },
      openGraph: {
        title,
        description,
        url: page.canonicalUrl,
      },
      ...(isChooseYourHeart
        ? { other: { "letterly-template": "choose-your-heart" } }
        : {}),
    };
  } catch {
    return {
      title: "Letter unavailable | Letterly",
      description: "This letter is not available.",
      robots: { index: false, follow: false, noarchive: true },
    };
  }
}

export default async function PublicPage({
  params,
  searchParams,
}: PublicPageProps): Promise<React.JSX.Element> {
  const { slug } = await params;
  const { opening } = await searchParams;
  const autoOpen =
    opening === "1" || (Array.isArray(opening) && opening.includes("1"));

  try {
    const page = await getPublicPage(slug);

    if ("publishedGraphVersion" in page) {
      return (
        <>
          <ChooseYourHeartRenderer page={page} slug={slug} />
          <PublicReportForm slug={slug} />
        </>
      );
    }

    if (!("recipientName" in page)) {
      return <LockedLetter slug={slug} />;
    }

    return (
      <Status state="idle">
        <div>
          <SecretLetterRenderer
            model={{
              recipientName: page.recipientName,
              mainMessage: page.mainMessage,
              sections: [],
              images: page.images,
            }}
            autoOpen={autoOpen}
          >
            {page.response?.enabled ? (
              <VisitorResponseForm slug={slug} response={page.response} />
            ) : null}
          </SecretLetterRenderer>
          <PublicReportForm slug={slug} />
        </div>
      </Status>
    );
  } catch (error: unknown) {
    if (!(error instanceof PublicPageUnavailableError)) {
      throw error;
    }
  }

  const supportContactUrl = getServerConfig().PUBLIC_SUPPORT_CONTACT_URL;

  return (
    <Status state="idle">
      <main className="grid min-h-screen place-items-center bg-canvas px-5 py-9 text-ink">
        <section className="w-full max-w-xl rounded-large border border-border bg-surface p-7 text-center shadow-low sm:p-9">
          <p className="mb-3 text-label font-bold uppercase tracking-[0.14em] text-wine">
            Letter unavailable
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            This letter is not available.
          </h1>
          <p className="mt-5 text-body-large leading-relaxed text-ink-muted">
            It may have been unpublished, deleted, or shared with an address
            that has changed.
          </p>
          <p className="mt-4 text-small leading-relaxed text-ink-muted">
            If you are the creator and need help, contact Letterly support.
          </p>
          {supportContactUrl ? (
            <a
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-medium border border-border px-5 py-3 text-small font-bold text-ink hover:border-wine hover:text-wine"
              href={supportContactUrl}
              rel="noreferrer"
            >
              Contact support
            </a>
          ) : null}
          <Link
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface hover:bg-wine-hover"
            href="/"
          >
            Return to Letterly
          </Link>
        </section>
      </main>
    </Status>
  );
}
