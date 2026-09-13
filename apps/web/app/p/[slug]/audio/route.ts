import {
  getApiOrigin,
  getServerConfig,
} from "../../../../src/lib/server-config";
import {
  createSignedVisitorIdentity,
  getTrustedVisitorAddress,
  visitorIdentityHeader,
} from "../../../../src/lib/visitor-identity";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await context.params;
  const config = getServerConfig();
  const secret = config.PUBLIC_MEDIA_PROXY_SECRET ?? config.BETTER_AUTH_SECRET;
  const headers = new Headers({ Accept: "audio/mpeg,audio/mp4" });
  const cookie = request.headers.get("cookie");
  const range = request.headers.get("range");
  if (cookie) headers.set("cookie", cookie);
  if (range) headers.set("range", range);
  if (secret)
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
  const upstream = await fetch(
    `${getApiOrigin()}/api/v1/public/pages/${encodeURIComponent(slug)}/audio`,
    { cache: "no-store", headers },
  );
  if (!upstream.ok)
    return new Response(null, {
      status:
        upstream.status === 503 ? 503 : upstream.status === 416 ? 416 : 404,
      headers: { "Cache-Control": "no-store" },
    });
  const responseHeaders = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
  });
  for (const name of ["content-length", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
