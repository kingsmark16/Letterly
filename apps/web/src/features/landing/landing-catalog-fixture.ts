import type { LandingCatalog } from "./landing-catalog";
export const fixtureCatalog: LandingCatalog = {
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
