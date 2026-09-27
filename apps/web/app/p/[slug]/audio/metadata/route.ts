import {
  getApiOrigin,
  getServerConfig,
} from "../../../../../src/lib/server-config";
import {
  createSignedVisitorIdentity,
  getTrustedVisitorAddress,
  visitorIdentityHeader,
} from "../../../../../src/lib/visitor-identity";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await context.params;
  const config = getServerConfig();
  const secret = config.PUBLIC_MEDIA_PROXY_SECRET ?? config.BETTER_AUTH_SECRET;
  const headers = new Headers({ Accept: "application/json" });
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  if (secret) {
    headers.set(
      visitorIdentityHeader,
      createSignedVisitorIdentity(
        getTrustedVisitorAddress(
          new Headers(request.headers),
          config.TRUSTED_PROXY_COUNT,
        ),
        secret,
      ),
    );
  }

  try {
    const upstream = await fetch(
      `${getApiOrigin()}/api/v1/public/pages/${encodeURIComponent(slug)}/audio/metadata`,
      { cache: "no-store", headers },
    );
    const status = upstream.ok
      ? upstream.status
      : upstream.status === 401 || upstream.status === 429
        ? upstream.status
        : upstream.status === 503
          ? 503
          : 404;
    return new Response(upstream.ok ? upstream.body : null, {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
