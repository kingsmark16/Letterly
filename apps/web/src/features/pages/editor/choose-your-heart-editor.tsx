"use client";

import type { PageJourneyOwnerResponse } from "@letterly/contracts/page-journeys";
import type { OwnerPageProjection } from "@letterly/contracts/pages";
import type { PageJourneyGraph } from "@letterly/templates/journey";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChooseYourHeartEditor as JourneyGraphEditor } from "../../../templates/choose-your-heart/editor";
import { getOwnerPageJourney, saveOwnerPageJourney } from "../api/journeys";
import { type WebApiError } from "../../../lib/api/errors";
import { pageKeys } from "../api/query-keys";
import { PublishControls } from "./publish-controls";
import {
  getJourneyEditorState,
  type JourneyDraft,
} from "./journey-editor-state";

interface ChooseYourHeartEditorProps {
  page: OwnerPageProjection;
  onDirtyChange?: (dirty: boolean) => void;
}

function pathText(error: WebApiError): string {
  if (!error.details || !("issues" in error.details)) return error.message;
  return error.details.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.code}`)
    .join("; ");
}

export function ChooseYourHeartEditor({
  page,
  onDirtyChange,
}: ChooseYourHeartEditorProps): React.JSX.Element {
  const readOnly = page.status === "PUBLISHED";
  const queryClient = useQueryClient();
  const journeyKey = ["page-journey", page.id];
  const journeyQuery = useQuery<PageJourneyOwnerResponse, WebApiError>({
    queryKey: journeyKey,
    queryFn: () => getOwnerPageJourney(page.id),
  });
  const [draft, setDraft] = useState<JourneyDraft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const state = getJourneyEditorState(journeyQuery.data, draft);
  const dirty = !readOnly && (state?.isDirty ?? false);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const saveMutation = useMutation<
    PageJourneyOwnerResponse,
    WebApiError,
    PageJourneyGraph
  >({
    mutationFn: (graph) => {
      if (readOnly || !state)
        throw new Error("Unpublish this journey before editing it.");
      return saveOwnerPageJourney(page.id, {
        ...graph,
        expectedContentVersion: state.baseline.contentVersion,
      });
    },
    onSuccess: (response) => {
      queryClient.setQueryData(journeyKey, response);
      setDraft(null);
      setSaveError(null);
      void queryClient.invalidateQueries({
        queryKey: pageKeys.detail(page.id),
      });
      void journeyQuery.refetch();
    },
    onError: (error) => setSaveError(pathText(error)),
  });

  if (journeyQuery.isError) {
    return (
      <section
        className="rounded-large border border-rose bg-surface p-7 shadow-low"
        role="alert"
      >
        <h2 className="font-display text-2xl font-semibold">
          Journey unavailable
        </h2>
        <p className="mt-3 text-body text-ink-muted">
          {journeyQuery.error.message}
        </p>
        <button
          className="mt-5 min-h-11 rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface"
          type="button"
          onClick={() => void journeyQuery.refetch()}
        >
          Try again
        </button>
      </section>
    );
  }
  if (!state) {
    return (
      <section className="rounded-large border border-border bg-surface p-7 shadow-low">
        <p
          className="text-body text-ink-muted"
          role="status"
          aria-live="polite"
        >
          Loading your heart journey...
        </p>
      </section>
    );
  }

  return (
    <JourneyGraphEditor
      graph={state.graph}
      readOnly={readOnly}
      isDirty={state.isDirty}
      isSaving={saveMutation.isPending}
      refreshConflict={state.refreshConflict}
      statusMessage={`Saved as version ${state.baseline.contentVersion}.`}
      saveError={saveError}
      onGraphChange={(graph) => setDraft({ baseline: state.baseline, graph })}
      onSave={() => saveMutation.mutate(state.graph)}
      onReload={() => {
        setDraft(null);
        setSaveError(null);
      }}
      lifecycleControls={
        <PublishControls
          page={page}
          isDirty={state.isDirty}
          isSaving={saveMutation.isPending}
          recipientName=""
          mainMessage=""
          isJourney
          onChanged={() => {
            void queryClient.invalidateQueries({
              queryKey: pageKeys.detail(page.id),
            });
            void queryClient.invalidateQueries({ queryKey: journeyKey });
          }}
        />
      }
    />
  );
}
