import { networkInterfaces } from "node:os";

/* global process */
/** @type {import("next").NextConfig} */
function getAllowedDevOrigins() {
  const origins = new Set(["127.0.0.1"]);

  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        origins.add(address.address);
      }
    }
  }

  return [...origins];
}

function getApiOrigin() {
  const configuredOrigin = process.env.API_ORIGIN?.trim();
  const environment = process.env.NODE_ENV ?? "development";

  if (!configuredOrigin) {
    if (environment !== "development" && environment !== "test") {
      throw new Error("API_ORIGIN is required outside development and test");
    }

    return "http://localhost:3001";
  }

  const origin = new URL(configuredOrigin);

  if (origin.protocol !== "http:" && origin.protocol !== "https:") {
    throw new Error("API_ORIGIN must use http or https");
  }

  return origin.toString().replace(/\/$/u, "");
}

const nextConfig = {
  // Include the current machine's LAN addresses so a phone can load the
  // development JavaScript bundles from the same Next.js dev server.
  allowedDevOrigins: getAllowedDevOrigins(),
  transpilePackages: ["@repo/ui", "@letterly/templates"],
  experimental: {
    useTypeScriptCli: false,
  },
  async headers() {
    return [
      {
        source: "/api/auth/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/verify-email",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
      {
        source: "/reset-password",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
      {
        source: "/forgot-password",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
      {
        source: "/p/:slug*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${getApiOrigin()}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
