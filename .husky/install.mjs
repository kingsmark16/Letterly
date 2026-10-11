import { existsSync } from "node:fs";

if (
  process.env.HUSKY !== "0" &&
  process.env.CI !== "true" &&
  process.env.NODE_ENV !== "production" &&
  existsSync(".git")
) {
  const { default: install } = await import("husky");
  const error = install();
  if (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
