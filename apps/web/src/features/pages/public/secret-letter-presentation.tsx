"use client";

import { Status } from "@repo/ui/status";
import { SecretLetterRenderer } from "../../../templates/secret-letter/renderer";
import { VisitorResponseForm } from "./visitor-response-form";
import { PublicReportForm } from "./public-report-form";
import { PublicVisitTracker } from "./public-visit-tracker";
import type { PublicTemplatePresentationProps } from "./presentation-types";

export function SecretLetterPresentation(
  props: PublicTemplatePresentationProps,
): React.JSX.Element {
  if (props.registryKey !== "confession.secret-letter" || props.version !== 1) {
    return <p role="status">This design version is unavailable.</p>;
  }

  const { payload } = props;
  return (
    <Status state="idle">
      <PublicVisitTracker slug={payload.slug} />
      <div>
        <SecretLetterRenderer
          model={payload.model}
          showAudioPlayerWhenEmpty
          audioUrl={payload.audioUrl}
          audioTitle={payload.audioTitle}
          audioDurationMilliseconds={payload.audioDurationMilliseconds}
          audioLink={payload.audioLink}
          audioMetadataUrl={
            payload.audioLink
              ? `/p/${encodeURIComponent(payload.slug)}/audio/metadata`
              : undefined
          }
          skipOpening={payload.skipOpening}
          afterQuestion={<PublicReportForm slug={payload.slug} />}
        >
          {payload.response?.enabled ? (
            <VisitorResponseForm
              slug={payload.slug}
              response={payload.response}
            />
          ) : null}
        </SecretLetterRenderer>
      </div>
    </Status>
  );
}
