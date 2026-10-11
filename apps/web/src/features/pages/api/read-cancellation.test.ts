import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import axios, { CanceledError } from "axios";
import { QueryClient } from "@tanstack/react-query";
import { apiClient, type ApiReadOptions } from "../../../lib/api/transport";
import {
  getAdminReport,
  listAdminAuditEvents,
  listAdminReports,
} from "../../admin/api";
import { getOwnerPage } from "./lifecycle";
import { getOwnerPageJourney } from "./journeys";
import { listPageQuestions } from "./questions";
import { listOwnerImages } from "./images";
import { getOwnerAudioLinkMetadata } from "./audio";
import { getPageAnalytics } from "./analytics";
import { getSubmission, listSubmissions } from "./submissions";
import { listPages } from "./list-pages";

const pageId = "11111111-1111-4111-8111-111111111111";
const submissionId = "22222222-2222-4222-8222-222222222222";
const reads: ReadonlyArray<{
  name: string;
  load: (options: ApiReadOptions) => Promise<unknown>;
}> = [
  { name: "page list", load: (options) => listPages({}, options) },
  { name: "owner page", load: (options) => getOwnerPage(pageId, options) },
  { name: "journey", load: (options) => getOwnerPageJourney(pageId, options) },
  { name: "questions", load: (options) => listPageQuestions(pageId, options) },
  { name: "images", load: (options) => listOwnerImages(pageId, options) },
  {
    name: "audio metadata",
    load: (options) => getOwnerAudioLinkMetadata(pageId, options),
  },
  {
    name: "analytics",
    load: (options) => getPageAnalytics(pageId, 7, options),
  },
  {
    name: "submission list",
    load: (options) => listSubmissions(pageId, {}, options),
  },
  {
    name: "submission detail",
    load: (options) => getSubmission(pageId, submissionId, options),
  },
  { name: "report list", load: (options) => listAdminReports({}, options) },
  {
    name: "report detail",
    load: (options) => getAdminReport("report-id", options),
  },
  { name: "audit list", load: (options) => listAdminAuditEvents({}, options) },
];

const originalAdapter = apiClient.defaults.adapter;
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

function waitForRequest() {
  let dispatched!: () => void;
  const started = new Promise<void>((resolve) => {
    dispatched = resolve;
  });
  apiClient.defaults.adapter = (config) => {
    dispatched();
    assert.ok(config.signal, "the read must pass its signal to Axios");
    return new Promise((_resolve, reject) => {
      config.signal?.addEventListener?.(
        "abort",
        () => reject(new CanceledError("canceled")),
        { once: true },
      );
    });
  };
  return started;
}

for (const { name, load } of reads) {
  test(
    `${name} preserves cancellation of an in-flight request`,
    { timeout: 5_000 },
    async () => {
      const controller = new AbortController();
      const started = waitForRequest();
      const pending = load({ signal: controller.signal });
      const rejected = assert.rejects(pending, (error: unknown) =>
        axios.isCancel(error),
      );
      await started;
      controller.abort();
      await rejected;
    },
  );

  test(
    `${name} aborts transport and restores cached data when its query is canceled`,
    { timeout: 5_000 },
    async () => {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const queryKey = ["cancellation-fixture", name];
      const retained = { retained: true };
      client.setQueryData(queryKey, retained);
      const started = waitForRequest();
      let transport: Promise<unknown> | undefined;
      try {
        const pending = client.fetchQuery({
          queryKey,
          queryFn: ({ signal }) => {
            transport = load({ signal });
            return transport;
          },
        });
        await started;
        await client.cancelQueries({ queryKey });
        assert.equal(await pending, retained);
        assert.ok(transport);
        await assert.rejects(transport, (error: unknown) =>
          axios.isCancel(error),
        );
        assert.equal(client.getQueryData(queryKey), retained);
        assert.equal(client.getQueryState(queryKey)?.fetchStatus, "idle");
        assert.equal(client.getQueryState(queryKey)?.error, null);
      } finally {
        client.clear();
      }
    },
  );
}
