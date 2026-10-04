import { expect, test } from "@playwright/test";
import { getTrustedVisitorAddress } from "../src/lib/visitor-identity";

test.describe("public visitor identity", () => {
  test("AC-10 ignores spoofed addresses before the trusted proxy boundary", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.9, 203.0.113.24",
    });

    expect(getTrustedVisitorAddress(headers, 1)).toBe("203.0.113.24");
  });

  test("AC-10 ignores forwarding headers when no proxy is trusted", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.9",
      "x-real-ip": "198.51.100.10",
    });

    expect(getTrustedVisitorAddress(headers, 0)).toBe("unknown");
  });

  test("AC-10 ignores X-Real-IP outside the trusted forwarding chain", () => {
    const headers = new Headers({
      "x-real-ip": "198.51.100.10",
    });

    expect(getTrustedVisitorAddress(headers, 1)).toBe("unknown");
  });
});
