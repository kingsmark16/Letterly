import { pageViewDurationRequestSchema } from "@letterly/contracts/analytics";
import {
  getApiOrigin,
  getServerConfig,
} from "../../../../../src/lib/server-config";
import {
  createSignedVisitorIdentity,
  getTrustedVisitorAddress,
  visitorIdentityHeader,
} from "../../../../../src/lib/visitor-identity";

type VisitTimeRouteContext = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: VisitTimeRouteContext,
): Promise<Response> {
  const payload = pageViewDurationRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!payload.success) return new Response(null, { status: 400 });

  const { slug } = await context.params;
  const config = getServerConfig();
  const secret = config.PUBLIC_MEDIA_PROXY_SECRET ?? config.BETTER_AUTH_SECRET;
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });
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
    `${getApiOrigin()}/api/v1/public/pages/${encodeURIComponent(slug)}/visit/time`,
    {
      method: "POST",
      cache: "no-store",
      headers,
      body: JSON.stringify(payload.data),
    },
  );
  return new Response(null, {
    status: upstream.status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
