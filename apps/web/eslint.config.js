import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    files: ["src/templates/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["@tanstack/react-query", "@letterly/database"],
          patterns: [
            {
              group: ["**/features/**", "**/lib/api/**"],
              message:
                "Template presentation receives values and callbacks. Keep API and persistence orchestration in its feature adapter.",
            },
          ],
        },
      ],
    },
  },
];
