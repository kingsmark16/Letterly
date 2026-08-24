import {
  getApiOrigin,
  getServerConfig,
} from "../../../../src/lib/server-config";
import {
  createSignedVisitorIdentity,
  getTrustedVisitorAddress,
  visitorIdentityHeader,
} from "../../../../src/lib/visitor-identity";

type ResponseRouteContext = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

function copyResponseHeaders(upstream: Response): Headers {
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const name of ["content-type", "x-request-id", "retry-after"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  const upstreamHeaders = upstream.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = upstreamHeaders.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    for (const cookie of setCookies) headers.append("set-cookie", cookie);
  } else {
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) headers.set("set-cookie", setCookie);
  }

  return headers;
}

export async function POST(
  request: Request,
  context: ResponseRouteContext,
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
  if (cookieHeader) headers.set("cookie", cookieHeader);

  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);

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

  try {
    const upstream = await fetch(
      `${getApiOrigin()}/api/v1/public/pages/${encodeURIComponent(slug)}/submissions`,
      {
        method: "POST",
        body: await request.text(),
        cache: "no-store",
        headers,
      },
    );

    return new Response(upstream.body, {
      status: upstream.status,
      headers: copyResponseHeaders(upstream),
    });
  } catch {
    return Response.json(
      {
        success: false,
        data: {
          code: "SERVICE_UNAVAILABLE",
          message: "Response service is temporarily unavailable",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
