import { config } from "@repo/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}"],
    rules: {
      "no-console": "error",
      "no-restricted-globals": [
        "error",
        {
          name: "localStorage",
          message: "Shared UI primitives must not persist browser state.",
        },
        {
          name: "sessionStorage",
          message: "Shared UI primitives must not persist browser state.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "axios",
                "axios/*",
                "better-auth",
                "better-auth/*",
                "@letterly/database",
                "@letterly/database/*",
                "@letterly/*",
                "@tanstack/*",
                "@sentry/*",
                "@vercel/analytics",
                "@vercel/analytics/*",
                "posthog-js",
                "posthog-js/*",
                "ky",
                "ky/*",
                "graphql-request",
                "graphql-request/*",
                "../features/*",
                "../../src/features/*",
              ],
              message:
                "Shared UI primitives must not depend on data, auth, or provider clients.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='fetch'], CallExpression[callee.property.name='fetch']",
          message: "Shared UI primitives must not fetch data.",
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "Shared UI primitives must render typed children only.",
        },
        {
          selector:
            "MemberExpression[object.name='window'][property.name='localStorage']",
          message: "Shared UI primitives must not persist browser state.",
        },
        {
          selector:
            "MemberExpression[object.name='window'][property.name='sessionStorage']",
          message: "Shared UI primitives must not persist browser state.",
        },
        {
          selector: "MemberExpression[property.name='localStorage']",
          message: "Shared UI primitives must not persist browser state.",
        },
        {
          selector: "MemberExpression[property.name='sessionStorage']",
          message: "Shared UI primitives must not persist browser state.",
        },
      ],
    },
  },
];
