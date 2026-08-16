import {
  getApiOrigin,
  getServerConfig,
} from "../../../../src/lib/server-config";
import {
  createSignedVisitorIdentity,
  getTrustedVisitorAddress,
  visitorIdentityHeader,
} from "../../../../src/lib/visitor-identity";

type ReportRouteContext = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: ReportRouteContext,
): Promise<Response> {
  const { slug } = await context.params;
  const config = getServerConfig();
  const visitorIdentitySecret =
    config.PUBLIC_MEDIA_PROXY_SECRET ?? config.BETTER_AUTH_SECRET;
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  if (visitorIdentitySecret) {
    headers.set(
      visitorIdentityHeader,
      createSignedVisitorIdentity(
        getTrustedVisitorAddress(
          new Headers(request.headers),
          config.TRUSTED_PROXY_COUNT,
        ),
        visitorIdentitySecret,
      ),
    );
  }

  const upstream = await fetch(
    `${getApiOrigin()}/api/v1/public/pages/${encodeURIComponent(slug)}/reports`,
    {
      method: "POST",
      body: await request.text(),
      cache: "no-store",
      headers,
    },
  );

  const responseHeaders = new Headers();
  for (const name of ["content-type", "x-request-id", "retry-after"]) {
    const value = upstream.headers.get(name);
    if (value) {
      responseHeaders.set(name, value);
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
