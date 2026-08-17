export const visitorIdentityHeader = "x-letterly-visitor-identity" as const;

export type ParsedVisitorIdentity = {
  address: string;
  payload: string;
  signature: string;
  issuedAtSeconds: number;
};

export function createVisitorIdentityPayload(
  address: string,
  issuedAtSeconds: number,
): string {
  return `${issuedAtSeconds}.${encodeBase64Url(address)}`;
}

export function parseVisitorIdentityHeader(
  value: string,
): ParsedVisitorIdentity | null {
  const parts = value.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [issuedAtValue, encodedAddress, signature] = parts;
  const issuedAtSeconds = Number(issuedAtValue);

  if (
    !issuedAtValue ||
    !Number.isSafeInteger(issuedAtSeconds) ||
    !encodedAddress ||
    !signature ||
    !/^[A-Za-z0-9_-]+$/.test(encodedAddress) ||
    !/^[A-Za-z0-9_-]+$/.test(signature)
  ) {
    return null;
  }

  let address: string;

  try {
    address = decodeBase64Url(encodedAddress);
  } catch {
    return null;
  }

  if (address.length === 0 || address.length > 200) {
    return null;
  }

  return {
    address,
    payload: `${issuedAtValue}.${encodedAddress}`,
    signature,
    issuedAtSeconds,
  };
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const binary = atob(
    padding === 0 ? normalized : normalized + "=".repeat(4 - padding),
  );
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}
