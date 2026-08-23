import type { Metadata } from "next";
import { Status } from "@repo/ui/status";
import Link from "next/link";
import { SecretLetterRenderer } from "../../../src/features/pages/components/secret-letter-renderer";
import { LockedLetter } from "../../../src/features/pages/components/locked-letter";
import { VisitorResponseForm } from "../../../src/features/pages/components/visitor-response-form";
import { ChooseYourHeartRenderer } from "../../../src/features/pages/components/choose-your-heart-renderer";
import {
  getPublicPage,
  PublicPageUnavailableError,
} from "../../../src/lib/public-page";

type PublicPageProps = {
  params: Promise<{ slug: string }>;
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
}: PublicPageProps): Promise<React.JSX.Element> {
  const { slug } = await params;

  try {
    const page = await getPublicPage(slug);

    if ("publishedGraphVersion" in page) {
      return <ChooseYourHeartRenderer page={page} slug={slug} />;
    }

    if (!("recipientName" in page)) {
      return <LockedLetter slug={slug} />;
    }

    return (
      <Status state="idle">
        <main>
          <SecretLetterRenderer
            model={{
              recipientName: page.recipientName,
              mainMessage: page.mainMessage,
              sections: [],
              images: page.images,
            }}
          />
          {page.response?.enabled ? (
            <VisitorResponseForm slug={slug} response={page.response} />
          ) : null}
        </main>
      </Status>
    );
  } catch (error: unknown) {
    if (!(error instanceof PublicPageUnavailableError)) {
      throw error;
    }
  }

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
          <Link
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface hover:bg-wine-hover"
            href="/"
          >
            Return to Letterly
          </Link>
        </section>
      </main>
    </Status>
  );
}
