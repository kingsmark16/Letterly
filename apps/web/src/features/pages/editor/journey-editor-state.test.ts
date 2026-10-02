import assert from "node:assert/strict";
import { test } from "node:test";
import { chooseYourHeartDefaultGraph } from "@letterly/templates";
import { pageJourneyOwnerResponseSchema } from "@letterly/contracts/page-journeys";
import { getJourneyEditorState } from "./journey-editor-state";

function response(version: number) {
  return pageJourneyOwnerResponseSchema.parse({
    draft: {
      ...structuredClone(chooseYourHeartDefaultGraph),
      revisionNumber: version,
    },
    contentVersion: version,
    publishedGraphVersion: null,
    validation: { valid: true, issues: [] },
  });
}

test("journey editor waits for remote data and derives a clean graph without a draft", () => {
  assert.equal(getJourneyEditorState(undefined, null), null);
  const remote = response(1);
  assert.deepEqual(getJourneyEditorState(remote, null), {
    baseline: remote,
    graph: remote.draft,
    isDirty: false,
    refreshConflict: false,
  });
});

test("a newer remote revision replaces clean state", () => {
  const baseline = response(1);
  const remote = response(2);
  const state = getJourneyEditorState(remote, {
    baseline,
    graph: structuredClone(baseline.draft),
  });
  assert.equal(state?.baseline.contentVersion, 2);
  assert.equal(state?.graph, remote.draft);
  assert.equal(state?.refreshConflict, false);
});

test("dirty values survive refresh and retain their original expected content version", () => {
  const baseline = response(1);
  const graph = structuredClone(baseline.draft);
  graph.questions[0]!.prompt = "My unsaved prompt";
  const draft = { baseline, graph };
  assert.equal(getJourneyEditorState(baseline, draft)?.refreshConflict, false);
  const state = getJourneyEditorState(response(2), draft);
  assert.equal(state?.graph.questions[0]?.prompt, "My unsaved prompt");
  assert.equal(state?.baseline.contentVersion, 1);
  assert.equal(state?.isDirty, true);
  assert.equal(state?.refreshConflict, true);
});

test("explicit reload discards local edits and accepts the latest revision", () => {
  const remote = response(3);
  const state = getJourneyEditorState(remote, null);
  assert.equal(state?.baseline.contentVersion, 3);
  assert.equal(state?.isDirty, false);
  assert.equal(state?.refreshConflict, false);
});
