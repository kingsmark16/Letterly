import type { Viewport } from "next";
import { redirect } from "next/navigation";
import { getLandingCatalog } from "@/features/catalog/server/catalog";
import { LandingPage } from "@/features/landing/landing-page";
import type { LandingCatalog } from "@/features/landing/landing-catalog";
import { fixtureCatalog } from "@/features/landing/landing-catalog-fixture";
import { isServerAuthenticated } from "@/lib/server-auth";
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

  if (!fixture && (await isServerAuthenticated())) {
    redirect("/dashboard/home");
  }

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
