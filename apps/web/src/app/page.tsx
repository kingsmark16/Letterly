import type { Viewport } from "next";
import { redirect } from "next/navigation";
import { getLandingCatalog } from "@/features/catalog/server/catalog";
import { LandingPage } from "@/features/landing/landing-page";
import type { LandingCatalog } from "@/features/landing/landing-catalog";
import { fixtureCatalog } from "@/features/landing/landing-catalog-fixture";
import { isServerAuthenticated } from "@/lib/server-auth";
import Loading from "./loading-state";

type HomeProps = {
  searchParams: Promise<{
    uiFixture?: string | string[];
    category?: string | string[];
    cursor?: string | string[];
    direction?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#230d1a",
};

function lastValue(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value.at(-1) : value;
}

export default async function Home({
  searchParams,
}: HomeProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const categoryKey = lastValue(params.category)?.trim() || undefined;
  const cursor = lastValue(params.cursor);
  const direction = lastValue(params.direction);
  const fixture =
    process.env.LETTERLY_UI_TEST_FIXTURES === "1"
      ? lastValue(params.uiFixture)
      : undefined;

  if (!fixture && (await isServerAuthenticated())) {
    redirect("/dashboard/home");
  }

  if (fixture === "loading") {
    return <Loading />;
  }

  let catalog: LandingCatalog | null = null;
  let catalogError = fixture === "error";

  if (fixture === "empty") {
    catalog = {
      categories: [],
      page: { items: [], nextCursor: null, previousCursor: null },
    };
  } else if (fixture === "long") {
    catalog = {
      ...fixtureCatalog,
      page: {
        ...fixtureCatalog.page,
        items: fixtureCatalog.page.items.filter(
          (template) => !categoryKey || template.categoryKey === categoryKey,
        ),
      },
    };
  } else if (!catalogError) {
    try {
      catalog = await getLandingCatalog({
        ...(categoryKey ? { categoryKey } : {}),
        ...(cursor
          ? { cursor, direction: direction === "before" ? "before" : "after" }
          : {}),
        ...(fixture === "growth" ? { q: "synthetic" } : {}),
      });
    } catch {
      catalogError = true;
    }
  }

  return (
    <LandingPage
      catalog={catalog}
      catalogError={catalogError}
      categoryKey={categoryKey}
      fixture={fixture}
    />
  );
}
