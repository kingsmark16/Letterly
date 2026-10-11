"use client";

import {
  pageJourneySubmissionRequestSchema,
  type PageJourneyPublicPageProjection,
  type PageJourneySubmissionRequest,
} from "@letterly/contracts/page-journeys";
import { journeyMetricOutcomeCategory } from "@letterly/contracts/metrics";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  ChooseYourHeartRenderer,
  type JourneySubmissionInput,
  type JourneySubmissionStatus,
} from "../../../templates/choose-your-heart/renderer";
import { submitPublicJourneyResponse } from "../api/public-actions";
import { type WebApiError } from "../../../lib/api/errors";
import { emitPageJourneyMetric } from "../../../lib/page-journey-metrics";

export function ChooseYourHeartPage({
  page,
  slug,
}: {
  page: PageJourneyPublicPageProjection;
  slug: string;
}): React.JSX.Element {
  const [status, setStatus] = useState<JourneySubmissionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const submissionFingerprint = useRef<string | null>(null);
  const startEmitted = useRef(false);
  const completedCategory = useRef<string | null>(null);
  const submission = useMutation<
    unknown,
    WebApiError,
    PageJourneySubmissionRequest
  >({
    mutationFn: (input) => submitPublicJourneyResponse(slug, input),
    onSuccess: () => setStatus("accepted"),
    onError: (caught) => {
      setStatus("error");
      setError(caught.message);
    },
  });

  useEffect(() => {
    if (startEmitted.current) return;
    startEmitted.current = true;
    emitPageJourneyMetric(slug, {
      event: "journey_start",
      templateKey: page.template.key,
    });
  }, [page.template.key, slug]);

  function resetResponse(): void {
    idempotencyKey.current = null;
    submissionFingerprint.current = null;
    setStatus("idle");
    setError(null);
  }

  function submitResponse(input: JourneySubmissionInput): void {
    if (!page.response.enabled || submission.isPending) return;
    const key = idempotencyKey.current ?? crypto.randomUUID();
    const parsed = pageJourneySubmissionRequestSchema.safeParse({
      publishedGraphVersion: page.publishedGraphVersion,
      answers: input.answers,
      outcomeKey: input.outcomeKey,
      visitorMessage:
        input.withMessage && input.visitorMessage.trim()
          ? input.visitorMessage.trim()
          : undefined,
      idempotencyKey: key,
    });
    if (!parsed.success) {
      setStatus("error");
      setError("Add a message or continue without one.");
      return;
    }
    const fingerprint = JSON.stringify({
      ...parsed.data,
      idempotencyKey: undefined,
    });
    if (submissionFingerprint.current !== fingerprint) {
      idempotencyKey.current = submissionFingerprint.current
        ? crypto.randomUUID()
        : key;
    }
    submissionFingerprint.current = fingerprint;
    setError(null);
    submission.mutate({
      ...parsed.data,
      idempotencyKey: idempotencyKey.current ?? key,
    });
  }

  return (
    <ChooseYourHeartRenderer
      page={page}
      submissionStatus={submission.isPending ? "submitting" : status}
      submissionError={error}
      onSubmit={submitResponse}
      onResetResponse={resetResponse}
      onOutcomeChanged={(displayOrder) => {
        if (displayOrder === null) {
          completedCategory.current = null;
          return;
        }
        const category = journeyMetricOutcomeCategory(displayOrder);
        if (completedCategory.current === category) return;
        completedCategory.current = category;
        emitPageJourneyMetric(slug, {
          event: "journey_completed",
          templateKey: page.template.key,
          outcomeCategory: category,
        });
      }}
    />
  );
}
