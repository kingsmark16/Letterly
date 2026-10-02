import type { PageJourneyOwnerResponse } from "@letterly/contracts/page-journeys";
import type { PageJourneyGraph } from "@letterly/templates/journey";

export interface JourneyDraft {
  baseline: PageJourneyOwnerResponse;
  graph: PageJourneyGraph;
}

function signature(response: PageJourneyOwnerResponse): string {
  return `${response.contentVersion}:${response.draft.revisionNumber}`;
}

export function getJourneyEditorState(
  remote: PageJourneyOwnerResponse | undefined,
  draft: JourneyDraft | null,
): (JourneyDraft & { isDirty: boolean; refreshConflict: boolean }) | null {
  if (!remote) return null;
  const isDirty =
    draft !== null &&
    JSON.stringify(draft.graph) !== JSON.stringify(draft.baseline.draft);
  if (!draft || !isDirty) {
    return {
      baseline: remote,
      graph: remote.draft,
      isDirty: false,
      refreshConflict: false,
    };
  }
  return {
    ...draft,
    isDirty,
    refreshConflict: signature(remote) !== signature(draft.baseline),
  };
}
