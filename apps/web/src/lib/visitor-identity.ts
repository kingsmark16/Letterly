import { createHmac } from "node:crypto";
import {
  createVisitorIdentityPayload,
  visitorIdentityHeader,
} from "@letterly/contracts/visitor-identity";

export function createSignedVisitorIdentity(
  address: string,
  secret: string,
  now = Date.now(),
): string {
  const payload = createVisitorIdentityPayload(address, Math.floor(now / 1000));
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function getTrustedVisitorAddress(
  requestHeaders: Headers,
  trustedProxyCount: number,
): string {
  if (!Number.isSafeInteger(trustedProxyCount) || trustedProxyCount <= 0) {
    return "unknown";
  }

  const forwardedAddresses = (requestHeaders.get("x-forwarded-for") ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  const forwardedIndex = Math.max(
    0,
    forwardedAddresses.length - trustedProxyCount,
  );
  const forwardedAddress = forwardedAddresses[forwardedIndex];

  return forwardedAddress || "unknown";
}

export { visitorIdentityHeader };
