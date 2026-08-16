import {
  getApiOrigin,
  getServerConfig,
} from "../../../../../src/lib/server-config";
import {
  createSignedVisitorIdentity,
  getTrustedVisitorAddress,
  visitorIdentityHeader,
} from "../../../../../src/lib/visitor-identity";

type MediaRouteContext = {
  params: Promise<{ slug: string; imageId: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: MediaRouteContext,
): Promise<Response> {
  const { slug, imageId } = await context.params;
  const config = getServerConfig();
  const visitorIdentitySecret =
    config.PUBLIC_MEDIA_PROXY_SECRET ?? config.BETTER_AUTH_SECRET;
  const headers = new Headers({ Accept: "image/webp" });

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
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const upstream = await fetch(
    `${getApiOrigin()}/api/v1/public/pages/${encodeURIComponent(slug)}/images/${encodeURIComponent(imageId)}`,
    { cache: "no-store", headers },
  );

  if (!upstream.ok) {
    return new Response(null, {
      status: upstream.status === 503 ? 503 : 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "image/webp",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
