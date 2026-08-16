import { loadWebConfig } from "@letterly/config";

export function getServerConfig() {
  return loadWebConfig();
}

export function getApiOrigin(): string {
  const configuredOrigin = getServerConfig().API_ORIGIN;

  return configuredOrigin
    ? new URL(configuredOrigin).toString().replace(/\/$/u, "")
    : "http://localhost:3001";
}
