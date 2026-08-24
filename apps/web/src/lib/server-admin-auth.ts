import { cookies } from "next/headers";
import { getApiOrigin } from "./server-config";

export type AdminAccessState =
  | "allowed"
  | "unauthenticated"
  | "forbidden"
  | "unavailable";

export async function getAdminAccessState(): Promise<AdminAccessState> {
  const cookieHeader = (await cookies()).toString();
  try {
    const response = await fetch(
      `${getApiOrigin()}/api/v1/admin/reports?size=1`,
      {
        headers: {
          Accept: "application/json",
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
        cache: "no-store",
      },
    );

    if (response.ok) return "allowed";
    if (response.status === 401) return "unauthenticated";
    if (response.status === 403) return "forbidden";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}
