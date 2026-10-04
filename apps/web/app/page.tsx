import type { Viewport } from "next";
import { getLandingCatalog } from "../src/features/catalog/server/catalog";
import { LandingPage } from "../src/features/landing/landing-page";
import type { LandingCatalog } from "../src/features/landing/landing-catalog";
import { fixtureCatalog } from "../src/features/landing/landing-catalog-fixture";
import Loading from "./loading-state";

type HomeProps = {
  searchParams: Promise<{ uiFixture?: string }>;
};

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#fff7f8",
};

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
    catalog = { categories: [] };
  } else if (fixture === "long") {
    catalog = fixtureCatalog;
  } else if (!catalogError) {
    try {
      catalog = await getLandingCatalog();
    } catch {
      catalogError = true;
    }
  }

  return <LandingPage catalog={catalog} catalogError={catalogError} />;
}
