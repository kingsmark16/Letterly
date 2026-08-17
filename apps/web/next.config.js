/* global process */
/** @type {import("next").NextConfig} */
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
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    useTypeScriptCli: false,
  },
  async headers() {
    return [
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
