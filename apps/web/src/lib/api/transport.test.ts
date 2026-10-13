import assert from "node:assert/strict";
import test from "node:test";
import axios, { AxiosError, AxiosHeaders, CanceledError } from "axios";
import { apiErrorEnvelopeSchema } from "@letterly/contracts/errors";
import { shouldRetryTransientApiRead, WebApiError } from "./errors";
import { request } from "./transport";

const schema = {
  parse: (value: unknown) => apiErrorEnvelopeSchema.parse(value),
};
const envelope = {
  statusCode: 429,
  code: "RATE_LIMITED",
  message: "Try again later",
  requestId: "11111111-1111-4111-8111-111111111111",
  details: { retryAfterSeconds: 12 },
};

test("preserves validated API error fields without exposing Axios configuration", async () => {
  const error = new AxiosError(
    "private upstream diagnostic",
    "ERR_BAD_RESPONSE",
    undefined,
    undefined,
    {
      status: 429,
      statusText: "Too Many Requests",
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders({ Cookie: "private-session" }) },
      data: envelope,
    },
  );
  await assert.rejects(
    request(() => Promise.reject(error), schema),
    (caught: unknown) => {
      assert.ok(caught instanceof WebApiError);
      assert.equal(caught.code, "RATE_LIMITED");
      assert.equal(caught.statusCode, 429);
      assert.equal(caught.requestId, envelope.requestId);
      assert.deepEqual(caught.details, envelope.details);
      assert.equal(caught.message, envelope.message);
      assert.equal("config" in caught, false);
      assert.equal("response" in caught, false);
      return true;
    },
  );
});

for (const code of ["ECONNABORTED", "ETIMEDOUT"]) {
  test(`normalizes ${code} to the safe timeout error`, async () => {
    await assert.rejects(
      request(() => Promise.reject(new AxiosError("private", code)), schema),
      {
        name: "WebApiError",
        code: "TIMEOUT",
        message: "The request took too long. Please try again.",
      },
    );
  });
}

test("normalizes a network failure without leaking diagnostics", async () => {
  await assert.rejects(
    request(
      () => Promise.reject(new AxiosError("private", "ERR_NETWORK")),
      schema,
    ),
    {
      name: "WebApiError",
      code: "OFFLINE",
      message: "You appear to be offline. Reconnect and try again.",
    },
  );
});

test("rejects malformed successful data with a safe error", async () => {
  await assert.rejects(
    request(
      () => Promise.resolve({ data: { privateContent: "unexpected" } }),
      schema,
    ),
    {
      name: "WebApiError",
      code: "MALFORMED_RESPONSE",
      message: "We received an unexpected response. Please try again.",
    },
  );
});

test("rejects malformed HTTP error bodies while keeping the status", async () => {
  const error = new AxiosError(
    "private",
    "ERR_BAD_RESPONSE",
    undefined,
    undefined,
    {
      status: 502,
      statusText: "Bad Gateway",
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
      data: "private upstream body",
    },
  );
  await assert.rejects(
    request(() => Promise.reject(error), schema),
    {
      name: "WebApiError",
      code: "MALFORMED_RESPONSE",
      statusCode: 502,
      message: "The server returned an invalid response. Please try again.",
    },
  );
});

test("keeps cancellation identifiable instead of reporting offline", async () => {
  const cancellation = new CanceledError("canceled");
  await assert.rejects(
    request(() => Promise.reject(cancellation), schema),
    (caught: unknown) => {
      assert.equal(caught, cancellation);
      assert.equal(axios.isCancel(caught), true);
      return true;
    },
  );
});

test("retains the identity of an already normalized error", async () => {
  const error = new WebApiError({
    code: "NOT_FOUND",
    message: "Not found",
    statusCode: 404,
  });
  await assert.rejects(
    request(() => Promise.reject(error), schema),
    (caught: unknown) => caught === error,
  );
});

test("retries one transient read failure but not permanent or malformed responses", () => {
  assert.equal(
    shouldRetryTransientApiRead(
      0,
      new WebApiError({ code: "OFFLINE", message: "Offline" }),
    ),
    true,
  );
  assert.equal(
    shouldRetryTransientApiRead(
      0,
      new WebApiError({
        code: "MALFORMED_RESPONSE",
        message: "Bad gateway",
        statusCode: 502,
      }),
    ),
    true,
  );
  assert.equal(
    shouldRetryTransientApiRead(
      0,
      new WebApiError({
        code: "NOT_FOUND",
        message: "Not found",
        statusCode: 404,
      }),
    ),
    false,
  );
  assert.equal(
    shouldRetryTransientApiRead(
      0,
      new WebApiError({ code: "MALFORMED_RESPONSE", message: "Invalid data" }),
    ),
    false,
  );
  assert.equal(
    shouldRetryTransientApiRead(
      1,
      new WebApiError({ code: "OFFLINE", message: "Offline" }),
    ),
    false,
  );
});
