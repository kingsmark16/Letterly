import { nextJsConfig } from "@repo/eslint-config/next-js";
import { globalIgnores } from "eslint/config";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  globalIgnores([".next-fixtures-*/**"]),
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
