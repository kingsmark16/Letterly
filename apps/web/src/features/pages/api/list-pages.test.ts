import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import axios, {
  AxiosHeaders,
  CanceledError,
  type InternalAxiosRequestConfig,
} from "axios";
import { apiClient } from "../../../lib/api/transport";
import { listPages } from "./list-pages";

const originalAdapter = apiClient.defaults.adapter;
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

test("loads a validated page list with the existing credentialed request settings", async () => {
  let captured: InternalAxiosRequestConfig | undefined;
  const signal = new AbortController().signal;
  apiClient.defaults.adapter = async (config) => {
    captured = config;
    return {
      config,
      headers: new AxiosHeaders(),
      status: 200,
      statusText: "OK",
      data: { items: [], nextCursor: "next-page", unwanted: "discard" },
    };
  };
  const result = await listPages(
    { status: "DRAFT", cursor: "first-page", size: 15 },
    { signal },
  );
  assert.deepEqual(result, { items: [], nextCursor: "next-page" });
  assert.ok(captured);
  assert.equal(captured.url, "/pages");
  assert.equal(captured.baseURL, "/api/v1");
  assert.equal(captured.timeout, 35_000);
  assert.equal(captured.withCredentials, true);
  assert.equal(captured.headers.get("Accept"), "application/json");
  assert.deepEqual(captured.params, {
    status: "DRAFT",
    cursor: "first-page",
    size: 15,
  });
  assert.equal(captured.signal, signal);
});

test("uses the bounded default page size", async () => {
  apiClient.defaults.adapter = async (config) => {
    assert.deepEqual(config.params, { size: 20 });
    return {
      config,
      headers: new AxiosHeaders(),
      status: 200,
      statusText: "OK",
      data: { items: [], nextCursor: null },
    };
  };
  assert.deepEqual(await listPages(), { items: [], nextCursor: null });
});

test("rejects invalid pagination before making a request", async () => {
  let requests = 0;
  apiClient.defaults.adapter = async () => {
    requests++;
    throw new Error("must not dispatch");
  };
  for (const size of [0, 51, 1.5]) await assert.rejects(listPages({ size }));
  assert.equal(requests, 0);
});

test("rejects an invalid list response rather than returning it to the dashboard", async () => {
  apiClient.defaults.adapter = async (config) => ({
    config,
    headers: new AxiosHeaders(),
    status: 200,
    statusText: "OK",
    data: { items: [{ id: "invalid" }], nextCursor: null },
  });
  await assert.rejects(listPages(), {
    name: "WebApiError",
    code: "MALFORMED_RESPONSE",
  });
});

test("cancels an in-flight page request with the supplied abort signal", async () => {
  const controller = new AbortController();
  let dispatched!: () => void;
  const started = new Promise<void>((resolve) => {
    dispatched = resolve;
  });
  apiClient.defaults.adapter = (config) =>
    new Promise((_resolve, reject) => {
      config.signal?.addEventListener?.(
        "abort",
        () => reject(new CanceledError("canceled")),
        { once: true },
      );
      dispatched();
    });
  const pending = listPages({}, { signal: controller.signal });
  await started;
  controller.abort();
  await assert.rejects(pending, (caught: unknown) => axios.isCancel(caught));
});
