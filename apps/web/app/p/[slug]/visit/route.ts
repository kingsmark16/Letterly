import {
  getApiOrigin,
  getServerConfig,
} from "../../../../src/lib/server-config";
import {
  createSignedVisitorIdentity,
  getTrustedVisitorAddress,
  visitorIdentityHeader,
} from "../../../../src/lib/visitor-identity";

type VisitRouteContext = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: VisitRouteContext,
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

  const upstream = await fetch(
    `${getApiOrigin()}/api/v1/public/pages/${encodeURIComponent(slug)}/visit`,
    { method: "POST", cache: "no-store", headers },
  );
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
