"use client";

import { Status } from "@repo/ui/status";
import { BirthdayWishRenderer } from "../../../templates/birthday-wish/renderer";
import { PublicReportForm } from "./public-report-form";
import { PublicVisitTracker } from "./public-visit-tracker";
import type { PublicTemplatePresentationProps } from "./presentation-types";

export function BirthdayWishPresentation(
  props: PublicTemplatePresentationProps,
): React.JSX.Element {
  if (props.registryKey !== "birthday.birthday-wish" || props.version !== 1) {
    return <p role="status">This design version is unavailable.</p>;
  }

  const { payload } = props;
  return (
    <Status state="idle">
      <PublicVisitTracker slug={payload.slug} />
      <div>
        <BirthdayWishRenderer
          model={payload.model}
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
        />
      </div>
    </Status>
  );
}
